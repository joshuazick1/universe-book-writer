/**
 * PerformanceAnalytics module for model/server performance calculations
 * @module PerformanceAnalytics
 * @description Provides analytics, scoring, categorization, and helper functions for model/server performance.
 * @example
 * import { PerformanceAnalytics } from './performanceAnalytics';
 * const score = PerformanceAnalytics.estimateQualityScore(benchmark);
 * // See README.md for more usage and edge cases
 */

import type { ServerModelBenchmark } from '../../../shared/types/index.js';

/**
 * PerformanceAnalytics provides static methods for model/server performance analytics
 */
export class PerformanceAnalytics {
    /**
     * Calculate stability score based on performance variance
     */
    static calculateStabilityScore(recentLatencies: number[]): number {
        if (recentLatencies.length < 2) return 0.5;
        const mean = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
        const variance = recentLatencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentLatencies.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;
        return Math.max(0, 1 - coefficientOfVariation);
    }

    /**
     * Estimate quality score based on performance characteristics
     */
    static estimateQualityScore(benchmark: ServerModelBenchmark): number {
        const latencyScore = Math.max(0, 1 - benchmark.latencyMs / 1000);
        const throughputScore = Math.min(1, benchmark.throughput / 10);
        return (latencyScore + throughputScore) / 2;
    }

    static categorizeLatency(latencyMs: number): string {
        if (latencyMs < 100) return 'fast';
        if (latencyMs < 500) return 'moderate';
        return 'slow';
    }

    static categorizeThroughput(throughput: number): string {
        if (throughput > 5) return 'high';
        if (throughput > 2) return 'moderate';
        return 'low';
    }

    static categorizeComplexityFromLatency(latencyMs: number): 'simple' | 'moderate' | 'complex' {
        if (latencyMs < 200) return 'simple';
        if (latencyMs < 800) return 'moderate';
        return 'complex';
    }

    static inferQualityFromThroughput(throughput: number): 'draft' | 'standard' | 'publication' {
        if (throughput > 4) return 'draft';
        if (throughput > 1.5) return 'standard';
        return 'publication';
    }

    static categorizeResourceUsage(latencyMs: number, throughput: number): 'low' | 'medium' | 'high' {
        const resourceScore = latencyMs / throughput;
        if (resourceScore < 100) return 'low';
        if (resourceScore < 300) return 'medium';
        return 'high';
    }

    static isLatencyImproving(recentLatencies: number[]): boolean {
        if (recentLatencies.length < 3) return false;
        const recent = recentLatencies.slice(-3);
        return recent[0] > recent[2];
    }

    static isThroughputConsistent(recentLatencies: number[]): boolean {
        if (recentLatencies.length < 3) return false;
        const variance = PerformanceAnalytics.calculateVariance(recentLatencies);
        const mean = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
        return (variance / mean) < 0.2;
    }

    static countRecentFailures(): number {
        // This would check orchestrator failure logs
        // For now return 0
        return 0;
    }

    static calculateVariance(values: number[]): number {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    }

    static hashToEmbedding(text: string): number[] {
        const hash = PerformanceAnalytics.simpleHash(text);
        const embedding = [];
        for (let i = 0; i < 384; i++) {
            embedding.push(((hash + i) % 1000) / 1000 - 0.5);
        }
        return embedding;
    }

    static simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}
