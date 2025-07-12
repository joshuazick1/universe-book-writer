
import { emitJobSSEEvent } from './pipeline/utils/sseEvents.js';
/**
 * Benchmark Manager for AI Server Orchestration
 *
 * Handles benchmarking logic, intervals, and result storage for server/model pairs.
 * Designed to be used by the AIOrchestrator for separation of concerns.
 */

import { AIServer, ServerModelBenchmark } from './orchestrator.js';
import { saveBenchmarksToDisk, loadBenchmarksFromDisk } from './orchestrator-benchmark-persistence.js';
import fs from 'fs';
import path from 'path';

/**
 * BenchmarkManager manages benchmark results and scheduling for AI servers/models.
 */

export class BenchmarkManager {
    /** Track in-flight benchmark jobs per model (modelName: boolean) */
    private inFlightBenchmarks: Set<string> = new Set();
    /** Tracks disabled model/server pairs due to RAM overages. Key: `${serverId}:${model}`. Value: timestamp (ms) when re-enabled. */
    private disabledDueToRAM: Map<string, number> = new Map();
    /** How long to disable a model/server pair after RAM overage (ms) */
    private ramDisableDuration = 60 * 60 * 1000; // 1 hour
    /** Log file for debug output */
    private debugLogPath: string;

    constructor() {
        // Set up log file path (single file, not per-run)
        this.debugLogPath = path.join(process.cwd(), 'logs', 'benchmarkManager.log');
        // Load persisted benchmarks from disk
        const loaded = loadBenchmarksFromDisk();
        for (const [key, value] of Object.entries(loaded)) {
            this.benchmarks.set(key, value);
        }
    }

    /** Write a debug log entry to the benchmarkManager log file */
    private logDebug(msg: string) {
        const line = `[${new Date().toISOString()}] ${msg}\n`;
        try {
            fs.mkdirSync(path.dirname(this.debugLogPath), { recursive: true });
            fs.appendFileSync(this.debugLogPath, line, 'utf-8');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('BenchmarkManager log error:', err);
        }
    }
    private benchmarks: Map<string, ServerModelBenchmark> = new Map();
    /**
     * Track recent benchmark results for adaptive backoff.
     * Map key: `${serverId}:${model}` => array of last N latency values
     */
    private recentLatencies: Map<string, number[]> = new Map();
    /**
     * Track last benchmark time for large models to enforce infrequent runs
     */
    private lastLargeModelBenchmark: Map<string, number> = new Map();
    /**
     * Minimum and maximum backoff intervals (ms)
     */
    private minBackoff = 5 * 60 * 1000; // 5 min
    private maxBackoff = 7 * 24 * 60 * 60 * 1000; // 1 week
    private stableThreshold = 0.05; // 5% change considered stable
    private stableRoundsForBackoff = 3; // If N rounds are stable, increase interval
    private largeModelThreshold = 70; // Models with size >= 70b are "large"
    private largeModelMinInterval = 12 * 60 * 60 * 1000; // 12 hours
    // constructor moved above for log file setup
    private initialAvgResponseTime: Map<string, number> = new Map();
    private _benchmarkIntervals: Record<string, NodeJS.Timeout> = {};
    private slowServerMultiplier = 2.0;
    private slowServerBenchmarkInterval = 2 * 60 * 60 * 1000; // 2 hours
    private singleServerBenchmarkInterval = 30 * 60 * 1000; // 30 min
    private multiServerBenchmarkInterval = 5 * 60 * 1000; // 5 min

    /** Get benchmark for a server/model */
    getBenchmark(serverId: string, model: string): ServerModelBenchmark | undefined {
        return this.benchmarks.get(`${serverId}:${model}`);
    }

    /** Update benchmark for a server/model */
    setBenchmark(serverId: string, model: string, benchmark: ServerModelBenchmark) {
        const key = `${serverId}:${model}`;
        this.benchmarks.set(key, benchmark);
        // Track recent latencies for adaptive backoff
        let arr = this.recentLatencies.get(key) || [];
        arr.push(benchmark.latencyMs);
        if (arr.length > this.stableRoundsForBackoff) arr = arr.slice(-this.stableRoundsForBackoff);
        this.recentLatencies.set(key, arr);
        // Persist benchmarks to disk after update
        saveBenchmarksToDisk(Object.fromEntries(this.benchmarks));
        this.logDebug(`Set benchmark for ${key}: latency=${benchmark.latencyMs.toFixed(2)}ms, throughput=${benchmark.throughput.toFixed(2)}, lastTested=${new Date(benchmark.lastTested).toISOString()}`);
    }

