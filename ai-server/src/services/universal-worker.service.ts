/**
 * Universal Worker Service - Executes jobs from the queue system
 * Provides centralized job execution with specialized handlers
 */

import { JobType, UniversalJob, JobId } from 'shared/types/universal-job';
import { ServerId } from 'shared/types/server';
import { JobExecutionResult, UniversalQueueService } from './universal-queue.service.js';
import { logger } from '../../../shared/logging/logger.js';

export interface JobExecutor {
    readonly supportedJobTypes: JobType[];
    executeJob(job: UniversalJob, serverId: ServerId): Promise<JobExecutionResult>;
}

export class UniversalWorkerService {
    private isRunning = false;
    private workerInterval: NodeJS.Timeout | null = null;
    private executorRegistry = new Map<JobType, JobExecutor>();
    private queueService: UniversalQueueService | null = null;

    constructor(
        private readonly pollIntervalMs = 1000 // Poll every 1 second
    ) { }

    /**
     * Initialize the worker with a queue service
     */
    public initialize(queueService: UniversalQueueService): void {
        this.queueService = queueService;
    }

    /**
     * Register a job executor for specific job types
     */
    public registerExecutor(executor: JobExecutor): void {
        for (const jobType of executor.supportedJobTypes) {
            this.executorRegistry.set(jobType, executor);
            logger.info(`[UniversalWorker] Registered executor for job type: ${jobType}`);
        }
    }

    /**
     * Start the worker to process jobs
     */
    public start(): void {
        if (this.isRunning) {
            logger.warn('[UniversalWorker] Worker is already running');
            return;
        }

        this.isRunning = true;
        logger.info('[UniversalWorker] Starting worker service');

        this.workerInterval = setInterval(async () => {
            await this.processJobs();
        }, this.pollIntervalMs);
    }

    /**
     * Stop the worker
     */
    public stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.workerInterval) {
            clearInterval(this.workerInterval);
            this.workerInterval = null;
        }
        logger.info('[UniversalWorker] Worker service stopped');
    }

    /**
     * Process jobs from all server queues
     */
    private async processJobs(): Promise<void> {
        if (!this.queueService) {
            logger.error('[UniversalWorker] Queue service not initialized');
            return;
        }

        const servers = this.queueService.getAllServers();

        // Debug: Log server processing status
        const serverStatuses = servers.map(server => ({
            id: server.id,
            healthy: server.isHealthy,
            queueLength: this.queueService?.getServerQueueLength(server.id) || 0,
            hasRunningJob: this.queueService?.hasRunningJobOnServer(server.id) || false
        }));

        const activeServers = serverStatuses.filter(s => s.healthy && (s.queueLength > 0 || s.hasRunningJob));
        if (activeServers.length > 0) {
            logger.info(`[UniversalWorker] Processing ${servers.length} servers, ${activeServers.length} active: ${JSON.stringify(activeServers)}`);
        }

        for (const server of servers) {
            // Skip unhealthy servers
            if (!server.isHealthy) {
                continue;
            }

            // Check if this server already has a running job to avoid concurrent execution
            const hasRunningJob = this.queueService.hasRunningJobOnServer(server.id);
            if (hasRunningJob) {
                continue; // Skip this server, let the current job finish first
            }

            // Process one job at a time per server to avoid overload
            const job = this.queueService.dequeueFromServer(server.id);
            if (job) {
                logger.info(`[UniversalWorker] Starting job ${job.id} (${job.type}) on server ${server.id}`);
                await this.executeJob(job, server.id);
            }
        }
    }

    /**
     * Execute a single job
     */
    private async executeJob(job: UniversalJob, serverId: ServerId): Promise<void> {
        if (!this.queueService) {
            logger.error('[UniversalWorker] Queue service not initialized');
            return;
        }

        const startTime = Date.now();
        logger.info(`[UniversalWorker] Executing job ${job.id} of type ${job.type} on server ${serverId}`);

        try {
            // Find appropriate executor
            const executor = this.executorRegistry.get(job.type);
            if (!executor) {
                throw new Error(`No executor registered for job type: ${job.type}`);
            }

            // Execute the job
            const result = await executor.executeJob(job, serverId);

            // Mark job as completed
            await this.queueService.completeJob(job.id, result);

            const duration = Date.now() - startTime;
            logger.info(`[UniversalWorker] Completed job ${job.id} in ${duration}ms`);

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error(`[UniversalWorker] Failed to execute job ${job.id}: ${errorMessage}`);

            // Mark job as failed
            const failureResult: JobExecutionResult = {
                jobId: job.id,
                success: false,
                error: errorMessage,
                executionTimeMs: duration,
                serverId: serverId
            };

            await this.queueService.completeJob(job.id, failureResult);
        }
    }

    /**
     * Get worker status
     */
    public getStatus() {
        return {
            isRunning: this.isRunning,
            registeredExecutors: Array.from(this.executorRegistry.keys()),
            pollIntervalMs: this.pollIntervalMs
        };
    }
}

// Export singleton instance
export const universalWorkerService = new UniversalWorkerService();
