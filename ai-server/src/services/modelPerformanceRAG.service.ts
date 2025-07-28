/**
 * Model Performance RAG Integration Service
 * 
 * Integrates AI orchestrator benchmark data into the RAG knowledge graph
 * for semantic search and context-aware model selection.
 */

import { RAGServiceManager } from '../rag/manager.js';
import { getRAGServiceManager } from '../rag/instance.js';
import { ensureNode } from '../../../shared/node/nodeService.js';
import { BenchmarkManager } from '../benchmarkManager.js';
import { AIOrchestrator } from '../orchestrator.js';
import { logger } from '../../../shared/logging/logger.js';
import { ragReadyResolve } from '../app.js';
import type {
    RAGNode,
    RAGRelationship,
    RAGNodeType,
    RAGRelationshipType
} from '../rag/core/types.js';
import type { ServerModelBenchmark } from '../orchestrator.js';

/**
 * Performance metrics organized for RAG storage
 */
interface ModelPerformanceNode {
    serverId: string;
    modelName: string;
    performanceMetrics: {
        latencyMs: number;
        throughput: number;
        lastTested: number;
        modelLoadTimeMs?: number;
        averageLatency?: number;
        stabilityScore?: number;
        qualityScore?: number;
    };
    contextualPerformance: {
        taskType?: string;
        inputComplexity?: 'simple' | 'moderate' | 'complex';
        outputQuality?: 'draft' | 'standard' | 'publication';
        resourceUsage?: 'low' | 'medium' | 'high';
    };
    trends: {
        improvingLatency: boolean;
        consistentThroughput: boolean;
        recentFailures: number;
    };
}

/**
 * Service for integrating model performance data with RAG system
 */
export class ModelPerformanceRAGService {
    private orchestrator: AIOrchestrator;
    private benchmarkManager: BenchmarkManager;
    private ragManager: any;
    private syncInterval: NodeJS.Timeout | null = null;

    /**
     * Public getter for orchestrator (for orchestrator-wide queries)
     */
    public getOrchestrator(): AIOrchestrator {
        return this.orchestrator;
    }

    /**
     * Public getter for ragManager (for orchestrator-wide queries)
     */
    public getRagManager(): any {
        return this.ragManager;
    }

    constructor(orchestrator: AIOrchestrator) {
        this.orchestrator = orchestrator;
        this.benchmarkManager = (orchestrator as any).benchmarkManager;
    }

    /**
     * Initialize the service and start periodic RAG sync
     */
    async initialize(): Promise<void> {
        try {
            this.ragManager = await getRAGServiceManager();
            logger.info('Model Performance RAG Service initialized');

            // Ensure orchestrator has aggregated models before initial sync
            if (typeof this.orchestrator.refreshTagsCache === 'function') {
                await this.orchestrator.refreshTagsCache();
            }

            // Perform initial sync
            await this.syncBenchmarkDataToRAG();

            // Start periodic sync (every 30 minutes to reduce load)
            this.syncInterval = setInterval(async () => {
                try {
                    await this.syncBenchmarkDataToRAG();
                } catch (error) {
                    logger.error(`Periodic benchmark sync failed: ${error}`);
                }
            }, 30 * 60 * 1000);

        } catch (error) {
            logger.error(`Failed to initialize Model Performance RAG Service: ${error}`);
            throw error;
        }
    }

    /**
     * Stop the service and cleanup
     */
    async shutdown(): Promise<void> {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        logger.info('Model Performance RAG Service shut down');
    }

    /**
     * Sync all benchmark data to RAG knowledge graph
     */
    async syncBenchmarkDataToRAG(): Promise<void> {
        try {
            //

            const servers = this.orchestrator.getServers();
            const synced = { modelNodes: 0, serverNodes: 0, performanceNodes: 0, relationships: 0 };

            // First, create model nodes with capability information
            const allModels = new Set<string>();
            for (const server of servers) {
                server.models.forEach(model => allModels.add(model));
            }

            for (const modelName of allModels) {
                await this.syncModelNode(modelName);
                synced.modelNodes++;
            }

            // Then, create server nodes and performance data
            for (const server of servers) {
                await this.syncServerNode(server);
                synced.serverNodes++;

                for (const model of server.models) {
                    const benchmark = this.orchestrator.getBenchmark(server.id, model);
                    if (benchmark) {
                        await this.syncServerModelPerformance(server.id, model, benchmark);
                        synced.performanceNodes++;

                        // Create relationships between server, model, and performance
                        await this.createPerformanceRelationships(server.id, model, benchmark);
                        synced.relationships += 3; // server-model, server-performance, model-performance
                    }
                }
            }

            logger.info(`Synced ${synced.modelNodes} model nodes, ${synced.serverNodes} server nodes, ${synced.performanceNodes} performance nodes, and ${synced.relationships} relationships to RAG`);
            // Signal RAG is fully synced for startup routines
            if (typeof ragReadyResolve === 'function') ragReadyResolve();

        } catch (error) {
            logger.error(`Failed to sync benchmark data to RAG: ${error}`);
            throw error;
        }
    }

    /**
     * Create or update a model node with capability information
     */
    private async syncModelNode(modelName: string): Promise<void> {
        // Use shared ensureNode utility for ai-model
        await ensureNode({
            type: 'ai-model',
            title: modelName,
            metadata: {
                // Add any additional metadata as needed
                universeId: 'system',
                ownerId: 'system',
                sourcePlugin: 'ai-orchestrator',
                // Optionally add more fields from capabilities, etc.
            }
        });
    }

    /**
     * Create or update a server node with hardware and deployment information
     */
    private async syncServerNode(server: any): Promise<void> {
        // Use shared ensureNode utility for ai-server
        await ensureNode({
            type: 'ai-server',
            title: server.id,
            metadata: {
                universeId: 'system',
                ownerId: 'system',
                sourcePlugin: 'ai-orchestrator',
                // Optionally add more fields from serverInfo, etc.
            }
        });
    }

