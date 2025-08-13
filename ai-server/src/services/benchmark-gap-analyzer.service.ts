/**
 * Benchmark Gap Analyzer Service - REFACTORED
 * 
 * Pure analysis and validation service for benchmark coverage gaps.
 * NO LONGER HANDLES SCHEDULING - that responsibility moved to SchedulingService.
 * Implements gap detection, node validation, and provides recommendations.
 */

import {
    BenchmarkGap,
    SchedulerPriority,
    ScheduleFrequency,
    RetestRecommendation
} from '../types/scheduler.types.js';
import { getSchedulerConfig, BENCHMARK_PRIORITY_MAP, getRecommendedFrequency } from '../config/scheduler.config.js';
import { logger } from 'shared/logging/logger.js';
import { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';
import { getNode } from 'shared/node/nodeService.js';
import { NodeType, Node } from 'shared/types/nodeTypes.js';
import type { MissingBenchmarkService } from './missing-benchmark.service.js';
import { ModelAvailabilityService } from './model-availability.service.js';

// Dynamically get all available benchmark types
async function getAllAvailableBenchmarkTypes(): Promise<BenchmarkType[]> {
    try {
        // Import all benchmark functions from the benchmarks module
        const benchmarkModule = await import('../benchmarking/benchmarks/index.js') as any;

        // Extract function names and convert to benchmark type names
        const benchmarkFunctions = Object.keys(benchmarkModule).filter(key =>
            typeof benchmarkModule[key] === 'function' && key.startsWith('evaluate')
        );

        // Convert function names to benchmark types (e.g., evaluateAdvancedCodeGeneration -> advanced-code-generation)
        const benchmarkTypes: string[] = benchmarkFunctions.map(funcName => {
            // Remove 'evaluate' prefix and convert camelCase to kebab-case
            const typeName = funcName
                .replace(/^evaluate/, '')
                .replace(/([A-Z])/g, '-$1')
                .toLowerCase()
                .replace(/^-/, ''); // Remove leading dash

            return typeName;
        });

        // Also include standard performance benchmark types
        const performanceBenchmarks: string[] = [
            'server-latency',
            'cold-performance',
            'warm-performance'
        ];

        const allTypes = [...new Set([...benchmarkTypes, ...performanceBenchmarks])];
        logger.info(`[BenchmarkGapAnalyzer] Dynamically loaded ${allTypes.length} benchmark types: ${allTypes.join(', ')}`);

        return allTypes as BenchmarkType[];
    } catch (error) {
        logger.warn('[BenchmarkGapAnalyzer] Failed to dynamically load benchmark types, using fallback list:', { error: String(error) });

        // Fallback to a basic set if dynamic loading fails
        return [
            'creative-writing',
            'character-consistency',
            'dialogue-generation',
            'plot-coherence',
            'world-building',
            'emotional-depth',
            'json-assembly',
            'typescript-quality',
            'task-planning',
            'style-transfer',
            'long-form-generation',
            'summarization',
            'fact-extraction',
            'content-moderation',
            'permissive-content',
            'advanced-code-generation',
            'node-graph-construction'
        ] as BenchmarkType[];
    }
}

interface ModelUsageStats {
    modelId: string;
    totalRequests: number;
    uniqueServers: number;
    averageResponseTime: number;
    lastUsed: Date;
    usageScore: number; // 0-1, higher = more important
}

interface ServerPerformanceStats {
    serverId: string;
    uptime: number; // percentage
    averageLatency: number;
    modelCount: number;
    reliabilityScore: number; // 0-1, higher = more reliable
}

/**
 * Gap analysis result with validation information
 */
export interface GapAnalysisResult {
    missingBenchmarks: BenchmarkGap[];
    nodeValidationIssues: ValidationIssue[];
    dataCompletenessScore: number;
    schedulingRecommendations: PriorityRecommendation[];
}

/**
 * Node validation result
 */
export interface ValidationResult {
    nodeId: string;
    isValid: boolean;
    issues: ValidationIssue[];
    recommendedActions: string[];
}

/**
 * Validation issue details
 */
export interface ValidationIssue {
    type: 'missing_data' | 'stale_data' | 'invalid_structure' | 'orphaned_node';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedBenchmarks?: BenchmarkType[];
}

/**
 * Data completeness report
 */
export interface CompletenessReport {
    modelId: string;
    totalBenchmarks: number;
    completedBenchmarks: number;
    completenessPercentage: number;
    missingBenchmarkTypes: BenchmarkType[];
    staleBenchmarkTypes: BenchmarkType[];
    lastUpdated: Date;
}

/**
 * Priority recommendation for scheduling
 */
export interface PriorityRecommendation {
    modelId: string;
    serverId: string;
    recommendedPriority: SchedulerPriority;
    benchmarkTypes: BenchmarkType[];
    reason: string;
    estimatedDuration: number;
}

export class BenchmarkGapAnalyzerService {
    private missingBenchmarkService?: MissingBenchmarkService;
    private config = getSchedulerConfig();
    private modelAvailabilityService = new ModelAvailabilityService();

    constructor() {
        // Initialize missingBenchmarkService lazily to avoid circular dependency
        logger.info('[BenchmarkGapAnalyzer] Initialized as pure analysis service (no scheduling)');
    }

    // Update MissingBenchmarkNode type to include benchmarkType
    private async getMissingBenchmarkService(): Promise<MissingBenchmarkService> {
        if (!this.missingBenchmarkService) {
            const { MissingBenchmarkService } = await import('./missing-benchmark.service.js');
            this.missingBenchmarkService = new MissingBenchmarkService();
        }
        return this.missingBenchmarkService!;
    }

    /**
     * Analyze comprehensive benchmark gaps across the system (PURE ANALYSIS - NO SCHEDULING)
     */
    async analyzeBenchmarkGaps(): Promise<BenchmarkGap[]> {
        logger.info('[BenchmarkGapAnalyzer] Analyzing benchmark gaps (analysis only, no scheduling)');

        try {
            // Get all available benchmark types dynamically
            const allAvailableBenchmarks = await getAllAvailableBenchmarkTypes();
            logger.info(`[BenchmarkGapAnalyzer] Found ${allAvailableBenchmarks.length} available benchmark types`);

            // Get missing benchmark data from database
            logger.info('[BenchmarkGapAnalyzer] Calling getMissingBenchmarkService().findModelPerformanceNodesWithMissingScores');
            const missingData = await (await this.getMissingBenchmarkService()).findModelPerformanceNodesWithMissingScores('extended');
            logger.info(`[BenchmarkGapAnalyzer] Retrieved ${missingData.length} missing benchmark nodes from database`);

            // Get actual available server-model combinations
            const allServers = ['http://localhost:11434']; // Default server list - would be provided by external service
            const actualCombinations = await this.modelAvailabilityService.getAvailableServerModelCombinations(allServers);

            logger.info(`[BenchmarkGapAnalyzer] Found ${actualCombinations.length} actual server-model combinations across ${allServers.length} servers`);

            // Process missing data and create gap analysis
            const gaps: BenchmarkGap[] = [];

            // Group actual combinations by model to match against missing benchmarks
            const combinationsByModel = new Map<string, Array<{ serverId: string, modelId: string }>>();
            for (const combo of actualCombinations) {
                if (!combinationsByModel.has(combo.modelId)) {
                    combinationsByModel.set(combo.modelId, []);
                }
                combinationsByModel.get(combo.modelId)!.push(combo);
            }

            // Process each unique model from actual combinations
            const allModels = [...combinationsByModel.keys()];

            for (const modelId of allModels) {
                // Find existing missing data for this model, or create comprehensive gap
                const existingMissing = missingData.find(m => m.modelId === modelId);

                // Use all available benchmarks as missing if no database record exists
                const missingBenchmarks = existingMissing?.missingBenchmarks || allAvailableBenchmarks;

                // Create a representative missing node structure
                const representativeMissing = existingMissing || {
                    serverId: allServers[0] || 'unknown',
                    modelId,
                    nodeId: `synthetic-${modelId}`,
                    missingBenchmarks,
                    lastTested: null,
                    ageDays: null
                };

                const modelUsage = (await this.getModelUsageStats()).find(mu => mu.modelId === modelId);
                const serverPerf = (await this.getServerPerformanceStats()).find(sp => sp.serverId === representativeMissing.serverId);
                const gap = await this.createBenchmarkGap(representativeMissing, modelUsage, serverPerf);
                gaps.push(gap);

                logger.info(`[BenchmarkGapAnalyzer] Created gap analysis for model ${modelId}: ${missingBenchmarks.length} missing benchmarks`);
            }

            logger.info(`[BenchmarkGapAnalyzer] Analysis complete: ${gaps.length} benchmark gaps identified`);

            return this.sortGapsByCalculatedPriority(gaps);

        } catch (error) {
            logger.error('[BenchmarkGapAnalyzer] Error during gap analysis:', { error: String(error) });
            throw error;
        }
    }

    /**
     * NEW: Validate existing node structure integrity
     */
    public async validateNodeStructure(nodeId: string): Promise<ValidationResult> {
        logger.info(`[BenchmarkGapAnalyzer] Validating node structure: ${nodeId}`);

        const result: ValidationResult = {
            nodeId,
            isValid: true,
            issues: [],
            recommendedActions: []
        };

        try {
            // Use getNodeById to fetch the node
            const { getNodeById } = await import('shared/node/nodeService.js');
            const node = await getNodeById(nodeId);
            if (!node) {
                result.isValid = false;
                result.issues.push({
                    type: 'missing_data',
                    severity: 'critical',
                    description: 'Node not found in database.'
                });
                result.recommendedActions.push('Check if node was deleted or id is incorrect.');
                return result;
            }

            // Check for required fields
            if (!node.type || typeof node.type !== 'string') {
                result.isValid = false;
                result.issues.push({
                    type: 'invalid_structure',
                    severity: 'high',
                    description: 'Node is missing a valid type.'
                });
                result.recommendedActions.push('Set a valid type for this node.');
            }
            if (!node.id || typeof node.id !== 'string') {
                result.isValid = false;
                result.issues.push({
                    type: 'invalid_structure',
                    severity: 'high',
                    description: 'Node is missing a valid id.'
                });
                result.recommendedActions.push('Set a valid id for this node.');
            }
            // Check for orphaned node (if parentId is set but parent does not exist)
            if (node.parentId && typeof node.parentId === 'string') {
                const parent = await getNodeById(node.parentId);
                if (!parent) {
                    result.isValid = false;
                    result.issues.push({
                        type: 'orphaned_node',
                        severity: 'medium',
                        description: 'Node parentId is set but parent node does not exist.'
                    });
                    result.recommendedActions.push('Re-link node to a valid parent or remove parentId.');
                }
            }
            // Check for stale data (if updatedAt is too old)
            if ('updatedAt' in node && typeof node.updatedAt === 'string') {
                const updatedAt = new Date(node.updatedAt);
                const now = new Date();
                const daysOld = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
                if (daysOld > 180) {
                    result.issues.push({
                        type: 'stale_data',
                        severity: 'low',
                        description: `Node has not been updated in over ${Math.floor(daysOld)} days.`
                    });
                    result.recommendedActions.push('Review and update node if still relevant.');
                }
            }

            if (result.issues.length === 0) {
                result.recommendedActions.push('Node structure is valid.');
            }

            logger.info(`[BenchmarkGapAnalyzer] Node validation complete: ${nodeId}, valid=${result.isValid}`);
            return result;

        } catch (error) {
            logger.error(`[BenchmarkGapAnalyzer] Error validating node ${nodeId}:`, { error: String(error) });
            result.isValid = false;
            result.issues.push({
                type: 'invalid_structure',
                severity: 'high',
                description: `Validation failed: ${String(error)}`
            });
            result.recommendedActions.push('Check for database or connectivity issues.');
            return result;
        }
    }

    /**
     * NEW: Analyze performance data completeness
     */
    public async analyzeDataCompleteness(modelId: string): Promise<CompletenessReport> {
        logger.info(`[BenchmarkGapAnalyzer] Analyzing data completeness for model: ${modelId}`);

        try {
            const allAvailableBenchmarks = await getAllAvailableBenchmarkTypes();
            const missingData = await (await this.getMissingBenchmarkService()).findModelPerformanceNodesWithMissingScores('extended');

            // Find data for this specific model
            const modelData = missingData.filter(data => data.modelId === modelId);

            let completedBenchmarks = 0;
            let missingBenchmarkTypes: BenchmarkType[] = [];
            let staleBenchmarkTypes: BenchmarkType[] = [];

            if (modelData.length > 0) {
                // Aggregate missing benchmarks across all servers for this model
                const allMissingForModel = new Set<BenchmarkType>();

                modelData.forEach(data => {
                    data.missingBenchmarks.forEach(benchmark => {
                        allMissingForModel.add(benchmark);
                    });
                });

                missingBenchmarkTypes = Array.from(allMissingForModel);
                completedBenchmarks = allAvailableBenchmarks.length - missingBenchmarkTypes.length;

                // For now, assume no stale benchmarks (would require timestamp analysis)
                staleBenchmarkTypes = [];
            } else {
                // No data found, assume all benchmarks are missing
                missingBenchmarkTypes = allAvailableBenchmarks;
                completedBenchmarks = 0;
            }

            const completenessPercentage = (completedBenchmarks / allAvailableBenchmarks.length) * 100;

            const report: CompletenessReport = {
                modelId,
                totalBenchmarks: allAvailableBenchmarks.length,
                completedBenchmarks,
                completenessPercentage,
                missingBenchmarkTypes,
                staleBenchmarkTypes,
                lastUpdated: new Date()
            };

            logger.info(`[BenchmarkGapAnalyzer] Completeness analysis for ${modelId}: ${completenessPercentage.toFixed(1)}% complete (${completedBenchmarks}/${allAvailableBenchmarks.length})`);
            return report;

        } catch (error) {
            logger.error(`[BenchmarkGapAnalyzer] Error analyzing completeness for ${modelId}:`, { error: String(error) });
            throw error;
        }
    }

    /**
     * NEW: Provide scheduling priority recommendations
     */
    public async recommendSchedulingPriority(gaps: BenchmarkGap[]): Promise<PriorityRecommendation[]> {
        logger.info(`[BenchmarkGapAnalyzer] Generating priority recommendations for ${gaps.length} gaps`);

        const recommendations: PriorityRecommendation[] = [];

        try {
            for (const gap of gaps) {
                const modelUsage = (await this.getModelUsageStats()).find(stats => stats.modelId === gap.modelId);

                // Calculate recommended priority based on multiple factors
                let recommendedPriority = gap.priority; // Start with existing priority
                let reason = `Based on ${gap.missingBenchmarks.length} missing benchmarks`;

                // Adjust based on usage patterns
                if (modelUsage) {
                    if (modelUsage.usageScore > 0.8) {
                        // High usage models get higher priority
                        if (recommendedPriority === SchedulerPriority.LOW) {
                            recommendedPriority = SchedulerPriority.MEDIUM;
                            reason += ', upgraded due to high usage';
                        } else if (recommendedPriority === SchedulerPriority.MEDIUM) {
                            recommendedPriority = SchedulerPriority.HIGH;
                            reason += ', upgraded due to very high usage';
                        }
                    } else if (modelUsage.usageScore < 0.3) {
                        // Low usage models get lower priority
                        if (recommendedPriority === SchedulerPriority.HIGH) {
                            recommendedPriority = SchedulerPriority.MEDIUM;
                            reason += ', downgraded due to low usage';
                        } else if (recommendedPriority === SchedulerPriority.MEDIUM) {
                            recommendedPriority = SchedulerPriority.LOW;
                            reason += ', downgraded due to very low usage';
                        }
                    }
                }

                // Check for critical benchmark types
                const criticalBenchmarks = gap.missingBenchmarks.filter(benchmark =>
                    ['json-assembly', 'creative-writing', 'server-latency'].includes(benchmark)
                );

                if (criticalBenchmarks.length > 0) {
                    recommendedPriority = SchedulerPriority.HIGH;
                    reason += `, includes ${criticalBenchmarks.length} critical benchmarks`;
                }

                recommendations.push({
                    modelId: gap.modelId,
                    serverId: gap.serverId,
                    recommendedPriority,
                    benchmarkTypes: gap.missingBenchmarks,
                    reason,
                    estimatedDuration: gap.estimatedDuration
                });
            }

            logger.info(`[BenchmarkGapAnalyzer] Generated ${recommendations.length} priority recommendations`);
            return recommendations;

        } catch (error) {
            logger.error('[BenchmarkGapAnalyzer] Error generating priority recommendations:', { error: String(error) });
            throw error;
        }
    }

    /**
     * Analyze gaps for a specific model across all servers
     */
    async analyzeModelGaps(modelId: string): Promise<BenchmarkGap[]> {
        logger.info(`[BenchmarkGapAnalyzer] Analyzing gaps for model: ${modelId}`);

        try {
            const allGaps = await this.analyzeBenchmarkGaps();
            return allGaps.filter(gap => gap.modelId === modelId);
        } catch (error) {
            logger.error(`[BenchmarkGapAnalyzer] Error analyzing model gaps for ${modelId}:`, String(error) as any);
            return [];
        }
    }

    /**
     * Analyze gaps for a specific server across all models
     */
    async analyzeServerGaps(serverId: string): Promise<BenchmarkGap[]> {
        logger.info(`[BenchmarkGapAnalyzer] Analyzing gaps for server: ${serverId}`);

        try {
            const allGaps = await this.analyzeBenchmarkGaps();
            return allGaps.filter(gap => gap.serverId === serverId);
        } catch (error) {
            logger.error(`[BenchmarkGapAnalyzer] Error analyzing server gaps for ${serverId}:`, String(error) as any);
            return [];
        }
    }

    /**
     * Get trend analysis for benchmark coverage over time
     */
    async getTrendAnalysis(days: number = 30): Promise<{
        coverageByDay: { date: string; coverage: number }[];
        topMissingBenchmarks: { benchmarkType: BenchmarkType; count: number }[];
        serverCoverageRanking: { serverId: string; coverage: number }[];
        modelCoverageRanking: { modelId: string; coverage: number }[];
        recommendations: string[];
    }> {
        logger.info(`[BenchmarkGapAnalyzer] Generating trend analysis for ${days} days`);

        try {
            // This would analyze historical data
            // For now, we'll return mock trend data
            const trends = {
                coverageByDay: this.generateMockCoverageTrend(days),
                topMissingBenchmarks: await this.getTopMissingBenchmarks(),
                serverCoverageRanking: await this.getServerCoverageRanking(),
                modelCoverageRanking: await this.getModelCoverageRanking(),
                recommendations: await this.generateRecommendations()
            };

            return trends;

        } catch (error) {
            logger.error('[BenchmarkGapAnalyzer] Error generating trend analysis:', String(error) as any);
            throw error;
        }
    }

    /**
     * Predict future benchmark gaps based on current trends
     */
    async predictFutureGaps(days: number = 7): Promise<{
        predictedGaps: BenchmarkGap[];
        confidence: number;
        recommendations: string[];
    }> {
        logger.info(`[BenchmarkGapAnalyzer] Predicting gaps for next ${days} days`);

        try {
            // Analyze current trends
            const currentGaps = await this.analyzeBenchmarkGaps();
            const usageStats = await this.getModelUsageStats();

            // Predict which models will need benchmarking based on usage growth
            const predictedGaps: BenchmarkGap[] = [];

            for (const stat of usageStats) {
                if (stat.usageScore > 0.7) { // High usage models
                    const existingGaps = currentGaps.filter(gap => gap.modelId === stat.modelId);

                    if (existingGaps.length === 0) {
                        // Create predicted gap for high-usage model without current gaps
                        const predictedGap = await this.createPredictedGap(stat);
                        if (predictedGap) {
                            predictedGaps.push(predictedGap);
                        }
                    }
                }
            }

            const confidence = this.calculatePredictionConfidence(currentGaps, usageStats);
            const recommendations = this.generatePredictiveRecommendations(predictedGaps);

            logger.info(`[BenchmarkGapAnalyzer] Predicted ${predictedGaps.length} future gaps with ${(confidence * 100).toFixed(1)}% confidence`);

            return {
                predictedGaps,
                confidence,
                recommendations
            };

        } catch (error) {
            logger.error('[BenchmarkGapAnalyzer] Error predicting future gaps:', String(error) as any);
            throw error;
        }
    }

    /**
     * Generate optimization recommendations for benchmark scheduling
     */
    async generateOptimizationRecommendations(): Promise<{
        schedulingOptimizations: string[];
        resourceOptimizations: string[];
        priorityAdjustments: string[];
        coverageImprovements: string[];
    }> {
        logger.info('[BenchmarkGapAnalyzer] Generating optimization recommendations');

        try {
            const gaps = await this.analyzeBenchmarkGaps();
            const trends = await this.getTrendAnalysis();

            return {
                schedulingOptimizations: this.generateSchedulingOptimizations(gaps),
                resourceOptimizations: this.generateResourceOptimizations(gaps, trends),
                priorityAdjustments: this.generatePriorityAdjustments(gaps),
                coverageImprovements: this.generateCoverageImprovements(trends)
            };

        } catch (error) {
            logger.error('[BenchmarkGapAnalyzer] Error generating optimization recommendations:', String(error) as any);
            throw error;
        }
    }

    // Private helper methods

    /**
     * Private helper methods for analysis
     */

    private async createBenchmarkGap(
        missing: any,
        modelUsage?: ModelUsageStats,
        serverPerf?: ServerPerformanceStats
    ): Promise<BenchmarkGap> {
        // Calculate dynamic priority based on multiple factors
        const priority = this.calculateDynamicPriority(missing, modelUsage, serverPerf);

        // Estimate duration based on benchmark types
        const estimatedDuration = this.estimateBenchmarkDuration(missing.missingBenchmarks);

        // Generate scheduling recommendation
        const schedulingRecommendation = this.generateSchedulingRecommendation(missing.missingBenchmarks, priority);

        return {
            serverId: missing.serverId,
            modelId: missing.modelId,
            nodeId: missing.nodeId,
            missingBenchmarks: missing.missingBenchmarks,
            staleBenchmarks: [], // This would be populated if checking for stale benchmarks
            lastTested: missing.lastTested ? new Date(missing.lastTested) : undefined,
            priority,
            estimatedDuration,
            schedulingRecommendation
        };
    }

    private calculateDynamicPriority(
        missing: any,
        modelUsage?: ModelUsageStats,
        serverPerf?: ServerPerformanceStats
    ): SchedulerPriority {
        let score = 0;

        // Base priority from benchmark types
        const highPriorityBenchmarks = missing.missingBenchmarks.filter((type: BenchmarkType) => {
            const priority = BENCHMARK_PRIORITY_MAP[type as keyof typeof BENCHMARK_PRIORITY_MAP];
            return priority === SchedulerPriority.CRITICAL || priority === SchedulerPriority.HIGH;
        });

        if (highPriorityBenchmarks.length > 0) {
            score += 40;
        }

        // Model usage factor
        if (modelUsage) {
            score += modelUsage.usageScore * 30;
        }

        // Server reliability factor
        if (serverPerf) {
            score += serverPerf.reliabilityScore * 20;
        }

        // Age factor
        if (missing.ageDays) {
            if (missing.ageDays > 30) score += 20;
            else if (missing.ageDays > 14) score += 15;
            else if (missing.ageDays > 7) score += 10;
        } else {
            score += 25; // Never tested gets high priority
        }

        // Convert score to priority
        if (score >= 80) return SchedulerPriority.CRITICAL;
        if (score >= 60) return SchedulerPriority.HIGH;
        if (score >= 40) return SchedulerPriority.MEDIUM;
        return SchedulerPriority.LOW;
    }

    private estimateBenchmarkDuration(benchmarks: BenchmarkType[]): number {
        const durations: Record<string, number> = {
            'server-latency': 2,
            'cold-performance': 5,
            'warm-performance': 8,
            'json-assembly': 10,
            'creative-writing': 15,
            'character-consistency': 12,
            'dialogue-generation': 10,
            'typescript-quality': 8,
            'task-planning': 12,
            'plot-coherence': 15,
            'world-building': 20,
            'emotional-depth': 18,
            'style-transfer': 12,
            'long-form-generation': 25,
            'summarization': 8,
            'fact-extraction': 6
        };

        return benchmarks.reduce((total, benchmark) => {
            return total + (durations[benchmark] || 10); // Default 10 minutes
        }, 0);
    }

    private generateSchedulingRecommendation(benchmarks: BenchmarkType[], priority: SchedulerPriority): {
        frequency: ScheduleFrequency;
        nextScheduleTime: Date;
        reason: string;
    } {
        let frequency: ScheduleFrequency = ScheduleFrequency.DAILY;
        let delayMinutes = 60; // Default 1 hour delay

        // Determine frequency and delay based on priority
        switch (priority) {
            case SchedulerPriority.CRITICAL:
                frequency = ScheduleFrequency.IMMEDIATE;
                delayMinutes = 5;
                break;
            case SchedulerPriority.HIGH:
                frequency = ScheduleFrequency.HOURLY;
                delayMinutes = 30;
                break;
            case SchedulerPriority.MEDIUM:
                frequency = ScheduleFrequency.DAILY;
                delayMinutes = 120;
                break;
            case SchedulerPriority.LOW:
                frequency = ScheduleFrequency.WEEKLY;
                delayMinutes = 1440; // 24 hours
                break;
        }

        const nextScheduleTime = new Date(Date.now() + delayMinutes * 60 * 1000);

        const reason = `${priority} priority with ${benchmarks.length} missing benchmark(s): ${benchmarks.slice(0, 3).join(', ')}${benchmarks.length > 3 ? '...' : ''}`;

        return {
            frequency,
            nextScheduleTime,
            reason
        };
    }

    private sortGapsByCalculatedPriority(gaps: BenchmarkGap[]): BenchmarkGap[] {
        const priorityOrder = {
            [SchedulerPriority.CRITICAL]: 4,
            [SchedulerPriority.HIGH]: 3,
            [SchedulerPriority.MEDIUM]: 2,
            [SchedulerPriority.LOW]: 1
        };

        return gaps.sort((a, b) => {
            // Primary sort by priority
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;

            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }

            // Secondary sort by number of missing benchmarks
            if (a.missingBenchmarks.length !== b.missingBenchmarks.length) {
                return b.missingBenchmarks.length - a.missingBenchmarks.length;
            }

            // Tertiary sort by last tested (older first)
            if (a.lastTested && b.lastTested) {
                return a.lastTested.getTime() - b.lastTested.getTime();
            }

            return 0;
        });
    }

    private async getModelUsageStats(): Promise<ModelUsageStats[]> {
        // This would query actual usage statistics
        // For now, return mock data
        return [
            {
                modelId: 'llama3:latest',
                totalRequests: 1500,
                uniqueServers: 3,
                averageResponseTime: 250,
                lastUsed: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                usageScore: 0.8
            },
            {
                modelId: 'llama3.2:3b-instruct-q4_K_M',
                totalRequests: 850,
                uniqueServers: 2,
                averageResponseTime: 180,
                lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                usageScore: 0.6
            }
        ];
    }

    private async getServerPerformanceStats(): Promise<ServerPerformanceStats[]> {
        // This would query actual server performance data
        // For now, return mock data
        return [
            {
                serverId: 'http://localhost:11434',
                uptime: 98.5,
                averageLatency: 125,
                modelCount: 5,
                reliabilityScore: 0.9
            }
        ];
    }

    private generateMockCoverageTrend(days: number): { date: string; coverage: number }[] {
        const trend = [];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const coverage = 65 + Math.random() * 20 + (i / days) * 10; // Trending upward

            trend.push({
                date: date.toISOString().split('T')[0],
                coverage: Math.round(coverage * 10) / 10
            });
        }

        return trend;
    }

    private async getTopMissingBenchmarks(): Promise<{ benchmarkType: BenchmarkType; count: number }[]> {
        const gaps = await this.analyzeBenchmarkGaps();
        const benchmarkCounts = new Map<BenchmarkType, number>();

        gaps.forEach(gap => {
            gap.missingBenchmarks.forEach(benchmark => {
                benchmarkCounts.set(benchmark, (benchmarkCounts.get(benchmark) || 0) + 1);
            });
        });

        return Array.from(benchmarkCounts.entries())
            .map(([benchmarkType, count]) => ({ benchmarkType, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    private async getServerCoverageRanking(): Promise<{ serverId: string; coverage: number }[]> {
        // This would calculate actual coverage percentages
        return [
            { serverId: 'http://localhost:11434', coverage: 75.5 },
            { serverId: 'http://server2:11434', coverage: 62.3 },
            { serverId: 'http://server3:11434', coverage: 58.1 }
        ];
    }

    private async getModelCoverageRanking(): Promise<{ modelId: string; coverage: number }[]> {
        // This would calculate actual coverage percentages
        return [
            { modelId: 'llama3:latest', coverage: 82.1 },
            { modelId: 'llama3.2:3b-instruct-q4_K_M', coverage: 67.8 },
            { modelId: 'codellama:7b', coverage: 45.2 }
        ];
    }

    private async generateRecommendations(): Promise<string[]> {
        return [
            'Focus on scheduling creative-writing benchmarks - highest gap count',
            'Prioritize server http://localhost:11434 for better overall coverage',
            'Consider automated refresh for performance benchmarks older than 6 hours',
            'llama3:latest shows good coverage - can be lower priority',
            'Implement staggered scheduling to avoid resource conflicts'
        ];
    }

    private async createPredictedGap(modelUsage: ModelUsageStats): Promise<BenchmarkGap | null> {
        // Create a predicted gap for a high-usage model
        const estimatedMissingBenchmarks: BenchmarkType[] = [
            'creative-writing',
            'character-consistency',
            'dialogue-generation'
        ];

        return {
            serverId: 'predicted-server',
            modelId: modelUsage.modelId,
            nodeId: `predicted-${modelUsage.modelId}`,
            missingBenchmarks: estimatedMissingBenchmarks,
            staleBenchmarks: [],
            priority: SchedulerPriority.MEDIUM,
            estimatedDuration: this.estimateBenchmarkDuration(estimatedMissingBenchmarks),
            schedulingRecommendation: {
                frequency: ScheduleFrequency.DAILY,
                nextScheduleTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
                reason: 'Predicted gap based on high usage patterns'
            }
        };
    }

    private calculatePredictionConfidence(gaps: BenchmarkGap[], usageStats: ModelUsageStats[]): number {
        // Simple confidence calculation based on data availability
        const dataPoints = gaps.length + usageStats.length;
        const maxConfidence = 0.9;
        const baseConfidence = 0.5;

        // More data = higher confidence, but cap at 90%
        return Math.min(maxConfidence, baseConfidence + (dataPoints / 100));
    }

    private generatePredictiveRecommendations(predictedGaps: BenchmarkGap[]): string[] {
        const recommendations = [];

        if (predictedGaps.length > 0) {
            recommendations.push(`Prepare for ${predictedGaps.length} predicted benchmark gaps in high-usage models`);
            recommendations.push('Consider proactive scheduling to prevent coverage degradation');
            recommendations.push('Monitor usage patterns for early gap detection');
        } else {
            recommendations.push('Current benchmark coverage appears stable');
            recommendations.push('Continue monitoring for usage pattern changes');
        }

        return recommendations;
    }

    private generateSchedulingOptimizations(gaps: BenchmarkGap[]): string[] {
        const optimizations = [];

        const criticalGaps = gaps.filter(gap => gap.priority === SchedulerPriority.CRITICAL);
        if (criticalGaps.length > 5) {
            optimizations.push('Consider increasing batch size to handle critical gaps faster');
        }

        const totalDuration = gaps.reduce((sum, gap) => sum + gap.estimatedDuration, 0);
        if (totalDuration > 480) { // More than 8 hours
            optimizations.push('Implement parallel scheduling across multiple servers');
        }

        optimizations.push('Stagger benchmark scheduling to optimize resource usage');

        return optimizations;
    }

    private generateResourceOptimizations(gaps: BenchmarkGap[], trends: any): string[] {
        return [
            'Consider server load balancing for benchmark distribution',
            'Implement caching for frequently repeated benchmark results',
            'Monitor memory usage during concurrent benchmark execution'
        ];
    }

    private generatePriorityAdjustments(gaps: BenchmarkGap[]): string[] {
        const adjustments = [];

        const lowPriorityCount = gaps.filter(gap => gap.priority === SchedulerPriority.LOW).length;
        if (lowPriorityCount > gaps.length * 0.6) {
            adjustments.push('Consider raising priority thresholds - too many low priority gaps');
        }

        adjustments.push('Review model usage patterns for priority calibration');

        return adjustments;
    }

    private generateCoverageImprovements(trends: any): string[] {
        return [
            'Focus on models with consistently low coverage scores',
            'Implement automated alerts for coverage drops below threshold',
            'Consider coverage goals by model importance'
        ];
    }
}
