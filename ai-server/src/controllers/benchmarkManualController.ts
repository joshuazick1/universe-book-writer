// ai-server/src/controllers/benchmarkManualController.ts
/**
 * Manual Benchmark Controller
 * POST /api/benchmark/manual
 * Allows ad-hoc benchmarking of a model on one or more servers, for one or more benchmark types.
 * Does NOT update persistent RAG/model selection data.
 *
 * NOTE: Manual runs are intentionally designed to NOT write to the RAG or persistent ai-model nodes.
 * All results are returned in the response only and not persisted for model selection or analytics.
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
import { Router, Request, Response } from 'express';
import { orchestrateEnhancedBenchmarks } from '../../benchmarking/orchestrateEnhancedBenchmarks.js';
import { BenchmarkType, QualityBenchmarkScore } from '../../../shared/types/aiQualityBenchmark.js';
import { getServersForModel, markServerUnhealthy } from '../../orchestrator/serverDiscovery.js';
import getOrchestratorInstance from '../orchestrator-instance.js';
import { ensureNode, getNode } from '../../../shared/node/nodeService.js';

const router = Router();

// Allow 'latency' as a special test type (not part of BenchmarkType)
const LATENCY_TEST = 'latency';

router.post('/api/benchmark/manual', async (req: Request, res: Response): Promise<void> => {
    try {
        const { modelId, benchmarkTypes, warmupSlotsPerServer, serverIds } = req.body as {
            modelId: string;
            benchmarkTypes: BenchmarkType[];
            warmupSlotsPerServer?: number;
            serverIds?: string[];
        };
        // Use orchestrateEnhancedBenchmarks for full-featured, parallel, aggregated benchmarking
        const results = await orchestrateEnhancedBenchmarks(
            modelId,
            benchmarkTypes,
            warmupSlotsPerServer ?? 3,
            serverIds
        );
        res.json({ modelId, results });
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});


// POST /api/benchmark/all-models
// Runs selected benchmarks across all discovered models (healthy servers)
router.post('/api/benchmark/all-models', async (req: Request, res: Response): Promise<void> => {
    try {
        const { benchmarkTypes, warmupSlotsPerServer } = req.body as {
            benchmarkTypes: BenchmarkType[];
            warmupSlotsPerServer?: number;
        };
        const orchestrator = getOrchestratorInstance();
        const allModels = orchestrator.getAllModels();
        const results: any[] = [];
        // Validate model availability on at least one healthy server before benchmarking
        await Promise.all(
            allModels.map(async (modelId) => {
                const servers = orchestrator.getServers().filter(s => s.healthy && s.models.includes(modelId));
                if (servers.length === 0) {
                    results.push({ modelId, error: 'Model not available on any healthy server.' });
                    return;
                }
                try {
                    const modelResults = await orchestrateEnhancedBenchmarks(
                        modelId,
                        benchmarkTypes,
                        warmupSlotsPerServer ?? 3
                    );
                    results.push({ modelId, results: modelResults });
                } catch (err) {
                    results.push({ modelId, error: err instanceof Error ? err.message : String(err) });
                }
            })
        );
        res.json({ results });
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// POST /api/benchmark/server-models/:serverId
// Runs selected benchmarks on all models of a particular server
router.post('/api/benchmark/server-models/:serverId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { benchmarkTypes, warmupSlotsPerServer } = req.body as {
            benchmarkTypes: BenchmarkType[];
            warmupSlotsPerServer?: number;
        };
        const { serverId } = req.params;
        const orchestrator = getOrchestratorInstance();
        const server = orchestrator.getServers().find(s => s.id === serverId);
        if (!server) {
            res.status(404).json({ error: `Server not found: ${serverId}` });
            return;
        }
        if (!server.healthy) {
            res.status(400).json({ error: `Server ${serverId} is not healthy.` });
            return;
        }
        // Use orchestrateEnhancedBenchmarks, overriding servers to just the selected one
        const results: any[] = [];
        await Promise.all(
            server.models.map(async (modelId) => {
                // Validate model availability on the server
                if (!server.models.includes(modelId)) {
                    results.push({ modelId, error: 'Model not available on this server.' });
                    return;
                }
                try {
                    const modelResults = await orchestrateEnhancedBenchmarks(
                        modelId,
                        benchmarkTypes,
                        warmupSlotsPerServer ?? 3,
                        [serverId]
                    );
                    results.push({ modelId, results: modelResults });
                } catch (err) {
                    results.push({ modelId, error: err instanceof Error ? err.message : String(err) });
                }
            })
        );
        res.json({ serverId, results });
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

export default router;
