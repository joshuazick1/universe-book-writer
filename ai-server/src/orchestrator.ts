/**
 * Orchestration Layer for AI Server
 *
 * This module manages a registry of AI servers (Ollama and future providers),
 * tracks their health, available models, and routes requests to the best server.
 *
 * - Add/remove servers at runtime
 * - Aggregate models across all servers
 * - Health check and response time tracking
 * - Select server with required model and best response
 * - Extensible for future AI providers
 */



import fetch from 'node-fetch';
import { BenchmarkManager } from './benchmarkManager.js';
import { logger } from '../../shared/logging/logger.js';
import { withJobErrorHandling } from './pipeline/utils/jobErrorHandler.js';
import { emitJobSSEEvent } from './pipeline/utils/sseEvents.js';

// Forward declaration to avoid circular dependency
let ModelPerformanceRAGService: any = null;

export interface AIServer {
    id: string;
    url: string;
    type: 'ollama' | 'other';
    healthy: boolean;
    lastResponseTime: number;
    models: string[];
    /** Max concurrent requests allowed for this server (configurable, default 4) */
    maxConcurrency?: number;
}

/**
 * Benchmark results for a server/model pair
 */
export interface ServerModelBenchmark {
    latencyMs: number;
    throughput: number; // requests/sec
    lastTested: number;
    modelLoadTimeMs?: number;
}

/**
 * Request queue entry for a server/model
 */
interface RequestQueueEntry<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    fn: (server: AIServer) => Promise<T>;
}

export class AIOrchestrator {

    /**
     * Wrap a job handler with error handling, retry, and job stealing for distributed jobs.
     * Use this for all distributed pipeline jobs.
     * @param handler The job handler function (server: AIServer) => Promise<T>
     * @param opts Options: model, version, sessionId, jobId
     */
    wrapDistributedJobHandler<T>(
        handler: (server: AIServer) => Promise<T>,
        opts: { model: string; version: string; sessionId: string; jobId: string }
    ): (server: AIServer) => Promise<T> {
        return async (server: AIServer) => {
            const wrapped = withJobErrorHandling<{ jobId: string }, T>(
                async () => handler(server),
                {
                    version: opts.version,
                    sessionId: opts.sessionId,
                    maxRetries: 3,
                    retryDelayMs: 2000,
                    jobStealTimeoutMs: 30000,
                }
            );
            return wrapped({ jobId: opts.jobId });
        };
    }
    private servers: AIServer[] = [];
    /** Track in-flight requests per server/model: { '<serverId>:<model>': count } */
    private inFlight: Map<string, number> = new Map();
    /** Mark a server/model as failed and start cooldown */
    private failureCooldown: Map<string, number> = new Map();
    /** Check if a server/model is in cooldown */
    private permanentBan: Set<string> = new Set();
    private cooldownMs = 2 * 60 * 1000; // 2 minutes, configurable
    /** Timestamp of last orchestrator activity */
    private lastActivity: number = Date.now();
    /** FIFO queue per server/model: { '<serverId>:<model>': RequestQueueEntry[] } */
    private requestQueues: Map<string, RequestQueueEntry<any>[]> = new Map();
    /** Max queue length per server/model (configurable, default 10) */
    private maxQueueLength = 10;
    /** Cached model map and last update timestamp */
    private modelMapCache: { map: Record<string, string[]>; updated: number } = { map: {}, updated: 0 };
    /** Cached tags aggregation and last update timestamp */
    private tagsCache: { tags: any; updated: number } = { tags: {}, updated: 0 };
    /** Cache TTL in ms */
    private cacheTtlMs = 30 * 1000; // 30 seconds
    /** Benchmark manager instance */
    private benchmarkManager = new BenchmarkManager();
    /** Model Performance RAG Service instance (lazy-loaded) */
    private performanceRAGService: any = null;
    /** Flag to track if RAG service initialization failed */
    private ragServiceFailed = false;
    /** Flag to track if orchestrator has been shut down */
    private isShutdown = false;

