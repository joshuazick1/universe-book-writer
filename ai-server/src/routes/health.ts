import { getOrchestratorInstance } from '../orchestrator-instance.js';
import { Router } from 'express';
const router = Router();

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/orchestrator/health
 * Returns health and status data for all servers
 */
router.get('/orchestrator/health', (_req, res) => {
    const orchestrator = getOrchestratorInstance();
    const servers = orchestrator.getServers();
    const data = servers.map(s => ({
        id: s.id,
        url: s.url,
        type: s.type,
        healthy: s.healthy,
        lastResponseTime: s.lastResponseTime,
        models: s.models,
        maxConcurrency: s.maxConcurrency ?? 4,
        avgLatency: orchestrator.getServerAvgLatency(s),
        initialAvgLatency: orchestrator.getInitialAvgResponseTime(s.id)
    }));
    res.status(200).json({ servers: data });
});

export default router;
