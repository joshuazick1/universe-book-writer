/**
 * Missing Benchmark Service
 * 
 * Service to detect model-performance nodes with missing benchmark scores
 * and automatically queue benchmarking tests for them.
 * 
 * @module MissingBenchmarkService
 */

import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { getNode } from '../../../shared/node/nodeService.js';
import { NodeType, Node } from '../../../shared/types/nodeTypes.js';
import { logger } from '../../../shared/logging/logger.js';
import { sharedDatabaseConnection } from '../../../shared/database/database.config.js';
import { AutomaticBenchmarkSchedulerService } from './automatic-benchmark-scheduler.service.js';
import { BenchmarkStalenessDetectorService } from './benchmark-staleness-detector.service.js';
import type { BenchmarkGapAnalyzerService } from './benchmark-gap-analyzer.service.js';
import {
    SchedulerPriority,
    SchedulingPolicy,
    BatchScheduleRequest
} from '../types/scheduler.types.js';

// Helper function to get multiple nodes by type
async function getNodes(query: { type: NodeType }): Promise<Node[]> {
    const db = (sharedDatabaseConnection as any).db;
    if (!db) throw new Error('MongoDB database connection not initialized');

    const systemTypes = ['ai-model', 'ai-server', 'model-performance'];
    const collectionName = systemTypes.includes(query.type) ? 'system_nodes' : 'nodes';
    const collection = db.collection(collectionName);

    const nodes = await collection.find({ type: query.type }).toArray();
    return nodes;
}

export interface MissingBenchmarkNode {
    nodeId: string;
    serverId: string;
    modelId: string;
    missingBenchmarks: BenchmarkType[];
    existingBenchmarks: BenchmarkType[];
    lastTested?: string;
    priority: 'high' | 'medium' | 'low';
    ageDays?: number;
}

export interface ServerHealthNode {
    serverId: string;
    lastHealthCheck?: string;
    consecutiveFailures: number;
    isHealthy: boolean;
    ageDays?: number;
}

export interface ModelAggregationNode {
    modelId: string;
    serverCount: number;
    lastAggregated?: string;
    hasIncompleteData: boolean;
    ageDays?: number;
}

/**
 * Standard benchmark types that every model-performance node should have
 */
const REQUIRED_BENCHMARKS: BenchmarkType[] = [
    // Essential quality benchmarks  
    'json-assembly',
    'creative-writing',
    'typescript-quality',
    'task-planning',

    // Book writing specific (high priority for this system)
    'character-consistency',
    'dialogue-generation',
    'plot-coherence'
];

/**
 * Extended benchmark types for comprehensive testing
 */
const EXTENDED_BENCHMARKS: BenchmarkType[] = [
    ...REQUIRED_BENCHMARKS,
    'world-building',
    'emotional-depth',
    'style-transfer',
    'long-form-generation',
    'summarization',
    'fact-extraction'
];

export class MissingBenchmarkService {
    private gapAnalyzer?: BenchmarkGapAnalyzerService;
    private stalenessDetector: BenchmarkStalenessDetectorService;
    private scheduler?: AutomaticBenchmarkSchedulerService;

    constructor() {
        // Initialize gapAnalyzer lazily to avoid circular dependency
        this.stalenessDetector = new BenchmarkStalenessDetectorService();
    }

    private getGapAnalyzer(): BenchmarkGapAnalyzerService {
        if (!this.gapAnalyzer) {
            // Import dynamically to avoid circular dependency
            const { BenchmarkGapAnalyzerService } = require('./benchmark-gap-analyzer.service.js');
            this.gapAnalyzer = new BenchmarkGapAnalyzerService();
        }
        return this.gapAnalyzer!;
    }

    /**
     * Initialize scheduler integration
     */
    setScheduler(scheduler: AutomaticBenchmarkSchedulerService): void {
        this.scheduler = scheduler;
    }

