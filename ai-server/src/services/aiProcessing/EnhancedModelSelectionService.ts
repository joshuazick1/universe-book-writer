/**
 * Enhanced Model Selection Service
 * 
 * Integrates quality benchmarks with latency data to make intelligent model routing decisions.
 * Prioritizes user experience by preserving fast servers for real-time requests.
 */

import { QualityBenchmarkManager, ModelQualityProfile } from '../benchmarking/QualityBenchmarkManager.js';
import { BenchmarkManager } from '../../orchestrator.js';
import { logInfo, logError, logWarn } from '../../logger.js';

export interface ModelSelectionCriteria {
    taskType: 'chat' | 'writing' | 'character-generation' | 'world-building' | 'analysis' | 'editing' | 'json-generation' | 'rag-processing';
    complexityLevel: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    qualityRequirement: 'draft' | 'standard' | 'publication' | 'professional';
    maxLatencyMs?: number;
    prioritizeQuality: boolean;
    prioritizeSpeed: boolean;
    userTier?: 'free' | 'premium' | 'enterprise';
}

export interface ModelSelectionResult {
    selectedModel: string;
    confidence: number; // 0-1
    reasoning: string;
    alternatives: Array<{
        model: string;
        score: number;
        tradeoff: string;
    }>;
    estimatedLatencyMs: number;
    estimatedQualityScore: number;
    serverInfo: {
        isSlowServer: boolean;
        latencyMs: number;
        load: number;
    };
}

export interface ModelCapability {
    modelEndpoint: string;
    strengths: string[];
    weaknesses: string[];
    optimalUseCases: string[];
    resourceRequirements: 'low' | 'medium' | 'high';
    reliabilityScore: number; // 0-1
}

export class EnhancedModelSelectionService {
    private qualityBenchmarkManager: QualityBenchmarkManager;
    private benchmarkManager: BenchmarkManager;
    private serviceName = 'EnhancedModelSelectionService';
    private modelCapabilities: Map<string, ModelCapability> = new Map();
    private selectionHistory: Array<{
        criteria: ModelSelectionCriteria;
        result: ModelSelectionResult;
        actualPerformance?: {
            latencyMs: number;
            qualityFeedback: number;
            userSatisfaction: number;
        };
        timestamp: number;
    }> = [];

    constructor(
        qualityBenchmarkManager: QualityBenchmarkManager,
        benchmarkManager: BenchmarkManager
    ) {
        this.qualityBenchmarkManager = qualityBenchmarkManager;
        this.benchmarkManager = benchmarkManager;
        // Initialize service

        this.initializeModelCapabilities();
    }

    /**
     * Select the best model based on comprehensive criteria
     */
    async selectModel(criteria: ModelSelectionCriteria): Promise<ModelSelectionResult> {
        logInfo(`Selecting model for ${criteria.taskType} (${criteria.complexityLevel}, ${criteria.qualityRequirement})`);

        // Get available models
        const availableModels = await this.getAvailableModels();
        if (availableModels.length === 0) {
            throw new Error('No models available');
        }

        // Get performance data
        const latencyData = this.getServerPerformanceMetrics();
        const modelProfiles = this.getAllModelQualityProfiles();

        // Score each model
        const modelScores: Array<{
            model: string;
            totalScore: number;
            qualityScore: number;
            speedScore: number;
            reliabilityScore: number;
            reasoning: string;
            serverInfo: any;
        }> = [];

        for (const model of availableModels) {
            const score = await this.calculateModelScore(model, criteria, latencyData, modelProfiles);
            modelScores.push(score);
        }

        // Sort by total score
        modelScores.sort((a, b) => b.totalScore - a.totalScore);

        const bestModel = modelScores[0];
        if (!bestModel) {
            throw new Error('No suitable model found');
        }

        // Create selection result
        const result: ModelSelectionResult = {
            selectedModel: bestModel.model,
            confidence: this.calculateSelectionConfidence(bestModel, modelScores),
            reasoning: bestModel.reasoning,
            alternatives: modelScores.slice(1, 4).map(score => ({
                model: score.model,
                score: score.totalScore,
                tradeoff: this.generateTradeoffExplanation(bestModel, score)
            })),
            estimatedLatencyMs: latencyData[bestModel.model]?.latencyMs || 5000,
            estimatedQualityScore: bestModel.qualityScore,
            serverInfo: bestModel.serverInfo
        };

        // Record selection for learning
        this.recordSelection(criteria, result);

        logInfo(`Selected ${result.selectedModel} (confidence: ${result.confidence.toFixed(2)}): ${result.reasoning}`);
        return result;
    }

