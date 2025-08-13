/**
 * Transparent Ollama API proxy with intelligent placement
 * Maintains exact same API behavior while adding smart routing
 */

import { Request, Response, Router } from 'express';
import { UniversalQueueService } from '../services/universal-queue.service.js';
import { QueueProxyService } from '../services/queue-proxy.service.js';
import { StreamingHandlerService } from '../services/streaming-handler.service.js';
import { JobBuilder } from '../utils/job-builder.js';
import { JobType } from 'shared/types/universal-job';
import { TaskType, OutputFormat, JobPriority } from 'shared/types/model-selection';
import { logger } from '../../../shared/logging/logger.js';

export class OllamaProxyController {
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
        // Generation endpoints
        this.router.post('/api/generate', this.handleGenerate.bind(this));
        this.router.post('/api/chat', this.handleChat.bind(this));
        this.router.post('/api/embeddings', this.handleEmbeddings.bind(this));

        // Model management
        this.router.post('/api/pull', this.handlePull.bind(this));
        this.router.post('/api/push', this.handlePush.bind(this));
        this.router.post('/api/create', this.handleCreate.bind(this));
        this.router.delete('/api/delete', this.handleDelete.bind(this));
        this.router.post('/api/copy', this.handleCopy.bind(this));
        this.router.post('/api/show', this.handleShow.bind(this));