    /** Call this on any orchestrator activity */
    recordActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Initialize or get the Model Performance RAG Service (lazy-loaded)
     */
    async getRAGService(): Promise<any> {
        // Don't initialize if shut down
        if (this.isShutdown) {
            return null;
        }

        if (this.performanceRAGService || this.ragServiceFailed) {
            return this.performanceRAGService;
        }

        try {
            if (!ModelPerformanceRAGService) {
                const module = await import('./services/modelPerformanceRAG.service.js');
                ModelPerformanceRAGService = module.ModelPerformanceRAGService;
            }
            this.performanceRAGService = new ModelPerformanceRAGService(this);
            await this.performanceRAGService.initialize();
            return this.performanceRAGService;
        } catch (error) {
            console.error('[orchestrator] Failed to initialize RAG service:', error);
            this.ragServiceFailed = true;
            return null;
        }
    }

    /**
     * Track usage with RAG service (non-blocking background operation)
     */
    trackUsageWithRAG(
        serverId: string,
        modelName: string,
        requestMetadata?: {
            requestId?: string;
            userContext?: string;
            taskType?: string;
            requestSize?: 'small' | 'medium' | 'large';
            priority?: 'low' | 'normal' | 'high';
            source?: string;
        }
    ): void {
        // Use setImmediate to make this completely non-blocking
        setImmediate(async () => {
            try {
                logger.info(`[orchestrator] trackUsageWithRAG CALLED for ${modelName} on ${serverId}` + (requestMetadata ? ` | metadata: ${JSON.stringify(requestMetadata)}` : ''));
                if (requestMetadata && requestMetadata.source) {
                    logger.info(`[orchestrator] trackUsageWithRAG source: ${requestMetadata.source}`);
                }
                const ragService = await this.getRAGService();
                if (ragService) {
                    logger.info(`[orchestrator] Calling incrementUsageTally for ${modelName} on ${serverId}`);
                    await ragService.incrementUsageTally(serverId, modelName, requestMetadata);
                    logger.info(`[orchestrator] incrementUsageTally completed for ${modelName} on ${serverId}`);
                } else {
                    logger.error(`[orchestrator] RAG service is null, cannot track usage for ${modelName} on ${serverId}`);
                }
            } catch (error) {
                // Log error but don't throw - this should not impact orchestration
                logger.error(`[orchestrator] RAG usage tracking failed for ${modelName} on ${serverId}: ${error}`);
            }
        });
    }

    /** Add a new AI server to the registry */
    addServer(server: Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>) {
        // Prevent duplicate by id or url
        if (this.servers.some(s => s.id === server.id || s.url === server.url)) {
            // Already exists, do not add again
            return;
        }
        this.servers.push({ ...server, healthy: false, lastResponseTime: Infinity, models: [] });
        // Run benchmarks for new server after short delay (async, non-blocking)
        setTimeout(() => { this.maybeRunBenchmarks(true); }, 1000);
        // Invalidate model map and tags cache
        this.modelMapCache.updated = 0;
        this.tagsCache.updated = 0;
    }

    /** Remove a server by ID */
    removeServer(id: string) {
        this.servers = this.servers.filter(s => s.id !== id);
    }

    /** Get all registered servers (deduplicated by id) */
    getServers() {
        // Remove duplicates by id (keep first occurrence)
        const seen = new Set<string>();
        const deduped: AIServer[] = [];
        for (const s of this.servers) {
            if (!seen.has(s.id)) {
                deduped.push(s);
                seen.add(s.id);
            }
        }
        return deduped;
    }

