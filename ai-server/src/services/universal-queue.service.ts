/**
 * Universal Queue Service - Replaces existing queueSystem.ts
 * Provides intelligent server selection and transparent API integration
 */

import { JobType, UniversalJob, JobCategory, JobId } from 'shared/types/universal-job';
import { ServerInfo, ServerId } from 'shared/types/server';
import { TaskType, JobPriority } from 'shared/types/model-selection';
import { IntelligentLoadBalancerService } from './intelligent-load-balancer.service.js';
import { ModelRegistryService } from './model-registry.service.js';
import { BenchmarkDataService } from './benchmark-data.service.js';

import { universalWorkerService } from './universal-worker.service.js';
import { WorkerInitializationService } from './worker-initialization.service.js';
import { logger } from '../../../shared/logging/logger.js';
import { encodeServerId } from 'shared/utils/server-utils.js'; // Assuming a utility function exists
import { AIOrchestrator, AIServer } from '../orchestrator.js';
import { MockServerOptions } from '../../tests/helpers/test-helpers.js';

const modelRegistry = new ModelRegistryService();
const benchmarkData = new BenchmarkDataService();
const loadBalancer = new IntelligentLoadBalancerService(modelRegistry, benchmarkData);

export interface ScheduleResult {
    readonly jobId: JobId;
    readonly success: boolean;
    readonly serverId?: ServerId;
    readonly serverUrl?: string;
    readonly estimatedCompletionTime?: number;
    readonly queuePosition?: number;
    readonly error?: string;
}

export interface JobExecutionResult {
    readonly jobId: JobId;
    readonly success: boolean;
    readonly result?: any;
    readonly error?: string;
    readonly executionTimeMs: number;
    readonly serverId: ServerId;
}

export interface QueueStats {
    readonly totalJobs: number;
    readonly pendingJobs: number;
    readonly runningJobs: number;
    readonly completedJobs: number;
    readonly failedJobs: number;
    readonly averageWaitTime: number;
    readonly averageExecutionTime: number;
}

export class UniversalQueueService {
    private jobQueue: Map<ServerId, UniversalJob[]> = new Map();
    private runningJobs: Map<JobId, { job: UniversalJob; serverId: ServerId; startTime: Date }> = new Map();
    private completedJobs: Map<JobId, JobExecutionResult> = new Map();
    private serverRegistry: Map<ServerId, ServerInfo> = new Map();
    private jobHistory: Map<JobId, UniversalJob> = new Map();

    constructor(
        private readonly loadBalancer: IntelligentLoadBalancerService,
        private readonly modelRegistry: ModelRegistryService,
        private readonly benchmarkData: BenchmarkDataService
    ) { }