    /**
     * Create or update a performance node in RAG for a specific server/model pair
     */
    private async syncServerModelPerformance(
        serverId: string,
        modelName: string,
        benchmark: ServerModelBenchmark
    ): Promise<void> {

        // Use shared ensureNode utility for model-performance
        await ensureNode({
            type: 'model-performance',
            title: `${modelName} Performance on ${serverId}`,
            metadata: {
                universeId: 'system',
                ownerId: 'system',
                sourcePlugin: 'ai-orchestrator',
                serverId,
                modelName,
                // Optionally add more fields from benchmark, etc.
            }
        });
    }

    /**
     * Update health status for a model/server pair directly on the model-performance node.
     * @param serverId The server identifier
     * @param modelName The model name
     * @param status Health status (e.g., 'unhealthy', 'healthy')
     * @param reason Reason for the health status (e.g., error message, OOM, etc.)
     * @param expiryMs Optional: milliseconds after which the unhealthy status expires (default: 24h)
     */
    async syncModelServerHealthStatus(
        serverId: string,
        modelName: string,
        status: 'unhealthy' | 'healthy',
        reason: string,
        expiryMs: number = 24 * 60 * 60 * 1000
    ): Promise<void> {
        const now = new Date();
        const nodeId = `performance:${serverId}:${modelName}`;
        let unhealthyCount = 1;
        let baseExpiryMs = expiryMs;
        let createdTime = now;
        let previousReportedAt: string | undefined = undefined;
        let lastHealthStatus: string | undefined = undefined;
        let node: any = null;
        try {
            node = await this.ragManager.getNode(nodeId);
            if (node && node.content && node.content.attributes) {
                const health = node.content.attributes.health || {};
                unhealthyCount = (health.unhealthyCount || 0) + (status === 'unhealthy' ? 1 : 0);
                baseExpiryMs = health.baseExpiryMs || expiryMs;
                createdTime = health.createdTime ? new Date(health.createdTime) : now;
                previousReportedAt = health.reportedAt;
                lastHealthStatus = health.status;
                this.benchmarkManager?.logDebug(`[HEALTH] Found existing model-performance node for ${serverId}:${modelName} with health: ${JSON.stringify(health)}`);
            } else {
                this.benchmarkManager?.logDebug(`[HEALTH] No existing model-performance node found for ${serverId}:${modelName}`);
            }
        } catch (err) {
            this.benchmarkManager?.logDebug(`[HEALTH] Error fetching model-performance node for ${serverId}:${modelName}: ${err}`);
        }
        // Exponential backoff: double expiry for each additional unhealthy mark (max 30 days)
        const maxExpiryMs = 30 * 24 * 60 * 60 * 1000;
        const calculatedExpiryMs = Math.min(baseExpiryMs * Math.pow(2, unhealthyCount - 1), maxExpiryMs);
        const expiresAt = new Date(now.getTime() + calculatedExpiryMs);
        // Update or create the model-performance node with health info
        const healthUpdate = {
            status,
            reason,
            reportedAt: now.toISOString(),
            previousReportedAt,
            expiresAt: expiresAt.toISOString(),
            unhealthyCount,
            baseExpiryMs,
            createdTime,
            modified: now,
            active: status === 'unhealthy',
        };
        if (node) {
            // Update health field in attributes
            const updatedAttributes = {
                ...node.content.attributes,
                health: healthUpdate
            };
            await this.ragManager.updateNode(nodeId, {
                content: {
                    ...node.content,
                    attributes: updatedAttributes
                },
                timestamps: {
                    ...node.timestamps,
                    modified: now
                }
            });
            this.benchmarkManager?.logDebug(`[HEALTH] Updated health for model-performance node ${nodeId}: serverId=${serverId}, modelName=${modelName}, health=${JSON.stringify(healthUpdate)}`);
            this.benchmarkManager?.logDebug(`[HEALTH] Full updated node: ${JSON.stringify({ nodeId, serverId, modelName, updatedAttributes })}`);
        } else {
            // Create a new model-performance node with health info
            const newNode = {
                id: nodeId,
                type: 'model-performance',
                title: `${modelName} Performance on ${serverId}`,
                content: {
                    description: `Performance and usage tracking for ${modelName} on server ${serverId}`,
                    attributes: {
                        serverId,
                        modelName,
                        health: healthUpdate
                    }
                },
                metadata: {
                    universeId: 'system',
                    ownerId: 'system',
                    sourcePlugin: 'ai-orchestrator',
                },
                timestamps: {
                    created: now,
                    modified: now
                },
                active: true
            };
            await this.ragManager.createNode(newNode);
            this.benchmarkManager?.logDebug(`[HEALTH] Created new model-performance node with health for ${nodeId}: serverId=${serverId}, modelName=${modelName}, health=${JSON.stringify(healthUpdate)}`);
            this.benchmarkManager?.logDebug(`[HEALTH] Full created node: ${JSON.stringify(newNode)}`);
        }
    }

    /**
     * Create relationships between performance data and system components
     */
    private async createPerformanceRelationships(
        serverId: string,
        modelName: string,
        benchmark: ServerModelBenchmark
    ): Promise<void> {
        // ...existing code...
        const { estimateResourceAllocation } = await import('./estimateResourceAllocation.js');
        const performanceNodeId = `performance:${serverId}:${modelName}`;
        const serverNodeId = `server:${serverId}`;
        const modelNodeId = `model:${modelName}`;

        // 1. Server hosts Model relationship
        const serverHostsModel: RAGRelationship = {
            id: `${serverNodeId}:hosts:${modelNodeId}`,
            type: 'hierarchical',
            fromNodeId: serverNodeId,
            toNodeId: modelNodeId,
            weight: 1.0,
            metadata: {
                description: 'Server hosts this AI model for inference',
                universeId: 'system',
                sourcePlugin: 'ai-orchestrator',
                attributes: {
                    relationshipType: 'hosting',
                    deploymentStatus: 'active',
                    resourceAllocation: estimateResourceAllocation(serverId, modelName)
                }
            },
            privacy: {
                encrypted: false,
                visibility: 'public' as const
            },
            timestamps: {
                created: new Date(),
                modified: new Date()
            }
        };

    }
    /**
     * Generate embeddings for performance data
     */
    private async generatePerformanceEmbeddings(modelName: string, benchmark: ServerModelBenchmark): Promise<number[]> {
        // Create a text representation for embedding
        const performanceText = `Model ${modelName} performance: ${benchmark.latencyMs}ms latency, ${benchmark.throughput} requests per second throughput, tested ${new Date(benchmark.lastTested).toISOString()}`;

        // This would use an embedding model - for now return a simple hash-based embedding
        return this.hashToEmbedding(performanceText);
    }