    /** Compute average benchmarked latency for a server across all its models */
    getServerAvgLatency(server: AIServer): number | undefined {
        const latencies: number[] = [];
        for (const m of server.models) {
            const bench = this.getBenchmark(server.id, m);
            if (bench) latencies.push(bench.latencyMs);
        }
        if (!latencies.length) return undefined;
        return latencies.reduce((a, b) => a + b, 0) / latencies.length;
    }

    /** Public getter for initialAvgResponseTime (for health API) */
    getInitialAvgResponseTime(serverId: string): number | null {
        return this.initialAvgResponseTime.get(serverId) ?? null;
    }

    /**
     * Run benchmarks for all servers/models, deprioritizing slow servers
     * @param servers List of servers
     * @param getMultiServerModels Function to get multi-server models
     * @param getSingleServerModels Function to get single-server models
     */
    /**
     * Adaptive/exponential backoff benchmarking: prioritize models on most servers, then smaller models, and back off if stable.
     */
    async maybeRunBenchmarks(
        servers: AIServer[],
        getModelMap: () => Record<string, string[]>,
        lastActivity: number,
        setLastActivity: (n: number) => void,
        force = false
    ) {
        const now = Date.now();
        this.logDebug(`maybeRunBenchmarks called (force=${force}, lastActivity=${lastActivity}, now=${now})`);
        if (!force && now - lastActivity < 10 * 60 * 1000) {
            this.logDebug('Exiting: not enough time since last activity.');
            return;
        }
        const modelMap = getModelMap();
        // Sort models: most servers first, then smallest size, deprioritize large models
        const getSize = (name: string) => {
            const match = name.match(/(\d+)(b)/i);
            return match ? parseInt(match[1], 10) : Infinity;
        };
        const allModels = Object.keys(modelMap).sort((a, b) => {
            const countDiff = modelMap[b].length - modelMap[a].length;
            if (countDiff !== 0) return countDiff;
            return getSize(a) - getSize(b);
        });
        // For each model, select the slowest available server and run a single benchmark job if not already in flight
        for (const m of allModels) {
            if (this.inFlightBenchmarks.has(m)) continue; // Only one in flight per model
            // Find all healthy servers with this model
            const candidates = servers.filter(s => s.healthy && s.models.includes(m));
            if (!candidates.length) continue;
            // Pick slowest server (highest avg latency)
            let slowest: AIServer | undefined = undefined;
            let maxLatency = -Infinity;
            for (const s of candidates) {
                const avg = this.getServerAvgLatency(s) ?? 0;
                if (avg > maxLatency) {
                    maxLatency = avg;
                    slowest = s;
                }
            }
            if (!slowest) continue;
            const key = `${slowest.id}:${m}`;
            // RAM overage check
            const disabledUntil = this.disabledDueToRAM.get(key);
            if (disabledUntil && now < disabledUntil) continue;
            // Large model: only benchmark if enough time has passed
            const size = getSize(m);
            if (size >= this.largeModelThreshold) {
                const last = this.lastLargeModelBenchmark.get(key) || 0;
                if (now - last < this.largeModelMinInterval) continue;
            }
            // Adaptive backoff: if recent results are stable, increase interval
            let interval = this.multiServerBenchmarkInterval;
            if (modelMap[m].length === 1) interval = this.singleServerBenchmarkInterval;
            // Exponential backoff for stable results
            const recents = this.recentLatencies.get(key) || [];
            if (recents.length === this.stableRoundsForBackoff) {
                const mean = recents.reduce((a, b) => a + b, 0) / recents.length;
                const maxDev = Math.max(...recents.map(x => Math.abs(x - mean)));
                if (maxDev / mean < this.stableThreshold) {
                    interval = Math.min(interval * Math.pow(2, recents.length), this.maxBackoff);
                } else {
                    interval = Math.max(interval, this.minBackoff);
                }
            }
            if (size >= this.largeModelThreshold) {
                interval = Math.max(interval, this.largeModelMinInterval);
            }
            const bench = this.getBenchmark(slowest.id, m);
            if (!bench || now - bench.lastTested > interval) {
                this.inFlightBenchmarks.add(m);
                emitJobSSEEvent({
                    jobId: `benchmark_${slowest.id}_${m}_${now}`,
                    sessionId: 'benchmark',
                    version: 'v1',
                    state: 'retry',
                    message: `Benchmark enqueued for model ${m} on slowest server ${slowest.id}`
                });
                try {
                    await this.benchmarkServerModel(slowest, m);
                    if (size >= this.largeModelThreshold) {
                        this.lastLargeModelBenchmark.set(key, now);
                    }
                    emitJobSSEEvent({
                        jobId: `benchmark_${slowest.id}_${m}_${now}`,
                        sessionId: 'benchmark',
                        version: 'v1',
                        state: 'complete',
                        message: `Benchmark complete for model ${m} on slowest server ${slowest.id}`
                    });
                } catch (err: any) {
                    if (err && typeof err === 'object' && (err.ramOverage || (err.message && /ram|memory/i.test(err.message)))) {
                        this.disabledDueToRAM.set(key, now + this.ramDisableDuration);
                    }
                    emitJobSSEEvent({
                        jobId: `benchmark_${slowest.id}_${m}_${now}`,
                        sessionId: 'benchmark',
                        version: 'v1',
                        state: 'fail',
                        error: err?.message || String(err),
                        message: `Benchmark failed for model ${m} on slowest server ${slowest.id}`
                    });
                } finally {
                    this.inFlightBenchmarks.delete(m);
                }
            }
        }
        setLastActivity(now);
    }
    /**
     * Optionally, benchmarkServerModel should return {ramOverage: true} or throw an error with ramOverage property or RAM/memory in message.
     * You may need to update benchmarkServerModel to support this contract.
     */

