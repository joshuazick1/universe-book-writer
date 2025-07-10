import type { Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * Add a new server (with config).
 * @route POST /api/orchestrator/servers/add
 */
export const addServer = (req: Request, res: Response) => {
    const { id, url, type, maxConcurrency } = req.body || {};
    if (!id || !url || !type) {
        return res.status(400).json({ error: 'id, url, and type are required' });
    }
    const orchestrator = getOrchestratorInstance();
    if (orchestrator.getServers().some(s => s.id === id)) {
        return res.status(409).json({ error: `Server '${id}' already exists` });
    }
    orchestrator.addServer({ id, url, type, maxConcurrency });
    return res.status(200).json({ success: true, id, url, type, maxConcurrency });
};

/**
 * Remove a server.
 * @route DELETE /api/orchestrator/servers/:id
 */
export const removeServer = (req: Request, res: Response) => {
    const { id } = req.params;
    const orchestrator = getOrchestratorInstance();
    if (!orchestrator.getServers().some(s => s.id === id)) {
        return res.status(404).json({ error: `Server '${id}' not found` });
    }
    orchestrator.removeServer(id);
    return res.status(200).json({ success: true, id });
};

/**
 * Update server config (concurrency, health, etc.).
 * @route PATCH /api/orchestrator/servers/:id
 */
export const updateServer = (req: Request, res: Response) => {
    const { id } = req.params;
    const { maxConcurrency } = req.body || {};
    const orchestrator = getOrchestratorInstance();
    const server = orchestrator.getServers().find(s => s.id === id);
    if (!server) return res.status(404).json({ error: `Server '${id}' not found` });
    if (typeof maxConcurrency === 'number') server.maxConcurrency = maxConcurrency;
    return res.status(200).json({ success: true, id, maxConcurrency });
};

/**
 * Get model-to-servers and server-to-models mapping.
 * @route GET /api/orchestrator/model-map
 */
export const getModelMap = (req: Request, res: Response) => {
    const orchestrator = getOrchestratorInstance();
    const servers = orchestrator.getServers();
    const modelToServers: Record<string, string[]> = {};
    const serverToModels: Record<string, string[]> = {};
    for (const server of servers) {
        serverToModels[server.id] = [...server.models];
        for (const model of server.models) {
            if (!modelToServers[model]) {
                modelToServers[model] = [];
            }
            modelToServers[model].push(server.id);
        }
    }
    return res.json({
        modelToServers,
        serverToModels,
        totalModels: Object.keys(modelToServers).length,
        totalServers: servers.length,
        totalCombinations: Object.values(serverToModels).reduce((sum, models) => sum + models.length, 0)
    });
};
