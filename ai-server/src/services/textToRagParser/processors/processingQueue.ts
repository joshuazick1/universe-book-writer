/**
 * Processing queue system for text-to-RAG parsing jobs
 */

import { EventEmitter } from 'events';
import { ProcessingJob, QueuedJob, ParsingOptions, ProcessingResult } from '../core/interfaces.js';
import { logger } from '../../../../../shared/logging/logger.js';

export interface QueueConfig {
    maxConcurrentJobs: number;
    jobTimeout: number; // milliseconds
    retryDelay: number; // milliseconds
    maxRetries: number;
    persistenceEnabled: boolean;
    cleanupInterval: number; // milliseconds
}

export interface QueueStats {
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    queueDepth: number;
}

export class ProcessingQueue extends EventEmitter {
    private queue: QueuedJob[] = [];
    private activeJobs: Map<string, ProcessingJob> = new Map();
    private completedJobs: Map<string, ProcessingJob> = new Map();
    private failedJobs: Map<string, ProcessingJob> = new Map();
    private config: QueueConfig;
    private isRunning = false;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(config: Partial<QueueConfig> = {}) {
        super();

        this.config = {
            maxConcurrentJobs: 3,
            jobTimeout: 300000, // 5 minutes
            retryDelay: 5000, // 5 seconds
            maxRetries: 3,
            persistenceEnabled: false,
            cleanupInterval: 3600000, // 1 hour
            ...config
        };

        this.setupCleanup();
    }

    /**
     * Add a new job to the queue
     */
    async addJob(
        sourceText: string,
        options: ParsingOptions,
        processor: (job: ProcessingJob) => Promise<ProcessingResult>
    ): Promise<string> {
        const job: ProcessingJob = {
            id: this.generateJobId(),
            status: 'pending',
            type: 'text_parsing',
            universeId: options.universeId,
            userId: options.userId,
            sourceText,
            chunks: [], // Will be populated during processing
            createdAt: new Date()
        };

        const queuedJob: QueuedJob = {
            job,
            priority: this.calculatePriority(sourceText, options),
            retryCount: 0,
            maxRetries: this.config.maxRetries
        };

        // Store the processor function for this job
        (queuedJob as any).processor = processor;

        // Insert job in priority order
        this.insertByPriority(queuedJob);

        logger.info(`Job ${job.id} added to queue (priority: ${queuedJob.priority})`);

        this.emit('jobAdded', job);

        // Start processing if not already running
        if (!this.isRunning) {
            this.startProcessing();
        }

        return job.id;
    }

    /**
     * Get job status
     */
    getJobStatus(jobId: string): ProcessingJob | null {
        // Check active jobs first
        const activeJob = this.activeJobs.get(jobId);
        if (activeJob) return activeJob;

        // Check completed jobs
        const completedJob = this.completedJobs.get(jobId);
        if (completedJob) return completedJob;

        // Check failed jobs
        const failedJob = this.failedJobs.get(jobId);
        if (failedJob) return failedJob;

        // Check queued jobs
        const queuedJob = this.queue.find(qj => qj.job.id === jobId);
        return queuedJob?.job || null;
    }

    /**
     * Get job results (only for completed jobs)
     */
    getJobResults(jobId: string): ProcessingResult | null {
        const job = this.completedJobs.get(jobId);
        return job?.results || null;
    }

    /**
     * Cancel a job
     */
    cancelJob(jobId: string): boolean {
        // Remove from queue if pending
        const queueIndex = this.queue.findIndex(qj => qj.job.id === jobId);
        if (queueIndex !== -1) {
            const queuedJob = this.queue.splice(queueIndex, 1)[0];
            queuedJob.job.status = 'failed';
            queuedJob.job.error = 'Cancelled by user';
            this.failedJobs.set(jobId, queuedJob.job);
            this.emit('jobCancelled', queuedJob.job);
            logger.info(`Job ${jobId} cancelled (was pending)`);
            return true;
        }

        // Cancel active job (implementation would depend on how to interrupt processing)
        const activeJob = this.activeJobs.get(jobId);
        if (activeJob) {
            activeJob.status = 'failed';
            activeJob.error = 'Cancelled by user';
            activeJob.completedAt = new Date();
            this.activeJobs.delete(jobId);
            this.failedJobs.set(jobId, activeJob);
            this.emit('jobCancelled', activeJob);
            logger.info(`Job ${jobId} cancelled (was active)`);
            return true;
        }

        return false;
    }

