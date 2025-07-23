import { Router } from 'express';
import getOrchestratorInstance from '../orchestrator-instance.js';

const router = Router();

router.get('/', (_req, res) => {
    const orchestrator = getOrchestratorInstance();
    res.status(200).json({
        servers: orchestrator.getServers().map(s => ({
            id: s.id,
            url: s.url,
            type: s.type
        }))
    });
});

router.post('/', ((req: any, res: any) => {
    const { servers } = req.body as { servers: any[] };
    if (!Array.isArray(servers)) {
        return res.status(400).json({ error: 'servers must be an array' });
    }
    const orchestrator = getOrchestratorInstance();
    // Remove all servers (reset)
    const currentServers = orchestrator.getServers();
    while (currentServers.length > 0) currentServers.pop();
    for (const s of servers) {
        if (s && s.id && s.url && s.type) {
            orchestrator.addServer({ id: s.id, url: s.url, type: s.type });
        }
    }
    res.status(200).json({ success: true, servers: orchestrator.getServers().map(s => ({ id: s.id, url: s.url, type: s.type })) });
}) as any);

export default router;