    /**
     * Calculate stability score based on performance variance
     */
    private calculateStabilityScore(serverId: string, modelName: string): number {
        const recentLatencies = (this.benchmarkManager as any).recentLatencies?.get(`${serverId}:${modelName}`) || [];

        if (recentLatencies.length < 2) return 0.5; // Not enough data

        const mean = recentLatencies.reduce((a: number, b: number) => a + b, 0) / recentLatencies.length;
        const variance = recentLatencies.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / recentLatencies.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;

        // Convert to 0-1 scale where lower variance = higher stability
        return Math.max(0, 1 - coefficientOfVariation);
    }

    /**
     * Estimate quality score based on performance characteristics
     */
    private estimateQualityScore(benchmark: ServerModelBenchmark): number {
        // Simple heuristic: balance between speed and throughput
        const latencyScore = Math.max(0, 1 - benchmark.latencyMs / 1000); // Assume 1s is max acceptable
        const throughputScore = Math.min(1, benchmark.throughput / 10); // Assume 10 req/s is excellent

        return (latencyScore + throughputScore) / 2;
    }

    // Helper methods for categorization
    private categorizeLatency(latencyMs: number): string {
        if (latencyMs < 100) return 'fast';
        if (latencyMs < 500) return 'moderate';
        return 'slow';
    }

    private categorizeThroughput(throughput: number): string {
        if (throughput > 5) return 'high';
        if (throughput > 2) return 'moderate';
        return 'low';
    }

    private categorizeComplexityFromLatency(latencyMs: number): 'simple' | 'moderate' | 'complex' {
        if (latencyMs < 200) return 'simple';
        if (latencyMs < 800) return 'moderate';
        return 'complex';
    }

    private inferQualityFromThroughput(throughput: number): 'draft' | 'standard' | 'publication' {
        if (throughput > 4) return 'draft';
        if (throughput > 1.5) return 'standard';
        return 'publication';
    }

    private categorizeResourceUsage(latencyMs: number, throughput: number): 'low' | 'medium' | 'high' {
        const resourceScore = latencyMs / throughput; // Higher means more resource intensive
        if (resourceScore < 100) return 'low';
        if (resourceScore < 300) return 'medium';
        return 'high';
    }

    private isLatencyImproving(recentLatencies: number[]): boolean {
        if (recentLatencies.length < 3) return false;
        const recent = recentLatencies.slice(-3);
        return recent[0] > recent[2]; // First measurement higher than last
    }

    private isThroughputConsistent(recentLatencies: number[]): boolean {
        if (recentLatencies.length < 3) return false;
        const variance = this.calculateVariance(recentLatencies);
        const mean = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
        return (variance / mean) < 0.2; // Less than 20% coefficient of variation
    }

    private countRecentFailures(serverId: string, modelName: string): number {
        // This would check orchestrator failure logs
        // For now return 0
        return 0;
    }

    private calculateVariance(values: number[]): number {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    }

