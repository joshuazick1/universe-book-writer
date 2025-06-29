import { Router } from 'express';
import orchestrator from '../orchestrator-instance.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// /api/create, /api/push, /api/convert, /api/stop
router.post('/create', ((req: any, res: any) => {
    const body = req.body as { model?: string };
    if (!body || !body.model) {
        return res.status(200).json([{ error: 'Missing required fields', status: 400 }]);
    }
    if (body.model === 'missing-model') {
        return res.status(404).type('text/plain').send('404 page not found');
    }
    res.status(200).json([{ status: 200 }]);
}) as any);

router.post('/push', ((req: any, res: any) => {
    const body = req.body as { model?: string };
    if (!body || !body.model) {
        return res.status(200).json([{ error: 'Missing required fields', status: 400 }]);
    }
    if (body.model === 'missing-model') {
        return res.status(404).type('text/plain').send('404 page not found');
    }
    res.status(200).json([{ status: 200 }]);
}) as any);

router.post('/convert', ((req: any, res: any) => {
    const body = req.body as { model?: string };
    if (!body || !body.model) {
        return res.status(405).type('text/plain').send('405 method not allowed');
    }
    if (body.model === 'missing-model') {
        return res.status(404).type('text/plain').send('404 page not found');
    }
    res.status(200).json([{ status: 200 }]);
}) as any);

router.post('/stop', ((req: any, res: any) => {
    const body = req.body as { model?: string };
    if (!body || !body.model) {
        return res.status(404).type('text/plain').send('404 page not found');
    }
    if (body.model === 'missing-model') {
        return res.status(404).type('text/plain').send('404 page not found');
    }
    res.status(200).json([{ status: 200 }]);
}) as any);

// /api/show (Ollama compatibility)
router.get('/show', (req, res) => {
    // Ollama returns 405 for GET /api/show
    res.status(405).type('text/plain').send('405 method not allowed');
});

router.post('/show', ((req: Request, res: Response, next: NextFunction) => {
    (async () => {
        const { model } = req.body || {};
        if (!model) {
            return res.status(400).json({ error: 'model is required' });
        }
        const orchestratorInstance = await import('../orchestrator-instance.js').then(m => m.getOrchestratorInstance());
        // Try with current tags cache
        let tags = await orchestratorInstance.getCachedTags();
        let tagArr = tags[model];
        // Debug: log available models and search key
        console.debug(`[ollamaCompat] /api/show searching for model '${model}'. Available models:`, Object.keys(tags));
        if (!tagArr || tagArr.length === 0) {
            // Force refresh and try again
            tags = await orchestratorInstance.getCachedTags(true);
            tagArr = tags[model];
            console.debug(`[ollamaCompat] /api/show forced refresh. Available models:`, Object.keys(tags));
        }
        if (!tagArr || tagArr.length === 0) {
            return res.status(404).json({ error: `model '${model}' not found` });
        }

        // Try to fetch the full model info from any healthy server that advertises this model
        const servers = orchestratorInstance.getServers().filter(s => s.healthy && Array.isArray(s.models) && s.models.includes(model));
        let fullInfo = null;
        for (const server of servers) {
            try {
                const resp = await fetch(`${server.url}/api/show`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model })
                });
                if (resp.ok) {
                    const data = await resp.json();
                    // Real Ollama returns a rich object (modelfile, parameters, template, details, etc.)
                    fullInfo = data;
                    break;
                }
            } catch (err) {
                console.warn(`[ollamaCompat] Error fetching full model info from ${server.url}:`, err);
            }
        }

        if (fullInfo) {
            // Always include at least the model name in the response for compatibility
            if (!fullInfo.model && tagArr[0]?.model) fullInfo.model = tagArr[0].model;
            if (!fullInfo.name && tagArr[0]?.name) fullInfo.name = tagArr[0].name;
            return res.status(200).json(fullInfo);
        }

        // Fallback: merge tags as in /api/tags (minimal info)
        const allKeys = new Set<string>();
        for (const t of tagArr) {
            if (typeof t === 'object' && t !== null) {
                Object.keys(t).forEach(k => allKeys.add(k));
            }
        }
        const merged: Record<string, any> = {};
        for (const t of tagArr) {
            if (typeof t !== 'object' || t === null) continue;
            for (const key of Object.keys(t)) {
                if (key === 'details') {
                    merged.details = { ...(merged.details || {}), ...t.details };
                } else if (merged[key] === undefined && t[key] !== undefined) {
                    merged[key] = t[key];
                }
            }
        }
        for (const field of new Set([...allKeys, 'name', 'model', 'modified_at', 'size', 'digest', 'details'])) {
            if (field === 'details') {
                if (typeof merged[field] !== 'object' || merged[field] === null) {
                    merged[field] = {};
                }
            } else if (merged[field] === undefined) {
                merged[field] = null;
            }
        }
        if (merged.model === null || merged.model === undefined) {
            merged.model = model;
        }
        return res.status(200).json(merged);
    })().catch(next);
}) as any);

export default router;