    /**
     * Enhanced method to queue missing benchmarks automatically using the scheduler
     */
    async scheduleAllMissingBenchmarks(
        policy: SchedulingPolicy = SchedulingPolicy.MISSING_ONLY,
        maxJobs?: number
    ): Promise<{
        scheduled: number;
        skipped: number;
        errors: string[];
    }> {
        logger.info('[MissingBenchmarkService] Scheduling all missing benchmarks using enhanced scheduler...');

        try {
            // Get comprehensive gap analysis
            const gaps = await this.getGapAnalyzer().analyzeBenchmarkGaps();

            if (gaps.length === 0) {
                logger.info('[MissingBenchmarkService] No gaps found, nothing to schedule');
                return { scheduled: 0, skipped: 0, errors: [] };
            }

            if (!this.scheduler) {
                throw new Error('Scheduler not initialized. Call setScheduler() first.');
            }

            // Create batch schedule request
            const batchRequest: BatchScheduleRequest = {
                gaps,
                policy,
                maxJobs
            };

            // Use the enhanced scheduler
            const result = await this.scheduler.scheduleBatch(batchRequest);

            logger.info(`[MissingBenchmarkService] Scheduled ${result.jobsScheduled} jobs, skipped ${result.jobsSkipped}`);

            return {
                scheduled: result.jobsScheduled,
                skipped: result.jobsSkipped,
                errors: []
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[MissingBenchmarkService] Error scheduling missing benchmarks:', String(error) as any);
            return {
                scheduled: 0,
                skipped: 0,
                errors: [errorMessage]
            };
        }
    }

    /**
     * Schedule missing benchmarks for a specific model
     */
    async scheduleModelMissingBenchmarks(
        modelId: string,
        policy: SchedulingPolicy = SchedulingPolicy.MISSING_ONLY
    ): Promise<{
        scheduled: number;
        skipped: number;
        errors: string[];
    }> {
        logger.info(`[MissingBenchmarkService] Scheduling missing benchmarks for model: ${modelId}`);

        try {
            const gaps = await this.getGapAnalyzer().analyzeModelGaps(modelId);

            if (gaps.length === 0) {
                return { scheduled: 0, skipped: 0, errors: [] };
            }

            if (!this.scheduler) {
                throw new Error('Scheduler not initialized. Call setScheduler() first.');
            }

            const batchRequest: BatchScheduleRequest = {
                gaps,
                policy,
                modelFilter: [modelId]
            };

            const result = await this.scheduler.scheduleBatch(batchRequest);

            return {
                scheduled: result.jobsScheduled,
                skipped: result.jobsSkipped,
                errors: []
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[MissingBenchmarkService] Error scheduling model benchmarks for ${modelId}:`, String(error) as any);
            return {
                scheduled: 0,
                skipped: 0,
                errors: [errorMessage]
            };
        }
    }

    /**
     * Schedule missing benchmarks for a specific server
     */
    async scheduleServerMissingBenchmarks(
        serverId: string,
        policy: SchedulingPolicy = SchedulingPolicy.MISSING_ONLY
    ): Promise<{
        scheduled: number;
        skipped: number;
        errors: string[];
    }> {
        logger.info(`[MissingBenchmarkService] Scheduling missing benchmarks for server: ${serverId}`);

        try {
            const gaps = await this.getGapAnalyzer().analyzeServerGaps(serverId);

            if (gaps.length === 0) {
                return { scheduled: 0, skipped: 0, errors: [] };
            }

            if (!this.scheduler) {
                throw new Error('Scheduler not initialized. Call setScheduler() first.');
            }

            const batchRequest: BatchScheduleRequest = {
                gaps,
                policy,
                serverFilter: [serverId]
            };

            const result = await this.scheduler.scheduleBatch(batchRequest);

            return {
                scheduled: result.jobsScheduled,
                skipped: result.jobsSkipped,
                errors: []
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[MissingBenchmarkService] Error scheduling server benchmarks for ${serverId}:`, String(error) as any);
            return {
                scheduled: 0,
                skipped: 0,
                errors: [errorMessage]
            };
        }
    }

    /**
     * Get comprehensive missing data report with enhanced analytics
     */
    async getEnhancedMissingDataReport(): Promise<{
        summary: {
            totalNodesWithMissingScores: number;
            totalServersNeedingHealthChecks: number;
            totalModelsNeedingAggregation: number;
            criticalGaps: number;
            highPriorityGaps: number;
            estimatedTimeToComplete: number; // minutes
        };
        gapAnalysis: any;
        stalenessReport: any;
        recommendations: string[];
    }> {
        logger.info('[MissingBenchmarkService] Generating enhanced missing data report...');

        try {
            // Get comprehensive analyses
            const [gapAnalysis, stalenessReport, missingData, serverHealth, modelAggregation] = await Promise.all([
                this.getGapAnalyzer().analyzeBenchmarkGaps(),
                this.stalenessDetector.getStalenessReport(),
                this.findModelPerformanceNodesWithMissingScores('extended'),
                this.findServersNeedingHealthChecks(),
                this.findModelsNeedingAggregation()
            ]);

            const criticalGaps = gapAnalysis.filter(gap => gap.priority === SchedulerPriority.CRITICAL).length;
            const highPriorityGaps = gapAnalysis.filter(gap => gap.priority === SchedulerPriority.HIGH).length;

            // Estimate completion time
            const totalDuration = gapAnalysis.reduce((sum, gap) => sum + gap.estimatedDuration, 0);
            const estimatedTimeToComplete = Math.ceil(totalDuration / 5); // Assuming 5 concurrent jobs

            // Generate recommendations
            const recommendations = await this.generateEnhancedRecommendations(
                gapAnalysis,
                stalenessReport,
                missingData.length,
                criticalGaps,
                highPriorityGaps
            );

            const report = {
                summary: {
                    totalNodesWithMissingScores: missingData.length,
                    totalServersNeedingHealthChecks: serverHealth.length,
                    totalModelsNeedingAggregation: modelAggregation.length,
                    criticalGaps,
                    highPriorityGaps,
                    estimatedTimeToComplete
                },
                gapAnalysis: {
                    totalGaps: gapAnalysis.length,
                    gaps: gapAnalysis.slice(0, 20), // Top 20 gaps
                    byPriority: {
                        critical: criticalGaps,
                        high: highPriorityGaps,
                        medium: gapAnalysis.filter(gap => gap.priority === SchedulerPriority.MEDIUM).length,
                        low: gapAnalysis.filter(gap => gap.priority === SchedulerPriority.LOW).length
                    }
                },
                stalenessReport,
                recommendations
            };

            logger.info(`[MissingBenchmarkService] Enhanced report complete: ${missingData.length} nodes with missing scores, ${criticalGaps} critical gaps`);
            return report;

        } catch (error) {
            logger.error('[MissingBenchmarkService] Error generating enhanced report:', String(error) as any);
            throw error;
        }
    }

    /**
     * Generate enhanced recommendations based on gap analysis and staleness
     */
    private async generateEnhancedRecommendations(
        gapAnalysis: any[],
        stalenessReport: any,
        missingNodeCount: number,
        criticalGaps: number,
        highPriorityGaps: number
    ): Promise<string[]> {
        const recommendations: string[] = [];

        // Critical gap recommendations
        if (criticalGaps > 0) {
            recommendations.push(`🚨 URGENT: ${criticalGaps} critical benchmark gaps require immediate attention`);
            recommendations.push('Consider enabling automatic scheduler to handle critical gaps');
        }

        // High priority recommendations
        if (highPriorityGaps > 5) {
            recommendations.push(`⚠️  ${highPriorityGaps} high-priority gaps detected - consider increasing scheduler batch size`);
        }

        // Staleness recommendations
        if (stalenessReport.criticalBenchmarks > 0) {
            recommendations.push(`📅 ${stalenessReport.criticalBenchmarks} benchmarks are critically stale and need re-testing`);
        }

        // Coverage recommendations
        const coveragePercent = ((stalenessReport.totalBenchmarks - missingNodeCount) / stalenessReport.totalBenchmarks * 100);
        if (coveragePercent < 80) {
            recommendations.push(`📊 Benchmark coverage is ${coveragePercent.toFixed(1)}% - aim for 90%+ coverage`);
        }

        // Resource optimization
        if (gapAnalysis.length > 50) {
            recommendations.push('🔄 Large number of gaps detected - consider implementing parallel scheduling');
        }

        // Default recommendation if all is well
        if (recommendations.length === 0) {
            recommendations.push('✅ Benchmark coverage looks good - continue monitoring');
        }

        return recommendations;
    }

    /**
     * Find model-performance nodes with missing benchmark scores
     * @param requirementLevel - 'core' for essential benchmarks, 'extended' for comprehensive
     * @returns Array of nodes with missing benchmarks
     */
    async findModelPerformanceNodesWithMissingScores(
        requirementLevel: 'core' | 'extended' = 'core'
    ): Promise<MissingBenchmarkNode[]> {
        try {
            logger.info(`[MissingBenchmarkService] Invoked findModelPerformanceNodesWithMissingScores with requirementLevel: ${requirementLevel}`);

            // Get all model-performance nodes from RAG
            const nodes = await getNodes({ type: 'model-performance' as NodeType });
            logger.info(`[MissingBenchmarkService] Retrieved ${nodes.length} nodes from getNodes`);
            nodes.forEach(node => {
                logger.debug(`[MissingBenchmarkService] Node ID: ${node.id}, Metadata: ${JSON.stringify(node.metadata)}`);
            });

            const requiredBenchmarks = requirementLevel === 'core' ? REQUIRED_BENCHMARKS : EXTENDED_BENCHMARKS;
            logger.debug(`[MissingBenchmarkService] Required benchmarks for level ${requirementLevel}: ${requiredBenchmarks.join(', ')}`);

            const missingNodes: MissingBenchmarkNode[] = [];

            for (const node of nodes) {
                const metadata = node.metadata || {};
                const benchmarks = metadata.benchmarks || {};
                const existingBenchmarks = Object.keys(benchmarks) as BenchmarkType[];

                logger.debug(`[MissingBenchmarkService] Node ID: ${node.id}, Existing Benchmarks: ${existingBenchmarks.join(', ')}`);

                // Find missing benchmarks
                const missingBenchmarks = requiredBenchmarks.filter(
                    benchmark => !existingBenchmarks.includes(benchmark)
                );

                logger.debug(`[MissingBenchmarkService] Node ID: ${node.id}, Missing Benchmarks: ${missingBenchmarks.join(', ')}`);

                if (missingBenchmarks.length > 0) {
                    const lastTested = metadata.lastTested || metadata.lastBenchmarked;
                    const ageDays = lastTested ?
                        Math.floor((Date.now() - new Date(lastTested).getTime()) / (1000 * 60 * 60 * 24)) :
                        undefined;

                    logger.debug(`[MissingBenchmarkService] Node ID: ${node.id}, Last Tested: ${lastTested}, Age Days: ${ageDays}`);

                    const priority = this.calculatePriority(missingBenchmarks, ageDays, existingBenchmarks.length);

                    missingNodes.push({
                        nodeId: node.id,
                        serverId: metadata.serverId || 'unknown',
                        modelId: metadata.modelName || metadata.modelId || 'unknown',
                        missingBenchmarks,
                        existingBenchmarks,
                        lastTested,
                        priority,
                        ageDays
                    });
                }
            }

            logger.info(`[MissingBenchmarkService] Found ${missingNodes.length} nodes with missing benchmarks`);
            return missingNodes.sort((a, b) => this.comparePriority(a, b));

        } catch (error) {
            logger.error('[MissingBenchmarkService] Error finding nodes with missing scores:', { error: String(error) });
            return [];
        }
    }

    /**
     * Find ai-server nodes needing health checks
     * @param maxAgeDays - Maximum age in days before health check is considered stale
     * @returns Array of servers needing health checks
     */
    async findServersNeedingHealthChecks(maxAgeDays: number = 1): Promise<ServerHealthNode[]> {
        try {
            logger.info('[MissingBenchmarkService] Searching for servers needing health checks...');

            const nodes = await getNodes({ type: 'ai-server' as NodeType });
            const staleServers: ServerHealthNode[] = [];

            for (const node of nodes) {
                const metadata = node.metadata || {};
                const serverHealth = metadata.serverHealth || {};
                const lastHealthCheck = serverHealth.lastHealthCheck;

                let needsHealthCheck = false;
                let ageDays: number | undefined;

                if (!lastHealthCheck) {
                    needsHealthCheck = true;
                } else {
                    ageDays = Math.floor((Date.now() - new Date(lastHealthCheck).getTime()) / (1000 * 60 * 60 * 24));
                    needsHealthCheck = ageDays > maxAgeDays;
                }

                if (needsHealthCheck) {
                    staleServers.push({
                        serverId: metadata.serverId || node.title,
                        lastHealthCheck,
                        consecutiveFailures: serverHealth.consecutiveFailures || 0,
                        isHealthy: serverHealth.isHealthy || false,
                        ageDays
                    });
                }
            }

            logger.info(`[MissingBenchmarkService] Found ${staleServers.length} servers needing health checks`);
            return staleServers.sort((a, b) => (b.ageDays || 999) - (a.ageDays || 999));

        } catch (error) {
            logger.error('[MissingBenchmarkService] Error finding servers needing health checks:', String(error) as any);
            return [];
        }
    }

    /**
     * Find ai-model nodes that need aggregation from their model-performance nodes
     * @param maxAgeDays - Maximum age before aggregation is considered stale
     * @returns Array of models needing aggregation
     */
    async findModelsNeedingAggregation(maxAgeDays: number = 7): Promise<ModelAggregationNode[]> {
        try {
            logger.info('[MissingBenchmarkService] Searching for models needing aggregation...');

            const modelNodes = await getNodes({ type: 'ai-model' as NodeType });
            const performanceNodes = await getNodes({ type: 'model-performance' as NodeType });

            const staleModels: ModelAggregationNode[] = [];

            for (const modelNode of modelNodes) {
                const modelId = modelNode.metadata?.modelId || modelNode.title;
                const lastAggregated = modelNode.metadata?.lastBenchmarked;

                // Count performance nodes for this model
                const relatedPerformanceNodes = performanceNodes.filter(
                    (node: Node) => node.metadata?.modelName === modelId || node.metadata?.modelId === modelId
                );

                // Check if aggregation is stale
                let needsAggregation = false;
                let ageDays: number | undefined;

                if (!lastAggregated) {
                    needsAggregation = true;
                } else {
                    ageDays = Math.floor((Date.now() - new Date(lastAggregated).getTime()) / (1000 * 60 * 60 * 24));
                    needsAggregation = ageDays > maxAgeDays;
                }

                // Check if there are newer performance nodes than the last aggregation
                const hasNewerData = relatedPerformanceNodes.some((perfNode: Node) => {
                    const perfLastTested = perfNode.metadata?.lastTested;
                    if (!perfLastTested || !lastAggregated) return true;
                    return new Date(perfLastTested) > new Date(lastAggregated);
                });

                if (needsAggregation || hasNewerData) {
                    staleModels.push({
                        modelId,
                        serverCount: relatedPerformanceNodes.length,
                        lastAggregated,
                        hasIncompleteData: hasNewerData,
                        ageDays
                    });
                }
            }

            logger.info(`[MissingBenchmarkService] Found ${staleModels.length} models needing aggregation`);
            return staleModels.sort((a, b) => (b.ageDays || 999) - (a.ageDays || 999));

        } catch (error) {
            logger.error('[MissingBenchmarkService] Error finding models needing aggregation:', String(error) as any);
            return [];
        }
    }

    /**
     * Get comprehensive missing data report
     * @returns Summary of all missing data across the system
     */
    async getComprehensiveMissingDataReport(): Promise<{
        missingBenchmarks: MissingBenchmarkNode[];
        staleHealthChecks: ServerHealthNode[];
        staleAggregations: ModelAggregationNode[];
        summary: {
            totalNodesWithMissingScores: number;
            totalServersNeedingHealthChecks: number;
            totalModelsNeedingAggregation: number;
            highPriorityItems: number;
        };
    }> {
        const [missingBenchmarks, staleHealthChecks, staleAggregations] = await Promise.all([
            this.findModelPerformanceNodesWithMissingScores('core'),
            this.findServersNeedingHealthChecks(1),
            this.findModelsNeedingAggregation(7)
        ]);

        const highPriorityItems = missingBenchmarks.filter(node => node.priority === 'high').length +
            staleHealthChecks.filter(server => server.consecutiveFailures > 0).length +
            staleAggregations.filter(model => model.hasIncompleteData).length;

        return {
            missingBenchmarks,
            staleHealthChecks,
            staleAggregations,
            summary: {
                totalNodesWithMissingScores: missingBenchmarks.length,
                totalServersNeedingHealthChecks: staleHealthChecks.length,
                totalModelsNeedingAggregation: staleAggregations.length,
                highPriorityItems
            }
        };
    }

    /**
     * Calculate priority for a node with missing benchmarks
     */
    private calculatePriority(
        missingBenchmarks: BenchmarkType[],
        ageDays?: number,
        existingBenchmarkCount: number = 0
    ): 'high' | 'medium' | 'low' {
        // High priority: missing core benchmarks or very old data
        const missingCoreBenchmarks = missingBenchmarks.filter(b =>
            ['json-assembly', 'creative-writing', 'character-consistency', 'dialogue-generation'].includes(b)
        );

        if (missingCoreBenchmarks.length > 0 || (ageDays && ageDays > 30) || existingBenchmarkCount === 0) {
            return 'high';
        }

        // Medium priority: some missing benchmarks with moderate age
        if (missingBenchmarks.length > 2 || (ageDays && ageDays > 7)) {
            return 'medium';
        }

        // Low priority: few missing benchmarks, recent data
        return 'low';
    }

    /**
     * Compare priority for sorting (high -> medium -> low, then by age)
     */
    private comparePriority(a: MissingBenchmarkNode, b: MissingBenchmarkNode): number {
        const priorityOrder = { high: 3, medium: 2, low: 1 };

        // First sort by priority
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }

        // Then sort by age (older first)
        const ageA = a.ageDays || 0;
        const ageB = b.ageDays || 0;
        return ageB - ageA;
    }

