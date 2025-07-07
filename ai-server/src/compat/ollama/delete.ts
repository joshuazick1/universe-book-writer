import type { Request, Response, NextFunction } from 'express';
import type { AIServer } from '../../orchestrator.js';
import {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator
} from '../shared/index.js';

/**
 * DELETE /api/delete
 * Delete a model by name.
 *
 * Request body: { name: string }
 * Response: { status: 'success' } | { error: string }
 *
 * @example
 * // Request
 * { "name": "model-name" }
 * // Response
 * { "status": "success" }
 */
export async function deleteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name } = req.body;
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

        // Find a server that has the model to delete
        const result = await orchestrator.tryRequestWithFailover(name, async (server: AIServer) => {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!resp.ok) {
                const rawText = await resp.text();
                console.error(`[ollama-delete] Error from ${server.url}: status ${resp.status}, response:`, rawText);

                // Handle specific error cases
                if (resp.status === 404) {
                    throw new Error(`Model '${name}' not found on server ${server.id}`);
                } else {
                    throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
                }
            }

            return await resp.json();
        });

        // Invalidate cache since we've removed a model
        await orchestrator.updateAllStatusAndCache();

        res.json(result || { status: 'success' });

    } catch (error) {
        console.error('[ollama-delete] Error:', error);
        if (error instanceof Error) {
            if (error.message.includes('No healthy servers')) {
                sendErrorResponse(
                    res,
                    404,
                    `Model '${req.body.name}' not found on any healthy server`,
                    'model_not_found'
                );
            } else if (error.message.includes('not found')) {
                sendErrorResponse(
                    res,
                    404,
                    error.message,
                    'model_not_found'
                );
            } else {
                handleCompatibilityError(res, error, 'Failed to delete model');
            }
        } else {
            handleCompatibilityError(res, error, 'Failed to delete model');
        }
    }
}
