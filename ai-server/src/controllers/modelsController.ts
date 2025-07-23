import type { Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * Add a model to all servers in the fleet.
 * @route POST /api/orchestrator/models/add-fleet
 */
export const addModelToFleet = (req: Request, res: Response) => {
    const { model } = req.body || {};
    if (!model) {
        return res.status(400).json({ error: 'model is required' });
    }
    const orchestrator = getOrchestratorInstance();
    const results = [];
    for (const server of orchestrator.getServers()) {
        if (server.models.includes(model)) {
            results.push({ serverId: server.id, status: 'exists' });
        } else {
            try {
                server.models.push(model);
                results.push({ serverId: server.id, status: 'added' });
            } catch (err) {
                results.push({ serverId: server.id, status: 'error', error: (err instanceof Error ? err.message : String(err)) });
            }
        }
    }
    return res.status(200).json({ success: true, model, results });
};

/**
 * Add a model to a specific server.
 * @route POST /api/orchestrator/models/add
 */
export const addModelToServer = (req: Request, res: Response) => {
    const { serverId, model } = req.body || {};
    if (!serverId || !model) {
        return res.status(400).json({ error: 'serverId and model are required' });
    }
    const orchestrator = getOrchestratorInstance();
    const server = orchestrator.getServers().find(s => s.id === serverId);
    if (!server) {
        return res.status(404).json({ error: `Server '${serverId}' not found` });
    }
    if (server.models.includes(model)) {
        return res.status(409).json({ error: `Model '${model}' already exists on server '${serverId}'` });
    }
    server.models.push(model);
    return res.status(200).json({ success: true, serverId, model });
};

/**
 * Remove a model from a specific server or all servers.
 * @route DELETE /api/orchestrator/models/:model
 */
export const removeModel = (req: Request, res: Response) => {
    const { model } = req.params;
    const { serverId } = req.query;
    const orchestrator = getOrchestratorInstance();
    let found = false;
    if (serverId) {
        const server = orchestrator.getServers().find(s => s.id === serverId);
        if (!server) return res.status(404).json({ error: `Server '${serverId}' not found` });
        const idx = server.models.indexOf(model);
        if (idx !== -1) {
            server.models.splice(idx, 1);
            found = true;
        }
    } else {
        for (const server of orchestrator.getServers()) {
            const idx = server.models.indexOf(model);
            if (idx !== -1) {
                server.models.splice(idx, 1);
                found = true;
            }
        }
    }
    if (!found) return res.status(404).json({ error: `Model '${model}' not found on any server` });
    return res.status(200).json({ success: true, model });
};

/**
 * Upload a new model (with versioning support).
 * @route POST /api/orchestrator/models/upload
 */
export const uploadModel = (req: Request, res: Response) => {
    const { serverId, model, version } = req.body || {};
    if (!serverId || !model || !version) {
        return res.status(400).json({ error: 'serverId, model, and version are required' });
    }
    // TODO: handle file upload (multipart/form-data)
    // For now, just simulate success
    return res.status(200).json({ success: true, serverId, model, version });
};

/**
 * List all versions of a model.
 * @route GET /api/orchestrator/models/versions
 */
export const listModelVersions = (req: Request, res: Response) => {
    const { model } = req.query;
    if (!model) return res.status(400).json({ error: 'model is required' });
    // Simulate version lookup (stub)
    // In a real system, this would query a model registry or metadata store
    return res.status(200).json({ model, versions: ['1.0.0', '1.1.0', '2.0.0'] });
};