    /**
     * Generate automatic benchmark queue items
     * @param maxItems - Maximum number of items to queue at once
     * @returns Array of benchmark tasks ready for queuing
     */
    async generateAutomaticBenchmarkQueue(maxItems: number = 10): Promise<Array<{
        serverId: string;
        modelId: string;
        benchmarkTypes: BenchmarkType[];
        priority: 'high' | 'medium' | 'low';
        reason: string;
    }>> {
        const missingNodes = await this.findModelPerformanceNodesWithMissingScores('core');
        const queueItems = [];

        for (const node of missingNodes.slice(0, maxItems)) {
            queueItems.push({
                serverId: node.serverId,
                modelId: node.modelId,
                benchmarkTypes: node.missingBenchmarks,
                priority: node.priority,
                reason: `Missing ${node.missingBenchmarks.length} benchmarks. Last tested: ${node.lastTested || 'never'}`
            });
        }

        return queueItems;
    }

    /**
     * Perform basic community detection on model families.
     * @returns Map of model families and their associated models
     */
    async performModelFamilyDetection(): Promise<Map<string, string[]>> {
        try {
            const modelNodes = await getNodes({ type: 'ai-model' as NodeType });
            const familyGroups = new Map<string, string[]>();

            for (const node of modelNodes) {
                const modelId = node.metadata?.modelId || node.title;
                const family = this.detectModelFamily(modelId);

                if (!familyGroups.has(family)) {
                    familyGroups.set(family, []);
                }
                familyGroups.get(family)!.push(modelId);
            }

            logger.info(`[MissingBenchmarkService] Detected ${familyGroups.size} model families`);
            return familyGroups;
        } catch (error) {
            logger.error('[MissingBenchmarkService] Error in model family detection:', String(error) as any);
            return new Map();
        }
    }

