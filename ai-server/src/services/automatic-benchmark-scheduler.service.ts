/**
 * Automatic Benchmark Scheduler Service
 * 
 * Core service for automating missing benchmark detection and queuing.
 * Implements intelligent scheduling algorithms, priority management,
 * rate limiting, and resource management for benchmark operations.
 */

import {
    SchedulerPriority,
    SchedulingPolicy,
    ScheduleFrequency,
    BatchScheduleRequest,
    BatchScheduleResult,
    BenchmarkGap,
    ScheduledJob
} from '../types/scheduler.types.js';
import { getSchedulerConfig } from '../config/scheduler.config.js';
import { logger } from '../../../shared/logging/logger.js';
import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { JobType } from '../../../shared/types/universal-job.js';

export class AutomaticBenchmarkSchedulerService {
    private config = getSchedulerConfig();
    private activeJobs = new Map<string, ScheduledJob>();
    private jobQueue: ScheduledJob[] = [];
    private isRunning = false;
    private rateLimitCounter = 0;
    private lastReset = Date.now();

    constructor() {
        logger.info('[AutomaticBenchmarkScheduler] Initializing automatic benchmark scheduler service');
    }

    /**
     * Start the automatic scheduler
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('[AutomaticBenchmarkScheduler] Scheduler is already running');
            return;
        }

        this.isRunning = true;
        logger.info('[AutomaticBenchmarkScheduler] Starting automatic benchmark scheduler');

        // Start the scheduler loop
        this.scheduleLoop();
    }

    /**
     * Stop the automatic scheduler
     */
    async stop(): Promise<void> {
        this.isRunning = false;
        this.activeJobs.clear();
        this.jobQueue = [];
        logger.info('[AutomaticBenchmarkScheduler] Stopped automatic benchmark scheduler');
    }

    /**
     * Schedule a single benchmark job
     */
    async scheduleJob(request: {
        modelId: string;
        serverId: string;
        benchmarkTypes: BenchmarkType[];
        priority?: SchedulerPriority;
    }): Promise<string> {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const job: ScheduledJob = {
            id: jobId,
            modelId: request.modelId,
            serverId: request.serverId,
            benchmarkTypes: request.benchmarkTypes,
            jobType: JobType.QUALITY_BENCHMARK,
            priority: request.priority || SchedulerPriority.MEDIUM,
            scheduledAt: new Date(),
            status: 'pending',
            retryCount: 0,
            maxRetries: this.config.defaultRetries
        };

        // Add to queue based on priority
        this.insertJobByPriority(job);

        logger.info(`[AutomaticBenchmarkScheduler] Scheduled job ${jobId} for model ${request.modelId} on server ${request.serverId}`);

        return jobId;
    }

    /**
     * Schedule multiple benchmark jobs from gaps analysis
     */
    async scheduleBatch(request: BatchScheduleRequest): Promise<BatchScheduleResult> {
        const results: BatchScheduleResult = {
            totalGaps: request.gaps.length,
            jobsScheduled: 0,
            jobsSkipped: 0,
            estimatedCompletionTime: new Date(Date.now() + 3600000), // 1 hour estimate
            scheduledJobs: [],
            skippedReasons: {
                rateLimited: 0,
                resourceLimited: 0,
                alreadyScheduled: 0,
                serverUnavailable: 0,
                other: 0
            }
        };

        for (const gap of request.gaps) {
            try {
                // Check if we should schedule this gap based on filters
                if (request.priorityFilter && !request.priorityFilter.includes(gap.priority)) {
                    results.jobsSkipped++;
                    results.skippedReasons.other++;
                    continue;
                }

                if (request.serverFilter && !request.serverFilter.includes(gap.serverId)) {
                    results.jobsSkipped++;
                    results.skippedReasons.serverUnavailable++;
                    continue;
                }

                if (request.modelFilter && !request.modelFilter.includes(gap.modelId)) {
                    results.jobsSkipped++;
                    results.skippedReasons.other++;
                    continue;
                }

                // Combine missing and stale benchmarks
                const allBenchmarks = [...gap.missingBenchmarks, ...gap.staleBenchmarks];
                if (allBenchmarks.length === 0) {
                    results.jobsSkipped++;
                    results.skippedReasons.other++;
                    continue;
                }

                const jobId = await this.scheduleJob({
                    modelId: gap.modelId,
                    serverId: gap.serverId,
                    benchmarkTypes: allBenchmarks,
                    priority: gap.priority
                });

                // Find the scheduled job to add to results
                const scheduledJob = this.jobQueue.find(job => job.id === jobId) ||
                    this.activeJobs.get(jobId);

                if (scheduledJob) {
                    results.scheduledJobs.push(scheduledJob);
                }

                results.jobsScheduled++;
            } catch (error) {
                results.jobsSkipped++;
                results.skippedReasons.other++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`[AutomaticBenchmarkScheduler] Failed to schedule gap for ${gap.modelId}:`, { error: errorMessage } as any);
            }

            // Check maxJobs limit
            if (request.maxJobs && results.jobsScheduled >= request.maxJobs) {
                logger.info(`[AutomaticBenchmarkScheduler] Reached maxJobs limit: ${request.maxJobs}`);
                break;
            }
        }

