/**
 * Graph-Enhanced Orchestrator
 * 
 * Enhanced version of the orchestrator that leverages graph relationship data
 * and community-based insights for intelligent model selection and routing.
 * This is the main integration point for Phase 3: Graph Relationship Enhancement.
 */

import { CommunityBasedModelSelectionService, ModelSelectionRecommendation, AllocationStrategy } from './community-based-model-selection.service.js';
import { GraphRelationshipService } from './graph-relationship.service.js';
import { logger } from '../../../shared/logging/logger.js';
import { NodeType } from '../../../shared/types/nodeTypes.js';

/**
 * Enhanced request context with graph-aware routing
 */
export interface GraphEnhancedRequest {
    taskType: string;
    requestId: string;
    userId?: string;
    content: string;
    constraints?: {
        maxLatency?: number;
        minQuality?: number;
        preferredRegions?: string[];
        excludeServers?: string[];
        requireHighAvailability?: boolean;
    };
    metadata?: {
        sessionId?: string;
        previousModelUsed?: string;
        userPreferences?: any;
        contextLength?: number;
        priority?: 'low' | 'normal' | 'high' | 'critical';
    };
}

/**
 * Enhanced routing decision with graph insights
 */
export interface GraphEnhancedRoutingDecision {
    selectedModel: string;
    selectedServer: string;
    recommendation: ModelSelectionRecommendation;
    alternativeOptions: ModelSelectionRecommendation[];
    routingStrategy: AllocationStrategy;
    graphInsights: {
        communityFactors: string[];
        performanceFactors: string[];
        networkAnalysis: string[];
        confidenceLevel: number;
    };
    estimatedPerformance: {
        latency: number;
        quality: number;
        reliability: number;
        cost: number;
    };
    fallbackPlan: {
        primaryFallback: string;
        secondaryFallback: string;
        gracefulDegradation: boolean;
    };
}

/**
 * System metrics for adaptive strategy generation
 */
interface SystemMetrics {
    totalLoad: number;
    avgLatency: number;
    failureRate: number;
    peakHours: boolean;
    resourceUtilization: number;
    activeUsers: number;
    queueLength: number;
}

export class GraphEnhancedOrchestrator {
    private modelSelectionService: CommunityBasedModelSelectionService;
    private graphService: GraphRelationshipService;
    private currentStrategy: AllocationStrategy;
    private systemMetrics: SystemMetrics;
    private lastStrategyUpdate: number = 0;
    private strategyUpdateInterval = 5 * 60 * 1000; // 5 minutes

    // Performance tracking
    private requestMetrics = new Map<string, any>();
    private modelPerformanceHistory = new Map<string, any[]>();

    constructor() {
        this.modelSelectionService = new CommunityBasedModelSelectionService();
        this.graphService = new GraphRelationshipService();

        // Initialize with default strategy
        this.currentStrategy = this.getDefaultStrategy();
        this.systemMetrics = this.getDefaultSystemMetrics();

        logger.info('[GraphEnhancedOrchestrator] Initializing graph-enhanced orchestrator with community-based selection');

        // Start background tasks
        this.startBackgroundTasks();
    }

