/**
 * Benchmark Staleness Detector Service
 * 
 * Service for detecting stale benchmark data requiring re-testing.
 * Implements different staleness thresholds for performance vs quality metrics,
 * tracks benchmark freshness, and schedules appropriate re-testing intervals.
 */

import {
    RetestRecommendation,
    BenchmarkHistory,
    BenchmarkStalenessConfig
} from '../types/scheduler.types.js';
import { getStalenessConfig, isBenchmarkStale } from '../config/scheduler.config.js';
import { logger } from '../../../shared/logging/logger.js';
import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { getNode } from '../../../shared/node/nodeService.js';
import { NodeType, Node } from '../../../shared/types/nodeTypes.js';
import { sharedDatabaseConnection } from '../../../shared/database/database.config.js';

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

export class BenchmarkStalenessDetectorService {
    private config: BenchmarkStalenessConfig;

    constructor() {
        this.config = getStalenessConfig();
    }

    /**
     * Get retest recommendations for all stale benchmarks
     */
    async getRetestRecommendations(): Promise<RetestRecommendation[]> {
        logger.info('[BenchmarkStalenessDetector] Analyzing benchmark staleness...');

        try {
            const recommendations: RetestRecommendation[] = [];

            // Get all model-performance nodes
            const nodes = await getNodes({ type: 'model-performance' as NodeType });
            logger.info(`[BenchmarkStalenessDetector] Analyzing ${nodes.length} model-performance nodes`);

            for (const node of nodes) {
                const nodeRecommendations = await this.analyzeNodeStaleness(node);
                recommendations.push(...nodeRecommendations);
            }

            // Sort by urgency
            const sortedRecommendations = this.sortByUrgency(recommendations);

            logger.info(`[BenchmarkStalenessDetector] Generated ${recommendations.length} retest recommendations`);
            return sortedRecommendations;

        } catch (error) {
            logger.error('[BenchmarkStalenessDetector] Error getting retest recommendations:', String(error) as any);
            return [];
        }
    }

    /**
     * Get retest recommendations for a specific model
     */
    async getModelRetestRecommendations(modelId: string): Promise<RetestRecommendation[]> {
        logger.info(`[BenchmarkStalenessDetector] Analyzing staleness for model: ${modelId}`);

        try {
            const allRecommendations = await this.getRetestRecommendations();
            return allRecommendations.filter(rec => rec.modelId === modelId);
        } catch (error) {
            logger.error(`[BenchmarkStalenessDetector] Error getting model recommendations for ${modelId}:`, String(error) as any);
            return [];
        }
    }

    /**
     * Get retest recommendations for a specific server
     */
    async getServerRetestRecommendations(serverId: string): Promise<RetestRecommendation[]> {
        logger.info(`[BenchmarkStalenessDetector] Analyzing staleness for server: ${serverId}`);

        try {
            const allRecommendations = await this.getRetestRecommendations();
            return allRecommendations.filter(rec => rec.serverId === serverId);
        } catch (error) {
            logger.error(`[BenchmarkStalenessDetector] Error getting server recommendations for ${serverId}:`, String(error) as any);
            return [];
        }
    }

