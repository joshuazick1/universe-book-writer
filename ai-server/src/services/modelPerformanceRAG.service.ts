/**
 * Model Performance RAG Integration Service
 * 
 * Integrates AI orchestrator benchmark data into the RAG knowledge graph
 * for semantic search and context-aware model selection.
 */

import { RAGServiceManager } from '../rag/manager.js';
import { getRAGServiceManager } from '../rag/instance.js';
import { BenchmarkManager } from '../benchmarkManager.js';
import { AIOrchestrator } from '../orchestrator.js';
import { logInfo, logError } from '../logger.js';
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

    constructor(orchestrator: AIOrchestrator) {
        this.orchestrator = orchestrator;
        this.benchmarkManager = (orchestrator as any).benchmarkManager;
    }

    /**
     * Initialize the service and start periodic RAG sync
     */
    async initialize(): Promise<void> {
        try {
            console.log('[RAG] ModelPerformanceRAGService: Starting initialization...');
            this.ragManager = await getRAGServiceManager();
            console.log('[RAG] ModelPerformanceRAGService: RAG manager obtained successfully');
            logInfo('Model Performance RAG Service initialized');

            // Perform initial sync
            console.log('[RAG] ModelPerformanceRAGService: Starting initial benchmark sync...');
            await this.syncBenchmarkDataToRAG();
            console.log('[RAG] ModelPerformanceRAGService: Initial benchmark sync completed');

            // Start periodic sync (every 30 minutes to reduce load)
            this.syncInterval = setInterval(async () => {
                try {
                    await this.syncBenchmarkDataToRAG();
                } catch (error) {
                    logError(`Periodic benchmark sync failed: ${error}`);
                }
            }, 30 * 60 * 1000);

        } catch (error) {
            logError(`Failed to initialize Model Performance RAG Service: ${error}`);
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
        logInfo('Model Performance RAG Service shut down');
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

            logInfo(`Synced ${synced.modelNodes} model nodes, ${synced.serverNodes} server nodes, ${synced.performanceNodes} performance nodes, and ${synced.relationships} relationships to RAG`);

        } catch (error) {
            logError(`Failed to sync benchmark data to RAG: ${error}`);
            throw error;
        }
    }

    /**
     * Create or update a model node with capability information
     */
    private async syncModelNode(modelName: string): Promise<void> {
        const nodeId = `model:${modelName}`;

        // Gather capability information from all servers running this model
        const capabilities = this.gatherModelCapabilities(modelName);

        const modelNode: RAGNode = {
            id: nodeId,
            type: 'ai-model' as RAGNodeType,
            title: `AI Model: ${modelName}`,
            content: {
                description: `AI language model ${modelName} with multi-server deployment capabilities`,
                attributes: {
                    modelName,
                    modelType: this.inferModelType(modelName),
                    capabilities: capabilities,
                    averagePerformance: this.calculateAverageModelPerformance(modelName),
                    deploymentCount: this.getModelDeploymentCount(modelName),
                    parameterSize: this.estimateParameterSize(modelName),
                    contextWindow: this.estimateContextWindow(modelName)
                }
            },
            summaries: {
                brief: `${modelName}: ${capabilities.primaryCapabilities.join(', ')}`,
                medium: `AI model ${modelName} specializing in ${capabilities.primaryCapabilities.join(', ')}. Deployed on ${this.getModelDeploymentCount(modelName)} server(s) with average performance metrics.`,
                detailed: `${modelName} is an AI language model with capabilities including ${capabilities.allCapabilities.join(', ')}. Currently deployed on ${this.getModelDeploymentCount(modelName)} server(s). Performance characteristics: ${capabilities.performanceSummary}. Best suited for: ${capabilities.recommendedUseCases.join(', ')}.`
            },
            embeddings: await this.generateModelEmbeddings(modelName, capabilities),
            metadata: {
                universeId: 'system',
                ownerId: 'system',
                sensitivity: 'public' as const,
                tags: [
                    'ai-model',
                    'language-model',
                    modelName.toLowerCase(),
                    ...capabilities.primaryCapabilities.map(c => c.toLowerCase().replace(/\s+/g, '-')),
                    `deployments-${this.getModelDeploymentCount(modelName)}`,
                    capabilities.performanceClass
                ],
                version: 1,
                sourcePlugin: 'ai-orchestrator'
            },
            privacy: {
                encrypted: false,
                shareable: true
            },
            temporal: {
                startDate: new Date()
            },
            timestamps: {
                created: new Date(),
                modified: new Date()
            },
            active: true // Ensure all model nodes are created as active
        };

        // Upsert pattern: check if node exists, update if yes, create if no
        const existingNode = await this.ragManager.getNode(nodeId);
        if (existingNode) {
            const { id, timestamps, ...updateData } = modelNode;
            await this.ragManager.updateNode(nodeId, updateData);
        } else {
            const { timestamps, ...nodeData } = modelNode;
            await this.ragManager.createNode(nodeData);
        }
        //
    }

    /**
     * Create or update a server node with hardware and deployment information
     */
    private async syncServerNode(server: any): Promise<void> {
        const nodeId = `server:${server.id}`;

        const serverInfo = this.gatherServerInformation(server);

        const serverNode: RAGNode = {
            id: nodeId,
            type: 'ai-server' as RAGNodeType,
            title: `AI Server: ${server.id}`,
            content: {
                description: `AI inference server hosting multiple language models`,
                attributes: {
                    serverId: server.id,
                    serverUrl: server.url || 'Unknown',
                    hostedModels: server.models || [],
                    modelCount: server.models?.length || 0,
                    serverCapabilities: serverInfo.capabilities,
                    hardwareProfile: serverInfo.hardwareProfile,
                    performanceProfile: serverInfo.performanceProfile,
                    status: server.status || 'unknown',
                    lastHealthCheck: serverInfo.lastHealthCheck
                }
            },
            summaries: {
                brief: `Server ${server.id}: ${server.models?.length || 0} models, ${serverInfo.performanceProfile.overallRating} performance`,
                medium: `AI server ${server.id} hosting ${server.models?.length || 0} models including ${(server.models || []).slice(0, 3).join(', ')}. Performance rating: ${serverInfo.performanceProfile.overallRating}.`,
                detailed: `AI inference server ${server.id} at ${server.url || 'unknown location'} hosting ${server.models?.length || 0} models: ${(server.models || []).join(', ')}. Hardware profile: ${serverInfo.hardwareProfile.description}. Performance characteristics: ${serverInfo.performanceProfile.description}. Server status: ${server.status || 'unknown'}.`
            },
            embeddings: await this.generateServerEmbeddings(server, serverInfo),
            metadata: {
                universeId: 'system',
                ownerId: 'system',
                sensitivity: 'public' as const,
                tags: [
                    'ai-server',
                    'inference-server',
                    server.id.toLowerCase(),
                    `models-${server.models?.length || 0}`,
                    serverInfo.performanceProfile.overallRating,
                    serverInfo.hardwareProfile.category,
                    server.status || 'unknown'
                ],
                version: 1,
                sourcePlugin: 'ai-orchestrator'
            },
            privacy: {
                encrypted: false,
                shareable: true
            },
            temporal: {
                startDate: new Date()
            },
            timestamps: {
                created: new Date(),
                modified: new Date()
            },
            active: true // Ensure all server nodes are created as active
        };

        // Upsert pattern for server node
        const existingServerNode = await this.ragManager.getNode(nodeId);
        if (existingServerNode) {
            const { id, timestamps, ...updateData } = serverNode;
            await this.ragManager.updateNode(nodeId, updateData);
        } else {
            const { timestamps, ...nodeData } = serverNode;
            await this.ragManager.createNode(nodeData);
        }
        //
    }

    /**
     * Create or update a performance node in RAG for a specific server/model pair
     */
    private async syncServerModelPerformance(
        serverId: string,
        modelName: string,
        benchmark: ServerModelBenchmark
    ): Promise<void> {

        const nodeId = `performance:${serverId}:${modelName}`;

        // Calculate additional metrics
        const trends = this.calculatePerformanceTrends(serverId, modelName);
        const contextualMetrics = this.inferContextualPerformance(benchmark);

        const performanceNode: RAGNode = {
            id: nodeId,
            type: 'model-performance' as RAGNodeType,
            title: `${modelName} Performance on ${serverId}`,
            content: {
                description: `Performance metrics for ${modelName} on server ${serverId}`,
                attributes: {
                    serverId,
                    modelName,
                    performanceMetrics: {
                        ...benchmark,
                        averageLatency: this.benchmarkManager.getServerAvgLatency({ id: serverId, models: [modelName] } as any),
                        stabilityScore: this.calculateStabilityScore(serverId, modelName),
                        qualityScore: this.estimateQualityScore(benchmark)
                    },
                    contextualPerformance: contextualMetrics,
                    trends
                }
            },
            summaries: {
                brief: `${modelName}: ${benchmark.latencyMs.toFixed(1)}ms avg latency, ${benchmark.throughput.toFixed(1)} req/s`,
                medium: `Model ${modelName} on server ${serverId} shows ${benchmark.latencyMs.toFixed(1)}ms average latency with ${benchmark.throughput.toFixed(1)} requests per second throughput. ${trends.improvingLatency ? 'Performance improving.' : 'Performance stable.'}`,
                detailed: `Comprehensive performance analysis for model ${modelName} on server ${serverId}: Average latency of ${benchmark.latencyMs.toFixed(1)}ms, throughput of ${benchmark.throughput.toFixed(1)} requests per second. Last tested: ${new Date(benchmark.lastTested).toISOString()}. Performance trends: ${trends.improvingLatency ? 'improving latency' : 'stable latency'}, ${trends.consistentThroughput ? 'consistent throughput' : 'variable throughput'}. Recent failures: ${trends.recentFailures}.`
            },
            embeddings: await this.generatePerformanceEmbeddings(modelName, benchmark),
            metadata: {
                universeId: 'system',
                ownerId: 'system',
                sensitivity: 'public' as const,
                tags: [
                    'model-performance',
                    'benchmarks',
                    serverId,
                    modelName,
                    `latency-${this.categorizeLatency(benchmark.latencyMs)}`,
                    `throughput-${this.categorizeThroughput(benchmark.throughput)}`
                ],
                version: 1,
                sourcePlugin: 'ai-orchestrator'
            },
            privacy: {
                encrypted: false,
                shareable: true
            },
            temporal: {
                startDate: new Date(benchmark.lastTested)
            },
            timestamps: {
                created: new Date(),
                modified: new Date()
            },
            active: true // Ensure all model-performance nodes are created as active
        };

        // Upsert pattern for performance node
        const existingPerfNode = await this.ragManager.getNode(nodeId);
        if (existingPerfNode) {
            const { id, timestamps, ...updateData } = performanceNode;
            await this.ragManager.updateNode(nodeId, updateData);
        } else {
            const { timestamps, ...nodeData } = performanceNode;
            await this.ragManager.createNode(nodeData);
        }
        //
    }

    /**
     * Create relationships between performance data and system components
     */
    private async createPerformanceRelationships(
        serverId: string,
        modelName: string,
        benchmark: ServerModelBenchmark
    ): Promise<void> {

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
                    resourceAllocation: this.estimateResourceAllocation(serverId, modelName)
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

        // 2. Server generates Performance data relationship
        const serverPerformance: RAGRelationship = {
            id: `${serverNodeId}:generates:${performanceNodeId}`,
            type: 'causal',
            fromNodeId: serverNodeId,
            toNodeId: performanceNodeId,
            weight: 1.0,
            metadata: {
                description: 'Server generates performance metrics for model execution',
                universeId: 'system',
                sourcePlugin: 'ai-orchestrator',
                attributes: {
                    relationshipType: 'performance-generation',
                    dataFrequency: 'continuous',
                    lastUpdate: new Date(benchmark.lastTested).toISOString()
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

        // 3. Model exhibits Performance characteristics relationship  
        const modelPerformance: RAGRelationship = {
            id: `${modelNodeId}:exhibits:${performanceNodeId}`,
            type: 'reference',
            fromNodeId: modelNodeId,
            toNodeId: performanceNodeId,
            weight: 0.8, // Slightly lower weight as this is context-dependent
            metadata: {
                description: 'Model exhibits these performance characteristics on this server',
                universeId: 'system',
                sourcePlugin: 'ai-orchestrator',
                attributes: {
                    relationshipType: 'performance-exhibition',
                    context: `${modelName} running on ${serverId}`,
                    performanceClass: this.categorizeLatency(benchmark.latencyMs),
                    qualityScore: this.estimateQualityScore(benchmark)
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

        // Upsert relationships
        const relationships = [serverHostsModel, serverPerformance, modelPerformance];
        for (const relationship of relationships) {
            const existingRel = await this.ragManager.getRelationship(relationship.id);
            if (existingRel) {
                const { id, timestamps, ...updateData } = relationship;
                await this.ragManager.updateRelationship(relationship.id, updateData);
            } else {
                const { timestamps, ...relData } = relationship;
                await this.ragManager.createRelationship(relData);
            }
        }

        //
    }

    /**
     * Estimate resource allocation for a model on a server
     */
    private estimateResourceAllocation(serverId: string, modelName: string): string {
        const server = this.orchestrator.getServers().find(s => s.id === serverId);
        const modelCount = server?.models?.length || 1;
        const paramSize = this.estimateParameterSize(modelName);

        if (modelCount === 1) return 'dedicated';
        if (paramSize === 'large') return 'high-share';
        if (paramSize === 'small') return 'low-share';
        return 'balanced-share';
    }

    /**
     * Calculate performance trends for a server/model pair
     */
    private calculatePerformanceTrends(serverId: string, modelName: string): ModelPerformanceNode['trends'] {
        // This would access recent latency data from BenchmarkManager
        // For now, return calculated estimates

        const recentBenchmarks = (this.benchmarkManager as any).recentLatencies?.get(`${serverId}:${modelName}`) || [];

        return {
            improvingLatency: this.isLatencyImproving(recentBenchmarks),
            consistentThroughput: this.isThroughputConsistent(recentBenchmarks),
            recentFailures: this.countRecentFailures(serverId, modelName)
        };
    }

    /**
     * Infer contextual performance characteristics
     */
    private inferContextualPerformance(benchmark: ServerModelBenchmark): ModelPerformanceNode['contextualPerformance'] {
        return {
            inputComplexity: this.categorizeComplexityFromLatency(benchmark.latencyMs),
            outputQuality: this.inferQualityFromThroughput(benchmark.throughput),
            resourceUsage: this.categorizeResourceUsage(benchmark.latencyMs, benchmark.throughput)
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
            logError(`Failed to query model performance: ${error}`);
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
            logError(`Failed to get best models for task: ${error}`);
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

            logInfo(`[RAG USAGE] Frequent model/server combinations with real usage:`);
            for (const combo of results) {
                logInfo(`[RAG USAGE] Model: ${combo.modelName} | Server: ${combo.serverId} | Usage: ${combo.usageCount}`);
            }
            return results;

        } catch (error) {
            logError(`Failed to get frequent model/server combinations: ${error}`);
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
            logError(`Failed to get deployment stats: ${error}`);
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
            logError(`Failed to track model usage: ${error}`);
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
            logInfo(`[RAG USAGE] incrementUsageTally CALLED for ${modelName} on ${serverId}` + (requestMetadata ? ` | metadata: ${JSON.stringify(requestMetadata)}` : ''));
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
                logInfo(`[RAG USAGE] incrementUsageTally UPDATED node for ${modelName} on ${serverId} | totalUsageCount: ${totalUsageCount}`);
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
                logInfo(`[RAG USAGE] incrementUsageTally CREATED node for ${modelName} on ${serverId} | totalUsageCount: 1`);
            }
        } catch (error) {
            logError(`[RAG] Failed to increment usage tally for ${modelName} on ${serverId}: ${error}`);
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
            logError(`Failed to get usage stats by time range: ${error}`);
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