    private hashToEmbedding(text: string): number[] {
        // Simple hash-based embedding for demo purposes
        // In production, this would use a real embedding model
        const hash = this.simpleHash(text);
        const embedding = [];
        for (let i = 0; i < 384; i++) { // 384-dimensional embedding
            embedding.push(((hash + i) % 1000) / 1000 - 0.5);
        }
        return embedding;
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Query performance data from RAG system
     */
    async queryModelPerformance(query: string): Promise<any[]> {
        try {
            const searchResults = await this.ragManager.searchNodes(
                '',
                { nodeType: 'model-performance' },
                10
            );
            return searchResults || [];
        } catch (error) {
            logger.error(`Failed to query model performance: ${error}`);
            return [];
        }
    }

    /**
     * Get best performing models for a specific task type
     */
    async getBestModelsForTask(
        taskType: string,
        requirements: {
            maxLatency?: number;
            minThroughput?: number;
            quality?: 'draft' | 'standard' | 'publication';
        } = {}
    ): Promise<Array<{ serverId: string; modelName: string; score: number }>> {

        try {
            const performanceNodes = await this.queryModelPerformance('');

            const candidates = performanceNodes
                .filter(node => {
                    const metrics = node.content?.performanceMetrics;
                    if (!metrics) return false;

                    if (requirements.maxLatency && metrics.latencyMs > requirements.maxLatency) return false;
                    if (requirements.minThroughput && metrics.throughput < requirements.minThroughput) return false;

                    return true;
                })
                .map(node => {
                    const metrics = node.content?.performanceMetrics;
                    const content = node.content;

                    // Calculate composite score
                    const latencyScore = Math.max(0, 1 - (metrics.latencyMs / 1000));
                    const throughputScore = Math.min(1, metrics.throughput / 10);
                    const stabilityScore = metrics.stabilityScore || 0.5;
                    const qualityScore = metrics.qualityScore || 0.5;

                    const compositeScore = (latencyScore * 0.3) + (throughputScore * 0.3) +
                        (stabilityScore * 0.2) + (qualityScore * 0.2);

                    return {
                        serverId: content.serverId,
                        modelName: content.modelName,
                        score: compositeScore
                    };
                })
                .sort((a, b) => b.score - a.score);

            return candidates.slice(0, 5); // Top 5 models

        } catch (error) {
            logger.error(`Failed to get best models for task: ${error}`);
            return [];
        }
    }

    /**
     * Get the most frequent model/server combinations from existing performance nodes
     */
    async getFrequentModelServerCombinations(
        options: {
            limit?: number;
            minUsageCount?: number;
            includeMetrics?: boolean;
        } = {}
    ): Promise<Array<{
        serverId: string;
        modelName: string;
        usageCount: number;
        lastUsed?: Date;
        averageLatency?: number;
        averageThroughput?: number;
    }>> {
        try {
            const searchResults = await this.ragManager.searchNodes(
                '',
                { nodeType: 'model-performance' },
                1000
            );
            const performanceNodes = searchResults || [];
            const combinations = new Map<string, {
                serverId: string;
                modelName: string;
                usageCount: number;
                lastUsed: Date;
                latencies: number[];
                throughputs: number[];
            }>();

            // Only count nodes with real usage (totalUsageCount > 0 or usageHistory.length > 0)
            for (const node of performanceNodes) {
                const content = node.content;
                if (!content?.attributes) continue;
                const { serverId, modelName, performanceMetrics, totalUsageCount, usageHistory } = content.attributes;
                if (!serverId || !modelName) continue;
                const realUsage = (typeof totalUsageCount === 'number' && totalUsageCount > 0) || (Array.isArray(usageHistory) && usageHistory.length > 0);
                if (!realUsage) continue;

                const key = `${serverId}:${modelName}`;
                const existing = combinations.get(key);

                if (existing) {
                    existing.usageCount += totalUsageCount || usageHistory?.length || 1;
                    if (performanceMetrics?.lastTested) {
                        const testDate = new Date(performanceMetrics.lastTested);
                        if (testDate > existing.lastUsed) {
                            existing.lastUsed = testDate;
                        }
                    }
                    if (performanceMetrics?.latencyMs) {
                        existing.latencies.push(performanceMetrics.latencyMs);
                    }
                    if (performanceMetrics?.throughput) {
                        existing.throughputs.push(performanceMetrics.throughput);
                    }
                } else {
                    combinations.set(key, {
                        serverId,
                        modelName,
                        usageCount: totalUsageCount || (usageHistory?.length || 1),
                        lastUsed: performanceMetrics?.lastTested ? new Date(performanceMetrics.lastTested) : new Date(),
                        latencies: performanceMetrics?.latencyMs ? [performanceMetrics.latencyMs] : [],
                        throughputs: performanceMetrics?.throughput ? [performanceMetrics.throughput] : []
                    });
                }
            }

            // Convert to result format and sort by usage count
            const results = Array.from(combinations.values())
                .filter(combo => combo.usageCount >= (options.minUsageCount || 1))
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, options.limit || 20)
                .map(combo => {
                    const result: any = {
                        serverId: combo.serverId,
                        modelName: combo.modelName,
                        usageCount: combo.usageCount,
                        lastUsed: combo.lastUsed
                    };

                    if (options.includeMetrics) {
                        if (combo.latencies.length > 0) {
                            result.averageLatency = combo.latencies.reduce((a, b) => a + b, 0) / combo.latencies.length;
                        }
                        if (combo.throughputs.length > 0) {
                            result.averageThroughput = combo.throughputs.reduce((a, b) => a + b, 0) / combo.throughputs.length;
                        }
                    }

                    return result;
                });

            logger.info(`[RAG USAGE] Frequent model/server combinations with real usage:`);
            for (const combo of results) {
                logger.info(`[RAG USAGE] Model: ${combo.modelName} | Server: ${combo.serverId} | Usage: ${combo.usageCount}`);
            }
            return results;

        } catch (error) {
            logger.error(`Failed to get frequent model/server combinations: ${error}`);
            return [];
        }
    }

    /**
     * Get usage statistics for model deployments across servers
     */
    async getModelDeploymentStats(): Promise<{
        totalCombinations: number;
        uniqueModels: number;
        uniqueServers: number;
        mostUsedModels: Array<{ modelName: string; serverCount: number; totalUsage: number }>;
        mostActiveServers: Array<{ serverId: string; modelCount: number; totalUsage: number }>;
        deploymentMatrix: Map<string, Set<string>>; // server -> models
    }> {
        try {
            const combinations = await this.getFrequentModelServerCombinations({ limit: 1000 });

            const uniqueModels = new Set<string>();
            const uniqueServers = new Set<string>();
            const modelStats = new Map<string, { serverCount: number; totalUsage: number }>();
            const serverStats = new Map<string, { modelCount: number; totalUsage: number }>();
            const deploymentMatrix = new Map<string, Set<string>>();

            for (const combo of combinations) {
                uniqueModels.add(combo.modelName);
                uniqueServers.add(combo.serverId);

                // Track model statistics
                const modelStat = modelStats.get(combo.modelName) || { serverCount: 0, totalUsage: 0 };
                modelStat.serverCount++;
                modelStat.totalUsage += combo.usageCount;
                modelStats.set(combo.modelName, modelStat);

                // Track server statistics
                const serverStat = serverStats.get(combo.serverId) || { modelCount: 0, totalUsage: 0 };
                serverStat.modelCount++;
                serverStat.totalUsage += combo.usageCount;
                serverStats.set(combo.serverId, serverStat);

                // Track deployment matrix
                if (!deploymentMatrix.has(combo.serverId)) {
                    deploymentMatrix.set(combo.serverId, new Set());
                }
                deploymentMatrix.get(combo.serverId)!.add(combo.modelName);
            }

            // Sort and format results
            const mostUsedModels = Array.from(modelStats.entries())
                .map(([modelName, stats]) => ({ modelName, ...stats }))
                .sort((a, b) => b.totalUsage - a.totalUsage)
                .slice(0, 10);

            const mostActiveServers = Array.from(serverStats.entries())
                .map(([serverId, stats]) => ({ serverId, ...stats }))
                .sort((a, b) => b.totalUsage - a.totalUsage)
                .slice(0, 10);

            return {
                totalCombinations: combinations.length,
                uniqueModels: uniqueModels.size,
                uniqueServers: uniqueServers.size,
                mostUsedModels,
                mostActiveServers,
                deploymentMatrix
            };

        } catch (error) {
            logger.error(`Failed to get deployment stats: ${error}`);
            return {
                totalCombinations: 0,
                uniqueModels: 0,
                uniqueServers: 0,
                mostUsedModels: [],
                mostActiveServers: [],
                deploymentMatrix: new Map()
            };
        }
    }

