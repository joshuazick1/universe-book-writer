/**
 * Ollama API chat and generation handlers
 * Handles /api/chat, /api/generate, and /api/embed endpoints
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
    composePromptFromMessages,
    setupStreamingHeaders,
    writeNDJSONChunk,
    parseNDJSONStream,
    collectStreamChunks,
    extractJsonOrText,
    generateChatCompletionId,
    calculateUsage
} from '../shared/index.js';

/**
 * POST /api/chat - Ollama chat endpoint
 */
export async function handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        console.debug('[ollamaCompat] /api/chat handler invoked');
        const { model, messages, stream, options, keep_alive } = req.body || {};
        console.debug('[ollamaCompat] /api/chat parsed body:', req.body);

        const validation = validateRequiredFields(req.body, ['model', 'messages']);
        if (!validation.isValid) {
            console.warn('[ollamaCompat] /api/chat missing required fields:', req.body);
            sendErrorResponse(res, 400, "model and messages are required", 'invalid_request_error');
            return;
        }

        if (!Array.isArray(messages)) {
            console.warn('[ollamaCompat] /api/chat messages not array:', req.body);
            sendErrorResponse(res, 400, "messages must be an array", 'invalid_request_error');
            return;
        }

        const orchestrator = await getOrchestrator(req);
        const tags = await orchestrator.getCachedTags();
        const tagArr = tags[model];

        console.debug('[ollamaCompat] /api/chat available models:', Object.keys(tags));

        if (!tagArr || tagArr.length === 0) {
            console.warn(`[ollamaCompat] /api/chat model not found: ${model}`);
            sendErrorResponse(res, 404, "model not found", 'not_found_error');
            return;
        }

        // Compose prompt from messages
        const prompt = composePromptFromMessages(messages);
        console.debug('[ollamaCompat] /api/chat composed prompt:', prompt);

        // Find healthy servers for this model
        const servers = findAvailableServers(orchestrator.getServers(), model);
        console.debug('[ollamaCompat] /api/chat healthy servers:', servers.map((s: any) => s.url));

        if (servers.length === 0) {
            console.warn(`[ollamaCompat] /api/chat no healthy servers for model: ${model}`);
            sendErrorResponse(res, 404, "model not found", 'not_found_error');
            return;
        }

        const server = selectBestServer(servers);
        console.debug(`[ollamaCompat] /api/chat relaying to: ${server.url}/api/generate`);

        // Prepare request payload
        const payload = {
            model,
            prompt,
            stream,
            options,
            keep_alive
        };

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.debug(`[ollamaCompat] /api/chat backend response status: ${resp.status}`);

            if (!resp.ok) {
                let rawText = await resp.text();
                console.error(`[ollamaCompat] /api/chat relay error: status ${resp.status}, raw response:`, rawText);

                try {
                    const errorData = JSON.parse(rawText);
                    res.status(resp.status).json(errorData);
                } catch {
                    res.status(resp.status).json({ error: rawText });
                }
                return;
            }

            if (stream) {
                // Stream NDJSON directly to client, transforming each chunk to match Ollama's output
                setupStreamingHeaders(res, { contentType: 'application/x-ndjson' });

                if (!resp.body) {
                    throw new Error('No stream body');
                }

                for await (const obj of parseNDJSONStream(resp.body as any)) {
                    // Transform to Ollama-compatible streaming chunk
                    const out: Record<string, any> = {
                        model: obj.model || model,
                        created_at: obj.created_at || new Date().toISOString()
                    };

                    // Always use message format (never response)
                    if (typeof obj.message === 'object' && obj.message !== null) {
                        out.message = {
                            role: obj.message.role || 'assistant',
                            content: obj.message.content || obj.response || ''
                        };
                    } else {
                        out.message = {
                            role: 'assistant',
                            content: obj.response || ''
                        };
                    }

                    // Include done/done_reason/timing fields if present
                    if (obj.done !== undefined) out.done = obj.done;
                    if (obj.done_reason !== undefined) out.done_reason = obj.done_reason;

                    // Include timing fields in final chunk
                    if (obj.done === true) {
                        for (const k of [
                            'total_duration',
                            'load_duration',
                            'prompt_eval_count',
                            'prompt_eval_duration',
                            'eval_count',
                            'eval_duration'
                        ]) {
                            if (obj[k] !== undefined) out[k] = obj[k];
                        }
                    }

                    writeNDJSONChunk(res, out);
                }

                res.end();
                console.debug('[ollamaCompat] /api/chat stream relay complete');
                return;
            }

            // Non-streaming response
            const { fullContent, lastChunk } = await collectStreamChunks(
                resp.body as any,
                (chunk: any) => chunk.message?.content || chunk.response || ''
            );

            console.debug('[ollamaCompat] /api/chat full content length:', fullContent.length);

            // Build final response
            let result = lastChunk || {};

            // Convert to Ollama message format if needed
            if (!result.message && fullContent) {
                result = {
                    model: result.model || model,
                    created_at: result.created_at || new Date().toISOString(),
                    message: { role: 'assistant', content: fullContent },
                    done: true,
                    done_reason: 'stop',
                    ...result
                };
            } else if (!result.message) {
                result.message = { role: 'assistant', content: fullContent };
            } else {
                result.message.content = fullContent;
            }

            // Clean content (remove thinking blocks, code fences, etc.)
            if (result.message && typeof result.message.content === 'string') {
                result.message.content = extractJsonOrText(result.message.content);
            }

            console.debug('[ollamaCompat] /api/chat final response keys:', Object.keys(result));
            res.status(200).json(result);

        } catch (err: any) {
            console.error('[ollamaCompat] /api/chat error:', err);
            sendErrorResponse(res, 500, "internal error", 'api_error');
        }
    } catch (error) {
        console.error('[ollamaCompat] /api/chat uncaught error:', error);
        handleCompatibilityError(res, error, 'Chat request failed');
    }
}

