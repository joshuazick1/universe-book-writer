import type { Request, Response, NextFunction } from 'express';
import type { AIServer } from '../../orchestrator.js';
import {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator
} from '../shared/index.js';

/**
 * POST /api/embed
 * Generate vector embeddings for a given prompt using an Ollama embedding model.
 * Uses a race condition approach - sends requests to all available servers and returns the first valid response.
 *
 * Request body: { model: string, prompt: string }
 * Response: { embedding: number[] }
 *
 * @example
 * // Request
 * { "model": "nomic-embed-text", "prompt": "text to embed" }
 * // Response
 * { "embedding": [0.1, 0.2, 0.3, ...] }
 */
export async function embedHandlerParallel(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    console.log('[embed-parallel] Starting parallel embedding request at', new Date().toISOString());

    try {
        const { model, prompt } = req.body;
        console.log('[embed-parallel] Request body:', {
            model,
            promptLength: prompt?.length || 0,
            hasModel: !!model,
            hasPrompt: !!prompt
        });

        const validation = validateRequiredFields(req.body, ['model', 'prompt']);
        console.log('[embed-parallel] Validation result:', validation);

        if (!validation.isValid) {
            console.log('[embed-parallel] Validation failed, sending 400 error');
            sendErrorResponse(
                res,
                400,
                `Missing required fields: ${validation.missing.join(', ')}`,
                'invalid_request_error'
            );
            return;
        }

        console.log('[embed-parallel] Getting orchestrator...');
        const orchestrator = await getOrchestrator(req);
        console.log('[embed-parallel] Got orchestrator:', {
            hasOrchestrator: !!orchestrator,
            orchestratorType: orchestrator?.constructor?.name || 'unknown'
        });

        // Get all healthy servers that have the model
        const candidates = orchestrator.servers.filter((s: AIServer) =>
            s.healthy &&
            s.models.includes(model) &&
            !orchestrator.isInCooldown(s.id, model) &&
            !orchestrator.permanentBan.has(`${s.id}:${model}`)
        );

        console.log('[embed-parallel] Found', candidates.length, 'candidate servers for parallel requests');
        console.log('[embed-parallel] Candidates:', candidates.map((s: AIServer) => ({
            id: s.id,
            url: s.url,
            healthy: s.healthy
        })));

        if (candidates.length === 0) {
            console.log('[embed-parallel] No healthy servers available');
            sendErrorResponse(
                res,
                503,
                'No healthy servers available for embedding model',
                'service_unavailable'
            );
            return;
        }

        // Create parallel requests to all servers
        const requestPromises = candidates.map(async (server: AIServer, index: number) => {
            const serverStartTime = Date.now();
            console.log(`[embed-parallel] Starting request ${index + 1} to server ${server.id} at ${server.url}`);

            try {
                const fetch = (await import('node-fetch')).default;
                const requestBody = JSON.stringify({ model, input: prompt });

                const resp = await fetch(`${server.url}/api/embed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody
                    // Note: node-fetch doesn't support timeout in RequestInit, we'll use AbortController if needed
                });

                const serverDuration = Date.now() - serverStartTime;
                console.log(`[embed-parallel] Server ${server.id} responded with status ${resp.status} in ${serverDuration}ms`);

                if (!resp.ok) {
                    const rawText = await resp.text();
                    console.error(`[embed-parallel] Error from ${server.url}: status ${resp.status}, response:`, rawText);
                    throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
                }

                const responseText = await resp.text();
                console.log(`[embed-parallel] Server ${server.id} raw response text:`, responseText);

                let parsedResult;
                try {
                    parsedResult = JSON.parse(responseText);
                    console.log(`[embed-parallel] Server ${server.id} parsed result keys:`, Object.keys(parsedResult));
                    console.log(`[embed-parallel] Server ${server.id} parsed result:`, JSON.stringify(parsedResult, null, 2));

                    // Check if we got a valid embedding
                    if (parsedResult.embeddings && Array.isArray(parsedResult.embeddings) && parsedResult.embeddings.length > 0 && parsedResult.embeddings[0].length > 0) {
                        console.log(`[embed-parallel] Server ${server.id} returned valid embeddings with ${parsedResult.embeddings[0].length} dimensions in ${serverDuration}ms`);
                        return { server, result: { embedding: parsedResult.embeddings[0] }, duration: serverDuration };
                    } else if (parsedResult.embedding && Array.isArray(parsedResult.embedding) && parsedResult.embedding.length > 0) {
                        console.log(`[embed-parallel] Server ${server.id} returned valid embedding with ${parsedResult.embedding.length} dimensions in ${serverDuration}ms`);
                        return { server, result: parsedResult, duration: serverDuration };
                    } else {
                        console.log(`[embed-parallel] Server ${server.id} returned invalid embedding format:`);
                        console.log(`[embed-parallel] - Has embedding field:`, !!parsedResult.embedding);
                        console.log(`[embed-parallel] - Embedding is array:`, Array.isArray(parsedResult.embedding));
                        console.log(`[embed-parallel] - Embedding length:`, parsedResult.embedding?.length || 0);
                        console.log(`[embed-parallel] - Has embeddings field:`, !!parsedResult.embeddings);
                        console.log(`[embed-parallel] - Embeddings is array:`, Array.isArray(parsedResult.embeddings));
                        console.log(`[embed-parallel] - Embeddings length:`, parsedResult.embeddings?.length || 0);
                        throw new Error(`Server ${server.id} returned invalid embedding format`);
                    }
                } catch (parseError) {
                    console.error(`[embed-parallel] Failed to parse JSON response from ${server.id}:`, parseError);
                    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
                    throw new Error(`Invalid JSON response from server ${server.id}: ${errorMsg}`);
                }

            } catch (error) {
                const serverDuration = Date.now() - serverStartTime;
                console.error(`[embed-parallel] Request to server ${server.id} failed after ${serverDuration}ms:`, error);
                throw error;
            }
        });

        // Race all requests and take the first successful one
        console.log(`[embed-parallel] Racing ${requestPromises.length} parallel requests...`);

        try {
            const result = await Promise.any(requestPromises);
            const totalDuration = Date.now() - startTime;

            console.log(`[embed-parallel] First successful response from server ${result.server.id} in ${result.duration}ms (total: ${totalDuration}ms)`);
            console.log(`[embed-parallel] Embedding dimensions: ${result.result.embedding.length}`);

            res.json(result.result);

        } catch (aggregateError) {
            // All requests failed
            const totalDuration = Date.now() - startTime;
            console.error(`[embed-parallel] All ${candidates.length} servers failed after ${totalDuration}ms`);

            if (aggregateError instanceof AggregateError) {
                console.error('[embed-parallel] Individual errors:', aggregateError.errors.map(err => err.message));
            }

            sendErrorResponse(
                res,
                503,
                'All embedding servers failed to respond',
                'service_unavailable'
            );
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('[embed-parallel] Error after', duration, 'ms:', error);
        console.error('[embed-parallel] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        if (error instanceof Error && error.message.includes('No healthy servers')) {
            console.log('[embed-parallel] Sending 503 - No healthy servers available');
            sendErrorResponse(
                res,
                503,
                'No healthy servers available for embedding model',
                'service_unavailable'
            );
        } else {
            console.log('[embed-parallel] Sending generic error response');
            handleCompatibilityError(res, error, 'Failed to generate embeddings');
        }
    }
}