    /**
     * Get staleness report for system overview
     */
    async getStalenessReport(): Promise<{
        totalBenchmarks: number;
        freshBenchmarks: number;
        agingBenchmarks: number;
        staleBenchmarks: number;
        criticalBenchmarks: number;
        avgAge: number;
        oldestBenchmark: {
            serverId: string;
            modelId: string;
            benchmarkType: BenchmarkType;
            ageInDays: number;
        } | null;
        stalenessBreakdown: {
            performance: { fresh: number; stale: number; critical: number };
            quality: { fresh: number; stale: number; critical: number };
            extended: { fresh: number; stale: number; critical: number };
        };
    }> {
        logger.info('[BenchmarkStalenessDetector] Generating staleness report...');

        try {
            const nodes = await getNodes({ type: 'model-performance' as NodeType });

            let totalBenchmarks = 0;
            let freshBenchmarks = 0;
            let agingBenchmarks = 0;
            let staleBenchmarks = 0;
            let criticalBenchmarks = 0;
            let totalAge = 0;
            let oldestBenchmark: any = null;
            let maxAge = 0;

            const stalenessBreakdown = {
                performance: { fresh: 0, stale: 0, critical: 0 },
                quality: { fresh: 0, stale: 0, critical: 0 },
                extended: { fresh: 0, stale: 0, critical: 0 }
            };

            for (const node of nodes) {
                const metadata = node.metadata || {};
                const benchmarks = metadata.benchmarks || {};
                const serverId = metadata.serverId || 'unknown';
                const modelId = metadata.modelName || metadata.modelId || 'unknown';

                for (const [benchmarkType, benchmarkData] of Object.entries(benchmarks)) {
                    if (!benchmarkData || typeof benchmarkData !== 'object') continue;

                    const lastTested = (benchmarkData as any).lastTested || (benchmarkData as any).timestamp;
                    if (!lastTested) continue;

                    totalBenchmarks++;

                    const testDate = new Date(lastTested);
                    const ageInDays = (Date.now() - testDate.getTime()) / (1000 * 60 * 60 * 24);
                    totalAge += ageInDays;

                    // Track oldest benchmark
                    if (ageInDays > maxAge) {
                        maxAge = ageInDays;
                        oldestBenchmark = {
                            serverId,
                            modelId,
                            benchmarkType: benchmarkType as BenchmarkType,
                            ageInDays: Math.round(ageInDays * 10) / 10
                        };
                    }

                    // Determine staleness level
                    const stalenessLevel = this.calculateStalenessLevel(benchmarkType as BenchmarkType, testDate);

                    switch (stalenessLevel) {
                        case 'fresh':
                            freshBenchmarks++;
                            break;
                        case 'aging':
                            agingBenchmarks++;
                            break;
                        case 'stale':
                            staleBenchmarks++;
                            break;
                        case 'critical':
                            criticalBenchmarks++;
                            break;
                    }

                    // Categorize by benchmark type
                    const category = this.getBenchmarkCategory(benchmarkType as BenchmarkType);
                    if (stalenessLevel === 'fresh') stalenessBreakdown[category].fresh++;
                    else if (stalenessLevel === 'stale' || stalenessLevel === 'aging') stalenessBreakdown[category].stale++;
                    else if (stalenessLevel === 'critical') stalenessBreakdown[category].critical++;
                }
            }

            const avgAge = totalBenchmarks > 0 ? totalAge / totalBenchmarks : 0;

            const report = {
                totalBenchmarks,
                freshBenchmarks,
                agingBenchmarks,
                staleBenchmarks,
                criticalBenchmarks,
                avgAge: Math.round(avgAge * 10) / 10,
                oldestBenchmark,
                stalenessBreakdown
            };

            logger.info(`[BenchmarkStalenessDetector] Report complete: ${totalBenchmarks} benchmarks analyzed, ${staleBenchmarks + criticalBenchmarks} need attention`);
            return report;

        } catch (error) {
            logger.error('[BenchmarkStalenessDetector] Error generating staleness report:', String(error) as any);
            throw error;
        }
    }

    /**
     * Check if specific benchmark needs retesting
     */
    async needsRetesting(serverId: string, modelId: string, benchmarkType: BenchmarkType): Promise<boolean> {
        try {
            // Find the node
            const nodes = await getNodes({ type: 'model-performance' as NodeType });
            const node = nodes.find(n => {
                const metadata = n.metadata || {};
                return (metadata.serverId === serverId) &&
                    (metadata.modelName === modelId || metadata.modelId === modelId);
            });

            if (!node) {
                return true; // No node found, needs testing
            }

            const benchmarks = node.metadata?.benchmarks || {};
            const benchmarkData = benchmarks[benchmarkType];

            if (!benchmarkData) {
                return true; // No benchmark data, needs testing
            }

            const lastTested = benchmarkData.lastTested || benchmarkData.timestamp;
            if (!lastTested) {
                return true; // No timestamp, needs testing
            }

            return isBenchmarkStale(benchmarkType, lastTested, this.config);

        } catch (error) {
            logger.error(`[BenchmarkStalenessDetector] Error checking if ${serverId}/${modelId}/${benchmarkType} needs retesting:`, String(error) as any);
            return true; // Error case - assume needs testing
        }
    }