    /**
     * Perform performance tier detection for servers.
     * @returns Map of performance tiers and their associated servers
     */
    async performServerPerformanceTierDetection(): Promise<Map<string, string[]>> {
        try {
            const serverNodes = await getNodes({ type: 'ai-server' as NodeType });
            const tierGroups = new Map<string, string[]>();

            for (const node of serverNodes) {
                const serverId = node.metadata?.serverId || node.title;
                const serverHealth = node.metadata?.serverHealth || {};
                const responseTime = serverHealth.responseTimeMs || 9999;
                const healthScore = serverHealth.isHealthy ? 1 : 0;

                const tier = this.detectServerPerformanceTier(responseTime, healthScore);

                if (!tierGroups.has(tier)) {
                    tierGroups.set(tier, []);
                }
                tierGroups.get(tier)!.push(serverId);
            }

            logger.info(`[MissingBenchmarkService] Detected ${tierGroups.size} server performance tiers`);
            return tierGroups;
        } catch (error) {
            logger.error('[MissingBenchmarkService] Error in server performance tier detection:', String(error) as any);
            return new Map();
        }
    }

    /**
     * Analyze community detection results.
     * @param communities - Community detection results to analyze
     * @returns Analysis summary
     */
    analyzeCommunityDetection(communities: Map<string, string[]>): {
        totalCommunities: number;
        averageCommunitySize: number;
        largestCommunity: string;
        smallestCommunity: string;
        isValid: boolean;
    } {
        const sizes = Array.from(communities.values()).map(group => group.length);
        const totalItems = sizes.reduce((a, b) => a + b, 0);
        const avgSize = totalItems / communities.size;

        const [largestSize, smallestSize] = [Math.max(...sizes), Math.min(...sizes)];
        const largestCommunity = Array.from(communities.entries())
            .find(([, group]) => group.length === largestSize)?.[0] || 'unknown';
        const smallestCommunity = Array.from(communities.entries())
            .find(([, group]) => group.length === smallestSize)?.[0] || 'unknown';

        return {
            totalCommunities: communities.size,
            averageCommunitySize: avgSize,
            largestCommunity,
            smallestCommunity,
            isValid: communities.size > 0 && avgSize > 0
        };
    }

