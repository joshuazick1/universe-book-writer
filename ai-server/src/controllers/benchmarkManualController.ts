// ai-server/src/controllers/benchmarkManualController.ts
/**
 * Manual Benchmark Controller
 * POST /api/benchmark/manual
 * Allows ad-hoc benchmarking of a model on one or more servers, for one or more benchmark types.
 * Does NOT update persistent RAG/model selection data.
 *
 * Request body:
 *   {
 *     modelId: string,
 *     benchmarkTypes: string[] (BenchmarkType[]),
 *     serverIds?: string[]
 *   }
 *
 * Response:
 *   {
 *     modelId: string,
 *     results: Array<{
 *       serverId: string,
 *       benchmarks: Record<BenchmarkType, QualityBenchmarkScore>
 *     }>
 *   }
 */
import { Router } from 'express';
import { runBenchmarksForServer } from '../../benchmarking/benchmarkRunner.js';
import { BenchmarkType, QualityBenchmarkScore } from '../../../shared/types/aiQualityBenchmark.js';
import { getServersForModel, getServerLatency } from '../../orchestrator/serverDiscovery.js';
import getOrchestratorInstance from '../orchestrator-instance.js';

const router = Router();

// Allow 'latency' as a special test type (not part of BenchmarkType)
const LATENCY_TEST = 'latency';

router.post('/api/benchmark/manual', async (req, res) => {
    try {
        const { modelId, benchmarkTypes, serverIds } = req.body as {
            modelId: string;
            benchmarkTypes: (BenchmarkType | typeof LATENCY_TEST)[];
            serverIds?: string[];
        };
        if (!modelId || !Array.isArray(benchmarkTypes) || benchmarkTypes.length === 0) {
            return res.status(400).json({ error: 'modelId and benchmarkTypes[] are required.' });
        }
        // Discover servers for model
        let servers: string[];
        if (serverIds && serverIds.length > 0) {
            servers = serverIds;
        } else {
            // Use orchestrator logic to pick fastest server for quality tests
            const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
            const healthyServers = orchestrator.getServers().filter((s: any) => s.healthy && s.models.includes(modelId));
            if (!healthyServers || healthyServers.length === 0) {
                return res.status(404).json({ error: 'No servers found for model.' });
            }
            // If latency is requested, run latency on all servers
            if (benchmarkTypes.includes(LATENCY_TEST)) {
                servers = healthyServers.map((s: any) => s.url.replace(/^https?:\/\//, ''));
            } else {
                // Pick fastest server (lowest latency)
                let fastestServer = healthyServers[0];
                let minLatency = Number.POSITIVE_INFINITY;
                for (const s of healthyServers) {
                    try {
                        const latency = await getServerLatency(s.url.replace(/^https?:\/\//, ''), modelId);
                        if (latency < minLatency) {
                            minLatency = latency;
                            fastestServer = s;
                        }
                    } catch { }
                }
                servers = [fastestServer.url.replace(/^https?:\/\//, '')];
            }
        }
        // For each server, run requested tests
        const results: Array<{ serverId: string; latencyMs?: number; benchmarks: Record<BenchmarkType, QualityBenchmarkScore> }> = [];
        for (const serverId of servers) {
            let latencyMs: number | undefined = undefined;
            if (benchmarkTypes.includes(LATENCY_TEST)) {
                try {
                    latencyMs = await getServerLatency(serverId, modelId);
                } catch { }
            }
            // Only pass valid BenchmarkType values to the runner
            const qualityTypes = benchmarkTypes.filter((t): t is BenchmarkType => t !== LATENCY_TEST);
            let benchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;
            if (qualityTypes.length > 0) {
                benchmarks = await runBenchmarksForServer(modelId, serverId, qualityTypes);
            }
            results.push({ serverId, latencyMs, benchmarks });
        }
        return res.json({ modelId, results });
    } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

export default router;