        // Information endpoints
        this.router.get('/api/tags', this.handleTags.bind(this));
        this.router.get('/api/ps', this.handlePS.bind(this));
        this.router.get('/api/version', this.handleVersion.bind(this));
    }

    /**
     * Handle /api/generate - Main text generation endpoint
     */
    private async handleGenerate(req: Request, res: Response): Promise<void> {
        try {
            const { model, prompt, stream = false, context, options } = req.body;

            if (!model || !prompt) {
                res.status(400).json({ error: 'Model and prompt are required' });
                return;
            }

            logger.info('OllamaProxy: Processing generate request', {
                model,
                stream,
                promptLength: prompt.length
            });

            // Determine task type from prompt content
            const taskType = this.inferTaskType(prompt);

            const job = new JobBuilder(JobType.OLLAMA_GENERATE, {
                model,
                prompt,
                context,
                options,
                stream
            })
                .withTaskType(taskType)
                .withModel(model)
                .withQualityPreference(true) // Default to quality for generation
                .withOutputFormat(OutputFormat.PLAIN_TEXT)
                .withPriority(JobPriority.NORMAL)
                .build();

            if (stream) {
                // Handle streaming response
                await this.handleStreamingJob(job, req, res);
            } else {
                // Handle regular response
                const result = await this.queueService.submitJob(job);
                res.json(result);
            }

        } catch (error) {
            logger.error('OllamaProxy: Generate request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handle /api/chat - Chat completion endpoint
     */
    private async handleChat(req: Request, res: Response): Promise<void> {
        try {
            const { model, messages, stream = false, options } = req.body;

            if (!model || !messages || !Array.isArray(messages)) {
                res.status(400).json({ error: 'Model and messages are required' });
                return;
            }

            logger.info('OllamaProxy: Processing chat request', {
                model,
                stream,
                messageCount: messages.length
            });

            const job = new JobBuilder(JobType.OLLAMA_CHAT, {
                model,
                messages,
                options,
                stream
            })
                .withTaskType(TaskType.CONVERSATION)
                .withModel(model)
                .withQualityPreference(false) // Prefer speed for chat
                .withOutputFormat(OutputFormat.PLAIN_TEXT)
                .withPriority(JobPriority.HIGH)
                .build();

            if (stream) {
                await this.handleStreamingJob(job, req, res);
            } else {
                const result = await this.queueService.submitJob(job);
                res.json(result);
            }

        } catch (error) {
            logger.error('OllamaProxy: Chat request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handle /api/embeddings - Generate embeddings
     */
    private async handleEmbeddings(req: Request, res: Response): Promise<void> {
        try {
            const { model, prompt } = req.body;

            if (!model || !prompt) {
                res.status(400).json({ error: 'Model and prompt are required' });
                return;
            }

            logger.info('OllamaProxy: Processing embeddings request', {
                model,
                promptLength: prompt.length
            });

            const job = new JobBuilder(JobType.OLLAMA_EMBEDDINGS, {
                model,
                prompt
            })
                .withTaskType(TaskType.EMBEDDING_GENERATION)
                .withModel(model)
                .withQualityPreference(true) // Quality important for embeddings
                .withPriority(JobPriority.NORMAL)
                .build();

            const result = await this.queueService.submitJob(job);
            res.json(result);

        } catch (error) {
            logger.error('OllamaProxy: Embeddings request failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handle model management endpoints
     */
    private async handlePull(req: Request, res: Response): Promise<void> {
        try {
            const { name, stream = false } = req.body;

            if (!name) {
                res.status(400).json({ error: 'Model name is required' });
                return;
            }

            const job = new JobBuilder(JobType.OLLAMA_PULL, { name, stream })
                .withModel(name)
                .withPriority(JobPriority.LOW)
                .build();

            if (stream) {
                await this.handleStreamingJob(job, req, res);
            } else {
                const result = await this.queueService.submitJob(job);
                res.json(result);
            }

        } catch (error) {
            this.handleError(res, 'Pull request failed', error);
        }
    }

    private async handlePush(req: Request, res: Response): Promise<void> {
        try {
            const { name, stream = false } = req.body;

            const job = new JobBuilder(JobType.OLLAMA_PUSH, { name, stream })
                .withModel(name)
                .withPriority(JobPriority.LOW)
                .build();

            if (stream) {
                await this.handleStreamingJob(job, req, res);
            } else {
                const result = await this.queueService.submitJob(job);
                res.json(result);
            }

        } catch (error) {
            this.handleError(res, 'Push request failed', error);
        }
    }

    private async handleCreate(req: Request, res: Response): Promise<void> {
        try {
            const { name, modelfile, stream = false } = req.body;

            const job = new JobBuilder(JobType.OLLAMA_CREATE, { name, modelfile, stream })
                .withModel(name)
                .withPriority(JobPriority.LOW)
                .build();

            if (stream) {
                await this.handleStreamingJob(job, req, res);
            } else {
                const result = await this.queueService.submitJob(job);
                res.json(result);
            }

        } catch (error) {
            this.handleError(res, 'Create request failed', error);
        }
    }

    private async handleDelete(req: Request, res: Response): Promise<void> {
        try {
            const { name } = req.body;

            const job = new JobBuilder(JobType.OLLAMA_DELETE, { name })
                .withModel(name)
                .withPriority(JobPriority.LOW)
                .build();

            const result = await this.queueService.submitJob(job);
            res.json(result);

        } catch (error) {
            this.handleError(res, 'Delete request failed', error);
        }
    }

    private async handleCopy(req: Request, res: Response): Promise<void> {
        try {
            const { source, destination } = req.body;

            const job = new JobBuilder(JobType.OLLAMA_COPY, { source, destination })
                .withModel(source)
                .withPriority(JobPriority.LOW)
                .build();

            const result = await this.queueService.submitJob(job);
            res.json(result);

        } catch (error) {
            this.handleError(res, 'Copy request failed', error);
        }
    }

    private async handleShow(req: Request, res: Response): Promise<void> {
        try {
            const { name } = req.body;

            const job = new JobBuilder(JobType.OLLAMA_SHOW, { name })
                .withModel(name)
                .withPriority(JobPriority.HIGH) // Information requests are high priority
                .build();

            const result = await this.queueService.submitJob(job);
            res.json(result);

        } catch (error) {
            this.handleError(res, 'Show request failed', error);
        }
    }

    private async handleTags(req: Request, res: Response): Promise<void> {
        try {
            const job = new JobBuilder(JobType.OLLAMA_TAGS, {})
                .withPriority(JobPriority.HIGH)
                .build();

            const result = await this.queueService.submitJob(job);
            res.json(result);

        } catch (error) {
            this.handleError(res, 'Tags request failed', error);
        }
    }

    private async handlePS(req: Request, res: Response): Promise<void> {
        try {
            const job = new JobBuilder(JobType.OLLAMA_PS, {})
                .withPriority(JobPriority.HIGH)
                .build();

            const result = await this.queueService.submitJob(job);
            res.json(result);

        } catch (error) {
            this.handleError(res, 'PS request failed', error);
        }
    }

    private async handleVersion(req: Request, res: Response): Promise<void> {
        try {
            // Version can be handled locally or proxied
            res.json({ version: '0.1.0-queue-proxy' });
        } catch (error) {
            this.handleError(res, 'Version request failed', error);
        }
    }

    /**
     * Handle streaming jobs
     */
    private async handleStreamingJob(job: any, req: Request, res: Response): Promise<void> {
        try {
            // Set appropriate headers for streaming
            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Submit job and get server URL for streaming
            const scheduleResult = await this.queueService.submitJob(job);

            if (!scheduleResult.success || !scheduleResult.serverUrl) {
                throw new Error('Failed to schedule streaming job');
            }

            // Create streaming request to the selected server
            const stream = await this.streamingHandler.handleStreamingRequest({
                url: `${scheduleResult.serverUrl}/api${req.path}`,
                method: 'POST',
                headers: req.headers as Record<string, string>,
                body: req.body
            });

            // Monitor the stream
            const monitoredStream = this.streamingHandler.createMonitoredStream(stream, job.id);

            // Pipe the stream to response
            monitoredStream.pipe(res);

        } catch (error) {
            logger.error('OllamaProxy: Streaming job failed', {
                jobId: job.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Streaming failed',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }

    /**
     * Infer task type from prompt content
     */
    private inferTaskType(prompt: string): TaskType {
        const lowerPrompt = prompt.toLowerCase();

        if (lowerPrompt.includes('code') || lowerPrompt.includes('function') || lowerPrompt.includes('class')) {
            return TaskType.CODE_GENERATION;
        } else if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
            return TaskType.SUMMARIZATION;
        } else if (lowerPrompt.includes('translate')) {
            return TaskType.TRANSLATION;
        } else if (lowerPrompt.includes('question') || lowerPrompt.includes('what') || lowerPrompt.includes('how')) {
            return TaskType.QUESTION_ANSWERING;
        } else if (lowerPrompt.includes('story') || lowerPrompt.includes('creative') || lowerPrompt.includes('write')) {
            return TaskType.CREATIVE_WRITING;
        } else {
            return TaskType.CONVERSATION;
        }
    }

    /**
     * Handle errors consistently
     */
    private handleError(res: Response, message: string, error: any): void {
        logger.error(`OllamaProxy: ${message}`, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (!res.headersSent) {
            res.status(500).json({
                error: message,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get the router instance
     */
    getRouter(): Router {
        return this.router;
    }
}
