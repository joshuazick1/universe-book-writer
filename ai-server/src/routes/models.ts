import { Router } from 'express';
import orchestrator from '../orchestrator-instance.js';

const router = Router();

// GET /api/models (Ollama returns 404 plain text)
router.get('/', (_req, res) => {
    res.status(404).type('text/plain').send('404 page not found');
});

// GET /api/models/:model (detailed info, aggregated)
router.get('/:model', (async (req: any, res: any) => {
    const { model } = req.params as { model: string };
    if (!model) return res.status(400).json({ error: 'Model name is required.' });
    const servers = orchestrator.getServers().filter(s => s.healthy && s.models.includes(model));
    if (servers.length === 0) return res.status(404).json({ error: `model '${model}' not found` });
    const allModelInfo: any = {};
    for (const server of servers) {
        try {
            const resp = await fetch(`${server.url}/api/models/${encodeURIComponent(model)}`);
            if (resp.ok) {
                const data = await resp.json();
                for (const key of Object.keys(data)) {
                    if (!allModelInfo[key]) allModelInfo[key] = data[key];
                    else if (Array.isArray(allModelInfo[key]) && Array.isArray(data[key])) {
                        allModelInfo[key] = [...new Set([...allModelInfo[key], ...data[key]])];
                    }
                }
            }
        } catch (err) {
            process.stderr.write(`ERROR [/api/models/:model] fetch from ${server.url} error: ${err instanceof Error ? err.message : String(err)}\n`);
        }
    }
    res.json(allModelInfo);
}) as any);

export default router;
