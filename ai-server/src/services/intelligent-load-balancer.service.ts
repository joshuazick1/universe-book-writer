/**
 * Advanced load balancing with 10-factor scoring algorithm
 * Includes intelligent model selection and task-aware server scoring
 */

import { ServerInfo } from 'shared/types/server';
import { UniversalJob } from 'shared/types/universal-job';
import { TaskType, ModelRequirements, ServerScoringWeights } from 'shared/types/model-selection';
import { ModelRegistryService } from './model-registry.service.js';
import { BenchmarkDataService } from './benchmark-data.service.js';

export class IntelligentLoadBalancerService {
    constructor(
        private readonly modelRegistry: ModelRegistryService,
        private readonly benchmarkData: BenchmarkDataService
    ) { }

    /**
     * Calculate a comprehensive score for a server based on 10+ factors
     * @param server - The server to score
     * @param job - The job to be assigned
     * @returns The calculated score (higher is better)
     */
    private async calculateServerScore(server: ServerInfo, job: UniversalJob): Promise<number> {
        let score = 0;
        const weights = this.getScoreWeights(job);

        // Factor 1: Health status (critical)
        score += server.isHealthy ? weights.health : -weights.health;

        // Factor 2: Current load (inverse scoring - lower load is better)
        const loadScore = Math.max(0, 100 - server.currentLoad);
        score += (loadScore / 100) * weights.load;

        // Factor 3: Response time/latency (lower is better)
        if (server.lastResponseTime) {
            const latencyScore = Math.max(0, 100 - (server.lastResponseTime / 10)); // 1000ms = 0 score
            score += (latencyScore / 100) * weights.latency;
        }

        // Factor 4: Error rate (lower is better)
        const errorScore = Math.max(0, 100 - (server.errorRate * 100));
        score += (errorScore / 100) * weights.errorRate;

        // Factor 5: Hardware capabilities
        score += server.hasGPU ? weights.gpu : 0;

        // Factor 6: Memory availability
        const memoryScore = Math.min(100, (server.availableMemoryMB / 1000) * 10); // 10GB = 100 score
        score += (memoryScore / 100) * weights.memory;

        // Factor 7: Queue depth (lower is better)
        const queueScore = Math.max(0, 100 - (server.queueDepth * 10));
        score += (queueScore / 100) * weights.queueDepth;

        // Factor 8: Model availability and performance
        const modelScore = await this.calculateModelScore(server, job);
        score += modelScore * weights.model;

        // Factor 9: Geographic/network proximity (if location data available)
        const proximityScore = this.calculateProximityScore(server, job);
        score += proximityScore * weights.proximity;

        // Factor 10: Historical performance for this task type
        const historyScore = await this.calculateHistoricalScore(server, job);
        score += historyScore * weights.history;

        // Factor 11: Resource specialization match
        const specializationScore = this.calculateSpecializationScore(server, job);
        score += specializationScore * weights.specialization;

        return score;
    }

    /**
     * Get scoring weights based on job type and requirements
     */
    private getScoreWeights(job: UniversalJob): ServerScoringWeights {
        const baseWeights: ServerScoringWeights = {
            health: 25,
            load: 20,
            latency: 15,
            errorRate: 10,
            gpu: 5,
            memory: 8,
            queueDepth: 7,
            model: 20,
            proximity: 3,
            history: 12,
            specialization: 5
        };

        // Adjust weights based on task requirements
        const taskType = job.constraints.modelRequirements?.taskType;
        const mutableWeights = { ...baseWeights };

        if (taskType === TaskType.CONVERSATION) {
            mutableWeights.latency *= 1.5;
            mutableWeights.load *= 1.3;
            mutableWeights.model *= 0.8;
        } else if (taskType === TaskType.SUMMARIZATION) {
            mutableWeights.model *= 1.5;
            mutableWeights.history *= 1.3;
            mutableWeights.latency *= 0.8;
        } else if (taskType === TaskType.ENTITY_EXTRACTION) {
            mutableWeights.health *= 1.4;
            mutableWeights.errorRate *= 1.3;
        }

        return mutableWeights;
    }

