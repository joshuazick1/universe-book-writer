/**
 * Community-Based Model Selection Service
 * 
 * Service that enhances model selection using graph-based insights and community analysis.
 * Integrates with the orchestrator to provide better server allocation based on 
 * relationship data, community scores, and performance clustering.
 */

import { GraphRelationshipService, CommunityScore, RelationshipType } from './graph-relationship.service.js';
import { getNode } from '../../../shared/node/nodeService.js';
import { NodeType, Node } from '../../../shared/types/nodeTypes.js';
import { logger } from '../../../shared/logging/logger.js';
import { sharedDatabaseConnection } from '../../../shared/database/database.config.js';

/**
 * Model selection recommendation
 */
export interface ModelSelectionRecommendation {
    modelId: string;
    serverId: string;
    score: number;
    confidence: number;
    reasonCodes: string[];
    reasons: string[];
    graphInsights: {
        communityRank: number;
        performanceCluster: string;
        peerModels: string[];
        networkPosition: string;
        relationshipStrength: number;
    };
    performanceMetrics: {
        predictedLatency: number;
        predictedQuality: number;
        reliabilityScore: number;
        capacityUtilization: number;
    };
}

/**
 * Server allocation strategy based on graph insights
 */
export interface AllocationStrategy {
    strategy: 'performance_optimized' | 'community_based' | 'load_balanced' | 'hybrid';
    weights: {
        performance: number;
        community: number;
        availability: number;
        proximity: number;
    };
    constraints: {
        minCommunityScore?: number;
        maxLoadThreshold?: number;
        requiredCapabilities?: string[];
        preferredRegions?: string[];
    };
}