    /**
     * Main routing method with graph-enhanced intelligence
     */
    async routeRequest(request: GraphEnhancedRequest): Promise<GraphEnhancedRoutingDecision> {
        const startTime = Date.now();
        logger.info(`[GraphEnhancedOrchestrator] Processing request ${request.requestId} with graph enhancement`);

        try {
            // Update strategy if needed
            await this.maybeUpdateStrategy();

            // Get model recommendations using graph insights
            const recommendations = await this.modelSelectionService.getModelRecommendations(
                {
                    taskType: request.taskType,
                    requiredCapabilities: this.extractRequiredCapabilities(request),
                    performanceRequirements: {
                        maxLatency: request.constraints?.maxLatency,
                        minQuality: request.constraints?.minQuality,
                        reliabilityThreshold: request.constraints?.requireHighAvailability ? 0.95 : 0.85
                    },
                    constraints: {
                        preferredRegions: request.constraints?.preferredRegions,
                        excludeServers: request.constraints?.excludeServers,
                        maxLoadThreshold: this.calculateMaxLoadThreshold(request.metadata?.priority)
                    }
                },
                this.currentStrategy
            );

            if (recommendations.length === 0) {
                throw new Error('No suitable model-server combinations found');
            }

            // Select primary recommendation
            const primaryRecommendation = recommendations[0];
            const alternatives = recommendations.slice(1, 4); // Top 3 alternatives

            // Generate fallback plan
            const fallbackPlan = this.generateFallbackPlan(recommendations, request);

            // Estimate performance
            const estimatedPerformance = this.estimateRequestPerformance(primaryRecommendation, request);

            // Compile graph insights
            const graphInsights = await this.compileGraphInsights(primaryRecommendation, request);

            const decision: GraphEnhancedRoutingDecision = {
                selectedModel: primaryRecommendation.modelId,
                selectedServer: primaryRecommendation.serverId,
                recommendation: primaryRecommendation,
                alternativeOptions: alternatives,
                routingStrategy: this.currentStrategy,
                graphInsights,
                estimatedPerformance,
                fallbackPlan
            };

            // Track request for learning
            this.trackRequest(request, decision, startTime);

            logger.info(`[GraphEnhancedOrchestrator] Routed request ${request.requestId} to ${primaryRecommendation.modelId} on ${primaryRecommendation.serverId} (score: ${primaryRecommendation.score.toFixed(3)})`);

            return decision;

        } catch (error) {
            logger.error(`[GraphEnhancedOrchestrator] Error routing request ${request.requestId}:`, { error });

            // Return emergency fallback
            return this.generateEmergencyFallback(request);
        }
    }

    /**
     * Update model performance based on actual results
     */
    async updateModelPerformance(
        requestId: string,
        actualResults: {
            latency: number;
            qualityScore: number;
            successRate: number;
            userSatisfaction?: number;
            errorDetails?: any;
        }
    ): Promise<void> {
        logger.info(`[GraphEnhancedOrchestrator] Updating performance metrics for request ${requestId}`);

        try {
            const requestMetrics = this.requestMetrics.get(requestId);
            if (!requestMetrics) {
                logger.warn(`[GraphEnhancedOrchestrator] No metrics found for request ${requestId}`);
                return;
            }

            // Update model performance service
            await this.modelSelectionService.updateModelPerformanceMetrics(
                requestMetrics.modelId,
                requestMetrics.serverId,
                {
                    actualLatency: actualResults.latency,
                    qualityScore: actualResults.qualityScore,
                    successRate: actualResults.successRate,
                    timestamp: new Date()
                }
            );

            // Update local performance history
            this.updateLocalPerformanceHistory(requestMetrics.modelId, actualResults);

            // Update system metrics
            this.updateSystemMetrics(actualResults);

            // Trigger missing score detection if needed
            if (actualResults.qualityScore && actualResults.qualityScore > 0) {
                await this.triggerScoreDetection(requestMetrics.modelId, actualResults);
            }

            // Clean up request tracking
            this.requestMetrics.delete(requestId);

        } catch (error) {
            logger.error(`[GraphEnhancedOrchestrator] Error updating performance for ${requestId}:`, { error });
        }
    }

    /**
     * Get detailed insights for a specific model
     */
    async getModelInsights(modelId: string): Promise<{
        graphInsights: any;
        communityPosition: any;
        performanceHistory: any;
        recommendations: string[];
    }> {
        logger.info(`[GraphEnhancedOrchestrator] Generating insights for model ${modelId}`);

        try {
            const [graphInsights, performanceHistory] = await Promise.all([
                this.modelSelectionService.getModelGraphInsights(modelId),
                this.getModelPerformanceHistory(modelId)
            ]);

            const recommendations = this.generateModelRecommendations(graphInsights, performanceHistory);

            return {
                graphInsights,
                communityPosition: graphInsights.communityAnalysis,
                performanceHistory,
                recommendations
            };

        } catch (error) {
            logger.error(`[GraphEnhancedOrchestrator] Error generating insights for ${modelId}:`, { error });
            throw error;
        }
    }