    /**
     * Calculate model-specific scoring for server
     */
    private async calculateModelScore(server: ServerInfo, job: UniversalJob): Promise<number> {
        let modelScore = 0;

        // Check if required model is available
        if (job.constraints.requiresModel) {
            if (!server.availableModels.includes(job.constraints.requiresModel)) {
                return -50; // Heavy penalty for missing required model
            }
            modelScore += 30;

            // Bonus if model is already loaded
            if (server.loadedModels.includes(job.constraints.requiresModel)) {
                modelScore += 20;
            }
        }

        // Check preferred models
        if (job.constraints.preferredModels?.length) {
            const availablePreferred = job.constraints.preferredModels.filter(model =>
                server.availableModels.includes(model)
            );
            modelScore += (availablePreferred.length / job.constraints.preferredModels.length) * 25;
        }

        // Get benchmark performance for this server/model combination
        if (job.constraints.modelRequirements?.taskType && job.modelId) {
            const benchmarks = await this.benchmarkData.getModelBenchmarks(
                job.modelId,
                job.constraints.modelRequirements.taskType
            );

            if (benchmarks) {
                // Quality score contribution
                if (benchmarks.qualityScore) {
                    modelScore += (benchmarks.qualityScore / 100) * 15;
                }

                // Performance score contribution
                if (benchmarks.avgLatencyMs) {
                    const perfScore = Math.max(0, 100 - (benchmarks.avgLatencyMs / 50));
                    modelScore += (perfScore / 100) * 15;
                }

                // Success rate contribution
                if (benchmarks.successRate) {
                    modelScore += benchmarks.successRate * 10;
                }
            }
        }

        return Math.min(100, modelScore);
    }

    /**
     * Calculate proximity score based on geographic location
     */
    private calculateProximityScore(server: ServerInfo, job: UniversalJob): number {
        // Basic implementation - can be enhanced with actual geographic data
        if (!server.location) {
            return 50; // Neutral score for unknown location
        }

        // For now, return a base score
        // TODO: Implement actual geographic distance calculation
        return 75;
    }

    /**
     * Calculate historical performance score for task type
     */
    private async calculateHistoricalScore(server: ServerInfo, job: UniversalJob): Promise<number> {
        if (!job.constraints.modelRequirements?.taskType) {
            return 50; // Neutral score
        }

        try {
            const taskMetrics = await this.benchmarkData.getTaskTypeMetrics(
                job.constraints.modelRequirements.taskType
            );

            // Check if this server is in top performers for this task type
            const isTopPerformer = taskMetrics.topPerformingModels.some(modelId =>
                server.availableModels.includes(modelId)
            );

            return isTopPerformer ? 85 : 45;
        } catch (error) {
            return 50; // Neutral score on error
        }
    }