    /**
     * Update health and models for all servers (real HTTP checks)
     */
    async updateAllStatus() {
        const logPath = 'logs/orchestrator-health-debug.log';
        const logDebug = (msg: string) => {
            const line = `[${new Date().toISOString()}] ${msg}\n`;
            try {
                require('fs').mkdirSync(require('path').dirname(logPath), { recursive: true });
                require('fs').appendFileSync(logPath, line, 'utf-8');
            } catch (e) { /* ignore */ }
        };
        await Promise.all(this.servers.map(async (s) => {
            try {
                // AbortController for timeout (node-fetch v3+)
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const resp = await fetch(`${s.url}/api/tags`, { signal: controller.signal });
                clearTimeout(timeout);
                logDebug(`Health check for ${s.id} (${s.url}): status=${resp.status}`);
                if (!resp.ok) throw new Error(`Status ${resp.status}`);
                const data: unknown = await resp.json();
                logDebug(`Response for ${s.id}: ${JSON.stringify(data)}`);
                s.healthy = true;
                s.lastResponseTime = Math.random() * 500 + 50; // TODO: measure real response time
                // Defensive: check data type
                if (data && typeof data === 'object' && 'models' in data) {
                    const models = (data as { models: unknown }).models;
                    if (Array.isArray(models)) {
                        // Accept both string and object formats
                        s.models = (models as any[]).map(m => {
                            if (typeof m === 'string') return m;
                            if (typeof m === 'object' && m !== null) {
                                return m.model || m.name || null;
                            }
                            return null;
                        }).filter(Boolean);
                        logDebug(`Parsed models for ${s.id}: ${JSON.stringify(s.models)}`);
                    } else if (models && typeof models === 'object') {
                        s.models = Object.keys(models as object);
                        logDebug(`Parsed models (object keys) for ${s.id}: ${JSON.stringify(s.models)}`);
                    } else {
                        s.models = [];
                        logDebug(`No valid models for ${s.id}`);
                    }
                } else {
                    s.models = [];
                    logDebug(`No 'models' property in response for ${s.id}`);
                }
            } catch (err) {
                s.healthy = false;
                s.models = [];
                let errMsg = '';
                if (err && typeof err === 'object' && 'message' in err) {
                    errMsg = (err as any).message;
                } else {
                    errMsg = String(err);
                }
                logDebug(`Health check failed for ${s.id}: ${errMsg}`);
            }
        }));
    }

    /**
     * Aggregate all models across healthy servers
     * Returns a map: { modelName: string[] (serverIds) }
     */
    getModelMap(): Record<string, string[]> {
        const modelMap: Record<string, string[]> = {};
        for (const s of this.servers) {
            if (!s.healthy) continue;
            for (const m of s.models) {
                if (!modelMap[m]) modelMap[m] = [];
                modelMap[m].push(s.id);
            }
        }
        return modelMap;
    }

    /**
     * Aggregate all unique models across healthy servers
     */
    getAllModels(): string[] {
        return Object.keys(this.getModelMap());
    }

    /**
     * Get in-flight request count for a server/model
     */
    getInFlight(serverId: string, model: string): number {
        return this.inFlight.get(`${serverId}:${model}`) || 0;
    }

    /**
     * Increment in-flight request count for a server/model
     */
    incrementInFlight(serverId: string, model: string) {
        const key = `${serverId}:${model}`;
        this.inFlight.set(key, (this.inFlight.get(key) || 0) + 1);
    }

    /**
     * Decrement in-flight request count for a server/model
     */
    decrementInFlight(serverId: string, model: string) {
        const key = `${serverId}:${model}`;
        const val = (this.inFlight.get(key) || 1) - 1;
        if (val <= 0) this.inFlight.delete(key);
        else this.inFlight.set(key, val);
    }

    /**
     * Get benchmark for a server/model
     */
    getBenchmark(serverId: string, model: string) {
        return this.benchmarkManager.getBenchmark(serverId, model);
    }

    /**
     * Update benchmark for a server/model
     */
    setBenchmark(serverId: string, model: string, benchmark: ServerModelBenchmark) {
        this.benchmarkManager.setBenchmark(serverId, model, benchmark);
    }

    /**
     * Get models that exist on more than one server
     */
    getMultiServerModels(): string[] {
        const map = this.getModelMap();
        return Object.keys(map).filter(m => map[m].length > 1);
    }

    /** Get models that exist on only one server */
    getSingleServerModels(): string[] {
        const map = this.getModelMap();
        return Object.keys(map).filter(m => map[m].length === 1);
    }

    /** Compute average benchmarked latency for a server across all its models */
    getServerAvgLatency(server: AIServer): number | undefined {
        return this.benchmarkManager.getServerAvgLatency(server);
    }