    /**
     * Helper method to detect model family from model ID.
     */
    private detectModelFamily(modelId: string): string {
        const modelLower = modelId.toLowerCase();

        if (modelLower.includes('llama')) return 'llama';
        if (modelLower.includes('mistral')) return 'mistral';
        if (modelLower.includes('qwen')) return 'qwen';
        if (modelLower.includes('phi')) return 'phi';
        if (modelLower.includes('gemma')) return 'gemma';
        if (modelLower.includes('codellama')) return 'codellama';
        if (modelLower.includes('deepseek')) return 'deepseek';

        return 'other';
    }

    /**
     * Helper method to detect server performance tier.
     */
    private detectServerPerformanceTier(responseTime: number, healthScore: number): string {
        if (responseTime < 200 && healthScore > 0.8) return 'high-performance';
        if (responseTime < 1000 && healthScore > 0.6) return 'medium-performance';
        return 'budget-tier';
    }

    /**
     * Validate community detection results
     * @param nodeId - ID of the node to validate
     * @returns Validation results
     */
    async validateCommunityDetection(nodeId: string): Promise<{
        isValid: boolean;
        communityData: any;
        recommendations: string[];
    }> {
        try {
            logger.info(`[MissingBenchmarkService] Validating community detection for node: ${nodeId}`);

            // This is a placeholder for future community validation logic
            const recommendations = [
                'Consider running additional benchmarks for better community classification',
                'Verify model family detection accuracy',
                'Check performance tier assignment'
            ];

            return {
                isValid: true,
                communityData: {
                    modelFamily: 'detected-family',
                    performanceTier: 'medium',
                    capabilityCluster: 'general-purpose'
                },
                recommendations
            };

        } catch (error) {
            logger.error('[MissingBenchmarkService] Error validating community detection:', String(error) as any);
            return {
                isValid: false,
                communityData: null,
                recommendations: ['Community detection validation failed - check logs for details']
            };
        }
    }