    /**
     * Force strategy recalculation based on current system state
     */
    async recalculateStrategy(): Promise<AllocationStrategy> {
        logger.info('[GraphEnhancedOrchestrator] Forcing strategy recalculation');

        try {
            const currentSystemMetrics = await this.collectSystemMetrics();
            const newStrategy = await this.modelSelectionService.generateOptimalAllocationStrategy(currentSystemMetrics);

            this.currentStrategy = newStrategy;
            this.systemMetrics = currentSystemMetrics;
            this.lastStrategyUpdate = Date.now();

            logger.info(`[GraphEnhancedOrchestrator] Updated strategy to: ${newStrategy.strategy}`);

            return newStrategy;

        } catch (error) {
            logger.error('[GraphEnhancedOrchestrator] Error recalculating strategy:', { error });
            throw error;
        }
    }

    /**
     * Get current system status with graph metrics
     */
    async getSystemStatus(): Promise<{
        strategy: AllocationStrategy;
        systemMetrics: SystemMetrics;
        modelUtilization: any;
        graphHealth: {
            totalNodes: number;
            totalRelationships: number;
            communityCount: number;
            healthScore: number;
        };
        performance: {
            avgLatency: number;
            successRate: number;
            throughput: number;
        };
    }> {
        try {
            const [graphStats, performanceStats] = await Promise.all([
                this.getGraphHealthMetrics(),
                this.getPerformanceStats()
            ]);

            return {
                strategy: this.currentStrategy,
                systemMetrics: this.systemMetrics,
                modelUtilization: this.getModelUtilizationStats(),
                graphHealth: graphStats,
                performance: performanceStats
            };

        } catch (error) {
            logger.error('[GraphEnhancedOrchestrator] Error getting system status:', { error });
            throw error;
        }
    }

    // Private helper methods

    private async maybeUpdateStrategy(): Promise<void> {
        const now = Date.now();
        if (now - this.lastStrategyUpdate > this.strategyUpdateInterval) {
            await this.recalculateStrategy();
        }
    }

    private extractRequiredCapabilities(request: GraphEnhancedRequest): string[] {
        const capabilities: string[] = [];

        // Analyze task type
        if (request.taskType.includes('creative') || request.taskType.includes('writing')) {
            capabilities.push('creative-writing');
        }
        if (request.taskType.includes('code') || request.taskType.includes('programming')) {
            capabilities.push('code-generation');
        }
        if (request.taskType.includes('conversation') || request.taskType.includes('chat')) {
            capabilities.push('conversational');
        }
        if (request.taskType.includes('character') || request.taskType.includes('consistency')) {
            capabilities.push('character-modeling');
        }

        // Analyze content for additional hints
        const content = request.content.toLowerCase();
        if (content.includes('json') || content.includes('structured')) {
            capabilities.push('structured-output');
        }
        if (content.includes('plan') || content.includes('strategy')) {
            capabilities.push('task-planning');
        }

        return capabilities;
    }

    private calculateMaxLoadThreshold(priority?: string): number {
        const basThreshold = 0.8;

        switch (priority) {
            case 'critical': return 0.95;
            case 'high': return 0.9;
            case 'low': return 0.6;
            default: return basThreshold;
        }
    }

    private generateFallbackPlan(
        recommendations: ModelSelectionRecommendation[],
        request: GraphEnhancedRequest
    ): { primaryFallback: string; secondaryFallback: string; gracefulDegradation: boolean } {
        const fallbacks = recommendations.slice(1, 3).map(r => `${r.modelId}@${r.serverId}`);

        return {
            primaryFallback: fallbacks[0] || 'default-model@default-server',
            secondaryFallback: fallbacks[1] || 'fallback-model@fallback-server',
            gracefulDegradation: request.metadata?.priority !== 'critical'
        };
    }

    private estimateRequestPerformance(
        recommendation: ModelSelectionRecommendation,
        request: GraphEnhancedRequest
    ): { latency: number; quality: number; reliability: number; cost: number } {
        const baseLatency = recommendation.performanceMetrics.predictedLatency;
        const contentMultiplier = Math.max(1, (request.content.length / 1000));

        return {
            latency: baseLatency * contentMultiplier,
            quality: recommendation.performanceMetrics.predictedQuality,
            reliability: recommendation.performanceMetrics.reliabilityScore,
            cost: this.estimateRequestCost(recommendation, request)
        };
    }

