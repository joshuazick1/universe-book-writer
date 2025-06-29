import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = Router();

/**
 * GET /api/orchestrator/benchmarks
 * Returns benchmark data for all server/model pairs
 */
router.get('/', (_req, res) => {
    const orchestrator = getOrchestratorInstance();
    const servers = orchestrator.getServers();
    const data = [];
    for (const s of servers) {
        for (const m of s.models) {
            const bench = orchestrator.getBenchmark(s.id, m);
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
    const orchestrator = getOrchestratorInstance();
    await orchestrator.runBenchmarks();
    res.status(200).json({ success: true });
});

/**
 * POST /api/orchestrator/benchmarks/server
 * Triggers a benchmark run for a specific server (optionally for a specific model)
 * Body: { serverId: string, model?: string }
 */
router.post('/server', async (req, res) => {
    const orchestrator = getOrchestratorInstance();
    const { serverId, model } = req.body || {};
    const server = orchestrator.getServers().find(s => s.id === serverId);
    if (!server) {
        res.status(404).json({ error: 'Server not found' });
        return;
    }
    if (model) {
        if (!server.models.includes(model)) {
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