    /**
     * Update staleness configuration
     */
    updateConfig(newConfig: Partial<BenchmarkStalenessConfig>): void {
        this.config = { ...this.config, ...newConfig };
        logger.info('[BenchmarkStalenessDetector] Configuration updated');
    }

    // Private methods

    /**
     * Analyze staleness for a specific node
     */
    private async analyzeNodeStaleness(node: Node): Promise<RetestRecommendation[]> {
        const recommendations: RetestRecommendation[] = [];

        for (const benchmarkKey of Object.keys(node.benchmarks || {})) {
            const benchmark = (node.benchmarks || {})[benchmarkKey];
            if (!benchmark) continue;

            const isStale = isBenchmarkStale(benchmarkKey, benchmark.lastTested || new Date().toISOString(), this.config);
            if (isStale) {
                const lastTested = new Date(benchmark.lastTested || new Date().toISOString());
                const recommendation = this.createRetestRecommendation(
                    node.serverId || 'unknown',
                    node.modelId || 'unknown',
                    benchmarkKey as BenchmarkType,
                    lastTested,
                    benchmark
                );
                if (recommendation) {
                    recommendations.push(recommendation);
                }
            }
        }

        return recommendations;
    }

    /**
     * Calculate urgency for a stale benchmark
     */
    private calculateUrgency(benchmarkType: BenchmarkType, lastTested: Date): 'low' | 'medium' | 'high' | 'critical' {
        const age = Date.now() - lastTested.getTime();
        const ageInHours = age / (1000 * 60 * 60);
        const ageInDays = ageInHours / 24;

        // Determine thresholds based on benchmark type
        let maxAge: number;
        let criticalMultiplier = 1.5;

        if (this.isPerformanceBenchmark(benchmarkType)) {
            maxAge = this.config.performanceMaxAge * 60 * 60 * 1000; // Convert hours to ms
        } else if (this.isQualityBenchmark(benchmarkType)) {
            maxAge = this.config.qualityMaxAge * 24 * 60 * 60 * 1000; // Convert days to ms
        } else {
            maxAge = this.config.extendedMaxAge * 24 * 60 * 60 * 1000; // Convert days to ms
        }

        if (age >= maxAge * criticalMultiplier) return 'critical';
        if (age >= maxAge) return 'high';
        if (age >= maxAge * 0.8) return 'medium';
        return 'low';
    }