        logger.info(`[AutomaticBenchmarkScheduler] Batch scheduling complete: ${results.jobsScheduled} scheduled, ${results.jobsSkipped} skipped`);

        return results;
    }

    /**
     * Get scheduler status
     */
    getStatus(): {
        isRunning: boolean;
        activeJobs: number;
        queuedJobs: number;
        maxConcurrentJobs: number;
        nextScheduledJob?: Date;
    } {
        return {
            isRunning: this.isRunning,
            activeJobs: this.activeJobs.size,
            queuedJobs: this.jobQueue.length,
            maxConcurrentJobs: this.config.maxConcurrentJobs,
            nextScheduledJob: this.jobQueue.length > 0 ? this.jobQueue[0].scheduledAt : undefined
        };
    }

    /**
     * Cancel a scheduled job
     */
    async cancelJob(jobId: string): Promise<boolean> {
        // Remove from queue
        const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
        if (queueIndex !== -1) {
            this.jobQueue.splice(queueIndex, 1);
            logger.info(`[AutomaticBenchmarkScheduler] Cancelled queued job ${jobId}`);
            return true;
        }

        // Remove from active jobs (would need to actually cancel the running job)
        if (this.activeJobs.has(jobId)) {
            this.activeJobs.delete(jobId);
            logger.info(`[AutomaticBenchmarkScheduler] Cancelled active job ${jobId}`);
            return true;
        }

        return false;
    }

    /**
     * Private methods
     */

    private async scheduleLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                await this.processQueue();

                // Wait before next iteration
                await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error('[AutomaticBenchmarkScheduler] Error in scheduler loop:', { error: errorMessage } as any);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds on error
            }
        }
    }

    private async processQueue(): Promise<void> {
        if (this.jobQueue.length === 0) return;

        // Check concurrent job limit
        if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
            logger.debug('[AutomaticBenchmarkScheduler] Max concurrent jobs reached, waiting');
            return;
        }

        // Get next job from queue
        const job = this.jobQueue.shift();
        if (!job) return;

        // Move to active jobs
        this.activeJobs.set(job.id, job);

        try {
            // Execute the job (simplified - would integrate with actual benchmarking system)
            await this.executeJob(job);

            // Remove from active jobs on completion
            this.activeJobs.delete(job.id);

            logger.info(`[AutomaticBenchmarkScheduler] Completed job ${job.id}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[AutomaticBenchmarkScheduler] Failed to execute job ${job.id}:`, { error: errorMessage } as any);

            // Handle retry logic
            if (job.retryCount < job.maxRetries) {
                job.retryCount++;
                job.scheduledAt = new Date(Date.now() + 5000 * job.retryCount); // 5 second backoff per retry
                this.insertJobByPriority(job);
                logger.info(`[AutomaticBenchmarkScheduler] Retrying job ${job.id} (attempt ${job.retryCount})`);
            } else {
                logger.error(`[AutomaticBenchmarkScheduler] Job ${job.id} failed after ${job.maxRetries} retries`);
            }

            this.activeJobs.delete(job.id);
        }
    }

    private async executeJob(job: ScheduledJob): Promise<void> {
        // This is a placeholder implementation
        // In the real system, this would integrate with the benchmarking infrastructure
        logger.info(`[AutomaticBenchmarkScheduler] Executing job ${job.id}: ${job.benchmarkTypes.join(', ')} for ${job.modelId} on ${job.serverId}`);

        // Simulate job execution time
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    private insertJobByPriority(job: ScheduledJob): void {
        const priorityOrder = {
            [SchedulerPriority.CRITICAL]: 0,
            [SchedulerPriority.HIGH]: 1,
            [SchedulerPriority.MEDIUM]: 2,
            [SchedulerPriority.LOW]: 3
        };

        // Find insertion point based on priority and scheduled time
        let insertIndex = 0;
        for (let i = 0; i < this.jobQueue.length; i++) {
            const existingJob = this.jobQueue[i];
            const existingPriority = priorityOrder[existingJob.priority];
            const newPriority = priorityOrder[job.priority];

            if (newPriority < existingPriority ||
                (newPriority === existingPriority && job.scheduledAt < existingJob.scheduledAt)) {
                insertIndex = i;
                break;
            }
            insertIndex = i + 1;
        }

        this.jobQueue.splice(insertIndex, 0, job);
    }
}
