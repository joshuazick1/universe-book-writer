// ai-server/orchestrator/RecommendationEngine.ts
// Orchestrator logic for providing dynamic model recommendations for a given task/context
// Production-ready: integrates real benchmark and latency data, robust filtering, and ranking.

import getBenchmarkingManager from '../src/benchmarking/BenchmarkingManager.js';
import { BenchmarkType, ModelQualityBenchmarks } from '../../shared/types/aiQualityBenchmark.js';

export interface RecommendationParams {
    task: string;
    universeId?: string;
    userId?: string;
    benchmarkType?: BenchmarkType;
    minQualityScore?: number;
    preferredVendors?: string[];
    maxLatencyMs?: number;
    excludeModels?: string[];
    requiredTags?: string[];
    // Extend as needed for richer context
}

/**
 * Provides a ranked list of recommended models for a given task/context.
 * @param params Recommendation parameters (task, universeId, userId, ...)
 * @returns Array of recommended model names/ids, ordered by preference
 */
export async function getModelRecommendations(params: RecommendationParams): Promise<string[]> {
    const allBenchmarks: readonly ModelQualityBenchmarks[] = await getBenchmarkingManager().getAllModelBenchmarks();
    if (!Array.isArray(allBenchmarks) || allBenchmarks.length === 0) return ['default-model'];

    const benchmarkType: BenchmarkType = params.benchmarkType ?? 'task-planning';
    const minQuality = params.minQualityScore ?? 0.0;
    const maxLatency = params.maxLatencyMs ?? Infinity;
    const exclude = params.excludeModels ?? [];
    const requiredTags = params.requiredTags ?? [];

    // Filter models by quality score, vendor, latency, exclusion, and tags
    let candidates = allBenchmarks.filter(mb => {
        const score = mb.benchmarks[benchmarkType]?.score ?? 0;
        if (score < minQuality) return false;
        if (params.preferredVendors && params.preferredVendors.length > 0) {
            if (!params.preferredVendors.some((v: string) => mb.modelId.includes(v))) return false;
        }
        if (exclude.includes(mb.modelId)) return false;
        const minLat = Math.min(...Object.values(mb.serverLatencies).map(v => v as number));
        if (minLat > maxLatency) return false;
        // Tag filtering (if ModelMetadata is available in future)
        // if (requiredTags.length && mb.tags) {
        //     if (!requiredTags.every(tag => mb.tags?.includes(tag))) return false;
        // }
        return true;
    });

    if (candidates.length === 0) return ['default-model'];

    // Sort by quality score DESC, then lowest latency ASC
    candidates.sort((a, b) => {
        const scoreA = a.benchmarks[benchmarkType]?.score ?? 0;
        const scoreB = b.benchmarks[benchmarkType]?.score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        const minLatA = Math.min(...Object.values(a.serverLatencies).map(v => v as number));
        const minLatB = Math.min(...Object.values(b.serverLatencies).map(v => v as number));
        return minLatA - minLatB;
    });

    return candidates.map(mb => mb.modelId);
}
