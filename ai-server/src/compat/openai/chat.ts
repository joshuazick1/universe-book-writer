/**
 * OpenAI API chat completion handlers
 * Handles /v1/chat/completions and /v1/completions endpoints
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
    setupSSEHeaders,
    writeSSEChunk,
    parseNDJSONStream,
    collectStreamChunks,
    generateChatCompletionId,
    generateCompletionId,
    calculateUsage,
    estimateTokenCount
} from '../shared/index.js';
import type { AIMessage, AIStreamChunk } from '../shared/index.js';

/**
 * POST /v1/chat/completions - OpenAI chat completions
 */
export async function handleChatCompletions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const {
            model,
            messages,
            stream = false,
            temperature,
            top_p,
            frequency_penalty,
            presence_penalty,
            max_tokens,
            stop,
            n = 1,
            logprobs,
            top_logprobs,
            user,
            functions,
            function_call,
            tools,
            tool_choice,
            ...rest
        } = req.body || {};

        const validation = validateRequiredFields(req.body, ['model', 'messages']);
        if (!validation.isValid) {
            sendErrorResponse(
                res,
                400,
                `Missing required fields: ${validation.missing.join(', ')}`,
                'invalid_request_error'
            );
            return;
        }

        if (!Array.isArray(messages)) {
            sendErrorResponse(res, 400, "messages must be an array", 'invalid_request_error');
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
        const prompt = composePromptFromMessages(messages);

        // Prepare Ollama-compatible request
        const ollamaPayload = {
            model,
            prompt,
            stream,
            options: {
                temperature,
                top_p,
                frequency_penalty,
                presence_penalty,
                num_predict: max_tokens,
                stop
            },
            ...rest
        };

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ollamaPayload)
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                try {
                    const errorData = JSON.parse(errorText);
                    res.status(resp.status).json({
                        error: {
                            message: errorData.error || errorText,
                            type: 'api_error',
                            code: 'model_error'
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

            const id = generateChatCompletionId();
            const created = Math.floor(Date.now() / 1000);

            if (stream) {
                setupSSEHeaders(res);

                if (!resp.body) {
                    throw new Error('No stream body');
                }

                for await (const obj of parseNDJSONStream(resp.body as any)) {
                    const chunk: AIStreamChunk = {
                        id,
                        object: 'chat.completion.chunk',
                        created,
                        model: obj.model || model,
                        choices: [{
                            index: 0,
                            delta: {
                                role: 'assistant',
                                content: obj.message?.content || obj.response || ''
                            },
                            finish_reason: obj.done ? (obj.done_reason || 'stop') : null
                        }]
                    };

                    writeSSEChunk(res, chunk);

                    if (obj.done) {
                        writeSSEChunk(res, '[DONE]');
                        break;
                    }
                }

                res.end();
                return;
            }

            // Non-streaming response
            const { fullContent, lastChunk } = await collectStreamChunks(
                resp.body as any,
                (chunk: any) => chunk.message?.content || chunk.response || ''
            );

            const usage = calculateUsage(prompt, fullContent);

            const completion = {
                id,
                object: 'chat.completion',
                created,
                model: lastChunk?.model || model,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: fullContent
                    },
                    finish_reason: lastChunk?.done_reason || 'stop'
                }],
                usage
            };

            res.status(200).json(completion);

        } catch (err: any) {
            console.error('[openaiCompat] /v1/chat/completions error:', err);
            sendErrorResponse(res, 500, 'Internal server error', 'api_error');
        }
    } catch (error) {
        handleCompatibilityError(res, error, 'Chat completion request failed');
    }
}

/**
 * POST /v1/completions - OpenAI text completions (legacy)
 */
export async function handleCompletions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const {
            model,
            prompt,
            stream = false,
            temperature,
            top_p,
            frequency_penalty,
            presence_penalty,
            max_tokens,
            stop,
            n = 1,
            logprobs,
            echo = false,
            user,
            ...rest
        } = req.body || {};

        const validation = validateRequiredFields(req.body, ['model', 'prompt']);
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

        // Prepare Ollama-compatible request
        const ollamaPayload = {
            model,
            prompt,
            stream,
            options: {
                temperature,
                top_p,
                frequency_penalty,
                presence_penalty,
                num_predict: max_tokens,
                stop
            },
            ...rest
        };

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ollamaPayload)
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                try {
                    const errorData = JSON.parse(errorText);
                    res.status(resp.status).json({
                        error: {
                            message: errorData.error || errorText,
                            type: 'api_error',
                            code: 'model_error'
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

            const id = generateCompletionId();
            const created = Math.floor(Date.now() / 1000);

            if (stream) {
                setupSSEHeaders(res);

                if (!resp.body) {
                    throw new Error('No stream body');
                }

                for await (const obj of parseNDJSONStream(resp.body as any)) {
                    const chunk = {
                        id,
                        object: 'text_completion',
                        created,
                        model: obj.model || model,
                        choices: [{
                            index: 0,
                            text: obj.response || '',
                            finish_reason: obj.done ? (obj.done_reason || 'stop') : null
                        }]
                    };

                    writeSSEChunk(res, chunk);

                    if (obj.done) {
                        writeSSEChunk(res, '[DONE]');
                        break;
                    }
                }

                res.end();
                return;
            }

            // Non-streaming response
            const { fullContent, lastChunk } = await collectStreamChunks(resp.body as any);
            const usage = calculateUsage(prompt as string, fullContent);

            const completion = {
                id,
                object: 'text_completion',
                created,
                model: lastChunk?.model || model,
                choices: [{
                    index: 0,
                    text: fullContent,
                    finish_reason: lastChunk?.done_reason || 'stop'
                }],
                usage
            };

            res.status(200).json(completion);

        } catch (err: any) {
            console.error('[openaiCompat] /v1/completions error:', err);
            sendErrorResponse(res, 500, 'Internal server error', 'api_error');
        }
    } catch (error) {
        handleCompatibilityError(res, error, 'Text completion request failed');
    }
}