    /**
     * Run benchmarks for all servers/models, deprioritizing slow servers
     */
    /**
     * Run benchmarks and also disable model/server pairs in the orchestrator if RAM overage is detected by the BenchmarkManager.
     */
    async maybeRunBenchmarks(force = false) {
        const self = this;
        // Patch: wrap the setLastActivity to intercept RAM disables
        await this.benchmarkManager.maybeRunBenchmarks(
            this.servers,
            () => this.getModelMap(),
            this.lastActivity,
            function setLastActivityWithRAMCheck(n: number) {
                self.lastActivity = n;
                // After benchmarks, also check for RAM disables and mark failures in orchestrator
                if (self.benchmarkManager && (self.benchmarkManager as any).disabledDueToRAM) {
                    const now = Date.now();
                    for (const [key, until] of (self.benchmarkManager as any).disabledDueToRAM.entries()) {
                        if (until > now) {
                            const [serverId, model] = key.split(":");
                            self.markFailure(serverId, model);
                        }
                    }
                }
            },
            force
        );
    }

    /** Benchmark a specific server/model pair (stub, replace with real logic) */
    async benchmarkServerModel(server: AIServer, model: string) {
        await this.benchmarkManager.benchmarkServerModel(server, model);
    }

    /**
     * Run a benchmark for all servers/models (latency, throughput, etc.)
     * This is a stub; real implementation should measure actual metrics.
     */
    async runBenchmarks() {
        await this.benchmarkManager.runBenchmarks(this.servers);
    }

    /**
     * Start scheduled and random benchmarks for all servers/models
     * Schedules periodic benchmarks with random jitter for each server/model
     */
    startScheduledBenchmarks() {
        this.benchmarkManager.startScheduledBenchmarks(
            this.servers,
            () => this.getMultiServerModels(),
            () => this.getSingleServerModels()
        );
    }
    /** Store interval handles for scheduled benchmarks (now managed by BenchmarkManager) */

    /**
     * Find the best server for a given model, considering health, cooldown, concurrency, and benchmarks
     * Implements fair load distribution: least-connections, then lowest latency
     * Returns the healthy server with available concurrency and lowest benchmarked latency
     */
    getBestServerForModel(model: string): AIServer | undefined {
        const candidates = this.servers.filter(s =>
            s.healthy &&
            s.models.includes(model) &&
            !this.isInCooldown(s.id, model) &&
            !this.permanentBan.has(`${s.id}:${model}`)
        ).filter(s => {
            const max = s.maxConcurrency ?? 4;
            return this.getInFlight(s.id, model) < max;
        });
        // Sort by least in-flight requests, then by benchmarked latency
        candidates.sort((a, b) => {
            const inflightA = this.getInFlight(a.id, model);
            const inflightB = this.getInFlight(b.id, model);
            if (inflightA !== inflightB) return inflightA - inflightB;
            const ba = this.getBenchmark(a.id, model)?.latencyMs ?? a.lastResponseTime;
            const bb = this.getBenchmark(b.id, model)?.latencyMs ?? b.lastResponseTime;
            return ba - bb;
        });
        return candidates[0];
    }

    /**
     * Enqueue a request for a server/model, or reject if queue is full
     */
    private enqueueRequest<T>(serverId: string, model: string, entry: RequestQueueEntry<T>) {
        const key = `${serverId}:${model}`;
        const queue = this.requestQueues.get(key) || [];
        if (queue.length >= this.maxQueueLength) {
            entry.reject({
                status: 429,
                message: `Too many requests for model '${model}' on server '${serverId}'. Please retry later.`,
                retryAfter: 5
            });
            return;
        }
        queue.push(entry);
        this.requestQueues.set(key, queue);
    }

