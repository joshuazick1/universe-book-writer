import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';
import type { AIServer } from '../orchestrator.js';

const router = Router();

/**
 * GET /api/orchestrator/benchmarks
 * Returns benchmark data for all server/model pairs
 */
router.get('/', (_req, res) => {
    const orchestrator = res.req?.app?.locals?.orchestrator || getOrchestratorInstance();
    // Targeted debug output
    // eslint-disable-next-line no-console
    console.log('[benchmarks] GET /api/orchestrator/benchmarks');
    const servers = orchestrator.getServers();
    // eslint-disable-next-line no-console
    console.log('[benchmarks] servers:', servers);
    const data = [];
    for (const s of servers) {
        for (const m of s.models) {
            const bench = orchestrator.getBenchmark(s.id, m);
            // eslint-disable-next-line no-console
            console.log('[benchmarks] server:', s.id, 'model:', m, 'bench:', bench);
            data.push({
                serverId: s.id,
                model: m,
                benchmark: bench || null,
                inFlight: orchestrator.getInFlight(s.id, m)
            });
        }
    }
    res.status(200).json({ benchmarks: data });
});

/**
 * POST /api/orchestrator/benchmarks/run
 * Triggers a benchmark run for all servers/models
 */
router.post('/run', async (_req, res) => {
    const orchestrator = res.req?.app?.locals?.orchestrator || getOrchestratorInstance();
    // eslint-disable-next-line no-console
    console.log('[benchmarks] POST /api/orchestrator/benchmarks/run');
    await orchestrator.runBenchmarks();
    res.status(200).json({ success: true });
});

/**
 * POST /api/orchestrator/benchmarks/server
 * Triggers a benchmark run for a specific server (optionally for a specific model)
 * Body: { serverId: string, model?: string }
 */
router.post('/server', async (req, res) => {
    const orchestrator = res.req?.app?.locals?.orchestrator || getOrchestratorInstance();
    const { serverId, model } = req.body || {};
    // eslint-disable-next-line no-console
    console.log('[benchmarks] POST /api/orchestrator/benchmarks/server', { serverId, model });
    const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId);
    if (!server) {
        // eslint-disable-next-line no-console
        console.log('[benchmarks] server not found:', serverId);
        res.status(404).json({ error: 'Server not found' });
        return;
    }
    if (model) {
        if (!server.models.includes(model)) {
            // eslint-disable-next-line no-console
            console.log('[benchmarks] model not found on server:', model);
            res.status(404).json({ error: 'Model not found on server' });
            return;
        }
        await orchestrator.benchmarkServerModel(server, model);
        res.status(200).json({ success: true, serverId, model });
        return;
    } else {
        for (const m of server.models) {
            await orchestrator.benchmarkServerModel(server, m);
        }
        res.status(200).json({ success: true, serverId });
        return;
    }
});

export default router;