    /**
     * Get queue statistics
     */
    getStats(): QueueStats {
        const allJobs = [
            ...Array.from(this.activeJobs.values()),
            ...Array.from(this.completedJobs.values()),
            ...Array.from(this.failedJobs.values()),
            ...this.queue.map(qj => qj.job)
        ];

        const completedJobsArray = Array.from(this.completedJobs.values());
        const processingTimes = completedJobsArray
            .filter(job => job.startedAt && job.completedAt)
            .map(job => job.completedAt!.getTime() - job.startedAt!.getTime());

        const averageProcessingTime = processingTimes.length > 0
            ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
            : 0;

        return {
            totalJobs: allJobs.length,
            pendingJobs: this.queue.length,
            processingJobs: this.activeJobs.size,
            completedJobs: this.completedJobs.size,
            failedJobs: this.failedJobs.size,
            averageProcessingTime,
            queueDepth: this.queue.length
        };
    }

    /**
     * Start queue processing
     */
    private startProcessing(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        logger.info('Processing queue started');
        this.processNext();
    }

    /**
     * Stop queue processing
     */
    stop(): void {
        this.isRunning = false;
        logger.info('Processing queue stopped');

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }

    /**
     * Process the next job in the queue
     */
    private async processNext(): Promise<void> {
        if (!this.isRunning) return;

        // Check if we can process more jobs
        if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
            // Check again in a second
            setTimeout(() => this.processNext(), 1000);
            return;
        }

        // Get next job from queue
        const queuedJob = this.queue.shift();
        if (!queuedJob) {
            // No jobs to process, check again in a second
            setTimeout(() => this.processNext(), 1000);
            return;
        }

        const job = queuedJob.job;
        const processor = (queuedJob as any).processor;

        // Start processing the job
        job.status = 'processing';
        job.startedAt = new Date();
        this.activeJobs.set(job.id, job);

        logger.info(`Processing job ${job.id} (attempt ${queuedJob.retryCount + 1})`);
        this.emit('jobStarted', job);

        try {
            // Set up timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Job timeout')), this.config.jobTimeout);
            });

            // Race between processing and timeout
            const results = await Promise.race([
                processor(job),
                timeoutPromise
            ]);

            // Job completed successfully
            job.status = 'completed';
            job.results = results;
            job.completedAt = new Date();

            this.activeJobs.delete(job.id);
            this.completedJobs.set(job.id, job);

            logger.info(`Job ${job.id} completed successfully`);
            this.emit('jobCompleted', job, results);

        } catch (error) {
            // Job failed
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Job ${job.id} failed: ${errorMessage}`);

            job.error = errorMessage;
            this.activeJobs.delete(job.id);

            // Retry if possible
            if (queuedJob.retryCount < queuedJob.maxRetries) {
                queuedJob.retryCount++;
                job.status = 'pending';
                delete job.error;

                logger.info(`Retrying job ${job.id} (attempt ${queuedJob.retryCount + 1}/${queuedJob.maxRetries + 1})`);

                // Add back to queue with delay
                setTimeout(() => {
                    this.insertByPriority(queuedJob);
                }, this.config.retryDelay);

            } else {
                // Max retries exceeded
                job.status = 'failed';
                job.completedAt = new Date();
                this.failedJobs.set(job.id, job);

                logger.error(`Job ${job.id} failed permanently after ${queuedJob.retryCount + 1} attempts`);
                this.emit('jobFailed', job, errorMessage);
            }
        }

        // Process next job
        setImmediate(() => this.processNext());
    }

    /**
     * Insert job in queue maintaining priority order
     */
    private insertByPriority(queuedJob: QueuedJob): void {
        const insertIndex = this.queue.findIndex(existing => existing.priority < queuedJob.priority);

        if (insertIndex === -1) {
            this.queue.push(queuedJob);
        } else {
            this.queue.splice(insertIndex, 0, queuedJob);
        }
    }

    /**
     * Calculate job priority based on text length and options
     */
    private calculatePriority(sourceText: string, options: ParsingOptions): number {
        let priority = 10; // Base priority

        // Shorter texts get higher priority
        const textLength = sourceText.length;
        if (textLength < 1000) priority += 5;
        else if (textLength < 5000) priority += 3;
        else if (textLength > 20000) priority -= 2;

        // Chunked processing gets lower priority (longer jobs)
        if (options.useChunking) priority -= 1;

        // Relationship extraction adds complexity
        if (options.enableRelationshipExtraction) priority -= 1;

        return priority;
    }

    /**
     * Generate unique job ID
     */
    private generateJobId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set up periodic cleanup of old jobs
     */
    private setupCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupOldJobs();
        }, this.config.cleanupInterval);
    }

    /**
     * Clean up old completed and failed jobs
     */
    private cleanupOldJobs(): void {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        let cleanedCount = 0;

        // Clean up old completed jobs
        for (const [jobId, job] of this.completedJobs.entries()) {
            if (job.completedAt && job.completedAt < cutoffTime) {
                this.completedJobs.delete(jobId);
                cleanedCount++;
            }
        }

        // Clean up old failed jobs
        for (const [jobId, job] of this.failedJobs.entries()) {
            if (job.completedAt && job.completedAt < cutoffTime) {
                this.failedJobs.delete(jobId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.debug(`Cleaned up ${cleanedCount} old jobs from queue`);
        }
    }
}
