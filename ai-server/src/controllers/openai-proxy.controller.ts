/**
 * Transparent OpenAI API proxy with intelligent placement
 */

import { Request, Response, Router } from 'express';
import { UniversalQueueService } from '../services/universal-queue.service.js';
import { QueueProxyService } from '../services/queue-proxy.service.js';
import { StreamingHandlerService } from '../services/streaming-handler.service.js';
import { JobBuilder } from '../utils/job-builder.js';
import { JobType } from 'shared/types/universal-job';
import { TaskType, OutputFormat, JobPriority } from 'shared/types/model-selection';
import { logger } from '../../../shared/logging/logger.js';

export class OpenAIProxyController {
    private router: Router;
    private queueService: UniversalQueueService;
    private proxyService: QueueProxyService;
    private streamingHandler: StreamingHandlerService;

    constructor(
        queueService: UniversalQueueService,
        proxyService: QueueProxyService,
        streamingHandler: StreamingHandlerService
    ) {
        this.queueService = queueService;
        this.proxyService = proxyService;
        this.streamingHandler = streamingHandler;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // OpenAI-compatible endpoints
        this.router.post('/v1/chat/completions', this.handleChatCompletions.bind(this));
        this.router.post('/v1/completions', this.handleCompletions.bind(this));
        this.router.post('/v1/embeddings', this.handleEmbeddings.bind(this));
        this.router.get('/v1/models', this.handleModels.bind(this));
    }