    /** Benchmark a specific server/model pair (stub, replace with real logic) */
    /**
     * Benchmark a specific server/model pair. Throws an error with {ramOverage:true} or message containing 'ram'/'memory' if RAM overage occurs.
     * Replace this stub with real logic that can detect RAM/memory errors.
     */
    async benchmarkServerModel(server: AIServer, model: string) {
        // Simulate RAM overage for demonstration: 10% chance
        if (Math.random() < 0.1) {
            const err: any = new Error('RAM overage detected during benchmark');
            err.ramOverage = true;
            throw err;
        }
        // Simulate benchmark (replace with real tests)
        const latency = Math.random() * 200 + 50;
        const throughput = Math.random() * 5 + 1;
        this.setBenchmark(server.id, model, {
            latencyMs: latency,
            throughput,
            lastTested: Date.now(),
        });
    }

    /**
     * Run a benchmark for all servers/models (latency, throughput, etc.)
     * This is a stub; real implementation should measure actual metrics.
     */
    async runBenchmarks(servers: AIServer[]) {
        for (const s of servers) {
            if (!s.healthy) continue;
            for (const m of s.models) {
                // Simulate benchmark (replace with real tests)
                const latency = Math.random() * 200 + 50;
                const throughput = Math.random() * 5 + 1;
                this.setBenchmark(s.id, m, {
                    latencyMs: latency,
                    throughput,
                    lastTested: Date.now(),
                });
            }
        }
    }

    /**
     * Start scheduled and random benchmarks for all servers/models
     * Schedules periodic benchmarks with random jitter for each server/model
     */
    startScheduledBenchmarks(
        servers: AIServer[],
        getMultiServerModels: () => string[],
        getSingleServerModels: () => string[]
    ) {
        // Clear any previous intervals
        if (this._benchmarkIntervals) {
            for (const intv of Object.values(this._benchmarkIntervals)) clearInterval(intv);
        }
        this._benchmarkIntervals = {};
        for (const s of servers) {
            for (const m of s.models) {
                const key = `${s.id}:${m}`;
                // Randomize interval between 80% and 120% of the normal interval
                const base = getMultiServerModels().includes(m)
                    ? this.multiServerBenchmarkInterval
                    : this.singleServerBenchmarkInterval;
                const interval = Math.floor(base * (0.8 + Math.random() * 0.4));
                this._benchmarkIntervals[key] = setInterval(() => {
                    this.benchmarkServerModel(s, m);
                }, interval);
            }
        }
    }
}