    private estimateRequestCost(recommendation: ModelSelectionRecommendation, request: GraphEnhancedRequest): number {
        // Simple cost estimation based on model size and content length
        const modelSize = this.extractModelSize(recommendation.modelId);
        const contentLength = request.content.length;

        return (modelSize * 0.001) + (contentLength * 0.0001);
    }

    private async compileGraphInsights(
        recommendation: ModelSelectionRecommendation,
        request: GraphEnhancedRequest
    ): Promise<{
        communityFactors: string[];
        performanceFactors: string[];
        networkAnalysis: string[];
        confidenceLevel: number;
    }> {
        const insights = recommendation.graphInsights;

        return {
            communityFactors: [
                `Community rank: ${insights.communityRank}`,
                `Peer models: ${insights.peerModels.length}`,
                `Network position: ${insights.networkPosition}`
            ],
            performanceFactors: [
                `Performance cluster: ${insights.performanceCluster}`,
                `Relationship strength: ${insights.relationshipStrength.toFixed(2)}`
            ],
            networkAnalysis: [
                `Similar models available: ${insights.peerModels.length}`,
                `Strong network connections: ${insights.relationshipStrength > 0.7 ? 'Yes' : 'No'}`
            ],
            confidenceLevel: recommendation.confidence
        };
    }

    private trackRequest(request: GraphEnhancedRequest, decision: GraphEnhancedRoutingDecision, startTime: number): void {
        this.requestMetrics.set(request.requestId, {
            modelId: decision.selectedModel,
            serverId: decision.selectedServer,
            taskType: request.taskType,
            timestamp: new Date(),
            processingTime: Date.now() - startTime,
            strategy: decision.routingStrategy.strategy,
            estimatedPerformance: decision.estimatedPerformance
        });
    }

    private generateEmergencyFallback(request: GraphEnhancedRequest): GraphEnhancedRoutingDecision {
        logger.warn(`[GraphEnhancedOrchestrator] Generating emergency fallback for ${request.requestId}`);

        return {
            selectedModel: 'emergency-model',
            selectedServer: 'emergency-server',
            recommendation: {
                modelId: 'emergency-model',
                serverId: 'emergency-server',
                score: 0.3,
                confidence: 0.1,
                reasonCodes: ['EMERGENCY_FALLBACK'],
                reasons: ['Emergency fallback due to routing failure'],
                graphInsights: {
                    communityRank: 999,
                    performanceCluster: 'emergency',
                    peerModels: [],
                    networkPosition: 'isolated',
                    relationshipStrength: 0
                },
                performanceMetrics: {
                    predictedLatency: 5000,
                    predictedQuality: 0.5,
                    reliabilityScore: 0.7,
                    capacityUtilization: 0.9
                }
            },
            alternativeOptions: [],
            routingStrategy: this.getDefaultStrategy(),
            graphInsights: {
                communityFactors: ['Emergency routing'],
                performanceFactors: ['Fallback mode'],
                networkAnalysis: ['No analysis available'],
                confidenceLevel: 0.1
            },
            estimatedPerformance: {
                latency: 5000,
                quality: 0.5,
                reliability: 0.7,
                cost: 0.1
            },
            fallbackPlan: {
                primaryFallback: 'emergency-model@emergency-server',
                secondaryFallback: 'emergency-model@emergency-server',
                gracefulDegradation: true
            }
        };
    }

    private updateLocalPerformanceHistory(modelId: string, results: any): void {
        const history = this.modelPerformanceHistory.get(modelId) || [];
        history.push({
            timestamp: new Date(),
            ...results
        });

        // Keep only last 100 records
        if (history.length > 100) {
            history.shift();
        }

        this.modelPerformanceHistory.set(modelId, history);
    }

    private updateSystemMetrics(results: any): void {
        // Update running averages
        this.systemMetrics.avgLatency = (this.systemMetrics.avgLatency * 0.9) + (results.latency * 0.1);
        this.systemMetrics.failureRate = (this.systemMetrics.failureRate * 0.9) + ((results.successRate < 0.9 ? 1 : 0) * 0.1);
    }

    private async triggerScoreDetection(modelId: string, results: any): Promise<void> {
        try {
            // Check if we should update benchmark scores
            if (results.qualityScore > 0.8) {
                logger.info(`[GraphEnhancedOrchestrator] Triggering score detection for high-quality result from ${modelId}`);
                // This would trigger the score detection service
                // await this.scoreDetectionService.updateModelScore(modelId, results);
            }
        } catch (error) {
            logger.error(`[GraphEnhancedOrchestrator] Error triggering score detection:`, { error });
        }
    }

