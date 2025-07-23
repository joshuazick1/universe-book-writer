/**
 * OpenAI Compatibility: /v1/completions endpoint
 *
 * POST /v1/completions
 * Legacy text completion endpoint for older models (e.g., text-davinci-003)
 *
 * Request: {
 *   model: string,
 *   prompt: string | string[],
 *   max_tokens?: number,
 *   temperature?: number,
 *   top_p?: number,
 *   frequency_penalty?: number,
 *   presence_penalty?: number,
 *   stop?: string | string[],
 *   n?: number,
 *   stream?: boolean,
 *   logprobs?: number,
 *   top_logprobs?: number,
 *   user?: string,
 *   suffix?: string,
 *   best_of?: number,
 *   echo?: boolean
 * }
 *
 * Response: {
 *   id: string,
 *   object: 'text_completion',
 *   created: number,
 *   model: string,
 *   choices: [{ text: string, index: number, finish_reason: string, logprobs?: object }],
 *   usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
 * }
 */
import { Request, Response, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { getOrchestratorInstance } from '../../orchestrator-instance.js';
import { logger } from '../../../../shared/logging/logger.js';

// Token counting utility (simple approximation)
function countTokens(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters for English text
    // In production, use a proper tokenizer like tiktoken
    return Math.ceil(text.length / 4);
}

// Convert OpenAI parameters to Ollama format
function toOllamaParams(params: any): any {
    return {
        model: params.model,
        prompt: params.prompt,
        stream: params.stream || false,
        options: {
            num_predict: params.max_tokens || 100,
            temperature: params.temperature || 0.7,
            top_p: params.top_p || 1.0,
            repeat_penalty: 1.0 + (params.frequency_penalty || 0) * 0.1,
            presence_penalty: params.presence_penalty || 0,
            stop: Array.isArray(params.stop) ? params.stop : (params.stop ? [params.stop] : undefined),
        },
    };
}

export const openaiCompletionsHandler: RequestHandler = async (req, res): Promise<void> => {
    const {
        model,
        prompt,
        max_tokens = 100,
        temperature = 0.7,
        top_p = 1.0,
        frequency_penalty = 0.0,
        presence_penalty = 0.0,
        stop = null,
        n = 1,
        stream = false,
        logprobs = null,
        top_logprobs = null,
        user = null,
        suffix = null,
        best_of = null,
        echo = false
    } = req.body;

    // Validate required parameters
    if (!model || (!prompt && prompt !== '')) {
        res.status(400).json({
            error: {
                message: 'Missing required fields: model and prompt',
                type: 'invalid_request_error',
                code: 'missing_fields',
            },
        });
        return;
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
    const promptText = typeof prompt === 'string' ? prompt : prompt.join('\n');

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

    const completionId = 'cmpl-' + uuidv4();
    const created = Math.floor(Date.now() / 1000);

    try {
        if (stream) {
            // Handle streaming responses
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

            await orchestrator.tryRequestWithFailover(model, async (server: any) => {
                const ollamaParams = toOllamaParams({ model, prompt: promptText, stream: true, max_tokens, temperature, top_p, frequency_penalty, presence_penalty, stop });

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
                                object: 'text_completion',
                                created,
                                model,
                                choices: [{
                                    text: ollamaChunk.response || '',
                                    index: 0,
                                    finish_reason: ollamaChunk.done ? 'stop' : null,
                                    logprobs: logprobs !== null ? {
                                        tokens: [ollamaChunk.response || ''],
                                        token_logprobs: [Math.log(0.9)], // Placeholder
                                        top_logprobs: null
                                    } : null
                                }]
                            };

                            res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);

                            if (ollamaChunk.done) {
                                res.write('data: [DONE]\n\n');
                                res.end();
                                return;
                            }
                        } catch (parseError) {
                            logger.error(`Error parsing Ollama streaming response: ${parseError}`);
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
                    const ollamaParams = toOllamaParams({ model, prompt: promptText, stream: false, max_tokens, temperature, top_p, frequency_penalty, presence_penalty, stop });

                    const response = await fetch(`${server.url}/api/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ollamaParams),
                    });

                    if (!response.ok) {
                        throw new Error(`Server ${server.url} returned ${response.status}`);
                    }

                    const ollamaResponse = await response.json() as any;

                    let completionText = ollamaResponse.response || '';

                    // Handle echo parameter
                    if (echo) {
                        completionText = promptText + completionText;
                    }

                    // Handle suffix parameter (insert completion between prompt and suffix)
                    if (suffix) {
                        completionText = completionText + suffix;
                    }

                    const choice: any = {
                        text: completionText,
                        index: i,
                        finish_reason: 'stop',
                    };

                    // Add logprobs if requested
                    if (logprobs !== null && logprobs > 0) {
                        const tokens = completionText.split(' ');
                        choice.logprobs = {
                            tokens,
                            token_logprobs: tokens.map(() => Math.log(Math.random() * 0.5 + 0.5)), // Placeholder
                            top_logprobs: top_logprobs ? tokens.map(() =>
                                Array(Math.min(top_logprobs, 5)).fill(null).map(() => ({
                                    token: 'alt_' + Math.random().toString(36).slice(2, 5),
                                    logprob: Math.log(Math.random() * 0.3 + 0.1)
                                }))
                            ) : null,
                            text_offset: tokens.reduce((acc: number[], token: string, idx: number) => {
                                acc.push(idx === 0 ? 0 : acc[idx - 1] + tokens[idx - 1].length + 1);
                                return acc;
                            }, [] as number[])
                        };
                    }

                    choices.push(choice);
                });
            }

            // Calculate token usage
            const promptTokens = countTokens(promptText);
            const completionTokens = choices.reduce((sum, choice) => sum + countTokens(choice.text), 0);
            const totalTokens = promptTokens + completionTokens;

            const response = {
                id: completionId,
                object: 'text_completion',
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
        logger.error(`Error in completions handler: ${error}`);

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
