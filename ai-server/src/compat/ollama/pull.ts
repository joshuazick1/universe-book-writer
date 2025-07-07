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
 * POST /api/pull
 * Pull a model from a registry (streaming NDJSON response).
 *
 * Request body: { name: string, insecure?: boolean, stream?: boolean }
 * Response: NDJSON streaming progress, final { status: 'success' }
 *
 * @example
 * // Request
 * { "name": "llama2:7b", "insecure": false, "stream": true }
 * // Response (NDJSON)
 * { "status": "downloading", "digest": "sha256:...", "total": 1000, "completed": 500 }
 * { "status": "success" }
 */
export async function pullHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, insecure = false, stream = true } = req.body;
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

        // Get the first healthy server for pulling
        const servers = orchestrator.getServers().filter((s: AIServer) => s.healthy);

        if (servers.length === 0) {
            sendErrorResponse(
                res,
                503,
                'No healthy servers available for model pull',
                'service_unavailable'
            );
            return;
        }

        const server = servers[0]; // Use first healthy server for pull operations

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, insecure, stream })
            });

            if (!resp.ok) {
                const rawText = await resp.text();
                console.error(`[ollama-pull] Error from ${server.url}: status ${resp.status}, response:`, rawText);

                if (resp.status === 404) {
                    sendErrorResponse(
                        res,
                        404,
                        `Model '${name}' not found in registry`,
                        'model_not_found'
                    );
                } else {
                    sendErrorResponse(
                        res,
                        resp.status,
                        `Pull failed: ${rawText}`,
                        'pull_error'
                    );
                }
                return;
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
                        // Invalidate cache since we may have a new model
                        orchestrator.updateAllStatusAndCache();
                    });

                    resp.body.on('error', (error) => {
                        console.error('[ollama-pull] Stream error:', error);
                        res.end();
                    });
                } else {
                    // Fallback if no body stream
                    res.write(JSON.stringify({ status: 'success' }) + '\n');
                    res.end();
                    orchestrator.updateAllStatusAndCache();
                }
            } else {
                // Non-streaming response
                const result = await resp.json();
                res.json(result);
                // Invalidate cache since we may have a new model
                await orchestrator.updateAllStatusAndCache();
            }

        } catch (error) {
            console.error(`[ollama-pull] Pull failed for server ${server.id}:`, error);
            sendErrorResponse(
                res,
                500,
                'Model pull failed',
                'pull_error'
            );
        }

    } catch (error) {
        console.error('[ollama-pull] Error:', error);
        handleCompatibilityError(res, error, 'Failed to pull model');
    }
}
