


import { Router } from 'express';
import type { Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * Orchestrator API routes for model and server management.
 * Implements endpoints for adding/removing/uploading models, managing servers, and listing model versions.
 * All logic is delegated to the orchestrator instance and application layer per CLEAN_BACKEND_ARCHITECTURE_PLAN.md.
 *
 * Endpoints:
 *   POST   /api/orchestrator/models/add      - Add a model to a specific server
 *   DELETE /api/orchestrator/models/:model   - Remove a model from a specific server or all servers
 *   POST   /api/orchestrator/models/upload   - Upload a new model (with versioning support)
 *   GET    /api/orchestrator/models/versions - List all versions of a model
 *   POST   /api/orchestrator/servers/add     - Add a new server (with config)
 *   DELETE /api/orchestrator/servers/:id     - Remove a server
 *   PATCH  /api/orchestrator/servers/:id     - Update server config (concurrency, health, etc.)
 */

const router = Router();


// POST /api/orchestrator/models/add-fleet
/**
 * Add a model to all servers in the fleet.
 * Request body: { model: string }
 * Response: { success: true, model, results: Array<{ serverId, status, error? }> }
 */
router.post('/models/add-fleet', (req: Request, res: Response) => {
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
});

// POST /api/orchestrator/models/add
router.post('/models/add', (req: Request, res: Response) => {
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
});

// DELETE /api/orchestrator/models/:model
router.delete('/models/:model', (req: Request, res: Response) => {
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
});

// POST /api/orchestrator/models/upload
router.post('/models/upload', (req: Request, res: Response) => {
    const { serverId, model, version } = req.body || {};
    if (!serverId || !model || !version) {
        return res.status(400).json({ error: 'serverId, model, and version are required' });
    }
    // TODO: handle file upload (multipart/form-data)
    // For now, just simulate success
    return res.status(200).json({ success: true, serverId, model, version });
});

// GET /api/orchestrator/models/versions
router.get('/models/versions', (req: Request, res: Response) => {
    const { model } = req.query;
    if (!model) return res.status(400).json({ error: 'model is required' });
    // Simulate version lookup (stub)
    // In a real system, this would query a model registry or metadata store
    return res.status(200).json({ model, versions: ['1.0.0', '1.1.0', '2.0.0'] });
});

// POST /api/orchestrator/servers/add
router.post('/servers/add', (req: Request, res: Response) => {
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
});

// DELETE /api/orchestrator/servers/:id
router.delete('/servers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const orchestrator = getOrchestratorInstance();
    if (!orchestrator.getServers().some(s => s.id === id)) {
        return res.status(404).json({ error: `Server '${id}' not found` });
    }
    orchestrator.removeServer(id);
    return res.status(200).json({ success: true, id });
});

// PATCH /api/orchestrator/servers/:id
router.patch('/servers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { maxConcurrency } = req.body || {};
    const orchestrator = getOrchestratorInstance();
    const server = orchestrator.getServers().find(s => s.id === id);
    if (!server) return res.status(404).json({ error: `Server '${id}' not found` });
    if (typeof maxConcurrency === 'number') server.maxConcurrency = maxConcurrency;
    return res.status(200).json({ success: true, id, maxConcurrency });
});

export default router;
