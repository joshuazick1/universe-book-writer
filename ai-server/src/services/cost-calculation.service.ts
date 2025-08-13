/**
 * Cost Calculation Service
 * 
 * Implements model cost-based scheduling frequency and resource optimization.
 * Provides cost estimation for benchmark operations and intelligent scheduling decisions.
 */

import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { logger } from '../../../shared/logging/logger.js';

/**
 * Model cost categories for scheduling optimization
 */
export type ModelCostCategory = 'low' | 'medium' | 'high' | 'premium';

/**
 * Cost breakdown for benchmark operations
 */
export interface BenchmarkCostBreakdown {
    computeCost: number;        // Server compute time cost
    modelLoadingCost: number;   // Cost to load/initialize model
    storageCost: number;        // Data storage and retrieval cost
    networkCost: number;        // API call overhead
    totalCost: number;          // Sum of all costs
}

/**
 * Model resource utilization profile
 */
export interface ModelResourceProfile {
    modelId: string;
    modelSizeMB: number;
    averageMemoryUsageMB: number;
    averageGPUUtilization: number;
    averageResponseTimeMs: number;
    tokensPerSecond: number;
    costCategory: ModelCostCategory;
}

export class CostCalculationService {
    // Cost per minute of compute time by model category
    private readonly costRates = {
        low: 0.01,      // $0.01/minute - small models
        medium: 0.05,   // $0.05/minute - medium models  
        high: 0.15,     // $0.15/minute - large models
        premium: 0.50   // $0.50/minute - premium/specialized models
    };

    // Benchmark duration estimates (minutes)
    private readonly benchmarkDurations: Record<string, number> = {
        'server-latency': 1,
        'cold-performance': 2,
        'warm-performance': 3,
        'json-assembly': 5,
        'creative-writing': 8,
        'character-consistency': 10,
        'dialogue-generation': 7,
        'plot-coherence': 12,
        'world-building': 15,
        'emotional-depth': 13,
        'typescript-quality': 6,
        'task-planning': 9,
        'style-transfer': 8,
        'long-form-generation': 20,
        'summarization': 5,
        'fact-extraction': 4,
        'content-moderation': 3,
        'permissive-content': 4,
        'advanced-code-generation': 12,
        'node-graph-construction': 8
    };

    constructor() {
        logger.info('[CostCalculationService] Initialized cost calculation service');
    }

    /**
     * Get the cost category for a specific model
     */
    public async getModelCostCategory(modelId: string): Promise<ModelCostCategory> {
        try {
            // Analyze model name patterns to determine cost category
            const modelLower = modelId.toLowerCase();

            // Premium models (specialized/fine-tuned)
            if (modelLower.includes('gpt-4') ||
                modelLower.includes('claude-3') ||
                modelLower.includes('premium') ||
                modelLower.includes('specialized')) {
                return 'premium';
            }

            // High-cost models (large general purpose)
            if (modelLower.includes('llama3:70b') ||
                modelLower.includes('mixtral:8x7b') ||
                modelLower.includes('70b') ||
                modelLower.includes('large')) {
                return 'high';
            }

            // Medium-cost models (standard size)
            if (modelLower.includes('llama3:7b') ||
                modelLower.includes('llama3:8b') ||
                modelLower.includes('7b') ||
                modelLower.includes('8b') ||
                modelLower.includes('13b')) {
                return 'medium';
            }

            // Low-cost models (small/quantized)
            if (modelLower.includes('3b') ||
                modelLower.includes('1b') ||
                modelLower.includes('q4') ||
                modelLower.includes('q8') ||
                modelLower.includes('quantized') ||
                modelLower.includes('small')) {
                return 'low';
            }

            // Default to medium if pattern not recognized
            logger.info(`[CostCalculationService] Unknown model pattern for ${modelId}, defaulting to medium cost`);
            return 'medium';

        } catch (error) {
            logger.error(`[CostCalculationService] Error determining cost category for ${modelId}:`, { error: String(error) });
            return 'medium'; // Safe default
        }
    }

    /**
     * Estimate the cost of running specific benchmarks
     */
    public async estimateBenchmarkCost(benchmarkTypes: BenchmarkType[]): Promise<number> {
        try {
            let totalCost = 0;

            for (const benchmarkType of benchmarkTypes) {
                const duration = this.benchmarkDurations[benchmarkType] || 10; // Default 10 minutes
                const avgRate = (this.costRates.low + this.costRates.medium) / 2; // Average rate for estimation
                totalCost += duration * avgRate;
            }

            logger.debug(`[CostCalculationService] Estimated cost for ${benchmarkTypes.length} benchmarks: $${totalCost.toFixed(3)}`);
            return totalCost;

        } catch (error) {
            logger.error('[CostCalculationService] Error estimating benchmark cost:', { error: String(error) });
            return 0;
        }
    }

