import type { Request, Response, NextFunction } from 'express';
import type { AIServer } from '../../orchestrator.js';
import {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator,
    setupStreamingHeaders
} from '../shared/index.js';

/**
 * POST /api/push
 * Push a model to a registry (streaming NDJSON response).
 *
 * Request body: { name: string, stream?: boolean }
 * Response: NDJSON streaming progress
 *
 * @example
 * // Request
 * { "name": "custom-model:latest", "stream": true }
 * // Response (NDJSON)
 * { "status": "uploading", "digest": "sha256:...", "total": 1000, "completed": 1000 }
 * { "status": "success" }
 */
export async function pushHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, stream = true } = req.body;
        const validation = validateRequiredFields(req.body, ['name']);

        if (!validation.isValid) {
            sendErrorResponse(
                res,
                400,
                `Missing required fields: ${validation.missing.join(', ')}`,
                'invalid_request_error'
            );
            return;
        }

        const orchestrator = await getOrchestrator(req);

        // Find a server that has the model to push
        const result = await orchestrator.tryRequestWithFailover(name, async (server: AIServer) => {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, stream })
            });

            if (!resp.ok) {
                const rawText = await resp.text();
                console.error(`[ollama-push] Error from ${server.url}: status ${resp.status}, response:`, rawText);

                if (resp.status === 404) {
                    throw new Error(`Model '${name}' not found on server ${server.id}`);
                } else if (resp.status === 401 || resp.status === 403) {
                    throw new Error(`Authentication failed for registry push from server ${server.id}`);
                } else {
                    throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
                }
            }

            if (stream) {
                // Set up streaming response
                setupStreamingHeaders(res, { contentType: 'application/x-ndjson' });

                // Pipe the streaming response from Ollama server
                if (resp.body) {
                    resp.body.on('data', (chunk) => {
                        res.write(chunk);
                    });

                    resp.body.on('end', () => {
                        res.end();
                    });

                    resp.body.on('error', (error) => {
                        console.error('[ollama-push] Stream error:', error);
                        res.end();
                    });
                } else {
                    // Fallback if no body stream
                    res.write(JSON.stringify({ status: 'success' }) + '\n');
                    res.end();
                }

                return; // Don't return a value for streaming responses
            } else {
                // Non-streaming response
                return await resp.json();
            }
        });

        // For non-streaming responses, send the result
        if (!stream && result) {
            res.json(result);
        }

    } catch (error) {
        console.error('[ollama-push] Error:', error);
        if (error instanceof Error) {
            if (error.message.includes('No healthy servers')) {
                res.status(404).type('text/plain').send('404 page not found');
            } else if (error.message.includes('not found')) {
                res.status(404).type('text/plain').send('404 page not found');
            } else if (error.message.includes('Authentication failed')) {
                sendErrorResponse(
                    res,
                    401,
                    error.message,
                    'authentication_error'
                );
            } else {
                handleCompatibilityError(res, error, 'Failed to push model');
            }
        } else {
            handleCompatibilityError(res, error, 'Failed to push model');
        }
    }
}
