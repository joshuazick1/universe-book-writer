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
import { logger } from '../../../shared/logging/logger.js';


const router = Router();
console.log('[DEBUG] generate.ts router loaded');

// POST /api/generate
router.post('/', (async (req: any, res: any) => {
    const startTime = Date.now();
    logger.info('[LOGGER TEST] /generate endpoint hit');
    console.log(`[TIMING] /generate: request received at ${new Date(startTime).toISOString()}`);
    const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
    const { model, prompt, stream, conversation } = req.body as { model: string; prompt: string; stream?: boolean; conversation?: any[] };
    const afterParseTime = Date.now();
    console.log(`[TIMING] /generate: parsed body in ${afterParseTime - startTime}ms`);
    if (!model || !prompt) {
        logger.error('[generate] Missing model or prompt');
        return res.status(400).json({ error: 'Model and prompt are required.' });
    }
    const healthyServersStart = Date.now();
    const healthyServers = orchestrator.getServers().filter((s: Server) => s.healthy && s.models.includes(model));
    const healthyServersEnd = Date.now();
    console.log(`[TIMING] /generate: healthyServers filter in ${healthyServersEnd - healthyServersStart}ms`);
    if (healthyServers.length === 0) {
        logger.error(`[generate] No healthy servers found for model '${model}'`);
        return res.status(404).json({ error: `model '${model}' not found` });
    }
    try {
        let usedServerId: string | null = null;
        let usedModel: string | null = null;
        let inferenceSuccess = false;
        let responseToSend: any = null;
        let responseStatus: number = 200;
        const inferenceStart = Date.now();
        // Custom failover: try each healthy server once, skip servers that return error responses
        const healthyServers = orchestrator.getServers().filter((s: any) => s.healthy && s.models.includes(model));
        const triedServers = new Set<string>();
        let lastError: any = null;
        for (const server of healthyServers) {
            if (triedServers.has(server.id)) continue;
            triedServers.add(server.id);
            const serverRequestStart = Date.now();
            let resp;
            try {
                resp = await fetch(`${server.url}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, prompt, stream })
                });
            } catch (fetchErr) {
                logger.error(`[generate] fetch threw error: ${fetchErr}`);
                console.log(`[TIMING] /generate: fetch error after ${Date.now() - serverRequestStart}ms`);
                lastError = fetchErr;
                continue;
            }
            const fetchEnd = Date.now();
            console.log(`[TIMING] /generate: fetch to model server took ${fetchEnd - serverRequestStart}ms`);
            const contentType = resp.headers.get('content-type') || '';

            usedServerId = server.id;
            usedModel = model;

            // Streaming
            if (stream && resp.body) {
                const streamStart = Date.now();
                res.setHeader('Content-Type', 'application/x-ndjson');
                let streamedBytes = 0;
                for await (const chunk of resp.body as any) {
                    const chunkStr = chunk instanceof Buffer ? chunk.toString('utf8') : String(chunk);
                    streamedBytes += chunkStr.length;
                    res.write(chunkStr);
                }
                res.end();
                const streamEnd = Date.now();
                console.log(`[TIMING] /generate: streamed ${streamedBytes} bytes in ${streamEnd - streamStart}ms`);
                inferenceSuccess = true;
                break;
            }

            // NDJSON
            if (contentType.includes('application/x-ndjson')) {
                const ndjsonStart = Date.now();
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
                const ndjsonEnd = Date.now();
                console.log(`[TIMING] /generate: NDJSON parse and aggregate took ${ndjsonEnd - ndjsonStart}ms`);
                break;
            }

            // Model not found
            if (resp.status === 404 && contentType.includes('application/json')) {
                const notFoundStart = Date.now();
                let data: any;
                try {
                    data = await resp.json();
                } catch (e) {
                    data = null;
                }
                if (data && typeof data["error"] === 'string' && /model not found/i.test(data["error"])) {
                    responseToSend = { error: `model '${model}' not found` };
                    responseStatus = 404;
                    const notFoundEnd = Date.now();
                    console.log(`[TIMING] /generate: model not found parse took ${notFoundEnd - notFoundStart}ms`);
                    break;
                }
                responseToSend = data;
                responseStatus = 404;
                const notFoundEnd = Date.now();
                console.log(`[TIMING] /generate: model not found parse took ${notFoundEnd - notFoundStart}ms`);
                break;
            }

            // Non-streaming JSON
            if (resp.status === 200 && contentType.includes('application/json')) {
                const jsonStart = Date.now();
                let data: any;
                try {
                    data = await resp.json();
                } catch (e) {
                    data = null;
                }
                // Check for error field indicating server-side failure
                if (data && typeof data["error"] === 'string') {
                    const errorStr = data["error"];
                    if (/llama runner process has terminated|broken pipe|signal: killed|signal: broken pipe/i.test(errorStr)) {
                        logger.warn(`[generate] Server ${server.id} returned error: ${errorStr}. Trying next server.`);
                        lastError = errorStr;
                        continue;
                    }
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
                const jsonEnd = Date.now();
                console.log(`[TIMING] /generate: JSON parse and cleanup took ${jsonEnd - jsonStart}ms`);
                break;
            }

            // Fallback
            const fallbackStart = Date.now();
            let fallbackData: any = null;
            try {
                fallbackData = await resp.json();
            } catch (e) {
                fallbackData = null;
            }
            if (fallbackData && typeof fallbackData["error"] === 'string') {
                const errorStr = fallbackData["error"];
                if (/llama runner process has terminated|broken pipe|signal: killed|signal: broken pipe/i.test(errorStr)) {
                    logger.warn(`[generate] Server ${server.id} returned error: ${errorStr}. Trying next server.`);
                    lastError = errorStr;
                    continue;
                }
            }
            responseToSend = fallbackData || { error: 'Unknown error', status: resp.status };
            responseStatus = resp.status;
            const fallbackEnd = Date.now();
            console.log(`[TIMING] /generate: fallback parse took ${fallbackEnd - fallbackStart}ms`);
            break;
        }
        const inferenceEnd = Date.now();
        console.log(`[TIMING] /generate: total inference time ${inferenceEnd - inferenceStart}ms`);

        // After inference, if successful, track usage as direct
        const usageTrackStart = Date.now();
        if (inferenceSuccess && usedServerId && usedModel) {
            try {
                logger.error(`[generate] Calling trackUsageWithRAG for ${usedModel} on ${usedServerId}`);
                if (typeof orchestrator.trackUsageWithRAG === 'function') {
                    orchestrator.trackUsageWithRAG(usedServerId, usedModel, { source: 'direct' });
                }
            } catch (usageErr) {
                logger.error(`[generate] Failed to track usage: ${usageErr}`);
            }
        }
        const usageTrackEnd = Date.now();
        console.log(`[TIMING] /generate: usage tracking took ${usageTrackEnd - usageTrackStart}ms`);

        // Send response if not already sent (for streaming, response is sent inline)
        const responseSendStart = Date.now();
        if (!res.headersSent && responseToSend !== null) {
            const responseSendEnd = Date.now();
            console.log(`[TIMING] /generate: response send took ${responseSendEnd - responseSendStart}ms`);
            return res.status(responseStatus).json(responseToSend);
        }
    } catch (err) {
        const errorStart = Date.now();
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[generate] Error: ${msg}`);
        console.log('[DEBUG/generate] tryRequestWithFailover threw:', err);
        const errorEnd = Date.now();
        console.log(`[TIMING] /generate: error handler took ${errorEnd - errorStart}ms`);
        if (/model not found/i.test(msg)) return res.status(404).json({ error: `model '${model}' not found` });
        else return res.status(502).json({ error: 'All servers failed', message: msg, model });
    }
}) as any);

// Return plain text 404 for /api/generate/stream (Ollama compatibility)
router.all('/stream', (req, res) => {
    res.status(404).type('text/plain').send('404 page not found');
});

export default router;