    /**
     * Calculate detailed cost breakdown for a model and benchmark set
     */
    public async calculateDetailedCost(
        modelId: string,
        benchmarkTypes: BenchmarkType[]
    ): Promise<BenchmarkCostBreakdown> {
        try {
            const costCategory = await this.getModelCostCategory(modelId);
            const baseRate = this.costRates[costCategory];

            let totalDuration = 0;
            for (const benchmarkType of benchmarkTypes) {
                totalDuration += this.benchmarkDurations[benchmarkType] || 10;
            }

            const computeCost = totalDuration * baseRate;
            const modelLoadingCost = this.calculateModelLoadingCost(costCategory);
            const storageCost = benchmarkTypes.length * 0.001; // $0.001 per benchmark result stored
            const networkCost = benchmarkTypes.length * 0.0005; // $0.0005 per API call

            const totalCost = computeCost + modelLoadingCost + storageCost + networkCost;

            return {
                computeCost,
                modelLoadingCost,
                storageCost,
                networkCost,
                totalCost
            };

        } catch (error) {
            logger.error(`[CostCalculationService] Error calculating detailed cost for ${modelId}:`, { error: String(error) });
            return {
                computeCost: 0,
                modelLoadingCost: 0,
                storageCost: 0,
                networkCost: 0,
                totalCost: 0
            };
        }
    }

    /**
     * Get optimal batch size based on cost efficiency
     */
    public async getOptimalBatchSize(modelId: string): Promise<number> {
        try {
            const costCategory = await this.getModelCostCategory(modelId);

            // Larger batches for cheaper models, smaller for expensive ones
            switch (costCategory) {
                case 'low':
                    return 20; // Can afford larger batches
                case 'medium':
                    return 12;
                case 'high':
                    return 6;
                case 'premium':
                    return 3; // Very small batches for premium models
                default:
                    return 10;
            }

        } catch (error) {
            logger.error(`[CostCalculationService] Error calculating optimal batch size for ${modelId}:`, { error: String(error) });
            return 10; // Safe default
        }
    }

    /**
     * Calculate cost savings from gating logic
     */
    public async calculateGatingSavings(
        modelId: string,
        skippedBenchmarks: BenchmarkType[]
    ): Promise<number> {
        try {
            const costCategory = await this.getModelCostCategory(modelId);
            const breakdown = await this.calculateDetailedCost(modelId, skippedBenchmarks);

            // Add penalty cost for gatekeeper execution
            const gatekeeperCost = await this.calculateDetailedCost(modelId, [
                'json-assembly',
                'creative-writing',
                'dialogue-generation'
            ]);

            const netSavings = breakdown.totalCost - gatekeeperCost.totalCost;

            logger.info(`[CostCalculationService] Gating savings for ${modelId}: $${netSavings.toFixed(3)} (${skippedBenchmarks.length} tests skipped)`);
            return Math.max(0, netSavings); // Never negative savings

        } catch (error) {
            logger.error(`[CostCalculationService] Error calculating gating savings for ${modelId}:`, { error: String(error) });
            return 0;
        }
    }

    /**
     * Get resource profile for a model (for future optimization)
     */
    public async getModelResourceProfile(modelId: string): Promise<ModelResourceProfile> {
        try {
            const costCategory = await this.getModelCostCategory(modelId);

            // Estimate resource usage based on cost category
            let modelSizeMB: number;
            let averageMemoryUsageMB: number;
            let averageGPUUtilization: number;
            let tokensPerSecond: number;

            switch (costCategory) {
                case 'low':
                    modelSizeMB = 2000;
                    averageMemoryUsageMB = 3000;
                    averageGPUUtilization = 0.3;
                    tokensPerSecond = 50;
                    break;
                case 'medium':
                    modelSizeMB = 7000;
                    averageMemoryUsageMB = 8000;
                    averageGPUUtilization = 0.6;
                    tokensPerSecond = 30;
                    break;
                case 'high':
                    modelSizeMB = 35000;
                    averageMemoryUsageMB = 40000;
                    averageGPUUtilization = 0.85;
                    tokensPerSecond = 15;
                    break;
                case 'premium':
                    modelSizeMB = 70000;
                    averageMemoryUsageMB = 80000;
                    averageGPUUtilization = 0.95;
                    tokensPerSecond = 8;
                    break;
                default:
                    modelSizeMB = 7000;
                    averageMemoryUsageMB = 8000;
                    averageGPUUtilization = 0.6;
                    tokensPerSecond = 30;
            }

            return {
                modelId,
                modelSizeMB,
                averageMemoryUsageMB,
                averageGPUUtilization,
                averageResponseTimeMs: 1000 / tokensPerSecond * 20, // Estimate for 20 tokens
                tokensPerSecond,
                costCategory
            };

        } catch (error) {
            logger.error(`[CostCalculationService] Error getting resource profile for ${modelId}:`, { error: String(error) });

            // Return safe defaults
            return {
                modelId,
                modelSizeMB: 7000,
                averageMemoryUsageMB: 8000,
                averageGPUUtilization: 0.6,
                averageResponseTimeMs: 1000,
                tokensPerSecond: 30,
                costCategory: 'medium'
            };
        }
    }

    /**
     * Private helper methods
     */

    private calculateModelLoadingCost(costCategory: ModelCostCategory): number {
        // One-time loading cost based on model size
        const loadingCosts = {
            low: 0.01,     // $0.01 to load small model
            medium: 0.05,  // $0.05 to load medium model
            high: 0.20,    // $0.20 to load large model
            premium: 0.50  // $0.50 to load premium model
        };

        return loadingCosts[costCategory] || 0.05;
    }
}