    /**
     * Ensure workers are running, auto-start if needed
     */
    private ensureWorkersRunning(): void {
        const workerStatus = universalWorkerService.getStatus();

        if (!WorkerInitializationService.isWorkerInitialized || !workerStatus.isRunning) {
            logger.info('[UniversalQueue] Auto-starting worker system...');
            try {
                if (!WorkerInitializationService.isWorkerInitialized()) {
                    WorkerInitializationService.initialize();
                } else {
                    universalWorkerService.start();
                }
                logger.info('[UniversalQueue] Worker system started successfully');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`[UniversalQueue] Failed to auto-start workers: ${errorMessage}`);
            }
        }
    }

    /**
     * Submit a job with intelligent server selection
     * @param job - The job to be submitted
     * @returns Promise with scheduling result
     */
    public async submitJob(job: UniversalJob): Promise<ScheduleResult> {
        logger.info(`[UniversalQueue Debug] Submitting job: ${job.id}, type: ${job.type}, category: ${job.category}`);

        // Ensure workers are running before submitting jobs
        this.ensureWorkersRunning();

        try {
            // Store job in history
            this.jobHistory.set(job.id, job);
            logger.info(`[UniversalQueue Debug] Job stored in history: ${job.id}`);

            let selectedServer: ServerInfo | undefined;

            // Check if job has server affinity (pre-assigned server)
            if (job.constraints?.serverAffinity) {
                // For jobs with server affinity (like benchmarks), bypass load balancer
                const targetServerId = encodeServerId(job.constraints.serverAffinity); // Encode the serverAffinity URL
                selectedServer = this.serverRegistry.get(targetServerId);
                logger.info(`[UniversalQueue Debug] Job has server affinity: ${targetServerId}`);

                if (!selectedServer) {
                    logger.error(`[UniversalQueue Debug] Target server not found: ${targetServerId}`);
                    return {
                        jobId: job.id,
                        success: false,
                        error: `Target server '${targetServerId}' not found or not registered`
                    };
                }

                // Verify server health
                if (!selectedServer.isHealthy) {
                    logger.error(`[UniversalQueue Debug] Target server is not healthy: ${targetServerId}`);
                    return {
                        jobId: job.id,
                        success: false,
                        error: `Target server '${targetServerId}' is not healthy`
                    };
                }
                logger.info(`[UniversalQueue Debug] Server affinity resolved successfully: ${targetServerId}`);
            } else {
                // For jobs without server affinity, use load balancer
                logger.info(`[UniversalQueue Debug] No server affinity, using load balancer`);
                // Get eligible servers
                const eligibleServers = await this.getEligibleServers(job);
                logger.info(`[UniversalQueue Debug] Found ${eligibleServers.length} eligible servers`);

                if (eligibleServers.length === 0) {
                    logger.error(`[UniversalQueue Debug] No eligible servers available for job: ${job.id}`);
                    return {
                        jobId: job.id,
                        success: false,
                        error: 'No eligible servers available for this job'
                    };
                }

                // Select optimal server using load balancer
                selectedServer = await this.loadBalancer.selectBestServer(eligibleServers, job);
                logger.info(`[UniversalQueue Debug] Load balancer selected server: ${selectedServer?.id}`);
            }

            if (!selectedServer) {
                logger.error(`[UniversalQueue Debug] No suitable server found for job: ${job.id}`);
                return {
                    jobId: job.id,
                    success: false,
                    error: 'No suitable server found for job'
                };
            }

            // Add to appropriate queue
            logger.info(`[UniversalQueue Debug] Enqueuing job ${job.id} to server ${selectedServer.id}`);
            await this.enqueueToServer(selectedServer.id, job);

            // Estimate completion time
            const estimatedTime = await this.loadBalancer.estimateCompletionTime(selectedServer, job);
            const queuePosition = this.getQueuePosition(selectedServer.id);

            return {
                jobId: job.id,
                success: true,
                serverId: selectedServer.id,
                serverUrl: selectedServer.baseUrl,
                estimatedCompletionTime: estimatedTime,
                queuePosition: queuePosition
            };

        } catch (error) {
            return {
                jobId: job.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Submit multiple jobs as a workflow with dependencies
     * @param jobs - Array of jobs with dependencies
     * @returns Promise with scheduling results
     */
    public async submitWorkflow(jobs: UniversalJob[]): Promise<ScheduleResult[]> {
        const results: ScheduleResult[] = [];

        // Sort jobs by dependencies (topological sort)
        const sortedJobs = this.topologicalSort(jobs);

        for (const job of sortedJobs) {
            const result = await this.submitJob(job);
            results.push(result);

            // If a critical job fails, stop the workflow
            if (!result.success && job.priority === JobPriority.CRITICAL) {
                break;
            }
        }

        return results;
    }

    /**
     * Wait for all jobs in a workflow to complete
     * @param jobIds - Array of job IDs to wait for
     * @param timeoutMs - Timeout in milliseconds (default: 15 minutes)
     * @returns Promise with all job results
     */
    public async waitForWorkflowCompletion(
        jobIds: JobId[],
        timeoutMs: number = 15 * 60 * 1000
    ): Promise<JobExecutionResult[]> {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkCompletion = () => {
                // Check if all jobs are completed
                const results: JobExecutionResult[] = [];
                const completed = jobIds.every(jobId => {
                    const result = this.completedJobs.get(jobId);
                    if (result) {
                        results.push(result);
                        return true;
                    }
                    return false;
                });

                if (completed) {
                    resolve(results);
                    return;
                }

                // Check timeout
                if (Date.now() - startTime > timeoutMs) {
                    reject(new Error(`Workflow completion timeout after ${timeoutMs}ms. Completed: ${results.length}/${jobIds.length}`));
                    return;
                }

                // Continue checking
                setTimeout(checkCompletion, 500); // Check every 500ms
            };

            checkCompletion();
        });
    }

    /**
     * Submit workflow and wait for completion
     * @param jobs - Array of jobs with dependencies
     * @param timeoutMs - Timeout in milliseconds
     * @returns Promise with all job results
     */
    public async submitAndWaitForWorkflow(
        jobs: UniversalJob[],
        timeoutMs: number = 15 * 60 * 1000
    ): Promise<JobExecutionResult[]> {
        const scheduleResults = await this.submitWorkflow(jobs);
        const jobIds = scheduleResults.map(r => r.jobId);

        return await this.waitForWorkflowCompletion(jobIds, timeoutMs);
    }

    /**
     * Get the next job from a specific server's queue
     * @param serverId - The server to get job from
     * @returns The next job or undefined if queue is empty
     */
    public dequeueFromServer(serverId: ServerId): UniversalJob | undefined {
        const queue = this.jobQueue.get(serverId);
        if (!queue || queue.length === 0) {
            return undefined;
        }

        const job = queue.shift();
        if (job) {
            // Mark as running
            this.runningJobs.set(job.id, {
                job,
                serverId,
                startTime: new Date()
            });
        }

        return job;
    }

    /**
     * Mark a job as completed
     * @param jobId - The completed job ID
     * @param result - The execution result
     */
    public async completeJob(jobId: JobId, result: JobExecutionResult): Promise<void> {
        // Remove from running jobs
        this.runningJobs.delete(jobId);

        // Store completion result
        this.completedJobs.set(jobId, result);

        // Update benchmark data for model performance tracking
        const job = this.jobHistory.get(jobId);
        if (job && job.constraints.modelRequirements?.taskType && result.success) {
            await this.benchmarkData.recordBenchmarkResult({
                modelId: job.modelId,
                taskType: job.constraints.modelRequirements.taskType,
                qualityScore: 75, // This would come from actual evaluation
                latencyMs: result.executionTimeMs,
                tokensPerSecond: 10, // This would be calculated from actual output
                memoryUsageMB: 1000, // This would come from server monitoring
                timestamp: new Date()
            });
        }
    }

    /**
     * Check if a server has any running jobs
     * @param serverId - The server ID to check
     * @returns True if the server has running jobs
     */
    public hasRunningJobOnServer(serverId: ServerId): boolean {
        for (const [jobId, runningJob] of this.runningJobs) {
            if (runningJob.serverId === serverId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the number of jobs in a server's queue
     * @param serverId - The server ID to check
     * @returns The number of queued jobs
     */
    public getServerQueueLength(serverId: ServerId): number {
        const queue = this.jobQueue.get(serverId);
        return queue ? queue.length : 0;
    }

    /**
     * Get queue distribution statistics across all servers
     * @returns Object with queue stats per server
     */
    public getQueueDistribution(): Record<string, { queued: number; running: number; healthy: boolean }> {
        const distribution: Record<string, { queued: number; running: number; healthy: boolean }> = {};

        for (const [serverId, server] of this.serverRegistry) {
            const queueLength = this.getServerQueueLength(serverId);
            const runningJobs = this.hasRunningJobOnServer(serverId) ? 1 : 0;

            distribution[serverId] = {
                queued: queueLength,
                running: runningJobs,
                healthy: server.isHealthy
            };
        }

        return distribution;
    }

    /**
     * Register a server to the registry
     * @param server - The server to be registered
     */
    public registerServer(server: ServerInfo): void {
        this.serverRegistry.set(server.id, server);

        // Initialize empty queue for new server
        if (!this.jobQueue.has(server.id)) {
            this.jobQueue.set(server.id, []);
        }

        // Log server registration
        logger.info(`[UniversalQueueService] Registered server: ${server.id}, URL: ${server.baseUrl}`);
    }

    /**
     * Update server information
     * @param serverId - The server ID to update
     * @param updates - Partial server info updates
     */
    public updateServer(serverId: ServerId, updates: Partial<ServerInfo>): void {
        const existing = this.serverRegistry.get(serverId);
        if (existing) {
            const updated = { ...existing, ...updates };
            this.serverRegistry.set(serverId, updated);
        }
    }

    /**
     * Get queue statistics
     * @returns Current queue statistics
     */
    public getQueueStats(): QueueStats {
        const totalJobs = this.jobHistory.size;
        const pendingJobs = Array.from(this.jobQueue.values()).reduce((sum, queue) => sum + queue.length, 0);
        const runningJobs = this.runningJobs.size;
        const completedJobs = this.completedJobs.size;
        const failedJobs = Array.from(this.completedJobs.values()).filter(r => !r.success).length;

        // Calculate averages
        const completedResults = Array.from(this.completedJobs.values());
        const avgExecutionTime = completedResults.length > 0
            ? completedResults.reduce((sum, r) => sum + r.executionTimeMs, 0) / completedResults.length
            : 0;

        return {
            totalJobs,
            pendingJobs,
            runningJobs,
            completedJobs,
            failedJobs,
            averageWaitTime: 0, // TODO: Calculate from job submission to start times
            averageExecutionTime: avgExecutionTime
        };
    }

    /**
     * Get eligible servers for a job
     */
    private async getEligibleServers(job: UniversalJob): Promise<ServerInfo[]> {
        const allServers = Array.from(this.serverRegistry.values());
        const eligible: ServerInfo[] = [];

        for (const server of allServers) {
            if (await this.loadBalancer.canServerHandleJob(server, job)) {
                eligible.push(server);
            }
        }

        return eligible;
    }

    /**
     * Add job to specific server queue
     */
    private async enqueueToServer(serverId: ServerId, job: UniversalJob): Promise<void> {
        let queue = this.jobQueue.get(serverId);
        if (!queue) {
            queue = [];
            this.jobQueue.set(serverId, queue);
        }

        // Insert job based on priority
        const insertIndex = this.findInsertPosition(queue, job);
        queue.splice(insertIndex, 0, job);
    }

    /**
     * Find insertion position based on job priority
     */
    private findInsertPosition(queue: UniversalJob[], job: UniversalJob): number {
        const priorityOrder: Record<JobPriority, number> = {
            [JobPriority.CRITICAL]: 0,
            [JobPriority.HIGH]: 1,
            [JobPriority.NORMAL]: 2,
            [JobPriority.LOW]: 3
        };

        const jobPriority = priorityOrder[job.priority as JobPriority] ?? priorityOrder[JobPriority.NORMAL];

        for (let i = 0; i < queue.length; i++) {
            const queueJobPriority = priorityOrder[queue[i].priority as JobPriority] ?? priorityOrder[JobPriority.NORMAL];
            if (jobPriority < queueJobPriority) {
                return i;
            }
        }

        return queue.length;
    }

    /**
     * Get position in queue for a server
     */
    private getQueuePosition(serverId: ServerId): number {
        const queue = this.jobQueue.get(serverId);
        return queue ? queue.length : 0;
    }

    /**
     * Topological sort for job dependencies
     */
    private topologicalSort(jobs: UniversalJob[]): UniversalJob[] {
        const result: UniversalJob[] = [];
        const visited = new Set<JobId>();
        const jobMap = new Map<JobId, UniversalJob>();

        // Create job lookup map
        jobs.forEach(job => jobMap.set(job.id, job));

        const visit = (jobId: JobId) => {
            if (visited.has(jobId)) return;

            const job = jobMap.get(jobId);
            if (!job) return;

            // Visit dependencies first
            job.dependencies.forEach(depId => visit(depId));

            visited.add(jobId);
            result.push(job);
        };

        // Visit all jobs
        jobs.forEach(job => visit(job.id));

        return result;
    }

    /**
     * Get server by ID
     */
    public getServer(serverId: ServerId): ServerInfo | undefined {
        return this.serverRegistry.get(serverId);
    }

    /**
     * Get all registered servers
     */
    public getAllServers(): ServerInfo[] {
        return Array.from(this.serverRegistry.values());
    }

    /**
     * Get job by ID
     */
    public getJob(jobId: JobId): UniversalJob | undefined {
        return this.jobHistory.get(jobId);
    }

    /**
     * Get running jobs for a server
     */
    public getRunningJobs(serverId?: ServerId): { job: UniversalJob; serverId: ServerId; startTime: Date }[] {
        const running = Array.from(this.runningJobs.values());
        return serverId ? running.filter(r => r.serverId === serverId) : running;
    }

    /**
     * Retrieves the status of a job by ID.
     * @param jobId - The ID of the job to retrieve.
     * @returns The status of the job.
     */
    public getJobStatus(jobId: string): JobExecutionResult | null {
        return this.completedJobs.get(jobId) || null;
    }

    /**
     * Get recent completed jobs for visualization
     * @param limit - Maximum number of recent jobs to return (default: 50)
     * @returns Array of recent completed jobs with metadata
     */
    public getRecentCompletedJobs(limit: number = 50): Array<{
        jobId: JobId;
        job: UniversalJob;
        result: JobExecutionResult;
        status: 'completed' | 'failed';
    }> {
        const recentJobs: Array<{
            jobId: JobId;
            job: UniversalJob;
            result: JobExecutionResult;
            status: 'completed' | 'failed';
        }> = [];

        // Get all completed job results sorted by completion time (most recent first)
        const completedResults = Array.from(this.completedJobs.entries())
            .sort((a, b) => (b[1].executionTimeMs || 0) - (a[1].executionTimeMs || 0))
            .slice(0, limit);

        for (const [jobId, result] of completedResults) {
            const job = this.jobHistory.get(jobId);
            if (job) {
                recentJobs.push({
                    jobId,
                    job,
                    result,
                    status: result.success ? 'completed' : 'failed'
                });
            }
        }

        return recentJobs;
    }

    /**
     * Get all available models across all registered servers
     */
    public async getAvailableModels(): Promise<string[]> {
        const allModels = new Set<string>();

        for (const server of this.serverRegistry.values()) {
            if (server.isHealthy) {
                for (const model of server.availableModels) {
                    allModels.add(model);
                }
            }
        }

        return Array.from(allModels);
    }

    // Add job scheduling logic
    async scheduleJob(job: UniversalJob): Promise<ScheduleResult> {
        return { jobId: job.id, success: true, serverId: 'placeholder-server-id' };
    }

    public getServerDetails(serverId: ServerId): ServerInfo | undefined {
        return this.serverRegistry.get(serverId);
    }

    public addMockServerTo(orchestrator: AIOrchestrator, opts: MockServerOptions): AIServer {
        // Remove any existing server with the same id to guarantee a fresh add
        const existing = orchestrator.getServers().find(s => s.id === opts.id);
        if (existing) orchestrator.removeServer(opts.id);
        orchestrator.addServer({ id: opts.id, url: opts.url, type: (opts.type as 'ollama' | 'other') || 'ollama' });

        // Add assertion to verify server addition
        const server = orchestrator.getServers().find(s => s.id === opts.id);
        if (!server) {
            logger.error(`[addMockServerTo] Server with id '${opts.id}' was not found after addServer. Test setup failed.`);
            throw new Error(`addMockServerTo: Server with id '${opts.id}' was not found after addServer. Test setup failed.`);
        }

        // Log successful addition
        logger.info(`[addMockServerTo] Server with id '${opts.id}' added successfully.`);

        server.healthy = opts.healthy !== false;
        server.models = opts.models || [];
        (server as any).tags = opts.tags || [];
        server.lastResponseTime = opts.latencyMs ?? 100;
        // Patch test-only fields
        (server as any).maxConcurrency = opts.maxConcurrency || 4;
        (server as any).inFlight = opts.inFlight || 0;
        (server as any).failOn = opts.failOn || [];

        // Set in-flight count in the orchestrator's internal tracking
        if (opts.inFlight && opts.models) {
            for (const model of opts.models) {
                for (let i = 0; i < opts.inFlight; i++) {
                    orchestrator.incrementInFlight(opts.id, model);
                }
            }
        }

        return server;
    }
}

// Move the export to after the class declaration
export const universalQueueService = new UniversalQueueService(loadBalancer, modelRegistry, benchmarkData);