    /**
     * Handle /v1/chat/completions - OpenAI Chat API
     */
    private async handleChatCompletions(req: Request, res: Response): Promise<void> {
        try {
            const {
                model,
                messages,
                stream = false,
                temperature,
                max_tokens,
                top_p,
                frequency_penalty,
                presence_penalty,
                stop,
                user
            } = req.body;

            if (!model || !messages || !Array.isArray(messages)) {
                res.status(400).json({
                    error: {
                        message: 'Model and messages are required',
                        type: 'invalid_request_error'
                    }
                });
                return;
            }

            logger.info('OpenAIProxy: Processing chat completions request', {
                model,
                stream,
                messageCount: messages.length
            });

            // Determine task type from messages content
            const taskType = this.inferTaskTypeFromMessages(messages);

            const job = new JobBuilder(JobType.OPENAI_CHAT_COMPLETIONS, {
                model,
                messages,
                stream,
                temperature,
                max_tokens,
                top_p,
                frequency_penalty,
                presence_penalty,
                stop,
                user
            })
                .withTaskType(taskType)
                .withModel(model)
                .withQualityPreference(taskType === TaskType.CODE_GENERATION) // Quality for code
                .withOutputFormat(this.inferOutputFormat(messages))
                .withPriority(stream ? JobPriority.HIGH : JobPriority.NORMAL)
                .build();

            if (stream) {
                // Handle streaming response
                await this.handleStreamingJob(job, req, res, 'openai');
            } else {
                // Handle regular response
                const result = await this.queueService.submitJob(job);

                // Format response to match OpenAI API
                const openaiResponse = this.formatOpenAIResponse(result, model, 'chat.completion');
                res.json(openaiResponse);
            }

        } catch (error) {
            logger.error('OpenAIProxy: Chat completions request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: {
                    message: 'Internal server error',
                    type: 'internal_server_error'
                }
            });
        }
    }

    /**
     * Handle /v1/completions - OpenAI Completions API
     */
    private async handleCompletions(req: Request, res: Response): Promise<void> {
        try {
            const {
                model,
                prompt,
                stream = false,
                temperature,
                max_tokens,
                top_p,
                frequency_penalty,
                presence_penalty,
                stop,
                user
            } = req.body;

            if (!model || !prompt) {
                res.status(400).json({
                    error: {
                        message: 'Model and prompt are required',
                        type: 'invalid_request_error'
                    }
                });
                return;
            }

            logger.info('OpenAIProxy: Processing completions request', {
                model,
                stream,
                promptLength: Array.isArray(prompt) ? prompt.length : prompt.length
            });

            // Determine task type from prompt content
            const taskType = this.inferTaskTypeFromPrompt(prompt);

            const job = new JobBuilder(JobType.OPENAI_COMPLETIONS, {
                model,
                prompt,
                stream,
                temperature,
                max_tokens,
                top_p,
                frequency_penalty,
                presence_penalty,
                stop,
                user
            })
                .withTaskType(taskType)
                .withModel(model)
                .withQualityPreference(taskType === TaskType.CODE_GENERATION)
                .withOutputFormat(this.inferOutputFormatFromPrompt(prompt))
                .withPriority(stream ? JobPriority.HIGH : JobPriority.NORMAL)
                .build();

            if (stream) {
                await this.handleStreamingJob(job, req, res, 'openai');
            } else {
                const result = await this.queueService.submitJob(job);
                const openaiResponse = this.formatOpenAIResponse(result, model, 'text_completion');
                res.json(openaiResponse);
            }

        } catch (error) {
            logger.error('OpenAIProxy: Completions request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: {
                    message: 'Internal server error',
                    type: 'internal_server_error'
                }
            });
        }
    }

    /**
     * Handle /v1/embeddings - OpenAI Embeddings API
     */
    private async handleEmbeddings(req: Request, res: Response): Promise<void> {
        try {
            const { model, input, user } = req.body;

            if (!model || !input) {
                res.status(400).json({
                    error: {
                        message: 'Model and input are required',
                        type: 'invalid_request_error'
                    }
                });
                return;
            }

            logger.info('OpenAIProxy: Processing embeddings request', {
                model,
                inputLength: Array.isArray(input) ? input.length : input.length
            });

            const job = new JobBuilder(JobType.OPENAI_EMBEDDINGS, {
                model,
                input,
                user
            })
                .withTaskType(TaskType.EMBEDDING_GENERATION)
                .withModel(model)
                .withQualityPreference(true) // Quality important for embeddings
                .withPriority(JobPriority.NORMAL)
                .build();

            const result = await this.queueService.submitJob(job);
            const openaiResponse = this.formatEmbeddingsResponse(result, model);
            res.json(openaiResponse);

        } catch (error) {
            logger.error('OpenAIProxy: Embeddings request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: {
                    message: 'Internal server error',
                    type: 'internal_server_error'
                }
            });
        }
    }

    /**
     * Handle /v1/models - List available models
     */
    private async handleModels(req: Request, res: Response): Promise<void> {
        try {
            // Get available models from the queue service
            const models = await this.queueService.getAvailableModels();

            const openaiModels = models.map((model: string) => ({
                id: model,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'universe-book-writer'
            }));

            res.json({
                object: 'list',
                data: openaiModels
            });

        } catch (error) {
            logger.error('OpenAIProxy: Models request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: {
                    message: 'Internal server error',
                    type: 'internal_server_error'
                }
            });
        }
    }

    /**
     * Handle streaming jobs with OpenAI-compatible SSE format
     */
    private async handleStreamingJob(job: any, req: Request, res: Response, format: 'openai'): Promise<void> {
        try {
            // Set appropriate headers for Server-Sent Events
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Submit job and get server URL for streaming
            const scheduleResult = await this.queueService.submitJob(job);

            if (!scheduleResult.success || !scheduleResult.serverUrl) {
                throw new Error('Failed to schedule streaming job');
            }

            // Create streaming request to the selected server
            const stream = await this.streamingHandler.handleStreamingRequest({
                url: `${scheduleResult.serverUrl}/v1${req.path}`,
                method: 'POST',
                headers: req.headers as Record<string, string>,
                body: req.body
            });

            // Monitor and forward the stream
            const monitoredStream = this.streamingHandler.createMonitoredStream(stream, job.id);
            monitoredStream.pipe(res);

        } catch (error) {
            logger.error('OpenAIProxy: Streaming job failed', {
                jobId: job.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            if (!res.headersSent) {
                res.status(500).json({
                    error: {
                        message: 'Streaming failed',
                        type: 'internal_server_error'
                    }
                });
            }
        }
    }

    /**
     * Format response to match OpenAI API structure
     */
    private formatOpenAIResponse(result: any, model: string, object: string): any {
        const timestamp = Math.floor(Date.now() / 1000);

        if (object === 'chat.completion') {
            return {
                id: `chatcmpl-${this.generateId()}`,
                object: 'chat.completion',
                created: timestamp,
                model: model,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: result.response || result.message || ''
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: result.prompt_tokens || 0,
                    completion_tokens: result.completion_tokens || 0,
                    total_tokens: (result.prompt_tokens || 0) + (result.completion_tokens || 0)
                }
            };
        } else if (object === 'text_completion') {
            return {
                id: `cmpl-${this.generateId()}`,
                object: 'text_completion',
                created: timestamp,
                model: model,
                choices: [{
                    text: result.response || result.message || '',
                    index: 0,
                    logprobs: null,
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: result.prompt_tokens || 0,
                    completion_tokens: result.completion_tokens || 0,
                    total_tokens: (result.prompt_tokens || 0) + (result.completion_tokens || 0)
                }
            };
        }

        return result;
    }

    /**
     * Format embeddings response to match OpenAI API
     */
    private formatEmbeddingsResponse(result: any, model: string): any {
        return {
            object: 'list',
            data: Array.isArray(result.data) ? result.data : [{
                object: 'embedding',
                embedding: result.embedding || [],
                index: 0
            }],
            model: model,
            usage: {
                prompt_tokens: result.prompt_tokens || 0,
                total_tokens: result.prompt_tokens || 0
            }
        };
    }

    /**
     * Infer task type from messages
     */
    private inferTaskTypeFromMessages(messages: any[]): TaskType {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || !lastMessage.content) {
            return TaskType.CONVERSATION;
        }

        return this.inferTaskTypeFromPrompt(lastMessage.content);
    }

    /**
     * Infer task type from prompt content
     */
    private inferTaskTypeFromPrompt(prompt: string | string[]): TaskType {
        const text = Array.isArray(prompt) ? prompt.join(' ') : prompt;
        const lowerText = text.toLowerCase();

        if (lowerText.includes('code') || lowerText.includes('function') || lowerText.includes('class')) {
            return TaskType.CODE_GENERATION;
        } else if (lowerText.includes('summarize') || lowerText.includes('summary')) {
            return TaskType.SUMMARIZATION;
        } else if (lowerText.includes('translate')) {
            return TaskType.TRANSLATION;
        } else if (lowerText.includes('json') || lowerText.includes('structure')) {
            return TaskType.JSON_GENERATION;
        } else if (lowerText.includes('question') || lowerText.includes('what') || lowerText.includes('how')) {
            return TaskType.QUESTION_ANSWERING;
        } else if (lowerText.includes('story') || lowerText.includes('creative') || lowerText.includes('write')) {
            return TaskType.CREATIVE_WRITING;
        } else {
            return TaskType.CONVERSATION;
        }
    }

    /**
     * Infer output format from messages
     */
    private inferOutputFormat(messages: any[]): OutputFormat {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || !lastMessage.content) {
            return OutputFormat.PLAIN_TEXT;
        }

        return this.inferOutputFormatFromPrompt(lastMessage.content);
    }

    /**
     * Infer output format from prompt
     */
    private inferOutputFormatFromPrompt(prompt: string | string[]): OutputFormat {
        const text = Array.isArray(prompt) ? prompt.join(' ') : prompt;
        const lowerText = text.toLowerCase();

        if (lowerText.includes('json')) {
            return OutputFormat.JSON;
        } else if (lowerText.includes('markdown')) {
            return OutputFormat.MARKDOWN;
        } else if (lowerText.includes('code') || lowerText.includes('function')) {
            return OutputFormat.CODE;
        } else if (lowerText.includes('xml')) {
            return OutputFormat.XML;
        } else {
            return OutputFormat.PLAIN_TEXT;
        }
    }

    /**
     * Generate a random ID for responses
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get the router instance
     */
    getRouter(): Router {
        return this.router;
    }
}
