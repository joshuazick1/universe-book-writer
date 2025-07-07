/**
 * OpenAI API embeddings handlers
 * Handles /v1/embeddings endpoint
 */

import type { Request, Response, NextFunction } from 'express';
import {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator,
    getCachedTags,
    findAvailableServers,
    selectBestServer,
    generateEmbeddingId,
    estimateTokenCount
} from '../shared/index.js';
import type { AIEmbeddingResponse, AIEmbedding } from '../shared/index.js';

/**
 * POST /v1/embeddings - Generate embeddings
 */
export async function handleEmbeddings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const {
            model,
            input,
            encoding_format = 'float',
            dimensions,
            user
        } = req.body || {};

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

        // Validate encoding_format
        if (encoding_format !== 'float' && encoding_format !== 'base64') {
            sendErrorResponse(
                res,
                400,
                'encoding_format must be "float" or "base64"',
                'invalid_request_error'
            );
            return;
        }

        const orchestrator = await getOrchestrator(req);
        const tags = await orchestrator.getCachedTags();
        const tagArr = tags[model];

        if (!tagArr || tagArr.length === 0) {
            sendErrorResponse(
                res,
                404,
                `The model '${model}' does not exist`,
                'invalid_request_error',
                'model_not_found'
            );
            return;
        }

        const servers = findAvailableServers(orchestrator.getServers(), model);
        if (servers.length === 0) {
            sendErrorResponse(
                res,
                404,
                `The model '${model}' does not exist`,
                'invalid_request_error',
                'model_not_found'
            );
            return;
        }

        const server = selectBestServer(servers);

        // Handle both string and array inputs
        const inputs = Array.isArray(input) ? input : [input];
        const embeddings: AIEmbedding[] = [];
        let totalTokens = 0;

        try {
            const fetch = (await import('node-fetch')).default;

            for (let i = 0; i < inputs.length; i++) {
                const text = inputs[i];
                const tokens = estimateTokenCount(text);
                totalTokens += tokens;

                // Call Ollama embed endpoint
                const resp = await fetch(`${server.url}/api/embed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        prompt: text
                    })
                });

                if (!resp.ok) {
                    const errorText = await resp.text();
                    try {
                        const errorData = JSON.parse(errorText);
                        res.status(resp.status).json({
                            error: {
                                message: errorData.error || errorText,
                                type: 'api_error',
                                code: 'embedding_error'
                            }
                        });
                    } catch {
                        res.status(resp.status).json({
                            error: {
                                message: errorText,
                                type: 'api_error'
                            }
                        });
                    }
                    return;
                }

                const data = await resp.json() as any;

                if (!data.embedding || !Array.isArray(data.embedding)) {
                    sendErrorResponse(
                        res,
                        500,
                        'Invalid embedding response from model',
                        'api_error'
                    );
                    return;
                }

                let embedding = data.embedding;

                // Handle encoding format
                if (encoding_format === 'base64') {
                    // Convert float array to base64
                    const buffer = new Float32Array(embedding);
                    const base64 = Buffer.from(buffer.buffer).toString('base64');
                    embedding = base64;
                }

                embeddings.push({
                    object: 'embedding',
                    index: i,
                    embedding
                });
            }

            const response: AIEmbeddingResponse = {
                object: 'list',
                data: embeddings,
                model,
                usage: {
                    prompt_tokens: totalTokens,
                    total_tokens: totalTokens
                }
            };

            res.status(200).json(response);

        } catch (err: any) {
            console.error('[openaiCompat] /v1/embeddings error:', err);
            sendErrorResponse(res, 500, 'Internal server error', 'api_error');
        }
    } catch (error) {
        handleCompatibilityError(res, error, 'Embeddings request failed');
    }
}