    /**
     * Dequeue and process the next request for a server/model if possible
     */
    private async processNextInQueue(serverId: string, model: string) {
        const key = `${serverId}:${model}`;
        const queue = this.requestQueues.get(key);
        if (!queue || queue.length === 0) return;
        const server = this.servers.find(s => s.id === serverId);
        if (!server || !server.healthy) return;
        const max = server.maxConcurrency ?? 4;
        if (this.getInFlight(serverId, model) >= max) return;
        const entry = queue.shift();
        if (queue.length === 0) this.requestQueues.delete(key);
        if (!entry) return;
        this.incrementInFlight(serverId, model);
        try {
            const result = await entry.fn(server);
            this.decrementInFlight(serverId, model);
            entry.resolve(result);
        } catch (err) {
            this.decrementInFlight(serverId, model);
            entry.reject(err);
        } finally {
            // Process next in queue
            this.processNextInQueue(serverId, model);
        }
    }

    /**
     * Attempt a request, retrying on other servers if needed, with concurrency tracking, queuing, and fair load distribution
     * @param model The model to use
     * @param fn Function to call with (server)
     * @returns The result or throws if all fail or all at max concurrency/queue
     */
    async tryRequestWithFailover<T>(model: string, fn: (server: AIServer) => Promise<T>): Promise<T> {
        // ...existing code...

        const tried: { server: string; error: string }[] = [];
        const candidates = this.servers
            .filter(s =>
                s.healthy &&
                s.models.includes(model) &&
                !this.isInCooldown(s.id, model) &&
                !this.permanentBan.has(`${s.id}:${model}`)
            )
            .sort((a, b) => {
                // Least-connections, then lowest latency
                const inflightA = this.getInFlight(a.id, model);
                const inflightB = this.getInFlight(b.id, model);
                if (inflightA !== inflightB) {
                    return inflightA - inflightB;
                }
                const ba = this.getBenchmark(a.id, model)?.latencyMs ?? a.lastResponseTime;
                const bb = this.getBenchmark(b.id, model)?.latencyMs ?? b.lastResponseTime;
                return ba - bb;
            });

        // ...removed debug logs...

        if (candidates.length === 0) {
            throw new Error(`No healthy servers available for model '${model}'.`);
        }
        // Try all candidates for immediate execution (least-connections first)
        for (const server of candidates) {
            const max = server.maxConcurrency ?? 4;
            const currentInFlight = this.getInFlight(server.id, model);
            if (currentInFlight < max) {
                this.incrementInFlight(server.id, model);
                try {
                    // Wrap the job handler for error handling, retry, and job stealing
                    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const version = 'v1'; // TODO: Pass actual version if available
                    const sessionId = 'unknown'; // TODO: Pass actual sessionId if available
                    const wrappedHandler = this.wrapDistributedJobHandler(fn, { model, version, sessionId, jobId });
                    const result = await wrappedHandler(server);
                    // Only track usage here if not a direct request (i.e., orchestrated)
                    if (!(fn as any).__source || (fn as any).__source !== 'direct') {
                        this.trackUsageWithRAG(server.id, model, {
                            requestId: jobId,
                            taskType: 'general',
                            priority: 'normal',
                            source: 'orchestrated'
                        });
                    }
                    this.decrementInFlight(server.id, model);
                    this.processNextInQueue(server.id, model);
                    return result;
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.decrementInFlight(server.id, model);
                    this.processNextInQueue(server.id, model);
                    if (/not enough ram|model not supported|out of memory|permanent/i.test(msg)) {
                        this.permanentBan.add(`${server.id}:${model}`);
                    } else {
                        this.markFailure(server.id, model);
                    }
                    emitJobSSEEvent({
                        jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        sessionId: 'unknown',
                        version: 'v1',
                        state: 'fail',
                        error: msg,
                    });
                    tried.push({ server: server.id, error: msg });
                }
            }
        }
        // If all are at max concurrency, try to enqueue on the best candidate (least-connections)
        const best = candidates[0];
        return new Promise<T>((resolve, reject) => {
            this.enqueueRequest<T>(best.id, model, {
                resolve,
                reject,
                fn
            });
        });
    }

    /** Mark a server/model as failed and start cooldown */
    markFailure(serverId: string, model: string) {
        this.failureCooldown.set(`${serverId}:${model}`, Date.now());
    }

    /** Check if a server/model is in cooldown */
    isInCooldown(serverId: string, model: string): boolean {
        const key = `${serverId}:${model}`;
        const lastFail = this.failureCooldown.get(key);
        if (!lastFail) return false;
        return Date.now() - lastFail < this.cooldownMs;
    }