    /**
     * Calculate comprehensive score for a model
     */
    private async calculateModelScore(
        model: string,
        criteria: ModelSelectionCriteria,
        latencyData: Record<string, any>,
        modelProfiles: Map<string, ModelQualityProfile>
    ): Promise<{
        model: string;
        totalScore: number;
        qualityScore: number;
        speedScore: number;
        reliabilityScore: number;
        reasoning: string;
        serverInfo: any;
    }> {
        const latencyInfo = latencyData[model] || { latencyMs: 5000, throughput: 0.1 };
        const qualityProfile = modelProfiles.get(model);
        const capability = this.modelCapabilities.get(model);

        // Server classification
        const isSlowServer = latencyInfo.latencyMs > 2000;
        const serverInfo = {
            isSlowServer,
            latencyMs: latencyInfo.latencyMs,
            load: latencyInfo.throughput || 0.1
        };

        // Quality scoring
        let qualityScore = 0.5; // Default neutral
        if (qualityProfile && qualityProfile.qualityData) {
            qualityScore = qualityProfile.qualityData.overallQuality || 0.7;
        }

        // Speed scoring (lower latency = higher score)
        const speedScore = Math.max(0.1, Math.min(1.0, 1000 / latencyInfo.latencyMs));

        // Reliability scoring
        const reliabilityScore = capability?.reliabilityScore || 0.7;

        // Apply criteria weights
        const weights = this.calculateCriteriaWeights(criteria);

        // Quality requirement multiplier
        const qualityMultiplier = this.getQualityMultiplier(criteria.qualityRequirement, qualityScore);

        // Complexity penalty for inappropriate models
        const complexityPenalty = this.getComplexityPenalty(criteria.complexityLevel, qualityScore);

        // User tier considerations
        const tierBonus = this.getUserTierBonus(criteria.userTier, isSlowServer);

        // Calculate weighted score
        let totalScore = (
            qualityScore * weights.quality * qualityMultiplier +
            speedScore * weights.speed +
            reliabilityScore * weights.reliability
        ) * complexityPenalty + tierBonus;

        // Apply latency constraints
        if (criteria.maxLatencyMs && latencyInfo.latencyMs > criteria.maxLatencyMs) {
            totalScore *= 0.3; // Heavy penalty for exceeding latency requirements
        }

        // Fast server preservation logic
        if (!isSlowServer && !this.shouldUseFastServer(criteria)) {
            totalScore *= 0.7; // Prefer slow servers for non-urgent tasks
        }

        const reasoning = this.generateReasoningExplanation(
            criteria,
            qualityScore,
            speedScore,
            reliabilityScore,
            isSlowServer,
            weights
        );

        return {
            model,
            totalScore: Math.max(0, Math.min(1, totalScore)),
            qualityScore,
            speedScore,
            reliabilityScore,
            reasoning,
            serverInfo
        };
    }

    /**
     * Calculate weights based on criteria
     */
    private calculateCriteriaWeights(criteria: ModelSelectionCriteria): {
        quality: number;
        speed: number;
        reliability: number;
    } {
        let qualityWeight = 0.5;
        let speedWeight = 0.3;
        let reliabilityWeight = 0.2;

        // Adjust based on explicit preferences
        if (criteria.prioritizeQuality && criteria.prioritizeSpeed) {
            qualityWeight = 0.45;
            speedWeight = 0.45;
            reliabilityWeight = 0.1;
        } else if (criteria.prioritizeQuality) {
            qualityWeight = 0.7;
            speedWeight = 0.1;
            reliabilityWeight = 0.2;
        } else if (criteria.prioritizeSpeed) {
            qualityWeight = 0.2;
            speedWeight = 0.7;
            reliabilityWeight = 0.1;
        }

        // Quality requirement adjustments
        switch (criteria.qualityRequirement) {
            case 'professional':
                qualityWeight += 0.2;
                speedWeight -= 0.1;
                reliabilityWeight += 0.1;
                break;
            case 'publication':
                qualityWeight += 0.15;
                speedWeight -= 0.1;
                reliabilityWeight += 0.05;
                break;
            case 'draft':
                qualityWeight -= 0.1;
                speedWeight += 0.15;
                reliabilityWeight -= 0.05;
                break;
        }

        // Complexity adjustments
        switch (criteria.complexityLevel) {
            case 'expert':
                qualityWeight += 0.1;
                reliabilityWeight += 0.1;
                speedWeight -= 0.2;
                break;
            case 'trivial':
                speedWeight += 0.1;
                qualityWeight -= 0.05;
                reliabilityWeight -= 0.05;
                break;
        }

        // Normalize weights
        const total = qualityWeight + speedWeight + reliabilityWeight;
        return {
            quality: qualityWeight / total,
            speed: speedWeight / total,
            reliability: reliabilityWeight / total
        };
    }