    /**
     * Track usage for a specific model/server combination
     * This method can be called when a model is actually used for inference
     */
    async trackModelUsage(serverId: string, modelName: string, metrics: {
        latencyMs: number;
        throughput: number;
        timestamp?: Date;
    }): Promise<void> {
        try {
            const nodeId = `performance:${serverId}:${modelName}`;
            const existingNode = await this.ragManager.getNode(nodeId);

            if (existingNode) {
                // Update usage count and recent metrics
                const currentAttributes = existingNode.content?.attributes || {};
                const usageCount = (currentAttributes.usageCount || 0) + 1;
                const recentUsage = currentAttributes.recentUsage || [];

                // Add new usage record and keep only last 100 records
                recentUsage.push({
                    timestamp: metrics.timestamp || new Date(),
                    latencyMs: metrics.latencyMs,
                    throughput: metrics.throughput
                });
                if (recentUsage.length > 100) {
                    recentUsage.shift();
                }

                // Update the node with new usage data
                await this.ragManager.updateNode(nodeId, {
                    content: {
                        ...existingNode.content,
                        attributes: {
                            ...currentAttributes,
                            usageCount,
                            recentUsage,
                            lastUsed: metrics.timestamp || new Date()
                        }
                    },
                    timestamps: {
                        ...existingNode.timestamps,
                        modified: new Date()
                    }
                });

                //
            } else {
                //
            }

        } catch (error) {
            logger.error(`Failed to track model usage: ${error}`);
        }
    }

    /**
     * Increment usage tally when orchestrator chooses a model/server combination
     * This is the main method called by the orchestrator for each inference request
     */
    async incrementUsageTally(
        serverId: string,
        modelName: string,
        requestMetadata?: {
            requestId?: string;
            userContext?: string;
            taskType?: string;
            requestSize?: 'small' | 'medium' | 'large';
            priority?: 'low' | 'normal' | 'high';
            source?: 'direct' | 'orchestrated';
        }
    ): Promise<void> {
        try {
            // Targeted debug for usage tally
            logger.info(`[RAG USAGE] incrementUsageTally CALLED for ${modelName} on ${serverId}` + (requestMetadata ? ` | metadata: ${JSON.stringify(requestMetadata)}` : ''));
            const nodeId = `performance:${serverId}:${modelName}`;
            const timestamp = new Date();
            //
            const existingNode = await this.ragManager.getNode(nodeId);
            //
            if (existingNode) {
                //
                const currentAttributes = existingNode.content?.attributes || {};
                const totalUsageCount = (currentAttributes.totalUsageCount || 0) + 1;
                //
                const usageHistory = currentAttributes.usageHistory || [];
                const newUsageEntry = {
                    timestamp,
                    requestId: requestMetadata?.requestId,
                    userContext: requestMetadata?.userContext,
                    taskType: requestMetadata?.taskType,
                    requestSize: requestMetadata?.requestSize,
                    priority: requestMetadata?.priority
                };
                usageHistory.push(newUsageEntry);
                if (usageHistory.length > 1000) {
                    usageHistory.splice(0, usageHistory.length - 1000);
                }
                const now = timestamp.getTime();
                const last24h = usageHistory.filter((entry: any) =>
                    (now - new Date(entry.timestamp).getTime()) <= (24 * 60 * 60 * 1000)
                ).length;
                const last7d = usageHistory.filter((entry: any) =>
                    (now - new Date(entry.timestamp).getTime()) <= (7 * 24 * 60 * 60 * 1000)
                ).length;
                const last30d = usageHistory.filter((entry: any) =>
                    (now - new Date(entry.timestamp).getTime()) <= (30 * 24 * 60 * 60 * 1000)
                ).length;
                const taskTypeStats = new Map<string, number>();
                usageHistory.forEach((entry: any) => {
                    if (entry.taskType) {
                        taskTypeStats.set(entry.taskType, (taskTypeStats.get(entry.taskType) || 0) + 1);
                    }
                });
                await this.ragManager.updateNode(nodeId, {
                    content: {
                        ...existingNode.content,
                        attributes: {
                            ...currentAttributes,
                            totalUsageCount,
                            usageHistory,
                            lastUsed: timestamp,
                            usageFrequency: {
                                last24h,
                                last7d,
                                last30d,
                                averagePerDay: last30d / 30,
                                peakDay: this.calculatePeakDayUsage(usageHistory)
                            },
                            usagePatterns: {
                                taskTypes: Object.fromEntries(taskTypeStats),
                                mostCommonTaskType: this.getMostCommonTaskType(taskTypeStats),
                                requestSizeDistribution: this.calculateRequestSizeDistribution(usageHistory),
                                priorityDistribution: this.calculatePriorityDistribution(usageHistory)
                            }
                        }
                    },
                    metadata: {
                        ...existingNode.metadata,
                        tags: [
                            ...existingNode.metadata.tags.filter((tag: string) => !tag.startsWith('usage-')),
                            `usage-total-${this.categorizeUsageLevel(totalUsageCount)}`,
                            `usage-recent-${this.categorizeUsageLevel(last24h)}`,
                            `popular-${last30d > 10 ? 'high' : last30d > 3 ? 'medium' : 'low'}`
                        ]
                    },
                    timestamps: {
                        ...existingNode.timestamps,
                        modified: timestamp
                    }
                });
                logger.info(`[RAG USAGE] incrementUsageTally UPDATED node for ${modelName} on ${serverId} | totalUsageCount: ${totalUsageCount}`);
            } else {
                //
                const newPerformanceNode: RAGNode = {
                    id: nodeId,
                    type: 'model-performance' as RAGNodeType,
                    title: `${modelName} Performance on ${serverId}`,
                    content: {
                        description: `Performance and usage tracking for ${modelName} on server ${serverId}`,
                        attributes: {
                            serverId,
                            modelName,
                            totalUsageCount: 1,
                            usageHistory: [{
                                timestamp,
                                requestId: requestMetadata?.requestId,
                                userContext: requestMetadata?.userContext,
                                taskType: requestMetadata?.taskType,
                                requestSize: requestMetadata?.requestSize,
                                priority: requestMetadata?.priority
                            }],
                            lastUsed: timestamp,
                            usageFrequency: {
                                last24h: 1,
                                last7d: 1,
                                last30d: 1,
                                averagePerDay: 1 / 30,
                                peakDay: 1
                            },
                            usagePatterns: {
                                taskTypes: requestMetadata?.taskType ? { [requestMetadata.taskType]: 1 } : {},
                                mostCommonTaskType: requestMetadata?.taskType || 'unknown',
                                requestSizeDistribution: requestMetadata?.requestSize ? { [requestMetadata.requestSize]: 1 } : {},
                                priorityDistribution: requestMetadata?.priority ? { [requestMetadata.priority]: 1 } : {}
                            }
                        }
                    },
                    summaries: {
                        brief: `${modelName}: 1 usage recorded`,
                        medium: `Model ${modelName} on server ${serverId} has been used 1 time`,
                        detailed: `Usage tracking for model ${modelName} on server ${serverId}. Total usage: 1. Last used: ${timestamp.toISOString()}.`
                    },
                    embeddings: await this.generatePerformanceEmbeddings(modelName, {
                        latencyMs: 0, throughput: 0, lastTested: timestamp.getTime()
                    } as any),
                    metadata: {
                        universeId: 'system',
                        ownerId: 'system',
                        sensitivity: 'public' as const,
                        tags: [
                            'model-performance',
                            'usage-tracking',
                            serverId,
                            modelName,
                            'usage-total-low',
                            'usage-recent-low',
                            'popular-low'
                        ],
                        version: 1,
                        sourcePlugin: 'ai-orchestrator'
                    },
                    privacy: {
                        encrypted: false,
                        shareable: true
                    },
                    temporal: {
                        startDate: timestamp
                    },
                    timestamps: {
                        created: timestamp,
                        modified: timestamp
                    },
                    active: true // Ensure all model-performance nodes are created as active
                };
                const { timestamps, ...nodeData } = newPerformanceNode;
                //
                await this.ragManager.createNode(nodeData);
                logger.info(`[RAG USAGE] incrementUsageTally CREATED node for ${modelName} on ${serverId} | totalUsageCount: 1`);
            }
        } catch (error) {
            logger.error(`[RAG] Failed to increment usage tally for ${modelName} on ${serverId}: ${error}`);
        }
    }