    /** Public getter for initialAvgResponseTime (for health API) */
    getInitialAvgResponseTime(serverId: string): number | null {
        return this.benchmarkManager.getInitialAvgResponseTime(serverId);
    }

    /** Update health and models for all servers (real HTTP checks) and refresh caches */
    async updateAllStatusAndCache() {
        await this.updateAllStatus();
        this.refreshModelMapCache();
        this.refreshTagsCache();
    }

    /** Get cached model map, refresh if expired or forced */
    async getCachedModelMap(force = false): Promise<Record<string, string[]>> {
        if (force || Date.now() - this.modelMapCache.updated > this.cacheTtlMs) {
            this.refreshModelMapCache();
        }
        return this.modelMapCache.map;
    }
    /** Refresh model map cache */
    async refreshModelMapCache() {
        await this.updateAllStatus();
        this.modelMapCache.map = this.getModelMap();
        this.modelMapCache.updated = Date.now();
    }

    /** Get cached tags aggregation, refresh if expired or forced */
    async getCachedTags(force = false): Promise<any> {
        if (force || Date.now() - this.tagsCache.updated > this.cacheTtlMs) {
            await this.refreshTagsCache();
        }
        return this.tagsCache.tags;
    }
    /** Refresh tags cache (aggregates tags from all servers, skips only bad responses) */
    async refreshTagsCache() {
        await this.updateAllStatus();
        // PATCH: Aggregate tags from all servers, not just healthy ones, for robustness
        const servers = this.getServers();
        const allTags: Record<string, any[]> = {};
        for (const server of servers) {
            try {
                const resp = await fetch(`${server.url}/api/tags`);
                if (!resp.ok) continue;
                const data = (await resp.json()) as any;
                if (!data || !Array.isArray(data.models)) continue;
                for (const tag of data.models) {
                    if (!tag || typeof tag !== 'object') continue;
                    // Accept models with missing fields, fill with nulls later
                    let modelKey = tag.model ?? tag.name ?? '__unknown__';
                    if (!allTags[modelKey]) allTags[modelKey] = [];
                    allTags[modelKey].push({ ...tag, server: server.id });
                }
            } catch (err) {
                continue;
            }
        }
        this.tagsCache.tags = allTags;
        this.tagsCache.updated = Date.now();
    }

    /** 
     * TEST-ONLY method: refresh tags cache using server.tags instead of HTTP calls 
     * This method should only be used in tests where servers have mock tags data.
     * Production code should NEVER call this method.
     */
    refreshTagsCacheFromServerData() {
        const servers = this.getServers();
        const allTags: Record<string, any[]> = {};
        for (const server of servers) {
            const serverTags = (server as any).tags;
            if (Array.isArray(serverTags)) {
                for (const tag of serverTags) {
                    if (!tag || typeof tag !== 'object') continue;
                    let modelKey = tag.model ?? tag.name ?? '__unknown__';
                    if (!allTags[modelKey]) allTags[modelKey] = [];
                    allTags[modelKey].push({ ...tag, server: server.id });
                }
            }
        }
        this.tagsCache.tags = allTags;
        this.tagsCache.updated = Date.now();
    }

    /**
     * Get enhanced model selection recommendations from RAG service
     * This provides intelligent insights but doesn't replace the core selection logic
     */
    async getRAGModelInsights(
        model: string,
        taskType?: string,
        requirements?: {
            maxLatency?: number;
            minThroughput?: number;
            quality?: 'draft' | 'standard' | 'publication';
        }
    ): Promise<Array<{ serverId: string; modelName: string; score: number }> | null> {
        try {
            const ragService = await this.getRAGService();
            if (!ragService) {
                return null;
            }

            return await ragService.getBestModelsForTask(taskType || 'general', requirements || {});
        } catch (error) {
            console.error('[orchestrator] Failed to get RAG model insights:', error);
            return null;
        }
    }

