/**
 * OpenAI Compatibility: /v1/chat/completions endpoint
 *
 * POST /v1/chat/completions
 * Chat-based completion endpoint for GPT-3.5/4 style models
 *
 * Request: {
 *   model: string,
 *   messages: [{ role: 'system' | 'user' | 'assistant' | 'tool', content: string, tool_calls?: object[] }],
 *   max_tokens?: number,
 *   temperature?: number,
 *   top_p?: number,
 *   frequency_penalty?: number,
 *   presence_penalty?: number,
 *   stop?: string | string[],
 *   n?: number,
 *   stream?: boolean,
 *   logprobs?: boolean,
 *   top_logprobs?: number,
 *   user?: string,
 *   tools?: object[],
 *   tool_choice?: string | object,
 *   functions?: object[],
 *   function_call?: string | object,
 *   response_format?: { type: 'text' | 'json_object' },
 *   seed?: number
 * }
 *
 * Response: {
 *   id: string,
 *   object: 'chat.completion',
 *   created: number,
 *   model: string,
 *   choices: [{ message: { role: string, content: string, tool_calls?: object[] }, index: number, finish_reason: string, logprobs?: object }],
 *   usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
 * }
 */
import { Request, Response, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { getOrchestratorInstance } from '../../orchestrator-instance.js';
import { logDebug, logError } from '../../logger.js';

// Token counting utility (simple approximation)
function countTokens(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
}

// Convert messages to Ollama prompt format
function messagesToPrompt(messages: any[]): string {
    return messages.map(msg => {
        if (msg.role === 'system') {
            return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
            return `User: ${msg.content}`;
        } else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content}`;
        } else if (msg.role === 'tool') {
            return `Tool: ${msg.content}`;
        }
        return `${msg.role}: ${msg.content}`;
    }).join('\n') + '\nAssistant:';
}

// Convert OpenAI parameters to Ollama format
function toOllamaParams(params: any): any {
    return {
        model: params.model,
        prompt: params.prompt,
        stream: params.stream || false,
        format: params.response_format?.type === 'json_object' ? 'json' : undefined,
        options: {
            num_predict: params.max_tokens || 100,
            temperature: params.temperature || 0.7,
            top_p: params.top_p || 1.0,
            repeat_penalty: 1.0 + (params.frequency_penalty || 0) * 0.1,
            presence_penalty: params.presence_penalty || 0,
            stop: Array.isArray(params.stop) ? params.stop : (params.stop ? [params.stop] : undefined),
            seed: params.seed,
        },
    };
}

export const openaiChatCompletionsHandler: RequestHandler = async (req, res): Promise<void> => {
    // TODO: Validate API key, rate limit, and permissions
    const {
        model,
        messages,
        max_tokens = 100,
        temperature = 0.7,
        top_p = 1.0,
        frequency_penalty = 0.0,
        presence_penalty = 0.0,
        stop = null,
        n = 1,
        stream = false,
        logprobs = false,
        top_logprobs = null,
        user = null,
        tools = null,
        tool_choice = null,
        functions = null,
        function_call = null,
        response_format = null,
        seed = null
    } = req.body;

    // Validate required parameters
    if (!model || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
            error: {
                message: 'Missing required fields: model and messages',
                type: 'invalid_request_error',
                code: 'missing_fields',
            },
        });
        return;
    }

    // Validate message format
    for (const msg of messages) {
        if (!msg.role || !['system', 'user', 'assistant', 'tool', 'function'].includes(msg.role)) {
            res.status(400).json({
                error: {
                    message: 'Invalid message role. Must be one of: system, user, assistant, tool, function',
                    type: 'invalid_request_error',
                    code: 'invalid_message_role',
                },
            });
            return;
        }
        if (msg.role !== 'tool' && !msg.content) {
            res.status(400).json({
                error: {
                    message: 'Message content is required for non-tool messages',
                    type: 'invalid_request_error',
                    code: 'missing_content',
                },
            });
            return;
        }
    }

    // Validate parameter ranges
    if (n > 20) {
        res.status(400).json({
            error: {
                message: 'n must be between 1 and 20',
                type: 'invalid_request_error',
                code: 'invalid_parameter',
            },
        });
        return;
    }

    if (max_tokens > 4096) {
        res.status(400).json({
            error: {
                message: 'max_tokens must be less than or equal to 4096',
                type: 'invalid_request_error',
                code: 'invalid_parameter',
            },
        });
        return;
    }

    // Get orchestrator instance
    const orchestrator = getOrchestratorInstance();

    // Find healthy servers with the requested model
    const healthyServers = orchestrator.getServers().filter((s: any) =>
        s.healthy && s.models.includes(model)
    );

    if (healthyServers.length === 0) {
        res.status(404).json({
            error: {
                message: `Model '${model}' not found`,
                type: 'invalid_request_error',
                code: 'model_not_found',
            },
        });
        return;
    }

    const completionId = 'chatcmpl-' + uuidv4();
    const created = Math.floor(Date.now() / 1000);
    const prompt = messagesToPrompt(messages);

    try {
        if (stream) {
            // Handle streaming responses
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

            await orchestrator.tryRequestWithFailover(model, async (server: any) => {
                const ollamaParams = toOllamaParams({
                    model,
                    prompt,
                    stream: true,
                    max_tokens,
                    temperature,
                    top_p,
                    frequency_penalty,
                    presence_penalty,
                    stop,
                    response_format,
                    seed
                });

                const response = await fetch(`${server.url}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ollamaParams),
                });

                if (!response.ok) {
                    throw new Error(`Server ${server.url} returned ${response.status}`);
                }

                if (!response.body) {
                    throw new Error('No response body from server');
                }

                // Send initial chunk with role
                const initialChunk = {
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created,
                    model,
                    choices: [{
                        index: 0,
                        delta: { role: 'assistant' },
                        finish_reason: null
                    }]
                };
                res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

                // Handle streaming response
                let textBuffer = '';
                for await (const chunk of response.body as any) {
                    const chunkStr = chunk instanceof Buffer ? chunk.toString('utf8') : String(chunk);
                    textBuffer += chunkStr;

                    const lines = textBuffer.split('\n');
                    textBuffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        try {
                            const ollamaChunk = JSON.parse(line);

                            // Convert Ollama streaming format to OpenAI format
                            const openaiChunk = {
                                id: completionId,
                                object: 'chat.completion.chunk',
                                created,
                                model,
                                choices: [{
                                    index: 0,
                                    delta: {
                                        content: ollamaChunk.response || ''
                                    },
                                    finish_reason: ollamaChunk.done ? 'stop' : null
                                }]
                            };

                            res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);

                            if (ollamaChunk.done) {
                                res.write('data: [DONE]\n\n');
                                res.end();
                                return;
                            }
                        } catch (parseError) {
                            logError(`Error parsing Ollama streaming response: ${parseError}`);
                        }
                    }
                }

                res.write('data: [DONE]\n\n');
                res.end();
            });
        } else {
            // Handle non-streaming responses
            const choices: any[] = [];

            for (let i = 0; i < n; i++) {
                await orchestrator.tryRequestWithFailover(model, async (server: any) => {
                    const ollamaParams = toOllamaParams({
                        model,
                        prompt,
                        stream: false,
                        max_tokens,
                        temperature,
                        top_p,
                        frequency_penalty,
                        presence_penalty,
                        stop,
                        response_format,
                        seed
                    });

                    const response = await fetch(`${server.url}/api/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ollamaParams),
                    });

                    if (!response.ok) {
                        throw new Error(`Server ${server.url} returned ${response.status}`);
                    }

                    const ollamaResponse = await response.json() as any;

                    let replyContent = ollamaResponse.response || '';
                    let toolCalls = null;
                    let finishReason = 'stop';

                    // Handle function/tool calling
                    if ((tools || functions) && tool_choice !== 'none') {
                        const availableTools = tools || functions || [];
                        if (availableTools.length > 0) {
                            // Simple heuristic: if response contains function-like content, treat as tool call
                            const functionPattern = /(\w+)\s*\(\s*([^)]*)\s*\)/;
                            const match = replyContent.match(functionPattern);

                            if (match && availableTools.some((tool: any) =>
                                (tool.function?.name || tool.name) === match[1]
                            )) {
                                const functionName = match[1];
                                const functionArgs = match[2];

                                toolCalls = [{
                                    id: 'call_' + Math.random().toString(36).slice(2, 10),
                                    type: 'function',
                                    function: {
                                        name: functionName,
                                        arguments: JSON.stringify({ args: functionArgs })
                                    }
                                }];
                                replyContent = ''; // No content when making tool calls
                                finishReason = 'tool_calls';
                            }
                        }
                    }

                    const choice: any = {
                        index: i,
                        message: {
                            role: 'assistant',
                            content: replyContent,
                            ...(toolCalls && { tool_calls: toolCalls })
                        },
                        finish_reason: finishReason,
                    };

                    // Add logprobs if requested
                    if (logprobs && replyContent) {
                        const tokens = replyContent.split(' ');
                        choice.logprobs = {
                            content: tokens.map((token: string) => ({
                                token,
                                logprob: Math.log(Math.random() * 0.5 + 0.5), // Placeholder
                                bytes: Array.from(new TextEncoder().encode(token)),
                                top_logprobs: top_logprobs ? Array(Math.min(top_logprobs, 5)).fill(null).map(() => ({
                                    token: 'alt_' + Math.random().toString(36).slice(2, 5),
                                    logprob: Math.log(Math.random() * 0.3 + 0.1)
                                })) : []
                            }))
                        };
                    }

                    choices.push(choice);
                });
            }

            // Calculate token usage
            const promptTokens = countTokens(prompt);
            const completionTokens = choices.reduce((sum, choice) =>
                sum + countTokens(choice.message.content || ''), 0
            );
            const totalTokens = promptTokens + completionTokens;

            const response = {
                id: completionId,
                object: 'chat.completion',
                created,
                model,
                choices,
                usage: {
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    total_tokens: totalTokens,
                },
            };

            res.json(response);
        }
    } catch (error) {
        logError(`Error in chat completions handler: ${error}`);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('model') && errorMessage.includes('not found')) {
            res.status(404).json({
                error: {
                    message: `Model '${model}' not found`,
                    type: 'invalid_request_error',
                    code: 'model_not_found',
                },
            });
            return;
        }

        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                code: 'internal_error',
            },
        });
    }
};
