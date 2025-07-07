/**
 * Represents an orchestrator server instance for model generation.
 */
interface Server {
    healthy: boolean;
    models: string[];
    url: string;
    // Add other properties as needed
}

import getOrchestratorInstance from '../orchestrator-instance.js';
import { Router } from 'express';
import fetch from 'node-fetch';
import { logDebug, logError } from '../logger.js';


const router = Router();

// POST /api/generate
router.post('/', (async (req: any, res: any) => {
    // --- DEBUG LOGGER TEST ---
    try {
        const { logInfo } = await import('../logger.js');
        logInfo('[LOGGER TEST] /generate endpoint hit');
    } catch (e) {
        // ignore
    }
    // Cleaned up debug output. Add targeted debug for usage tracking only.
    const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
    const { model, prompt, stream, conversation } = req.body as { model: string; prompt: string; stream?: boolean; conversation?: any[] };
    // Only log errors and usage tracking
    if (!model || !prompt) {
        logError('[generate] Missing model or prompt');
        return res.status(400).json({ error: 'Model and prompt are required.' });
    }
    const healthyServers = orchestrator.getServers().filter((s: Server) => s.healthy && s.models.includes(model));
    if (healthyServers.length === 0) {
        logError(`[generate] No healthy servers found for model '${model}'`);
        return res.status(404).json({ error: `model '${model}' not found` });
    }
    try {
        let usedServerId: string | null = null;
        let usedModel: string | null = null;
        let inferenceSuccess = false;
        let responseToSend: any = null;
        let responseStatus: number = 200;
        await orchestrator.tryRequestWithFailover(model, async (server: any) => {
            let resp;
            try {
                resp = await fetch(`${server.url}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, prompt, stream })
                });
            } catch (fetchErr) {
                logError(`[generate] fetch threw error: ${fetchErr}`);
                throw fetchErr;
            }
            const contentType = resp.headers.get('content-type') || '';

            usedServerId = server.id;
            usedModel = model;

            // Streaming
            if (stream && resp.body) {
                res.setHeader('Content-Type', 'application/x-ndjson');
                for await (const chunk of resp.body as any) {
                    const chunkStr = chunk instanceof Buffer ? chunk.toString('utf8') : String(chunk);
                    res.write(chunkStr);
                }
                res.end();
                inferenceSuccess = true;
                return;
            }

            // NDJSON
            if (contentType.includes('application/x-ndjson')) {
                const text = await resp.text();
                const lines = text.split('\n').filter(Boolean);
                let fullResponse = '';
                let lastObj = null;
                for (const line of lines) {
                    try {
                        const obj = JSON.parse(line);
                        if (typeof obj.response === 'string') fullResponse += obj.response;
                        if (obj.done) lastObj = obj;
                    } catch (e) { }
                }
                responseToSend = {
                    model,
                    response: fullResponse,
                    done: true,
                    done_reason: lastObj?.done_reason || 'stop',
                    context: lastObj?.context,
                };
                responseStatus = resp.status;
                inferenceSuccess = true;
                return;
            }

            // Model not found
            if (resp.status === 404 && contentType.includes('application/json')) {
                let data: any;
                try {
                    data = await resp.json();
                } catch (e) {
                    data = null;
                }
                if (data && typeof data["error"] === 'string' && /model not found/i.test(data["error"])) {
                    responseToSend = { error: `model '${model}' not found` };
                    responseStatus = 404;
                    return;
                }
                responseToSend = data;
                responseStatus = 404;
                return;
            }

            // Non-streaming JSON
            if (resp.status === 200 && contentType.includes('application/json')) {
                let data: any;
                try {
                    data = await resp.json();
                } catch (e) {
                    data = null;
                }
                if (data && typeof data === 'object') {
                    delete data["created_at"];
                    delete data["total_duration"];
                    delete data["load_duration"];
                    delete data["eval_duration"];
                    delete data["prompt_eval_duration"];
                    delete data["tokens"];
                    delete data["token_ids"];
                    delete data["internal_state"];
                }
                responseToSend = data;
                responseStatus = 200;
                inferenceSuccess = true;
                return;
            }

            // Fallback
            let fallbackData: any = null;
            try {
                fallbackData = await resp.json();
            } catch (e) {
                fallbackData = null;
            }
            responseToSend = fallbackData || { error: 'Unknown error', status: resp.status };
            responseStatus = resp.status;
            return;
        });

        // After inference, if successful, track usage as direct
        if (inferenceSuccess && usedServerId && usedModel) {
            try {
                logError(`[generate] Calling trackUsageWithRAG for ${usedModel} on ${usedServerId}`);
                if (typeof orchestrator.trackUsageWithRAG === 'function') {
                    orchestrator.trackUsageWithRAG(usedServerId, usedModel, { source: 'direct' });
                }
            } catch (usageErr) {
                logError(`[generate] Failed to track usage: ${usageErr}`);
            }
        }

        // Send response if not already sent (for streaming, response is sent inline)
        if (!res.headersSent && responseToSend !== null) {
            return res.status(responseStatus).json(responseToSend);
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`[generate] Error: ${msg}`);
        console.log('[DEBUG/generate] tryRequestWithFailover threw:', err);
        if (/model not found/i.test(msg)) return res.status(404).json({ error: `model '${model}' not found` });
        else return res.status(502).json({ error: 'All servers failed', message: msg, model });
    }
}) as any);

// Return plain text 404 for /api/generate/stream (Ollama compatibility)
router.all('/stream', (req, res) => {
    res.status(404).type('text/plain').send('404 page not found');
});

export default router;