/**
 * POST /api/generate - Ollama generate endpoint
 */
export async function handleGenerate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { model, prompt, stream, context, options, keep_alive, raw } = req.body || {};

        const validation = validateRequiredFields(req.body, ['model', 'prompt']);
        if (!validation.isValid) {
            sendErrorResponse(res, 400, `Missing required fields: ${validation.missing.join(', ')}`, 'invalid_request_error');
            return;
        }

        const orchestrator = await getOrchestrator(req);
        const tags = await orchestrator.getCachedTags();
        const tagArr = tags[model];

        if (!tagArr || tagArr.length === 0) {
            sendErrorResponse(res, 404, "model not found", 'not_found_error');
            return;
        }

        const servers = findAvailableServers(orchestrator.getServers(), model);
        if (servers.length === 0) {
            sendErrorResponse(res, 404, "model not found", 'not_found_error');
            return;
        }

        const server = selectBestServer(servers);

        // Prepare request payload
        const payload = {
            model,
            prompt,
            stream,
            context,
            options,
            keep_alive,
            raw
        };

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                try {
                    const errorData = JSON.parse(errorText);
                    res.status(resp.status).json(errorData);
                } catch {
                    res.status(resp.status).json({ error: errorText });
                }
                return;
            }

            if (stream) {
                setupStreamingHeaders(res, { contentType: 'application/x-ndjson' });

                if (!resp.body) {
                    throw new Error('No stream body');
                }

                for await (const obj of parseNDJSONStream(resp.body as any)) {
                    writeNDJSONChunk(res, obj);
                }

                res.end();
                return;
            }

            // Non-streaming: collect all chunks and return final response
            const { fullContent, lastChunk } = await collectStreamChunks(resp.body as any);

            const result = {
                ...lastChunk,
                response: fullContent,
                done: true
            };

            res.status(200).json(result);

        } catch (err: any) {
            console.error('[ollamaCompat] /api/generate error:', err);
            sendErrorResponse(res, 500, "internal error", 'api_error');
        }
    } catch (error) {
        handleCompatibilityError(res, error, 'Generate request failed');
    }
}

/**
 * POST /api/embed - Generate embeddings
 */
export async function handleEmbed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { model, prompt } = req.body || {};

        const validation = validateRequiredFields(req.body, ['model', 'prompt']);
        if (!validation.isValid) {
            sendErrorResponse(res, 400, `Missing required fields: ${validation.missing.join(', ')}`, 'invalid_request_error');
            return;
        }

        const orchestrator = await getOrchestrator(req);
        const tags = await orchestrator.getCachedTags();
        const tagArr = tags[model];

        if (!tagArr || tagArr.length === 0) {
            sendErrorResponse(res, 404, "model not found", 'not_found_error');
            return;
        }

        const servers = findAvailableServers(orchestrator.getServers(), model);
        if (servers.length === 0) {
            sendErrorResponse(res, 404, "model not found", 'not_found_error');
            return;
        }

        const server = selectBestServer(servers);

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt })
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                try {
                    const errorData = JSON.parse(errorText);
                    res.status(resp.status).json(errorData);
                } catch {
                    res.status(resp.status).json({ error: errorText });
                }
                return;
            }

            const data = await resp.json();
            res.status(200).json(data);

        } catch (err: any) {
            console.error('[ollamaCompat] /api/embed error:', err);
            sendErrorResponse(res, 500, "internal error", 'api_error');
        }
    } catch (error) {
        handleCompatibilityError(res, error, 'Embed request failed');
    }
}
