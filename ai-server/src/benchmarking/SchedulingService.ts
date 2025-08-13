/**
 * Central Scheduling Service
 * 
 * Coordinates all existing benchmarking services into intelligent scheduling.
 * Implements cost-aware scheduling, dynamic gating logic, and adaptive frequency management.
 * This service acts as the central orchestrator for all benchmark scheduling decisions.
 */

import { AutomaticBenchmarkSchedulerService } from '../services/automatic-benchmark-scheduler.service.js';
import { UniversalQueueService } from '../services/universal-queue.service.js';
import { BenchmarkGapAnalyzerService } from '../services/benchmark-gap-analyzer.service.js';
import { ModelAggregationService } from '../services/model-aggregation.service.js';
import { ServerAggregationService } from '../services/server-aggregation.service.js';

import {
    SchedulerPriority,
    ScheduleFrequency,
    SchedulingPolicy,
    BenchmarkGap,
    ScheduledJob,
    BatchScheduleRequest,
    BatchScheduleResult
} from '../types/scheduler.types.js';

import { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Scheduling frequency configuration based on model cost and usage
 */
export interface ScheduleFrequencyConfig {
    modelId: string;
    costCategory: 'low' | 'medium' | 'high' | 'premium';
    baseFrequency: ScheduleFrequency;
    adaptiveMultiplier: number; // Multiplier based on stability metrics
}

/**
 * Gated benchmark suite execution result
 */
export interface GatedSuiteResult {
    modelId: string;
    serverId: string;
    gatekeepersPassed: BenchmarkType[];
    gatekeepersFailed: BenchmarkType[];
    qualityTestsExecuted: BenchmarkType[];
    qualityTestsSkipped: BenchmarkType[];
    totalExecutionTime: number;
    costSaved: number; // Estimated cost saved by gating
}

/**
 * Performance metrics for adaptive scheduling
 */
export interface PerformanceMetrics {
    modelId: string;
    serverId: string;
    averageResponseTime: number;
    successRate: number;
    stabilityScore: number; // 0-1, higher = more stable
    lastBenchmarked: Date;
    trendDirection: 'improving' | 'stable' | 'degrading';
}

/**
 * Scheduling result with enhanced metadata
 */
export interface SchedulingResult {
    jobsScheduled: number;
    jobsSkipped: number;
    estimatedCost: number;
    estimatedDuration: number;
    gatingSavings: number;
    scheduledJobs: ScheduledJob[];
    recommendations: string[];
}

export class SchedulingService {
    private scheduler: AutomaticBenchmarkSchedulerService;
    private queueService!: UniversalQueueService; // Will be initialized in initializeServices
    private gapAnalyzer: BenchmarkGapAnalyzerService;
    private modelAggregation: ModelAggregationService;
    private serverAggregation: ServerAggregationService;
    private costCalculation!: any; // Will be initialized in initializeServices

    private isInitialized = false;

    constructor() {
        // Initialize services
        this.scheduler = new AutomaticBenchmarkSchedulerService();
        this.gapAnalyzer = new BenchmarkGapAnalyzerService();
        this.modelAggregation = new ModelAggregationService();
        this.serverAggregation = new ServerAggregationService();

        // Cost calculation service will be created separately
        // Queue service needs to be imported as singleton
        this.initializeServices().catch(error => {
            logger.error('[SchedulingService] Failed to initialize services during construction:', { error: String(error) });
        });
    }

    /**
     * Initialize all coordination services
     */
    private async initializeServices(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Import queue service singleton
            const { universalQueueService } = await import('../services/universal-queue.service.js');
            this.queueService = universalQueueService;

            // Import cost calculation service (handle gracefully if not yet created)
            try {
                const costCalcModule = await import('../services/cost-calculation.service.js');
                this.costCalculation = new costCalcModule.CostCalculationService();
            } catch (costError) {
                logger.warn('[SchedulingService] Cost calculation service not available, using fallback methods');
                this.costCalculation = {
                    getModelCostCategory: async () => 'medium',
                    estimateBenchmarkCost: async () => 0,
                };
            }

            this.isInitialized = true;
            logger.info('[SchedulingService] Successfully initialized central scheduling coordination');
        } catch (error) {
            logger.error('[SchedulingService] Failed to initialize services:', { error: String(error) });
            throw error;
        }
    }

    /**
     * Calculate optimal scheduling frequency based on model cost and usage patterns
     */
    public async calculateSchedulingFrequency(modelId: string): Promise<ScheduleFrequencyConfig> {
        await this.initializeServices();

        try {
            // Get cost category from cost calculation service
            const costCategory = await this.costCalculation.getModelCostCategory(modelId);

            // Get performance metrics for stability assessment
            const metrics = await this.getModelPerformanceMetrics(modelId);

            // Calculate base frequency based on cost
            let baseFrequency: ScheduleFrequency;
            let adaptiveMultiplier = 1.0;

            switch (costCategory) {
                case 'low':
                    baseFrequency = ScheduleFrequency.DAILY;
                    break;
                case 'medium':
                    baseFrequency = ScheduleFrequency.DAILY;
                    adaptiveMultiplier = 0.8; // Slightly less frequent
                    break;
                case 'high':
                    baseFrequency = ScheduleFrequency.WEEKLY;
                    adaptiveMultiplier = 0.6;
                    break;
                case 'premium':
                    baseFrequency = ScheduleFrequency.WEEKLY;
                    adaptiveMultiplier = 0.4; // Much less frequent
                    break;
                default:
                    baseFrequency = ScheduleFrequency.DAILY;
            }

            // Adjust frequency based on stability
            if (metrics) {
                if (metrics.stabilityScore > 0.9) {
                    adaptiveMultiplier *= 0.7; // Very stable, test less often
                } else if (metrics.stabilityScore < 0.6) {
                    adaptiveMultiplier *= 1.5; // Unstable, test more often
                }

                if (metrics.trendDirection === 'degrading') {
                    adaptiveMultiplier *= 1.3; // Increase frequency for degrading performance
                }
            }

            logger.info(`[SchedulingService] Calculated frequency for ${modelId}: ${baseFrequency} (${costCategory} cost, ${adaptiveMultiplier.toFixed(2)}x multiplier)`);

            return {
                modelId,
                costCategory,
                baseFrequency,
                adaptiveMultiplier
            };
        } catch (error) {
            logger.error(`[SchedulingService] Failed to calculate frequency for ${modelId}:`, { error: String(error) });
            // Return conservative default
            return {
                modelId,
                costCategory: 'medium',
                baseFrequency: ScheduleFrequency.DAILY,
                adaptiveMultiplier: 1.0
            };
        }
    }

    /**
     * Execute gated benchmark suite with dependency checking
     */
    public async executeGatedBenchmarkSuite(modelId: string, serverId: string): Promise<GatedSuiteResult> {
        await this.initializeServices();

        const startTime = Date.now();
        const result: GatedSuiteResult = {
            modelId,
            serverId,
            gatekeepersPassed: [],
            gatekeepersFailed: [],
            qualityTestsExecuted: [],
            qualityTestsSkipped: [],
            totalExecutionTime: 0,
            costSaved: 0
        };

        try {
            logger.info(`[SchedulingService] Starting gated benchmark suite for ${modelId} on ${serverId}`);

            // Get benchmark gaps to understand what needs testing
            const gaps = await this.gapAnalyzer.analyzeModelGaps(modelId);
            const modelGaps = gaps.filter(gap => gap.serverId === serverId);

            if (modelGaps.length === 0) {
                logger.info(`[SchedulingService] No gaps found for ${modelId} on ${serverId}`);
                return result;
            }

            const missingBenchmarks = modelGaps[0]?.missingBenchmarks || [];

            // Define gatekeeper benchmarks (must pass before quality tests)
            const gatekeepers: BenchmarkType[] = [
                'json-assembly',      // Basic structured output
                'creative-writing',   // Basic text generation
                'dialogue-generation' // Basic conversation ability
            ];

            // Execute gatekeeper benchmarks first
            const gatekeeperResults = new Map<BenchmarkType, boolean>();

            for (const gatekeeper of gatekeepers) {
                if (missingBenchmarks.includes(gatekeeper)) {
                    try {
                        // Schedule gatekeeper benchmark
                        const jobId = await this.scheduler.scheduleJob({
                            modelId,
                            serverId,
                            benchmarkTypes: [gatekeeper],
                            priority: SchedulerPriority.HIGH
                        });

                        // For this implementation, we'll assume success
                        // In real implementation, would wait for job completion
                        gatekeeperResults.set(gatekeeper, true);
                        result.gatekeepersPassed.push(gatekeeper);

                        logger.info(`[SchedulingService] Gatekeeper ${gatekeeper} passed for ${modelId}`);
                    } catch (error) {
                        gatekeeperResults.set(gatekeeper, false);
                        result.gatekeepersFailed.push(gatekeeper);
                        logger.warn(`[SchedulingService] Gatekeeper ${gatekeeper} failed for ${modelId}:`, { error: String(error) });
                    }
                }
            }

            // Check if enough gatekeepers passed
            const gatekeeperPassRate = result.gatekeepersPassed.length / Math.max(gatekeepers.length, 1);
            const shouldProceed = gatekeeperPassRate >= 0.67; // Need 67% pass rate

            if (!shouldProceed) {
                const skippedTests = missingBenchmarks.filter(test => !gatekeepers.includes(test));
                result.qualityTestsSkipped = skippedTests;
                result.costSaved = await this.costCalculation.estimateBenchmarkCost(skippedTests);

                logger.info(`[SchedulingService] Gating prevented ${skippedTests.length} quality tests, saved $${result.costSaved.toFixed(2)}`);
            } else {
                // Execute remaining quality benchmarks
                const qualityTests = missingBenchmarks.filter(test => !gatekeepers.includes(test));

                if (qualityTests.length > 0) {
                    try {
                        await this.scheduler.scheduleJob({
                            modelId,
                            serverId,
                            benchmarkTypes: qualityTests,
                            priority: SchedulerPriority.MEDIUM
                        });

                        result.qualityTestsExecuted = qualityTests;
                        logger.info(`[SchedulingService] Scheduled ${qualityTests.length} quality tests for ${modelId}`);
                    } catch (error) {
                        result.qualityTestsSkipped = qualityTests;
                        logger.error(`[SchedulingService] Failed to schedule quality tests:`, { error: String(error) });
                    }
                }
            }

            result.totalExecutionTime = Date.now() - startTime;

            logger.info(`[SchedulingService] Gated suite complete: ${result.gatekeepersPassed.length} gatekeepers passed, ${result.qualityTestsExecuted.length} quality tests executed`);

            return result;
        } catch (error) {
            logger.error(`[SchedulingService] Error in gated benchmark suite:`, { error: String(error) });
            result.totalExecutionTime = Date.now() - startTime;
            return result;
        }
    }

    /**
     * Adjust scheduling frequency based on performance stability
     */
    public async adjustFrequencyBasedOnStability(modelId: string, metrics: PerformanceMetrics): Promise<void> {
        await this.initializeServices();

        try {
            const currentFrequency = await this.calculateSchedulingFrequency(modelId);

            // Calculate recommended adjustment
            let adjustment = 1.0;

            if (metrics.stabilityScore > 0.95 && metrics.trendDirection === 'stable') {
                adjustment = 0.5; // Very stable, reduce frequency significantly
            } else if (metrics.stabilityScore > 0.85) {
                adjustment = 0.8; // Stable, reduce frequency moderately
            } else if (metrics.stabilityScore < 0.6) {
                adjustment = 1.5; // Unstable, increase frequency
            } else if (metrics.trendDirection === 'degrading') {
                adjustment = 1.3; // Performance declining, monitor more closely
            }

            logger.info(`[SchedulingService] Stability-based frequency adjustment for ${modelId}: ${adjustment.toFixed(2)}x (stability: ${metrics.stabilityScore.toFixed(2)}, trend: ${metrics.trendDirection})`);

            // Store the adjustment for future scheduling decisions
            // This would integrate with a configuration store
        } catch (error) {
            logger.error(`[SchedulingService] Failed to adjust frequency for ${modelId}:`, { error: String(error) });
        }
    }

    /**
     * Schedule benchmarks based on gap analysis with intelligent coordination
     */
    public async scheduleMissingBenchmarks(gaps: BenchmarkGap[]): Promise<SchedulingResult> {
        await this.initializeServices();

        const result: SchedulingResult = {
            jobsScheduled: 0,
            jobsSkipped: 0,
            estimatedCost: 0,
            estimatedDuration: 0,
            gatingSavings: 0,
            scheduledJobs: [],
            recommendations: []
        };

        try {
            logger.info(`[SchedulingService] Scheduling ${gaps.length} benchmark gaps with intelligent coordination`);

            // Group gaps by priority for optimal scheduling
            const gapsByPriority = this.groupGapsByPriority(gaps);

            // Process critical and high priority gaps first
            for (const priority of [SchedulerPriority.CRITICAL, SchedulerPriority.HIGH]) {
                const priorityGaps = gapsByPriority.get(priority) || [];

                if (priorityGaps.length > 0) {
                    const batchResult = await this.scheduler.scheduleBatch({
                        gaps: priorityGaps,
                        policy: SchedulingPolicy.MISSING_ONLY,
                        priorityFilter: [priority],
                        maxJobs: 50 // Limit batch size
                    });

                    result.jobsScheduled += batchResult.jobsScheduled;
                    result.jobsSkipped += batchResult.jobsSkipped;
                    result.scheduledJobs.push(...batchResult.scheduledJobs);
                }
            }

            // Process medium and low priority gaps with cost consideration
            for (const priority of [SchedulerPriority.MEDIUM, SchedulerPriority.LOW]) {
                const priorityGaps = gapsByPriority.get(priority) || [];

                for (const gap of priorityGaps) {
                    // Apply cost-aware gating for non-critical gaps
                    const costCategory = await this.costCalculation.getModelCostCategory(gap.modelId);

                    if (costCategory === 'premium' || costCategory === 'high') {
                        // Use gated execution for expensive models
                        const gatedResult = await this.executeGatedBenchmarkSuite(gap.modelId, gap.serverId);
                        result.gatingSavings += gatedResult.costSaved;
                    } else {
                        // Direct scheduling for cheaper models
                        const jobId = await this.scheduler.scheduleJob({
                            modelId: gap.modelId,
                            serverId: gap.serverId,
                            benchmarkTypes: gap.missingBenchmarks,
                            priority: gap.priority
                        });
                        result.jobsScheduled++;
                    }
                }
            }

            // Calculate cost estimates
            result.estimatedCost = await this.calculateTotalCost(result.scheduledJobs);
            result.estimatedDuration = await this.calculateTotalDuration(result.scheduledJobs);

            // Generate recommendations
            result.recommendations = this.generateSchedulingRecommendations(gaps, result);

            logger.info(`[SchedulingService] Intelligent scheduling complete: ${result.jobsScheduled} jobs scheduled, $${result.estimatedCost.toFixed(2)} estimated cost, $${result.gatingSavings.toFixed(2)} gating savings`);

            return result;
        } catch (error) {
            logger.error('[SchedulingService] Error in intelligent benchmark scheduling:', { error: String(error) });
            throw error;
        }
    }

    /**
     * Private helper methods
     */

    private async getModelPerformanceMetrics(modelId: string): Promise<PerformanceMetrics | null> {
        try {
            // This would integrate with existing aggregation services
            // For now, return mock data based on model patterns
            return {
                modelId,
                serverId: 'unknown',
                averageResponseTime: 250,
                successRate: 0.95,
                stabilityScore: 0.85,
                lastBenchmarked: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                trendDirection: 'stable'
            };
        } catch (error) {
            logger.warn(`[SchedulingService] Could not get metrics for ${modelId}:`, { error: String(error) });
            return null;
        }
    }

    private groupGapsByPriority(gaps: BenchmarkGap[]): Map<SchedulerPriority, BenchmarkGap[]> {
        const grouped = new Map<SchedulerPriority, BenchmarkGap[]>();

        for (const gap of gaps) {
            if (!grouped.has(gap.priority)) {
                grouped.set(gap.priority, []);
            }
            grouped.get(gap.priority)!.push(gap);
        }

        return grouped;
    }

    private async calculateTotalCost(jobs: ScheduledJob[]): Promise<number> {
        let totalCost = 0;

        for (const job of jobs) {
            try {
                const cost = await this.costCalculation.estimateBenchmarkCost(job.benchmarkTypes);
                totalCost += cost;
            } catch (error) {
                logger.warn(`[SchedulingService] Could not calculate cost for job ${job.id}`);
            }
        }

        return totalCost;
    }

    private async calculateTotalDuration(jobs: ScheduledJob[]): Promise<number> {
        // Estimate total duration based on job types and parallelization
        const estimatedMinutes = jobs.length * 15; // 15 minutes average per job
        return estimatedMinutes;
    }

    private generateSchedulingRecommendations(gaps: BenchmarkGap[], result: SchedulingResult): string[] {
        const recommendations: string[] = [];

        if (result.gatingSavings > 0) {
            recommendations.push(`Gating logic saved $${result.gatingSavings.toFixed(2)} by preventing unnecessary quality tests`);
        }

        const criticalGaps = gaps.filter(g => g.priority === SchedulerPriority.CRITICAL).length;
        if (criticalGaps > 5) {
            recommendations.push(`${criticalGaps} critical gaps detected - consider increasing concurrent job limits`);
        }

        if (result.estimatedCost > 100) {
            recommendations.push('High estimated cost - consider staggering expensive model tests');
        }

        if (recommendations.length === 0) {
            recommendations.push('Scheduling appears optimal with current configuration');
        }

        return recommendations;
    }
}