    /**
     * Get usage statistics filtered by time range
     */
    async getUsageStatsByTimeRange(
        timeRange: {
            startDate: Date;
            endDate: Date;
        },
        filters?: {
            serverId?: string;
            modelName?: string;
            taskType?: string;
            priority?: 'low' | 'normal' | 'high';
        }
    ): Promise<{
        totalRequests: number;
        uniqueCombinations: number;
        topCombinations: Array<{
            serverId: string;
            serverUrl: string;
            modelName: string;
            requestCount: number;
            averageRequestsPerDay: number;
            taskTypeBreakdown: Record<string, number>;
        }>;
        timeSeriesData: Array<{
            date: string;
            requestCount: number;
            uniqueCombinations: number;
        }>;
        taskTypeStats: Record<string, number>;
        serverStats: Record<string, number>;
        modelStats: Record<string, number>;
    }> {
        try {
            const searchResults = await this.ragManager.searchNodes(
                '',
                { nodeType: 'model-performance' }
            );

            const performanceNodes = searchResults || [];
            const startTime = timeRange.startDate.getTime();
            const endTime = timeRange.endDate.getTime();
            const daysDiff = Math.ceil((endTime - startTime) / (24 * 60 * 60 * 1000));

            let totalRequests = 0;
            const combinationStats = new Map<string, {
                serverId: string;
                modelName: string;
                requestCount: number;
                taskTypes: Map<string, number>;
            }>();
            const dailyStats = new Map<string, { requests: number; combinations: Set<string> }>();
            const taskTypeStats = new Map<string, number>();
            const serverStats = new Map<string, number>();
            const modelStats = new Map<string, number>();

            // Process each performance node
            for (const node of performanceNodes) {
                const attributes = node.content?.attributes;
                if (!attributes?.usageHistory) continue;

                const { serverId, modelName, usageHistory } = attributes;

                // Apply filters
                if (filters?.serverId && serverId !== filters.serverId) continue;
                if (filters?.modelName && modelName !== filters.modelName) continue;

                // Filter usage history by time range and other criteria
                const filteredUsage = usageHistory.filter((entry: any) => {
                    const entryTime = new Date(entry.timestamp).getTime();
                    if (entryTime < startTime || entryTime > endTime) return false;
                    if (filters?.taskType && entry.taskType !== filters.taskType) return false;
                    if (filters?.priority && entry.priority !== filters.priority) return false;
                    return true;
                });

                if (filteredUsage.length === 0) continue;

                const combo = `${serverId}:${modelName}`;
                totalRequests += filteredUsage.length;

                // Update combination stats
                if (!combinationStats.has(combo)) {
                    combinationStats.set(combo, {
                        serverId,
                        modelName,
                        requestCount: 0,
                        taskTypes: new Map()
                    });
                }
                const comboStat = combinationStats.get(combo)!;
                comboStat.requestCount += filteredUsage.length;

                // Process each usage entry
                for (const entry of filteredUsage) {
                    const date = new Date(entry.timestamp).toISOString().split('T')[0];

                    // Update daily stats
                    if (!dailyStats.has(date)) {
                        dailyStats.set(date, { requests: 0, combinations: new Set() });
                    }
                    const dayStat = dailyStats.get(date)!;
                    dayStat.requests++;
                    dayStat.combinations.add(combo);

                    // Update task type stats
                    if (entry.taskType) {
                        taskTypeStats.set(entry.taskType, (taskTypeStats.get(entry.taskType) || 0) + 1);
                        comboStat.taskTypes.set(entry.taskType, (comboStat.taskTypes.get(entry.taskType) || 0) + 1);
                    }

                    // Update server and model stats
                    serverStats.set(serverId, (serverStats.get(serverId) || 0) + 1);
                    modelStats.set(modelName, (modelStats.get(modelName) || 0) + 1);
                }
            }

            // Convert to result format
            const topCombinations = Array.from(combinationStats.values())
                .sort((a, b) => b.requestCount - a.requestCount)
                .slice(0, 20)
                .map(combo => ({
                    serverId: combo.serverId,
                    serverUrl: this.getServerUrlFromId(combo.serverId),
                    modelName: combo.modelName,
                    requestCount: combo.requestCount,
                    averageRequestsPerDay: daysDiff > 0 ? Math.round((combo.requestCount / daysDiff) * 100) / 100 : 0,
                    taskTypeBreakdown: Object.fromEntries(combo.taskTypes)
                }));

            const timeSeriesData = Array.from(dailyStats.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, stats]) => ({
                    date,
                    requestCount: stats.requests,
                    uniqueCombinations: stats.combinations.size
                }));