    /**
     * Get quality requirement multiplier
     */
    private getQualityMultiplier(requirement: string, qualityScore: number): number {
        switch (requirement) {
            case 'professional':
                return qualityScore < 0.8 ? 0.5 : 1.2;
            case 'publication':
                return qualityScore < 0.7 ? 0.7 : 1.1;
            case 'standard':
                return qualityScore < 0.5 ? 0.8 : 1.0;
            case 'draft':
                return 1.0;
            default:
                return 1.0;
        }
    }

    /**
     * Get complexity penalty
     */
    private getComplexityPenalty(complexity: string, qualityScore: number): number {
        switch (complexity) {
            case 'expert':
                return qualityScore < 0.6 ? 0.3 : 1.0;
            case 'complex':
                return qualityScore < 0.5 ? 0.6 : 1.0;
            case 'trivial':
                return qualityScore > 0.9 ? 0.9 : 1.0; // Slight penalty for overkill
            default:
                return 1.0;
        }
    }

    /**
     * Get user tier bonus
     */
    private getUserTierBonus(tier: string | undefined, isSlowServer: boolean): number {
        if (!tier) return 0;

        switch (tier) {
            case 'enterprise':
                return isSlowServer ? -0.1 : 0.1; // Prefer fast servers for enterprise
            case 'premium':
                return isSlowServer ? -0.05 : 0.05;
            case 'free':
                return isSlowServer ? 0.05 : -0.05; // Prefer slow servers for free tier
            default:
                return 0;
        }
    }

    /**
     * Determine if fast server should be used
     */
    private shouldUseFastServer(criteria: ModelSelectionCriteria): boolean {
        // Use fast servers for real-time, interactive tasks
        return (
            criteria.taskType === 'chat' ||
            criteria.prioritizeSpeed ||
            criteria.maxLatencyMs && criteria.maxLatencyMs < 2000 ||
            criteria.userTier === 'enterprise'
        );
    }

    /**
     * Generate reasoning explanation
     */
    private generateReasoningExplanation(
        criteria: ModelSelectionCriteria,
        qualityScore: number,
        speedScore: number,
        reliabilityScore: number,
        isSlowServer: boolean,
        weights: any
    ): string {
        const reasons: string[] = [];

        if (weights.quality > 0.5) {
            reasons.push(`Quality-focused (${qualityScore.toFixed(2)} quality score)`);
        }
        if (weights.speed > 0.5) {
            reasons.push(`Speed-optimized (${speedScore.toFixed(2)} speed score)`);
        }
        if (criteria.qualityRequirement === 'professional' || criteria.qualityRequirement === 'publication') {
            reasons.push(`High quality requirement (${criteria.qualityRequirement})`);
        }
        if (isSlowServer && criteria.taskType !== 'chat') {
            reasons.push('Using slow server to preserve fast servers for interactive tasks');
        }
        if (!isSlowServer && this.shouldUseFastServer(criteria)) {
            reasons.push('Using fast server for real-time requirements');
        }

        return reasons.join('; ') || 'Balanced selection based on available metrics';
    }

    /**
     * Calculate selection confidence
     */
    private calculateSelectionConfidence(
        bestModel: any,
        allModels: any[]
    ): number {
        if (allModels.length < 2) return 0.5;

        const secondBest = allModels[1];
        const scoreDifference = bestModel.totalScore - secondBest.totalScore;

        // Higher confidence with larger score differences
        return Math.min(0.95, 0.5 + scoreDifference * 2);
    }

    /**
     * Generate tradeoff explanation
     */
    private generateTradeoffExplanation(bestModel: any, alternative: any): string {
        const qualityDiff = alternative.qualityScore - bestModel.qualityScore;
        const speedDiff = alternative.speedScore - bestModel.speedScore;

        if (Math.abs(qualityDiff) > 0.1 && Math.abs(speedDiff) > 0.1) {
            if (qualityDiff > 0 && speedDiff < 0) {
                return 'Higher quality but slower';
            } else if (qualityDiff < 0 && speedDiff > 0) {
                return 'Faster but lower quality';
            }
        }

        if (Math.abs(qualityDiff) > 0.1) {
            return qualityDiff > 0 ? 'Better quality' : 'Lower quality';
        }

        if (Math.abs(speedDiff) > 0.1) {
            return speedDiff > 0 ? 'Faster response' : 'Slower response';
        }

        return 'Similar performance profile';
    }