export class CommunityBasedModelSelectionService {
    private graphService: GraphRelationshipService;
    private communityCache = new Map<string, CommunityScore>();
    private relationshipCache = new Map<string, any[]>();
    private cacheExpiry = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.graphService = new GraphRelationshipService();
        logger.info('[CommunityBasedModelSelection] Initializing community-based model selection service');
    }

    /**
     * Get enhanced model recommendations using graph-based insights
     */
    async getModelRecommendations(
        requestData: {
            taskType: string;
            requiredCapabilities?: string[];
            performanceRequirements?: {
                maxLatency?: number;
                minQuality?: number;
                reliabilityThreshold?: number;
            };
            constraints?: {
                preferredRegions?: string[];
                excludeServers?: string[];
                maxLoadThreshold?: number;
            };
        },
        strategy: AllocationStrategy = this.getDefaultStrategy()
    ): Promise<ModelSelectionRecommendation[]> {
        logger.info(`[CommunityBasedModelSelection] Generating recommendations for task: ${requestData.taskType}`);

        try {
            // Get available models and servers
            const [modelNodes, serverNodes] = await Promise.all([
                this.getNodes({ type: 'ai-model' as NodeType }),
                this.getNodes({ type: 'ai-server' as NodeType })
            ]);

            // Filter models by capabilities if specified
            const filteredModels = this.filterModelsByCapabilities(
                modelNodes,
                requestData.requiredCapabilities || []
            );

            // Get community scores for filtered models
            const communityScores = await this.getCommunityScores(filteredModels.map(m => m.id));

            // Generate recommendations for each model-server combination
            const recommendations: ModelSelectionRecommendation[] = [];

            for (const model of filteredModels) {
                const modelCommunity = communityScores.find(cs => cs.nodeId === model.id);

                // Get compatible servers for this model
                const compatibleServers = await this.getCompatibleServers(model, serverNodes, requestData.constraints);

                for (const server of compatibleServers) {
                    const recommendation = await this.generateRecommendation(
                        model,
                        server,
                        modelCommunity,
                        requestData,
                        strategy
                    );

                    if (recommendation.score > 0.3) { // Minimum threshold
                        recommendations.push(recommendation);
                    }
                }
            }

            // Sort by score and apply strategy-specific ranking
            const rankedRecommendations = this.rankRecommendations(recommendations, strategy);

            logger.info(`[CommunityBasedModelSelection] Generated ${rankedRecommendations.length} recommendations`);
            return rankedRecommendations.slice(0, 10); // Return top 10

        } catch (error) {
            logger.error('[CommunityBasedModelSelection] Error generating recommendations:', { error });
            throw error;
        }
    }

    /**
     * Get detailed graph insights for a specific model
     */
    async getModelGraphInsights(modelId: string): Promise<{
        communityAnalysis: {
            communityId: string;
            rank: number;
            score: number;
            peerCount: number;
            influenceMetrics: any;
        };
        relationshipAnalysis: {
            totalRelationships: number;
            strongRelationships: number;
            relationshipTypes: string[];
            networkPosition: string;
        };
        performanceCluster: {
            clusterId: string;
            clusterRank: number;
            similarModels: string[];
            avgPerformance: number;
        };
        recommendations: {
            suggestedPeers: string[];
            improvementAreas: string[];
            benchmarkGaps: string[];
        };
    }> {
        logger.info(`[CommunityBasedModelSelection] Analyzing graph insights for model: ${modelId}`);

        try {
            const insights = await this.graphService.getGraphBasedInsights(modelId);
            const communityScores = await this.getCommunityScores([modelId]);
            const modelCommunity = communityScores.find(cs => cs.nodeId === modelId);

            return {
                communityAnalysis: {
                    communityId: modelCommunity?.communityId || 'unknown',
                    rank: modelCommunity?.rank || 0,
                    score: modelCommunity?.score || 0,
                    peerCount: modelCommunity?.peerNodes.length || 0,
                    influenceMetrics: modelCommunity?.influenceMetrics || {}
                },
                relationshipAnalysis: {
                    totalRelationships: insights.relationshipAnalysis.similarModels.length,
                    strongRelationships: insights.relationshipAnalysis.similarModels.length,
                    relationshipTypes: [RelationshipType.PERFORMANCE_SIMILAR, RelationshipType.MODEL_FAMILY],
                    networkPosition: insights.relationshipAnalysis.networkPosition
                },
                performanceCluster: {
                    clusterId: insights.relationshipAnalysis.performanceCluster,
                    clusterRank: modelCommunity?.rank || 0,
                    similarModels: insights.relationshipAnalysis.similarModels,
                    avgPerformance: insights.communityContext.avgPerformance
                },
                recommendations: {
                    suggestedPeers: insights.communityContext.peerModels,
                    improvementAreas: this.identifyImprovementAreas(insights),
                    benchmarkGaps: this.identifyBenchmarkGaps(modelId)
                }
            };

        } catch (error) {
            logger.error(`[CommunityBasedModelSelection] Error analyzing insights for ${modelId}:`, { error });
            throw error;
        }
    }

    /**
     * Update model performance based on real usage data
     */
    async updateModelPerformanceMetrics(
        modelId: string,
        serverId: string,
        metrics: {
            actualLatency: number;
            qualityScore: number;
            successRate: number;
            timestamp: Date;
        }
    ): Promise<void> {
        logger.info(`[CommunityBasedModelSelection] Updating performance metrics for ${modelId} on ${serverId}`);

        try {
            // Update model-performance node
            const performanceNode = await this.getModelPerformanceNode(modelId, serverId);
            if (performanceNode) {
                const updatedMetrics = this.mergePerformanceMetrics(performanceNode.metadata || {}, metrics);

                // Update the node with new performance data
                await this.updateNodeMetadata(performanceNode.id, updatedMetrics);

                // Trigger relationship recalculation if significant change
                if (this.isSignificantPerformanceChange(performanceNode.metadata || {}, metrics)) {
                    await this.triggerRelationshipUpdate(modelId);
                }
            }

            // Clear relevant caches
            this.clearModelCaches(modelId);

        } catch (error) {
            logger.error(`[CommunityBasedModelSelection] Error updating metrics for ${modelId}:`, { error });
        }
    }

    /**
     * Generate allocation strategy based on current system state
     */
    async generateOptimalAllocationStrategy(
        systemMetrics: {
            totalLoad: number;
            avgLatency: number;
            failureRate: number;
            peakHours: boolean;
        }
    ): Promise<AllocationStrategy> {
        logger.info('[CommunityBasedModelSelection] Generating optimal allocation strategy');

        try {
            let strategy: AllocationStrategy['strategy'] = 'hybrid';
            let weights = { performance: 0.4, community: 0.3, availability: 0.2, proximity: 0.1 };

            // Adjust strategy based on system state
            if (systemMetrics.totalLoad > 0.8) {
                // High load - prioritize availability
                strategy = 'load_balanced';
                weights = { performance: 0.2, community: 0.1, availability: 0.6, proximity: 0.1 };
            } else if (systemMetrics.failureRate > 0.1) {
                // High failure rate - prioritize performance and reliability
                strategy = 'performance_optimized';
                weights = { performance: 0.6, community: 0.2, availability: 0.15, proximity: 0.05 };
            } else if (systemMetrics.avgLatency > 5000) {
                // High latency - balance performance and proximity
                weights = { performance: 0.5, community: 0.2, availability: 0.1, proximity: 0.2 };
            } else {
                // Normal conditions - use community insights
                strategy = 'community_based';
                weights = { performance: 0.3, community: 0.5, availability: 0.1, proximity: 0.1 };
            }

            return {
                strategy,
                weights,
                constraints: {
                    minCommunityScore: systemMetrics.peakHours ? 0.6 : 0.4,
                    maxLoadThreshold: systemMetrics.peakHours ? 0.7 : 0.9
                }
            };

        } catch (error) {
            logger.error('[CommunityBasedModelSelection] Error generating allocation strategy:', { error });
            throw error;
        }
    }

    // Private helper methods

    private async getNodes(query: { type: NodeType }): Promise<Node[]> {
        const db = (sharedDatabaseConnection as any).db;
        if (!db) throw new Error('MongoDB database connection not initialized');

        const systemTypes = ['ai-model', 'ai-server', 'model-performance'];
        const collectionName = systemTypes.includes(query.type) ? 'system_nodes' : 'nodes';
        const collection = db.collection(collectionName);

        const nodes = await collection.find({ type: query.type }).toArray();
        return nodes;
    }

    private async getCommunityScores(modelIds: string[]): Promise<CommunityScore[]> {
        // Check cache first
        const cachedScores: CommunityScore[] = [];
        const uncachedIds: string[] = [];

        for (const modelId of modelIds) {
            const cached = this.communityCache.get(modelId);
            if (cached && this.isCacheValid(modelId)) {
                cachedScores.push(cached);
            } else {
                uncachedIds.push(modelId);
            }
        }

        // Fetch uncached scores
        if (uncachedIds.length > 0) {
            const freshScores = await this.graphService.generateCommunityScores();

            // Cache and filter for requested models
            for (const score of freshScores) {
                if (uncachedIds.includes(score.nodeId)) {
                    this.communityCache.set(score.nodeId, score);
                    cachedScores.push(score);
                }
            }
        }

        return cachedScores;
    }

    private filterModelsByCapabilities(models: Node[], requiredCapabilities: string[]): Node[] {
        if (requiredCapabilities.length === 0) return models;

        return models.filter(model => {
            const modelCapabilities = this.extractModelCapabilities(model);
            return requiredCapabilities.every(required =>
                modelCapabilities.some(cap => cap.includes(required.toLowerCase()))
            );
        });
    }

    private extractModelCapabilities(model: Node): string[] {
        const benchmarks = model.metadata?.benchmarks || {};
        const capabilities = new Set<string>();

        for (const benchmark of Object.keys(benchmarks)) {
            if (benchmark.includes('creative') || benchmark.includes('writing')) {
                capabilities.add('creative-writing');
            }
            if (benchmark.includes('code') || benchmark.includes('typescript')) {
                capabilities.add('code-generation');
            }
            if (benchmark.includes('dialogue') || benchmark.includes('conversation')) {
                capabilities.add('conversational');
            }
            if (benchmark.includes('character') || benchmark.includes('consistency')) {
                capabilities.add('character-modeling');
            }
            if (benchmark.includes('planning') || benchmark.includes('task')) {
                capabilities.add('task-planning');
            }
            if (benchmark.includes('json') || benchmark.includes('assembly')) {
                capabilities.add('structured-output');
            }
        }

        return Array.from(capabilities);
    }

    private async getCompatibleServers(
        model: Node,
        serverNodes: Node[],
        constraints?: any
    ): Promise<Node[]> {
        // Filter servers based on constraints
        let compatibleServers = serverNodes;

        if (constraints?.excludeServers?.length > 0) {
            compatibleServers = compatibleServers.filter(server =>
                !constraints.excludeServers.includes(server.id)
            );
        }

        if (constraints?.preferredRegions?.length > 0) {
            compatibleServers = compatibleServers.filter(server =>
                constraints.preferredRegions.includes(server.metadata?.region || 'unknown')
            );
        }

        if (constraints?.maxLoadThreshold) {
            compatibleServers = compatibleServers.filter(server =>
                (server.metadata?.currentLoad || 0) < constraints.maxLoadThreshold
            );
        }

        // Check model compatibility (memory requirements, etc.)
        const modelMemoryReq = this.estimateModelMemoryRequirement(model);
        compatibleServers = compatibleServers.filter(server =>
            (server.metadata?.estimatedMemory || 0) >= modelMemoryReq
        );

        return compatibleServers;
    }

    private async generateRecommendation(
        model: Node,
        server: Node,
        community: CommunityScore | undefined,
        requestData: any,
        strategy: AllocationStrategy
    ): Promise<ModelSelectionRecommendation> {
        // Calculate base scores
        const performanceScore = this.calculatePerformanceScore(model, server, requestData);
        const communityScore = community ? community.score : 0.5;
        const availabilityScore = this.calculateAvailabilityScore(server);
        const proximityScore = this.calculateProximityScore(server, requestData);

        // Weighted final score based on strategy
        const finalScore =
            performanceScore * strategy.weights.performance +
            communityScore * strategy.weights.community +
            availabilityScore * strategy.weights.availability +
            proximityScore * strategy.weights.proximity;

        // Generate reasons
        const reasons = this.generateReasons(performanceScore, communityScore, availabilityScore, proximityScore);
        const reasonCodes = this.generateReasonCodes(performanceScore, communityScore, availabilityScore, proximityScore);

        // Calculate confidence based on data availability
        const confidence = this.calculateConfidence(model, server, community);

        // Predict performance metrics
        const performanceMetrics = await this.predictPerformanceMetrics(model, server);

        return {
            modelId: model.title || model.id,
            serverId: server.title || server.id,
            score: finalScore,
            confidence,
            reasonCodes,
            reasons,
            graphInsights: {
                communityRank: community?.rank || 0,
                performanceCluster: 'cluster_' + Math.floor(Math.random() * 10),
                peerModels: community?.peerNodes || [],
                networkPosition: this.determineNetworkPosition(community),
                relationshipStrength: community?.score || 0
            },
            performanceMetrics
        };
    }

    private calculatePerformanceScore(model: Node, server: Node, requestData: any): number {
        const benchmarks = model.metadata?.benchmarks || {};
        let totalScore = 0;
        let benchmarkCount = 0;

        // Weight benchmarks based on task type
        const taskWeights = this.getTaskTypeWeights(requestData.taskType);

        for (const [benchmark, data] of Object.entries(benchmarks)) {
            if (data && typeof data === 'object' && 'score' in data && typeof (data as any).score === 'number') {
                const weight = taskWeights[benchmark] || 1;
                totalScore += (data as any).score * weight;
                benchmarkCount++;
            }
        }

        return benchmarkCount > 0 ? totalScore / benchmarkCount : 0.5;
    }

    private calculateAvailabilityScore(server: Node): number {
        const currentLoad = server.metadata?.currentLoad || 0;
        const healthScore = server.metadata?.healthScore || 1;
        const uptime = server.metadata?.uptime || 0.95;

        return (1 - currentLoad) * 0.4 + healthScore * 0.4 + uptime * 0.2;
    }

    private calculateProximityScore(server: Node, requestData: any): number {
        const serverRegion = server.metadata?.region || 'unknown';
        const preferredRegions = requestData.constraints?.preferredRegions || [];

        if (preferredRegions.length === 0) return 0.5;

        return preferredRegions.includes(serverRegion) ? 1.0 : 0.3;
    }

    private getTaskTypeWeights(taskType: string): Record<string, number> {
        const weights: Record<string, Record<string, number>> = {
            'creative-writing': {
                'creative-writing': 2.0,
                'character-consistency': 1.5,
                'dialogue-generation': 1.3,
                'plot-coherence': 1.2
            },
            'code-generation': {
                'typescript-quality': 2.0,
                'advanced-code-generation': 1.8,
                'task-planning': 1.3,
                'json-assembly': 1.2
            },
            'conversation': {
                'dialogue-generation': 2.0,
                'character-consistency': 1.5,
                'creative-writing': 1.2
            }
        };

        return weights[taskType] || {};
    }

    private rankRecommendations(
        recommendations: ModelSelectionRecommendation[],
        strategy: AllocationStrategy
    ): ModelSelectionRecommendation[] {
        return recommendations.sort((a, b) => {
            // Primary sort by score
            if (Math.abs(a.score - b.score) > 0.1) {
                return b.score - a.score;
            }

            // Secondary sort by confidence
            if (Math.abs(a.confidence - b.confidence) > 0.1) {
                return b.confidence - a.confidence;
            }

            // Tertiary sort by community rank (lower is better)
            return a.graphInsights.communityRank - b.graphInsights.communityRank;
        });
    }

    private generateReasons(performance: number, community: number, availability: number, proximity: number): string[] {
        const reasons: string[] = [];

        if (performance > 0.8) reasons.push('Excellent performance on relevant benchmarks');
        else if (performance > 0.6) reasons.push('Good performance on most benchmarks');
        else reasons.push('Moderate performance, may need optimization');

        if (community > 0.7) reasons.push('Strong community standing with high peer similarity');
        else if (community > 0.5) reasons.push('Good community integration');
        else reasons.push('Limited community data available');

        if (availability > 0.8) reasons.push('High availability and low current load');
        else if (availability > 0.6) reasons.push('Adequate availability');
        else reasons.push('May experience capacity constraints');

        if (proximity > 0.7) reasons.push('Optimal geographic proximity');
        else reasons.push('Standard network routing');

        return reasons;
    }

    private generateReasonCodes(performance: number, community: number, availability: number, proximity: number): string[] {
        const codes: string[] = [];

        if (performance > 0.8) codes.push('HIGH_PERFORMANCE');
        if (community > 0.7) codes.push('STRONG_COMMUNITY');
        if (availability > 0.8) codes.push('HIGH_AVAILABILITY');
        if (proximity > 0.7) codes.push('OPTIMAL_PROXIMITY');

        return codes;
    }

    private calculateConfidence(model: Node, server: Node, community?: CommunityScore): number {
        let confidence = 0;

        // Benchmark data availability
        const benchmarkCount = Object.keys(model.metadata?.benchmarks || {}).length;
        confidence += Math.min(benchmarkCount / 10, 0.4); // Max 0.4 for benchmarks

        // Community data availability
        if (community) {
            confidence += 0.3;
        }

        // Server performance history
        if (server.metadata?.healthScore) {
            confidence += 0.2;
        }

        // Recent updates
        const lastUpdated = model.metadata?.lastBenchmarked;
        if (lastUpdated) {
            const age = Date.now() - new Date(lastUpdated).getTime();
            const ageDays = age / (1000 * 60 * 60 * 24);
            if (ageDays < 7) confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }

    private async predictPerformanceMetrics(model: Node, server: Node): Promise<{
        predictedLatency: number;
        predictedQuality: number;
        reliabilityScore: number;
        capacityUtilization: number;
    }> {
        // Use historical data and graph insights to predict performance
        const baseLatency = server.metadata?.avgLatency || 1000;
        const modelSize = this.extractModelSize(model.title || '');
        const serverCapacity = server.metadata?.estimatedMemory || 8000;

        const predictedLatency = baseLatency * (1 + Math.max(0, (modelSize - 7) / 10));
        const predictedQuality = this.estimateQualityScore(model);
        const reliabilityScore = server.metadata?.healthScore || 0.9;
        const capacityUtilization = Math.min(1.0, (modelSize * 1000) / serverCapacity);

        return {
            predictedLatency,
            predictedQuality,
            reliabilityScore,
            capacityUtilization
        };
    }

    private getDefaultStrategy(): AllocationStrategy {
        return {
            strategy: 'hybrid',
            weights: {
                performance: 0.4,
                community: 0.3,
                availability: 0.2,
                proximity: 0.1
            },
            constraints: {
                minCommunityScore: 0.4,
                maxLoadThreshold: 0.8
            }
        };
    }

    private estimateModelMemoryRequirement(model: Node): number {
        const modelSize = this.extractModelSize(model.title || '');
        if (modelSize) {
            // Rough estimate: 2GB per billion parameters
            return modelSize * 2000;
        }
        return 4000; // Default 4GB requirement
    }

    private extractModelSize(modelName: string): number {
        const sizeMatch = modelName.match(/(\d+(?:\.\d+)?)[bB]/);
        if (sizeMatch) {
            return parseFloat(sizeMatch[1]);
        }
        return 7; // Default size
    }

    private estimateQualityScore(model: Node): number {
        const benchmarks = model.metadata?.benchmarks || {};
        const scores = Object.values(benchmarks)
            .filter((data: any) => data && typeof data === 'object' && data.score)
            .map((data: any) => data.score);

        if (scores.length === 0) return 0.7; // Default

        return scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
    }

    private determineNetworkPosition(community?: CommunityScore): string {
        if (!community) return 'isolated';

        const connections = community.peerNodes.length;
        const influence = community.influenceMetrics.networkCentrality || 0;

        if (influence > 0.7 && connections > 5) return 'central';
        if (connections > 3) return 'connected';
        if (connections > 1) return 'peripheral';
        return 'isolated';
    }

    private identifyImprovementAreas(insights: any): string[] {
        const areas: string[] = [];

        if (insights.communityContext.avgPerformance < 0.6) {
            areas.push('Performance optimization needed');
        }

        if (insights.relationshipAnalysis.similarModels.length < 3) {
            areas.push('Limited peer relationships');
        }

        if (insights.relationshipAnalysis.networkPosition === 'peripheral') {
            areas.push('Increase community engagement');
        }

        return areas;
    }

    private identifyBenchmarkGaps(modelId: string): string[] {
        // This would analyze missing benchmarks
        // For now, return common gaps
        return [
            'Long-form content generation',
            'Multi-modal reasoning',
            'Advanced code optimization'
        ];
    }

    private async getModelPerformanceNode(modelId: string, serverId: string): Promise<Node | null> {
        const nodes = await this.getNodes({ type: 'model-performance' as NodeType });
        return nodes.find(node =>
            node.metadata?.modelId === modelId && node.metadata?.serverId === serverId
        ) || null;
    }

    private mergePerformanceMetrics(existingMetadata: any, newMetrics: any): any {
        // Merge new performance metrics with existing data
        return {
            ...existingMetadata,
            lastUpdated: newMetrics.timestamp.toISOString(),
            recentMetrics: {
                latency: newMetrics.actualLatency,
                quality: newMetrics.qualityScore,
                successRate: newMetrics.successRate
            }
        };
    }

    private async updateNodeMetadata(nodeId: string, metadata: any): Promise<void> {
        const db = (sharedDatabaseConnection as any).db;
        const collection = db.collection('system_nodes');

        await collection.updateOne(
            { _id: nodeId },
            { $set: { metadata } }
        );
    }

    private isSignificantPerformanceChange(oldMetrics: any, newMetrics: any): boolean {
        const oldLatency = oldMetrics.recentMetrics?.latency || 0;
        const newLatency = newMetrics.actualLatency;

        return Math.abs(oldLatency - newLatency) / Math.max(oldLatency, 1) > 0.2; // 20% change
    }

    private async triggerRelationshipUpdate(modelId: string): Promise<void> {
        // Trigger asynchronous relationship recalculation
        logger.info(`[CommunityBasedModelSelection] Triggering relationship update for model: ${modelId}`);
        // This would queue a job to recalculate relationships
    }

    private clearModelCaches(modelId: string): void {
        this.communityCache.delete(modelId);
        this.relationshipCache.delete(modelId);
    }

    private isCacheValid(modelId: string): boolean {
        // Implement cache validity check based on timestamp
        return true; // Simplified for now
    }
}
