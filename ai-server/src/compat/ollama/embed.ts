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
export async function embedHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    console.log('[embed-handler] Starting embedding request at', new Date().toISOString());

    try {
        const { model, prompt } = req.body;
        console.log('[embed-handler] Request body:', {
            model,
            promptLength: prompt?.length || 0,
            hasModel: !!model,
            hasPrompt: !!prompt
        });

        const validation = validateRequiredFields(req.body, ['model', 'prompt']);
        console.log('[embed-handler] Validation result:', validation);

        if (!validation.isValid) {
            console.log('[embed-handler] Validation failed, sending 400 error');
            sendErrorResponse(
                res,
                400,
                `Missing required fields: ${validation.missing.join(', ')}`,
                'invalid_request_error'
            );
            return;
        }

        console.log('[embed-handler] Getting orchestrator...');
        const orchestrator = await getOrchestrator(req);
        console.log('[embed-handler] Got orchestrator:', {
            hasOrchestrator: !!orchestrator,
            orchestratorType: orchestrator?.constructor?.name || 'unknown'
        });

        // Use parallel racing approach for faster response
        console.log('[embed-handler] Using parallel racing approach for faster embeddings');

        // Get all healthy servers that have the model
        const candidates = orchestrator.servers.filter((s: AIServer) =>
            s.healthy &&
            s.models.includes(model) &&
            !orchestrator.isInCooldown(s.id, model) &&
            !orchestrator.permanentBan.has(`${s.id}:${model}`)
        );

        console.log('[embed-handler] Found', candidates.length, 'candidate servers for parallel requests');
        console.log('[embed-handler] Candidates:', candidates.map((s: AIServer) => ({
            id: s.id,
            url: s.url,
            healthy: s.healthy
        })));

        if (candidates.length === 0) {
            console.log('[embed-handler] No healthy servers available');
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
            console.log(`[embed-handler] Starting request ${index + 1} to server ${server.id} at ${server.url}`);

            try {
                const fetch = (await import('node-fetch')).default;
                const requestBody = JSON.stringify({ model, prompt });

                const resp = await fetch(`${server.url}/api/embed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody
                });

                const serverDuration = Date.now() - serverStartTime;
                console.log(`[embed-handler] Server ${server.id} responded with status ${resp.status} in ${serverDuration}ms`);

                if (!resp.ok) {
                    const rawText = await resp.text();
                    console.error(`[embed-handler] Error from ${server.url}: status ${resp.status}, response:`, rawText);
                    throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
                }

                const responseText = await resp.text();
                let parsedResult;
                try {
                    parsedResult = JSON.parse(responseText);

                    // Check if we got a valid embedding
                    if (parsedResult.embedding && Array.isArray(parsedResult.embedding) && parsedResult.embedding.length > 0) {
                        console.log(`[embed-handler] Server ${server.id} returned valid embedding with ${parsedResult.embedding.length} dimensions in ${serverDuration}ms`);
                        return { server, result: parsedResult, duration: serverDuration };
                    } else if (parsedResult.embeddings && Array.isArray(parsedResult.embeddings) && parsedResult.embeddings.length > 0) {
                        // Handle OpenAI-style response format
                        console.log(`[embed-handler] Server ${server.id} returned OpenAI-style embeddings in ${serverDuration}ms`);
                        return { server, result: { embedding: parsedResult.embeddings[0] }, duration: serverDuration };
                    } else {
                        console.log(`[embed-handler] Server ${server.id} returned empty embedding, rejecting`);
                        throw new Error(`Server ${server.id} returned empty embedding`);
                    }
                } catch (parseError) {
                    console.error(`[embed-handler] Failed to parse JSON response from ${server.id}:`, parseError);
                    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
                    throw new Error(`Invalid JSON response from server ${server.id}: ${errorMsg}`);
                }

            } catch (error) {
                const serverDuration = Date.now() - serverStartTime;
                console.error(`[embed-handler] Request to server ${server.id} failed after ${serverDuration}ms:`, error);
                throw error;
            }
        });

        // Race all requests and take the first successful one
        console.log(`[embed-handler] Racing ${requestPromises.length} parallel requests...`);

        try {
            const result = await Promise.any(requestPromises);
            const totalDuration = Date.now() - startTime;

            console.log(`[embed-handler] First successful response from server ${result.server.id} in ${result.duration}ms (total: ${totalDuration}ms)`);
            console.log(`[embed-handler] Embedding dimensions: ${result.result.embedding.length}`);

            res.json(result.result);
            return;

        } catch (aggregateError) {
            // All requests failed
            const totalDuration = Date.now() - startTime;
            console.error(`[embed-handler] All ${candidates.length} servers failed after ${totalDuration}ms`);

            if (aggregateError instanceof AggregateError) {
                console.error('[embed-handler] Individual errors:', aggregateError.errors.map((err: Error) => err.message));
            }

            sendErrorResponse(
                res,
                503,
                'All embedding servers failed to respond',
                'service_unavailable'
            );
            return;
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('[embed-handler] Error after', duration, 'ms:', error);
        console.error('[embed-handler] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        if (error instanceof Error && error.message.includes('No healthy servers')) {
            console.log('[embed-handler] Sending 503 - No healthy servers available');
            sendErrorResponse(
                res,
                503,
                'No healthy servers available for embedding model',
                'service_unavailable'
            );
        } else {
            console.log('[embed-handler] Sending generic error response');
            handleCompatibilityError(res, error, 'Failed to generate embeddings');
        }
    }
}