    /**
     * Record selection for learning and analysis
     */
    private recordSelection(criteria: ModelSelectionCriteria, result: ModelSelectionResult): void {
        this.selectionHistory.push({
            criteria,
            result,
            timestamp: Date.now()
        });

        // Keep only recent history
        if (this.selectionHistory.length > 1000) {
            this.selectionHistory = this.selectionHistory.slice(-800);
        }
    }

    /**
     * Record actual performance feedback
     */
    recordPerformanceFeedback(
        selectionId: string,
        actualLatencyMs: number,
        qualityFeedback: number,
        userSatisfaction: number
    ): void {
        // Find the recent selection and update with actual performance
        const recent = this.selectionHistory
            .reverse()
            .find(entry => entry.result.selectedModel === selectionId);

        if (recent) {
            recent.actualPerformance = {
                latencyMs: actualLatencyMs,
                qualityFeedback,
                userSatisfaction
            };
        }
    }

    /**
     * Get model performance analytics
     */
    getPerformanceAnalytics(): {
        modelAccuracy: Record<string, { predictions: number; accuracy: number }>;
        taskTypeOptimization: Record<string, string>; // taskType -> best model
        userSatisfactionTrends: Array<{ timestamp: number; satisfaction: number }>;
    } {
        const modelAccuracy: Record<string, { predictions: number; accuracy: number }> = {};
        const taskTypeOptimization: Record<string, string> = {};
        const satisfactionTrends: Array<{ timestamp: number; satisfaction: number }> = [];

        // Analyze selection history
        for (const entry of this.selectionHistory) {
            if (entry.actualPerformance) {
                const model = entry.result.selectedModel;
                if (!modelAccuracy[model]) {
                    modelAccuracy[model] = { predictions: 0, accuracy: 0 };
                }

                modelAccuracy[model].predictions++;
                modelAccuracy[model].accuracy += entry.actualPerformance.userSatisfaction;

                satisfactionTrends.push({
                    timestamp: entry.timestamp,
                    satisfaction: entry.actualPerformance.userSatisfaction
                });
            }
        }

        // Calculate averages
        for (const model in modelAccuracy) {
            modelAccuracy[model].accuracy /= modelAccuracy[model].predictions;
        }

        // Find best models for each task type
        const taskGroups: Record<string, Array<{ model: string; satisfaction: number }>> = {};
        for (const entry of this.selectionHistory) {
            if (entry.actualPerformance) {
                const taskType = entry.criteria.taskType;
                if (!taskGroups[taskType]) {
                    taskGroups[taskType] = [];
                }
                taskGroups[taskType].push({
                    model: entry.result.selectedModel,
                    satisfaction: entry.actualPerformance.userSatisfaction
                });
            }
        }

        for (const [taskType, results] of Object.entries(taskGroups)) {
            const bestModel = results.reduce((best, current) =>
                current.satisfaction > best.satisfaction ? current : best
            );
            taskTypeOptimization[taskType] = bestModel.model;
        }

        return {
            modelAccuracy,
            taskTypeOptimization,
            userSatisfactionTrends: satisfactionTrends.slice(-100) // Recent trends
        };
    }

    /**
     * Initialize model capabilities
     */
    private initializeModelCapabilities(): void {
        // This would be populated from configuration or discovery
        // For now, adding some example capabilities
        logInfo('Model capabilities initialized');
    }

    /**
     * Get available models
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            // This should integrate with your existing model discovery
            const serverMetrics = this.getServerPerformanceMetrics();
            return Object.keys(serverMetrics);
        } catch (error) {
            logError(`Failed to get available models: ${error}`);
            return [];
        }
    }

    /**
     * Get all model quality profiles
     */
    private getAllModelQualityProfiles(): Map<string, ModelQualityProfile> {
        const profiles = new Map<string, ModelQualityProfile>();

        // Get profiles from quality benchmark manager
        // This is a simplified implementation - in practice you'd iterate through all known models
        return profiles;
    }

    /**
     * Get server performance metrics (stub implementation)
     */
    private getServerPerformanceMetrics(): Record<string, any> {
        // TODO: Implement actual server performance metrics collection
        // For now, return empty object as fallback
        return {};
    }
}
