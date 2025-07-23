import type { Request, Response, NextFunction } from 'express';
import type { AIServer } from '../../orchestrator.js';
import {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator
} from '../shared/index.js';

/**
 * POST /api/copy
 * Copy a model between instances or under a new name.
 *
 * Request body: { source: string, destination: string }
 * Response: { status: 'success' } | { error: string }
 *
 * @example
 * // Request
 * { "source": "llama2", "destination": "my-llama2" }
 * // Response
 * { "status": "success" }
 */
export async function copyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { source, destination } = req.body;
        const validation = validateRequiredFields(req.body, ['source', 'destination']);

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

        // Find a server that has the source model
        const result = await orchestrator.tryRequestWithFailover(source, async (server: AIServer) => {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, destination })
            });

            if (!resp.ok) {
                const rawText = await resp.text();
                console.error(`[ollama-copy] Error from ${server.url}: status ${resp.status}, response:`, rawText);

                // Handle specific error cases
                if (resp.status === 404) {
                    throw new Error(`Source model '${source}' not found on server ${server.id}`);
                } else if (resp.status === 409) {
                    throw new Error(`Destination model '${destination}' already exists on server ${server.id}`);
                } else {
                    throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
                }
            }

            return await resp.json();
        });

        // Invalidate cache since we've added a new model
        await orchestrator.updateAllStatusAndCache();

        res.json(result || { status: 'success' });

    } catch (error) {
        console.error('[ollama-copy] Error:', error);
        if (error instanceof Error) {
            if (error.message.includes('No healthy servers')) {
                sendErrorResponse(
                    res,
                    503,
                    'No healthy servers available with source model',
                    'service_unavailable'
                );
            } else if (error.message.includes('not found')) {
                sendErrorResponse(
                    res,
                    404,
                    error.message,
                    'model_not_found'
                );
            } else if (error.message.includes('already exists')) {
                sendErrorResponse(
                    res,
                    409,
                    error.message,
                    'model_exists'
                );
            } else {
                handleCompatibilityError(res, error, 'Failed to copy model');
            }
        } else {
            handleCompatibilityError(res, error, 'Failed to copy model');
        }
    }
}