    /**
     * Get usage statistics from RAG service
     */
    async getUsageStatistics(
        timeRange?: {
            startDate: Date;
            endDate: Date;
        },
        filters?: {
            serverId?: string;
            modelName?: string;
            taskType?: string;
            priority?: 'low' | 'normal' | 'high';
        }
    ): Promise<any> {
        try {
            const ragService = await this.getRAGService();
            if (!ragService) {
                return null;
            }

            const defaultTimeRange = {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                endDate: new Date()
            };

            return await ragService.getUsageStatsByTimeRange(timeRange || defaultTimeRange, filters);
        } catch (error) {
            console.error('[orchestrator] Failed to get usage statistics:', error);
            return null;
        }
    }

    /**
     * Shutdown the orchestrator and cleanup resources
     */
    async shutdown(): Promise<void> {
        console.log('[orchestrator] Shutting down...');

        // Set shutdown flag to prevent re-initialization
        this.isShutdown = true;

        // Shutdown RAG service if initialized
        if (this.performanceRAGService) {
            try {
                await this.performanceRAGService.shutdown();
                console.log('[orchestrator] RAG service shut down successfully');
            } catch (error) {
                console.error('[orchestrator] Error shutting down RAG service:', error);
            }
            this.performanceRAGService = null;
        }

        // Clear all maps and queues
        this.inFlight.clear();
        this.failureCooldown.clear();
        this.permanentBan.clear();
        this.requestQueues.clear();
        this.modelMapCache = { map: {}, updated: 0 };
        this.tagsCache = { tags: {}, updated: 0 };

        console.log('[orchestrator] Shutdown complete');
    }

    /**
     * Load all active servers/models from the RAG into orchestrator in-memory cache (hybrid sync)
     */
    async loadActiveServersFromRAG() {
        const ragService = await this.getRAGService();
        if (!ragService) {
            logger.error('[orchestrator] Cannot load active servers from RAG: RAG service unavailable');
            return;
        }
        // Assumes RAG nodes of type 'ai-server' and 'active: true'
        const activeServerNodes = await ragService.findNodes({ type: 'ai-server', active: true });
        this.servers = activeServerNodes.map((node: any) => ({
            id: node.id.replace(/^server:/, ''),
            url: node.content?.attributes?.url || '',
            type: node.content?.attributes?.type || 'ollama',
            healthy: node.content?.attributes?.healthy ?? false,
            lastResponseTime: node.content?.attributes?.lastResponseTime ?? Infinity,
            models: node.content?.attributes?.models || [],
            maxConcurrency: node.content?.attributes?.maxConcurrency
        }));
        logger.info(`[orchestrator] Loaded ${this.servers.length} active servers from RAG`);
    }

    /**
     * Add a new AI server to the registry and RAG (hybrid sync)
     */
    async addServerHybrid(server: Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>) {
        // Prevent duplicate by id or url
        if (this.servers.some(s => s.id === server.id || s.url === server.url)) {
            return;
        }
        // Add to in-memory cache
        this.servers.push({ ...server, healthy: false, lastResponseTime: Infinity, models: [] });
        // Add to RAG as active
        const ragService = await this.getRAGService();
        if (ragService) {
            const nodeId = `server:${server.id}`;
            await ragService.upsertNode(nodeId, {
                id: nodeId,
                type: 'ai-server',
                content: { attributes: { ...server, active: true } },
                active: true
            });
        }
        setTimeout(() => { this.maybeRunBenchmarks(true); }, 1000);
        this.modelMapCache.updated = 0;
        this.tagsCache.updated = 0;
    }

    /**
     * Remove a server by ID and mark as inactive in RAG (hybrid sync)
     */
    async removeServerHybrid(id: string) {
        this.servers = this.servers.filter(s => s.id !== id);
        const ragService = await this.getRAGService();
        if (ragService) {
            const nodeId = `server:${id}`;
            await ragService.updateNode(nodeId, { active: false });
        }
    }

    /**
     * Resync orchestrator cache with RAG (hybrid sync)
     */
    async resyncFromRAG() {
        await this.loadActiveServersFromRAG();
    }
}

// Export BenchmarkManager for use in other services
export { BenchmarkManager };
