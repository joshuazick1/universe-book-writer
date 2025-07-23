import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * GET /api/orchestrator/model-map
 * Returns a mapping of models to servers and servers to models.
 * Response: { modelToServers: Record<string, string[]>, serverToModels: Record<string, string[]> }
 */
const router = Router();

router.get('/model-map', async (req, res) => {
    const orchestrator = getOrchestratorInstance();
    const servers = orchestrator.getServers();
    // Use cached model map, refresh if expired
    const modelToServers = await orchestrator.getCachedModelMap();
    // Server to models mapping
    const serverToModels: Record<string, string[]> = {};
    for (const s of servers) {
        serverToModels[s.id] = s.models.slice();
    }
    res.status(200).json({ modelToServers, serverToModels });
});

export default router;