            return {
                totalRequests,
                uniqueCombinations: combinationStats.size,
                topCombinations,
                timeSeriesData,
                taskTypeStats: Object.fromEntries(taskTypeStats),
                serverStats: Object.fromEntries(serverStats),
                modelStats: Object.fromEntries(modelStats)
            };

        } catch (error) {
            logger.error(`Failed to get usage stats by time range: ${error}`);
            throw error;
        }
    }

    // Helper methods for usage analytics
    private calculatePeakDayUsage(usageHistory: any[]): number {
        const dailyCounts = new Map<string, number>();

        for (const entry of usageHistory) {
            const date = new Date(entry.timestamp).toISOString().split('T')[0];
            dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
        }

        return Math.max(...Array.from(dailyCounts.values()), 0);
    }

    private getMostCommonTaskType(taskTypeStats: Map<string, number>): string {
        if (taskTypeStats.size === 0) return 'unknown';

        return Array.from(taskTypeStats.entries())
            .sort(([, a], [, b]) => b - a)[0][0];
    }

    private calculateRequestSizeDistribution(usageHistory: any[]): Record<string, number> {
        const distribution: Record<string, number> = {};

        for (const entry of usageHistory) {
            if (entry.requestSize) {
                distribution[entry.requestSize] = (distribution[entry.requestSize] || 0) + 1;
            }
        }

        return distribution;
    }

    private calculatePriorityDistribution(usageHistory: any[]): Record<string, number> {
        const distribution: Record<string, number> = {};

        for (const entry of usageHistory) {
            if (entry.priority) {
                distribution[entry.priority] = (distribution[entry.priority] || 0) + 1;
            }
        }

        return distribution;
    }

    private categorizeUsageLevel(count: number): string {
        if (count >= 1000) return 'very-high';
        if (count >= 100) return 'high';
        if (count >= 10) return 'medium';
        if (count >= 1) return 'low';
        return 'none';
    }

    // ============================================
    // MODEL AND SERVER INFORMATION GATHERING
    // ============================================

    /**
     * Gather capability information for a model across all deployments
     */
    private gatherModelCapabilities(modelName: string) {
        const servers = this.orchestrator.getServers();
        const deployments = servers.filter(s => s.models?.includes(modelName));

        const capabilities = {
            primaryCapabilities: this.inferPrimaryCapabilities(modelName),
            allCapabilities: this.inferAllCapabilities(modelName),
            performanceSummary: this.summarizeModelPerformance(modelName),
            recommendedUseCases: this.getRecommendedUseCases(modelName),
            performanceClass: this.classifyModelPerformance(modelName)
        };

        return capabilities;
    }

    /**
     * Gather server information including hardware and performance profiles
     */
    private gatherServerInformation(server: any) {
        const performanceData = this.getServerPerformanceData(server.id);

        return {
            capabilities: this.inferServerCapabilities(server),
            hardwareProfile: this.inferHardwareProfile(server),
            performanceProfile: this.createPerformanceProfile(server.id, performanceData),
            lastHealthCheck: new Date()
        };
    }

    /**
     * Infer model type from name patterns
     */
    private inferModelType(modelName: string): string {
        const name = modelName.toLowerCase();
        if (name.includes('llama')) return 'llama-family';
        if (name.includes('mistral')) return 'mistral-family';
        if (name.includes('qwen')) return 'qwen-family';
        if (name.includes('phi')) return 'phi-family';
        if (name.includes('gemma')) return 'gemma-family';
        if (name.includes('code')) return 'code-specialized';
        if (name.includes('chat') || name.includes('instruct')) return 'chat-instruct';
        return 'general-purpose';
    }

    /**
     * Calculate average performance across all deployments of a model
     */
    private calculateAverageModelPerformance(modelName: string) {
        const servers = this.orchestrator.getServers();
        const benchmarks = servers
            .filter(s => s.models?.includes(modelName))
            .map(s => this.orchestrator.getBenchmark(s.id, modelName))
            .filter((b): b is NonNullable<typeof b> => b !== null && b !== undefined);

        if (benchmarks.length === 0) {
            return { latencyMs: 0, throughput: 0, availability: 0 };
        }

        const avgLatency = benchmarks.reduce((sum, b) => sum + b.latencyMs, 0) / benchmarks.length;
        const avgThroughput = benchmarks.reduce((sum, b) => sum + b.throughput, 0) / benchmarks.length;
        const availability = benchmarks.length / servers.filter(s => s.models?.includes(modelName)).length;

        return {
            latencyMs: Math.round(avgLatency * 100) / 100,
            throughput: Math.round(avgThroughput * 100) / 100,
            availability: Math.round(availability * 100) / 100
        };
    }

    /**
     * Get deployment count for a model
     */
    private getModelDeploymentCount(modelName: string): number {
        const servers = this.orchestrator.getServers();
        return servers.filter(s => s.models?.includes(modelName)).length;
    }

    /**
     * Estimate parameter size from model name
     */
    private estimateParameterSize(modelName: string): string {
        const name = modelName.toLowerCase();
        const sizeMatch = name.match(/(\d+)b/);
        if (sizeMatch) {
            const size = parseInt(sizeMatch[1]);
            if (size >= 70) return 'large';
            if (size >= 13) return 'medium';
            return 'small';
        }
        return 'unknown';
    }

    /**
     * Estimate context window from model name/type
     */
    private estimateContextWindow(modelName: string): number {
        const name = modelName.toLowerCase();
        if (name.includes('32k')) return 32768;
        if (name.includes('16k')) return 16384;
        if (name.includes('8k')) return 8192;
        if (name.includes('llama')) return 4096;
        if (name.includes('mistral')) return 8192;
        return 4096; // Default
    }

    /**
     * Infer primary capabilities from model name/type
     */
    private inferPrimaryCapabilities(modelName: string): string[] {
        const name = modelName.toLowerCase();
        const capabilities: string[] = [];

        if (name.includes('code')) capabilities.push('Code Generation');
        if (name.includes('chat') || name.includes('instruct')) capabilities.push('Conversational AI');
        if (name.includes('math')) capabilities.push('Mathematical Reasoning');
        if (name.includes('tool')) capabilities.push('Tool Usage');

        if (capabilities.length === 0) {
            capabilities.push('Text Generation', 'Question Answering');
        }

        return capabilities;
    }

    /**
     * Infer all capabilities from model characteristics
     */
    private inferAllCapabilities(modelName: string): string[] {
        const primary = this.inferPrimaryCapabilities(modelName);
        const additional = ['Text Completion', 'Summarization', 'Analysis', 'Creative Writing'];
        return [...primary, ...additional];
    }

    /**
     * Summarize model performance across deployments
     */
    private summarizeModelPerformance(modelName: string): string {
        const avg = this.calculateAverageModelPerformance(modelName);
        const latencyClass = this.categorizeLatency(avg.latencyMs);
        const throughputClass = this.categorizeThroughput(avg.throughput);

        return `${latencyClass} latency (${avg.latencyMs}ms), ${throughputClass} throughput (${avg.throughput} req/s), ${(avg.availability * 100)}% availability`;
    }

    /**
     * Get recommended use cases for a model
     */
    private getRecommendedUseCases(modelName: string): string[] {
        const type = this.inferModelType(modelName);
        const size = this.estimateParameterSize(modelName);

        const useCases: string[] = [];

        if (type === 'code-specialized') {
            useCases.push('Code generation', 'Code review', 'Programming assistance');
        } else if (type === 'chat-instruct') {
            useCases.push('Interactive conversations', 'Customer service', 'Educational tutoring');
        } else {
            useCases.push('Content creation', 'Document analysis', 'General assistance');
        }

        if (size === 'large') {
            useCases.push('Complex reasoning tasks', 'Long-form content');
        } else if (size === 'small') {
            useCases.push('Quick responses', 'Resource-constrained environments');
        }

        return useCases;
    }

    /**
     * Classify model performance level
     */
    private classifyModelPerformance(modelName: string): string {
        const avg = this.calculateAverageModelPerformance(modelName);
        const latencyScore = avg.latencyMs < 200 ? 2 : avg.latencyMs < 500 ? 1 : 0;
        const throughputScore = avg.throughput > 3 ? 2 : avg.throughput > 1 ? 1 : 0;
        const totalScore = latencyScore + throughputScore;

        if (totalScore >= 3) return 'high-performance';
        if (totalScore >= 2) return 'standard-performance';
        return 'basic-performance';
    }

    /**
     * Infer server capabilities
     */
    private inferServerCapabilities(server: any): string[] {
        const capabilities = ['Model Hosting', 'AI Inference'];

        if (server.models?.length > 5) capabilities.push('Multi-Model Support');
        if (server.url?.includes('gpu')) capabilities.push('GPU Acceleration');

        return capabilities;
    }

    /**
     * Infer hardware profile from server characteristics
     */
    private inferHardwareProfile(server: any) {
        const modelCount = server.models?.length || 0;
        let category = 'standard';
        let description = 'Standard inference server';

        if (modelCount > 10) {
            category = 'high-capacity';
            description = 'High-capacity server with extensive model support';
        } else if (modelCount < 3) {
            category = 'specialized';
            description = 'Specialized server with focused model deployment';
        }

        return { category, description };
    }

    /**
     * Create performance profile for server
     */
    private createPerformanceProfile(serverId: string, performanceData: any) {
        // This would analyze actual performance data
        // For now, return estimated profile
        return {
            overallRating: 'good',
            description: 'Stable performance with consistent response times',
            strengths: ['Reliability', 'Consistent latency'],
            considerations: ['Monitor during peak usage']
        };
    }

    /**
     * Get server performance data
     */
    private getServerPerformanceData(serverId: string) {
        // This would gather actual performance metrics
        // For now, return basic structure
        return {
            uptime: '99%',
            avgResponseTime: '250ms',
            throughput: '2.5 req/s'
        };
    }

    /**
     * Generate embeddings for model capabilities
     */
    private async generateModelEmbeddings(modelName: string, capabilities: any): Promise<number[]> {
        const modelText = `AI model ${modelName} capabilities: ${capabilities.allCapabilities.join(' ')} use cases: ${capabilities.recommendedUseCases.join(' ')} performance: ${capabilities.performanceSummary}`;
        return this.hashToEmbedding(modelText);
    }

    /**
     * Generate embeddings for server information
     */
    private async generateServerEmbeddings(server: any, serverInfo: any): Promise<number[]> {
        const serverText = `AI server ${server.id} hosting models: ${(server.models || []).join(' ')} capabilities: ${serverInfo.capabilities.join(' ')} performance: ${serverInfo.performanceProfile.description}`;
        return this.hashToEmbedding(serverText);
    }

    /**
     * Get server URL from server ID
     */
    private getServerUrlFromId(serverId: string): string {
        const servers = this.orchestrator.getServers();
        const server = servers.find(s => s.id === serverId);
        return server?.url || `unknown-server-${serverId}`;
    }
}

// Singleton instance
let performanceRAGService: ModelPerformanceRAGService | null = null;

/**
 * Get or create the Model Performance RAG Service instance
 */
export async function getModelPerformanceRAGService(orchestrator: AIOrchestrator): Promise<ModelPerformanceRAGService> {
    if (!performanceRAGService) {
        performanceRAGService = new ModelPerformanceRAGService(orchestrator);
        await performanceRAGService.initialize();
    }
    return performanceRAGService;
}

/**
 * Shutdown the Model Performance RAG Service
 */
export async function shutdownModelPerformanceRAGService(): Promise<void> {
    if (performanceRAGService) {
        await performanceRAGService.shutdown();
        performanceRAGService = null;
    }
}