    private async getModelPerformanceHistory(modelId: string): Promise<any> {
        return this.modelPerformanceHistory.get(modelId) || [];
    }

    private generateModelRecommendations(graphInsights: any, performanceHistory: any): string[] {
        const recommendations: string[] = [];

        if (graphInsights.communityAnalysis.score < 0.5) {
            recommendations.push('Consider expanding model relationships for better community integration');
        }

        if (performanceHistory.length > 0) {
            const avgLatency = performanceHistory.reduce((sum: number, h: any) => sum + h.latency, 0) / performanceHistory.length;
            if (avgLatency > 3000) {
                recommendations.push('Performance optimization may be needed - consider server upgrades');
            }
        }

        if (graphInsights.performanceCluster.similarModels.length < 3) {
            recommendations.push('Limited peer similarity detected - consider benchmark updates');
        }

        return recommendations;
    }

    private async collectSystemMetrics(): Promise<SystemMetrics> {
        // This would collect real system metrics
        // For now, return current metrics with some updates
        return {
            ...this.systemMetrics,
            totalLoad: Math.random() * 0.8, // Simulated current load
            avgLatency: this.systemMetrics.avgLatency,
            failureRate: this.systemMetrics.failureRate,
            peakHours: this.isPeakHours(),
            resourceUtilization: Math.random() * 0.9,
            activeUsers: Math.floor(Math.random() * 100) + 10,
            queueLength: Math.floor(Math.random() * 20)
        };
    }

    private async getGraphHealthMetrics(): Promise<{
        totalNodes: number;
        totalRelationships: number;
        communityCount: number;
        healthScore: number;
    }> {
        // This would query actual graph statistics
        return {
            totalNodes: 150,
            totalRelationships: 300,
            communityCount: 8,
            healthScore: 0.85
        };
    }

    private async getPerformanceStats(): Promise<{
        avgLatency: number;
        successRate: number;
        throughput: number;
    }> {
        return {
            avgLatency: this.systemMetrics.avgLatency,
            successRate: 1 - this.systemMetrics.failureRate,
            throughput: 100 - (this.systemMetrics.totalLoad * 100)
        };
    }

    private getModelUtilizationStats(): any {
        // Return model utilization statistics
        return {
            totalModels: 25,
            activeModels: 18,
            avgUtilization: 0.65
        };
    }

    private isPeakHours(): boolean {
        const hour = new Date().getHours();
        return hour >= 9 && hour <= 17; // 9 AM to 5 PM
    }

    private extractModelSize(modelId: string): number {
        const sizeMatch = modelId.match(/(\d+(?:\.\d+)?)[bB]/);
        return sizeMatch ? parseFloat(sizeMatch[1]) : 7;
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

    private getDefaultSystemMetrics(): SystemMetrics {
        return {
            totalLoad: 0.5,
            avgLatency: 1500,
            failureRate: 0.05,
            peakHours: this.isPeakHours(),
            resourceUtilization: 0.6,
            activeUsers: 25,
            queueLength: 5
        };
    }

    private startBackgroundTasks(): void {
        // Start periodic strategy updates
        setInterval(async () => {
            try {
                await this.maybeUpdateStrategy();
            } catch (error) {
                logger.error('[GraphEnhancedOrchestrator] Error in background strategy update:', { error });
            }
        }, 60000); // Check every minute

        // Start periodic cleanup
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 300000); // Clean every 5 minutes
    }

    private cleanupOldMetrics(): void {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

        // Clean up old request metrics
        for (const [requestId, metrics] of this.requestMetrics.entries()) {
            if (metrics.timestamp.getTime() < cutoff) {
                this.requestMetrics.delete(requestId);
            }
        }

        // Clean up old performance history
        for (const [modelId, history] of this.modelPerformanceHistory.entries()) {
            const filtered = history.filter((h: any) => h.timestamp.getTime() > cutoff);
            if (filtered.length !== history.length) {
                this.modelPerformanceHistory.set(modelId, filtered);
            }
        }
    }
}