    /**
     * Calculate specialization match score
     */
    private calculateSpecializationScore(server: ServerInfo, job: UniversalJob): number {
        let score = 50; // Base score

        const requirements = job.constraints.modelRequirements;
        if (!requirements) return score;

        // GPU requirement matching
        if (requirements.specialFeatures?.includes('gpu-acceleration')) {
            score += server.hasGPU ? 30 : -20;
        }

        // Memory requirement matching
        if (requirements.contextLength && requirements.contextLength > 4000) {
            const memoryScore = Math.min(30, (server.availableMemoryMB / 8000) * 30); // 8GB = full score
            score += memoryScore;
        }

        // Task type specialization
        switch (requirements.taskType) {
            case TaskType.CODE_GENERATION:
            case TaskType.CODE_REVIEW:
                score += server.hasGPU ? 10 : 0; // Code tasks benefit from GPU
                break;
            case TaskType.EMBEDDING_GENERATION:
                score += server.hasGPU ? 20 : -10; // Embeddings need GPU
                break;
            case TaskType.REAL_TIME_CONVERSATION:
                // Prioritize low latency servers
                score += server.lastResponseTime < 500 ? 15 : -10;
                break;
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Select the best server for a given job using comprehensive scoring
     * @param servers - List of available servers
     * @param job - The job to be assigned
     * @returns The best server or undefined if no servers are available
     */
    public async selectBestServer(servers: ServerInfo[], job: UniversalJob): Promise<ServerInfo | undefined> {
        if (servers.length === 0) {
            return undefined;
        }

        // Filter out unhealthy servers unless no healthy servers exist
        const healthyServers = servers.filter(s => s.isHealthy);
        const candidateServers = healthyServers.length > 0 ? healthyServers : servers;

        // Calculate scores for all candidate servers
        const scoredServers = await Promise.all(
            candidateServers.map(async server => ({
                server,
                score: await this.calculateServerScore(server, job)
            }))
        );

        // Sort by score (highest first) and return the best server
        scoredServers.sort((a, b) => b.score - a.score);

        return scoredServers[0]?.server;
    }

    /**
     * Get multiple ranked servers for load balancing and failover
     * @param servers - List of available servers
     * @param job - The job to be assigned
     * @param count - Number of servers to return
     * @returns Ranked list of servers
     */
    public async getRankedServers(
        servers: ServerInfo[],
        job: UniversalJob,
        count: number = 3
    ): Promise<ServerInfo[]> {
        if (servers.length === 0) {
            return [];
        }

        const scoredServers = await Promise.all(
            servers.map(async server => ({
                server,
                score: await this.calculateServerScore(server, job)
            }))
        );

        return scoredServers
            .sort((a, b) => b.score - a.score)
            .slice(0, count)
            .map(s => s.server);
    }

    /**
     * Check if a server can handle a specific job
     * @param server - The server to check
     * @param job - The job to be assigned
     * @returns Whether the server can handle the job
     */
    public async canServerHandleJob(server: ServerInfo, job: UniversalJob): Promise<boolean> {
        // Health check
        if (!server.isHealthy) {
            return false;
        }

        // Required model check
        if (job.constraints.requiresModel &&
            !server.availableModels.includes(job.constraints.requiresModel)) {
            return false;
        }

        // Resource requirements check
        const resourceReqs = job.constraints.resourceRequirements;
        if (resourceReqs) {
            if (resourceReqs.requiresGPU && !server.hasGPU) {
                return false;
            }

            if (resourceReqs.minMemoryMB &&
                server.availableMemoryMB < resourceReqs.minMemoryMB) {
                return false;
            }
        }

        // Server exclusion check
        if (job.constraints.excludeServers?.includes(server.id)) {
            return false;
        }

        // Load capacity check (basic)
        if (server.currentLoad >= 95) { // 95% max load threshold
            return false;
        }

        return true;
    }

    /**
     * Estimate job completion time on a specific server
     * @param server - The target server
     * @param job - The job to estimate
     * @returns Estimated completion time in milliseconds
     */
    public async estimateCompletionTime(server: ServerInfo, job: UniversalJob): Promise<number> {
        let baseTime = 1000; // Base 1 second

        // Adjust for server load
        baseTime *= (1 + server.currentLoad / 100);

        // Adjust for model loading if not already loaded
        if (job.modelId && !server.loadedModels.includes(job.modelId)) {
            baseTime += 5000; // Add 5 seconds for model loading
        }

        // Adjust for task complexity
        const complexity = this.getTaskComplexity(job);
        baseTime *= complexity;

        // Adjust for historical performance
        if (server.lastResponseTime > 0) {
            baseTime = (baseTime + server.lastResponseTime) / 2;
        }

        return Math.round(baseTime);
    }

    /**
     * Get task complexity multiplier
     */
    private getTaskComplexity(job: UniversalJob): number {
        const requirements = job.constraints.modelRequirements;
        if (!requirements) return 1.0;

        switch (requirements.taskType) {
            case TaskType.REAL_TIME_CONVERSATION:
                return 0.8; // Simple, fast responses
            case TaskType.CODE_GENERATION:
            case TaskType.CODE_REVIEW:
                return 1.5; // More complex reasoning
            case TaskType.CREATIVE_WRITING:
                return 2.0; // Long-form, complex content
            case TaskType.DATA_ANALYSIS:
                return 1.8; // Complex analytical tasks
            case TaskType.EMBEDDING_GENERATION:
                return 0.6; // Fast vector operations
            default:
                return 1.0;
        }
    }
}
