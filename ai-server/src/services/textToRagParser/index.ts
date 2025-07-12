/**
 * Text-to-RAG Parser Service
 * Main entry point for the backend text parsing service
 */

import { EventEmitter } from 'events';
import { ProcessingQueue, QueueConfig, QueueStats } from './processors/processingQueue.js';
import { ParserEngine } from './core/parserEngine.js';
import {
    ProcessingJob,
    ProcessingResult,
    ParsingOptions
} from './core/interfaces.js';
import { logger } from '../../../../shared/logging/logger.js';

export interface TextToRAGServiceConfig {
    aiServerUrl?: string;
    queueConfig?: Partial<QueueConfig>;
    enableMetrics?: boolean;
}

export class TextToRAGParserService extends EventEmitter {
    private processingQueue: ProcessingQueue;
    private parserEngine: ParserEngine;
    private isInitialized = false;

    constructor(config: TextToRAGServiceConfig = {}) {
        super();

        const aiServerUrl = config.aiServerUrl || 'http://localhost:5100';

        this.processingQueue = new ProcessingQueue(config.queueConfig);
        this.parserEngine = new ParserEngine(aiServerUrl);

        // Forward events from queue and parser
        this.setupEventForwarding();
    }

    /**
     * Initialize the service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            logger.info('Initializing Text-to-RAG Parser Service...');

            // Initialize parser engine (which will initialize RAG service)
            await this.parserEngine.initialize();

            this.isInitialized = true;
            logger.info('Text-to-RAG Parser Service initialized successfully');

        } catch (error) {
            logger.error(`Failed to initialize Text-to-RAG Parser Service: ${error}`);
            throw error;
        }
    }

    /**
     * Parse text and return job ID for tracking
     */
    async parseText(
        sourceText: string,
        options: ParsingOptions
    ): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        if (!sourceText || sourceText.trim().length === 0) {
            throw new Error('Source text cannot be empty');
        }

        logger.info(`Starting text parsing: ${sourceText.length} characters, universe: ${options.universeId}`);

        // Add job to processing queue
        const jobId = await this.processingQueue.addJob(
            sourceText,
            options,
            (job: ProcessingJob) => this.parserEngine.processJob(job)
        );

        logger.info(`Text parsing job created: ${jobId}`);
        return jobId;
    }

    /**
     * Get the status of a parsing job
     */
    getJobStatus(jobId: string): ProcessingJob | null {
        return this.processingQueue.getJobStatus(jobId);
    }

    /**
     * Get the results of a completed parsing job
     */
    getJobResults(jobId: string): ProcessingResult | null {
        return this.processingQueue.getJobResults(jobId);
    }

    /**
     * Cancel a parsing job
     */
    cancelJob(jobId: string): boolean {
        return this.processingQueue.cancelJob(jobId);
    }

    /**
     * Get queue statistics
     */
    getQueueStats(): QueueStats {
        return this.processingQueue.getStats();
    }

    /**
     * Parse text synchronously (for smaller texts)
     */
    async parseTextSync(
        sourceText: string,
        options: ParsingOptions
    ): Promise<ProcessingResult> {
        if (!this.isInitialized) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        logger.info(`Starting synchronous text parsing: ${sourceText.length} characters`);

        // Create a temporary job
        const job: ProcessingJob = {
            id: `sync_${Date.now()}`,
            status: 'pending',
            type: 'text_parsing',
            universeId: options.universeId,
            userId: options.userId,
            sourceText,
            chunks: [],
            createdAt: new Date()
        };

        // Process directly with parser engine
        return await this.parserEngine.processJob(job);
    }

    /**
     * Get service health status
     */
    async getHealthStatus(): Promise<{
        healthy: boolean;
        details: {
            initialized: boolean;
            queueStats: QueueStats;
            lastError?: string;
        };
    }> {
        const queueStats = this.getQueueStats();

        // Service is healthy if:
        // 1. It's initialized
        // 2. Either no jobs have been processed yet, OR failure rate is less than 10%
        const isHealthy = this.isInitialized && (
            queueStats.totalJobs === 0 ||
            queueStats.failedJobs < queueStats.totalJobs * 0.1
        );

        return {
            healthy: isHealthy,
            details: {
                initialized: this.isInitialized,
                queueStats
            }
        };
    }

    /**
     * Shutdown the service gracefully
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down Text-to-RAG Parser Service...');

        // Stop the processing queue
        this.processingQueue.stop();

        // Remove event listeners
        this.removeAllListeners();

        this.isInitialized = false;
        logger.info('Text-to-RAG Parser Service shut down');
    }

    /**
     * Set up event forwarding from queue and parser
     */
    private setupEventForwarding(): void {
        // Forward queue events
        this.processingQueue.on('jobAdded', (job) => {
            this.emit('jobAdded', job);
        });

        this.processingQueue.on('jobStarted', (job) => {
            this.emit('jobStarted', job);
        });

        this.processingQueue.on('jobCompleted', (job, results) => {
            this.emit('jobCompleted', job, results);
        });

        this.processingQueue.on('jobFailed', (job, error) => {
            this.emit('jobFailed', job, error);
        });

        this.processingQueue.on('jobCancelled', (job) => {
            this.emit('jobCancelled', job);
        });

        // Forward parser events
        this.parserEngine.on('jobProgress', (jobId, progress) => {
            this.emit('jobProgress', jobId, progress);
        });
    }
}

// Export types and utilities
export * from './core/interfaces.js';
export * from './core/entityTypes.js';
export * from './utils/textChunker.js';
export * from './utils/jsonParser.js';

// Create singleton instance for easy access
let serviceInstance: TextToRAGParserService | null = null;

/**
 * Get or create the service singleton
 */
export function getTextToRAGParserService(config?: TextToRAGServiceConfig): TextToRAGParserService {
    if (!serviceInstance) {
        serviceInstance = new TextToRAGParserService(config);
    }
    return serviceInstance;
}

/**
 * Initialize the service singleton
 */
export async function initializeTextToRAGParserService(config?: TextToRAGServiceConfig): Promise<TextToRAGParserService> {
    const service = getTextToRAGParserService(config);
    await service.initialize();
    return service;
}