    /**
     * Detect performance similarities between models
     * @param modelId - Model to analyze
     * @returns Similar models and their similarity scores
     */
    async detectSimilarModels(modelId: string): Promise<Array<{
        modelId: string;
        similarityScore: number;
        sharedCapabilities: string[];
    }>> {
        try {
            logger.info(`[MissingBenchmarkService] Detecting similar models for: ${modelId}`);

            const performanceNodes = await getNodes({ type: 'model-performance' as NodeType });
            const targetModelNodes = performanceNodes.filter(
                (node: Node) => node.metadata?.modelName === modelId || node.metadata?.modelId === modelId
            );

            if (targetModelNodes.length === 0) {
                return [];
            }

            // Simple similarity detection based on shared benchmark scores
            const similarModels = [];
            const seenModels = new Set<string>();

            for (const otherNode of performanceNodes) {
                const otherModelId = otherNode.metadata?.modelName || otherNode.metadata?.modelId;

                if (otherModelId && otherModelId !== modelId && !seenModels.has(otherModelId)) {
                    seenModels.add(otherModelId);

                    // Calculate basic similarity (placeholder logic)
                    const similarityScore = this.calculateModelSimilarity(targetModelNodes[0], otherNode);

                    if (similarityScore > 0.5) {
                        similarModels.push({
                            modelId: otherModelId,
                            similarityScore,
                            sharedCapabilities: ['text-generation', 'creative-writing'] // Placeholder
                        });
                    }
                }
            }

            return similarModels.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5);

        } catch (error) {
            logger.error('[MissingBenchmarkService] Error detecting similar models:', String(error) as any);
            return [];
        }
    }

    /**
     * Calculate similarity between two model performance nodes
     * @param nodeA - First model node
     * @param nodeB - Second model node
     * @returns Similarity score (0-1)
     */
    private calculateModelSimilarity(nodeA: Node, nodeB: Node): number {
        // Placeholder similarity calculation
        // In a real implementation, this would compare benchmark scores, performance metrics, etc.

        const benchmarksA = nodeA.metadata?.benchmarks || {};
        const benchmarksB = nodeB.metadata?.benchmarks || {};

        const sharedBenchmarks = Object.keys(benchmarksA).filter(key =>
            benchmarksB.hasOwnProperty(key)
        );

        if (sharedBenchmarks.length === 0) {
            return 0;
        }

        // Simple score comparison
        let totalDifference = 0;
        for (const benchmark of sharedBenchmarks) {
            const scoreA = benchmarksA[benchmark]?.score || 0;
            const scoreB = benchmarksB[benchmark]?.score || 0;
            totalDifference += Math.abs(scoreA - scoreB);
        }

        const averageDifference = totalDifference / sharedBenchmarks.length;
        return Math.max(0, 1 - averageDifference); // Convert difference to similarity
    }
}

// Export singleton instance
export const missingBenchmarkService = new MissingBenchmarkService();