    private sortByUrgency(recommendations: RetestRecommendation[]): RetestRecommendation[] {
        const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return recommendations.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);
    }

    private createRetestRecommendation(
        serverId: string,
        modelId: string,
        benchmarkType: BenchmarkType,
        lastTested: Date,
        benchmarkData: any
    ): RetestRecommendation | null {
        const now = new Date();
        const ageInMs = now.getTime() - lastTested.getTime();
        const ageInHours = ageInMs / (1000 * 60 * 60);
        const ageInDays = ageInHours / 24;

        // Determine max age based on benchmark type
        let maxAge: number;
        let ageUnit: 'hours' | 'days';

        if (this.isPerformanceBenchmark(benchmarkType)) {
            maxAge = this.config.performanceMaxAge;
            ageUnit = 'hours';
        } else if (this.isLatencyBenchmark(benchmarkType)) {
            maxAge = this.config.latencyMaxAge;
            ageUnit = 'hours';
        } else if (this.isQualityBenchmark(benchmarkType)) {
            maxAge = this.config.qualityMaxAge;
            ageUnit = 'days';
        } else {
            maxAge = this.config.extendedMaxAge;
            ageUnit = 'days';
        }

        const currentAge = ageUnit === 'hours' ? ageInHours : ageInDays;

        // Determine urgency and recommendation
        let urgency: 'low' | 'medium' | 'high' | 'critical';
        let recommendation: 'schedule_now' | 'schedule_soon' | 'schedule_routine' | 'no_action';
        let nextTestDate: Date;
        let reason: string;

        if (currentAge <= maxAge * 0.5) {
            urgency = 'low';
            recommendation = 'no_action';
            nextTestDate = new Date(now.getTime() + (maxAge * 0.5) * (ageUnit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
            reason = 'Benchmark is still fresh';
        } else if (currentAge <= maxAge * 0.8) {
            urgency = 'low';
            recommendation = 'schedule_routine';
            nextTestDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
            reason = 'Benchmark is aging but not urgent';
        } else if (currentAge <= maxAge) {
            urgency = 'medium';
            recommendation = 'schedule_soon';
            nextTestDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
            reason = 'Benchmark is approaching staleness threshold';
        } else if (currentAge <= maxAge * 1.5) {
            urgency = 'high';
            recommendation = 'schedule_now';
            nextTestDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
            reason = 'Benchmark is stale and needs updating';
        } else {
            urgency = 'critical';
            recommendation = 'schedule_now';
            nextTestDate = new Date(now.getTime() + 60 * 1000); // 1 minute
            reason = 'Benchmark is critically stale and may affect system performance';
        }

        // Create historical performance data
        const historicalPerformance: BenchmarkHistory = {
            serverId,
            modelId,
            benchmarkType,
            testHistory: [{
                timestamp: lastTested,
                score: benchmarkData.score || benchmarkData.result || 0,
                duration: benchmarkData.duration || 0,
                jobId: benchmarkData.jobId || 'unknown'
            }],
            averageScore: benchmarkData.score || benchmarkData.result || 0,
            scoreVariance: 0,
            averageDuration: benchmarkData.duration || 0,
            lastTested,
            testCount: 1,
            stalenessLevel: this.calculateStalenessLevel(benchmarkType, lastTested)
        };

        return {
            serverId,
            modelId,
            benchmarkType,
            currentAge: Math.round(currentAge * 10) / 10,
            maxAge,
            urgency,
            recommendation,
            nextTestDate,
            reason,
            historicalPerformance
        };
    }

    private calculateStalenessLevel(benchmarkType: BenchmarkType, lastTested: Date): 'fresh' | 'aging' | 'stale' | 'critical' {
        const now = new Date();
        const ageInMs = now.getTime() - lastTested.getTime();
        const ageInHours = ageInMs / (1000 * 60 * 60);
        const ageInDays = ageInHours / 24;

        let maxAge: number;
        let currentAge: number;

        if (this.isPerformanceBenchmark(benchmarkType) || this.isLatencyBenchmark(benchmarkType)) {
            maxAge = this.isPerformanceBenchmark(benchmarkType) ? this.config.performanceMaxAge : this.config.latencyMaxAge;
            currentAge = ageInHours;
        } else if (this.isQualityBenchmark(benchmarkType)) {
            maxAge = this.config.qualityMaxAge;
            currentAge = ageInDays;
        } else {
            maxAge = this.config.extendedMaxAge;
            currentAge = ageInDays;
        }

        if (currentAge <= maxAge * 0.5) return 'fresh';
        if (currentAge <= maxAge) return 'aging';
        if (currentAge <= maxAge * 1.5) return 'stale';
        return 'critical';
    }

    private isPerformanceBenchmark(benchmarkType: BenchmarkType): boolean {
        // Note: Performance benchmarks in this system relate to model quality/speed
        return ['typescript-quality', 'advanced-code-generation'].includes(benchmarkType);
    }

    private isLatencyBenchmark(benchmarkType: BenchmarkType): boolean {
        // Note: There's no specific latency benchmark type in the current system
        // This would be used for server response time measurements
        return false;
    }

    private isQualityBenchmark(benchmarkType: BenchmarkType): boolean {
        return ['creative-writing', 'character-consistency',
            'dialogue-generation', 'plot-coherence', 'json-assembly', 'task-planning'].includes(benchmarkType);
    }

    private getBenchmarkCategory(benchmarkType: BenchmarkType): 'performance' | 'quality' | 'extended' {
        if (this.isPerformanceBenchmark(benchmarkType) || this.isLatencyBenchmark(benchmarkType)) {
            return 'performance';
        }
        if (this.isQualityBenchmark(benchmarkType)) {
            return 'quality';
        }
        return 'extended';
    }
}
