import { Router } from 'express';
import fetch from 'node-fetch';
import getOrchestratorInstance from '../orchestrator-instance.js';
import { logDebug, logError } from '../logger.js';

const router = Router();

// POST /api/generate
router.post('/', (async (req: any, res: any) => {
    const { model, prompt, stream, conversation } = req.body as { model: string; prompt: string; stream?: boolean; conversation?: any[] };
    logDebug(`[generate] Incoming request: model=${model}, prompt=${prompt}, stream=${stream}`);
    if (conversation) {
        logDebug(`[generate] Conversation array received (${Array.isArray(conversation) ? conversation.length : 0} messages):`);
        try {
            logDebug(`[generate] Conversation sample: ${JSON.stringify(conversation.slice(-3), null, 2)}`);
        } catch (e) {
            logError(`[generate] Error stringifying conversation: ${e}`);
        }
    } else {
        logDebug('[generate] No conversation array received');
    }
    if (!model || !prompt) {
        logDebug('[generate] Missing model or prompt');
        return res.status(400).json({ error: 'Model and prompt are required.' });
    }
    const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
    const healthyServers = orchestrator.getServers().filter((s: any) => s.healthy && s.models.includes(model));
    logDebug(`[generate] Healthy servers for model '${model}': ${JSON.stringify(healthyServers.map(s => s.url))}`);
    if (healthyServers.length === 0) {
        logDebug(`[generate] No healthy servers found for model '${model}'`);
        return res.status(404).json({ error: `model '${model}' not found` });
    }
    try {
        await orchestrator.tryRequestWithFailover(model, async (server: any) => {
            logDebug(`[generate] Sending request to server: ${server.url}`);
            const resp = await fetch(`${server.url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream })
            });
            logDebug(`[generate] Response status from ${server.url}: ${resp.status}`);
            if (stream) {
                if (!resp.body) throw new Error('No stream body');
                res.setHeader('Content-Type', 'application/x-ndjson');
                let buffer = '';
                let chunkCount = 0;
                let totalBytes = 0;
                let firstLine = '';
                let lastLine = '';
                for await (const chunk of resp.body as any) {
                    const chunkStr = chunk instanceof Buffer ? chunk.toString('utf8') : String(chunk);
                    totalBytes += chunkStr.length;
                    buffer += chunkStr;
                    let newlineIdx;
                    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIdx);
                        buffer = buffer.slice(newlineIdx + 1);
                        if (line.trim().length === 0) continue;
                        chunkCount++;
                        if (chunkCount === 1) firstLine = line;
                        lastLine = line;
                        logDebug(`[generate] [stream] NDJSON line #${chunkCount}: ${line.slice(0, 200)}`);
                        res.write(line + '\n');
                    }
                }
                // Write any remaining buffered line (if not empty)
                if (buffer.trim().length > 0) {
                    chunkCount++;
                    if (chunkCount === 1) firstLine = buffer;
                    lastLine = buffer;
                    logDebug(`[generate] [stream] NDJSON line #${chunkCount}: ${buffer.slice(0, 200)}`);
                    res.write(buffer + '\n');
                }
                res.end();
                logDebug(`[generate] Streamed response complete for ${server.url} (lines: ${chunkCount}, bytes: ${totalBytes})`);
                logDebug(`[generate] First line: ${firstLine.slice(0, 200)}`);
                logDebug(`[generate] Last line: ${lastLine.slice(0, 200)}`);
                return true;
            } else {
                const contentType = resp.headers.get('content-type') || '';
                if (contentType.includes('application/x-ndjson')) {
                    const text = await resp.text();
                    logDebug(`[generate] NDJSON response from ${server.url}: ${text.slice(0, 200)}...`);
                    const lines = text.split('\n').filter(Boolean);
                    let fullResponse = '';
                    let lastObj = null;
                    for (const line of lines) {
                        try {
                            const obj = JSON.parse(line);
                            if (typeof obj.response === 'string') fullResponse += obj.response;
                            if (obj.done) lastObj = obj;
                        } catch { }
                    }
                    // Return a single object with the full concatenated response
                    res.status(resp.status).json({
                        model,
                        response: fullResponse,
                        done: true,
                        done_reason: lastObj?.done_reason || 'stop',
                        context: lastObj?.context,
                    });
                } else {
                    const data = await resp.json();
                    logDebug(`[generate] JSON response from ${server.url}: ${JSON.stringify(data).slice(0, 200)}...`);
                    if (data && typeof (data as any).error === 'string' && /model not found/i.test((data as any).error)) {
                        res.status(404).json({ error: `model '${model}' not found` });
                    } else {
                        if (data && typeof data === 'object') {
                            delete (data as any).created_at;
                            delete (data as any).total_duration;
                            delete (data as any).load_duration;
                            delete (data as any).eval_duration;
                            delete (data as any).prompt_eval_duration;
                        }
                        res.status(resp.status).json(data);
                    }
                }
                return true;
            }
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`[generate] Error: ${msg}`);
        if (/model not found/i.test(msg)) res.status(404).json({ error: `model '${model}' not found` });
        else res.status(502).json({ error: 'All servers failed', message: msg, model });
    }
}) as any);

// Return plain text 404 for /api/generate/stream (Ollama compatibility)
router.all('/stream', (req, res) => {
    res.status(404).type('text/plain').send('404 page not found');
});

export default router;
