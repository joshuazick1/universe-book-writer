import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = Router();

router.get('/', (_req, res) => {
    const orchestrator = getOrchestratorInstance();
    res.status(200).json({
        servers: orchestrator.getServers().map(s => ({
            id: s.id,
            url: s.url,
            type: s.type
        })),
        cooldownMs: 1000
    });
});

router.post('/', async (req, res) => {
    const orchestrator = getOrchestratorInstance();
    let { servers, cooldownMs } = req.body || {};
    if (!Array.isArray(servers)) servers = [];
    orchestrator.getServers().splice(0, orchestrator.getServers().length);
    for (const s of servers) {
        if (s && s.id && s.url && s.type) {
            orchestrator.addServer({ id: s.id, url: s.url, type: s.type });
        }
    }
    // Trigger model/health refresh after config
    try {
        await orchestrator.updateAllStatus();
    } catch (err) {
        // Handle error if needed
    }
    res.status(200).json({
        success: true,
        servers: orchestrator.getServers().map(s => ({ id: s.id, url: s.url, type: s.type })),
        cooldownMs: cooldownMs ?? 1000
    });
});

export default router;
