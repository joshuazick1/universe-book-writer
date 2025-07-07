import type { Request, Response, NextFunction } from 'express';
import type { AIServer } from '../../orchestrator.js';
import {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator
} from '../shared/index.js';

/**
 * POST /api/embeddings
 * Batch generate embeddings for one or more inputs using an Ollama embedding model.
 *
 * Request body: { model: string, input: string | string[] }
 * Response: { model: string, embeddings: number[][] }
 *
 * @example
 * // Request
 * { "model": "all-minilm", "input": ["text1", "text2"] }
 * // Response
 * { "model": "all-minilm", "embeddings": [[0.1,0.2],[0.3,0.4]] }
 */
export async function embeddingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { model, input } = req.body;
        const validation = validateRequiredFields(req.body, ['model', 'input']);

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

        // Convert input to array if it's a single string
        const inputs = Array.isArray(input) ? input : [input];

        // Use orchestrator to find a server with the requested model
        const result = await orchestrator.tryRequestWithFailover(model, async (server: AIServer) => {
            const fetch = (await import('node-fetch')).default;

            // For batch processing, we can either:
            // 1. Send all inputs to /api/embed in parallel
            // 2. Use a batch endpoint if available
            // For now, we'll use parallel /api/embed calls

            const embeddings = await Promise.all(
                inputs.map(async (prompt: string) => {
                    const resp = await fetch(`${server.url}/api/embed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model, prompt })
                    });

                    if (!resp.ok) {
                        const rawText = await resp.text();
                        console.error(`[ollama-embeddings] Error from ${server.url}: status ${resp.status}, response:`, rawText);
                        throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
                    }

                    const result = await resp.json() as { embedding: number[] };
                    return result.embedding;
                })
            );

            return { model, embeddings };
        });

        res.json(result);

    } catch (error) {
        console.error('[ollama-embeddings] Error:', error);
        if (error instanceof Error && error.message.includes('No healthy servers')) {
            sendErrorResponse(
                res,
                503,
                'No healthy servers available for embedding model',
                'service_unavailable'
            );
        } else {
            handleCompatibilityError(res, error, 'Failed to generate embeddings');
        }
    }
}
