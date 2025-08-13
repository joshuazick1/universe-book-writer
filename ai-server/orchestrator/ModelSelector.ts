// ai-server/orchestrator/ModelSelector.ts
// Orchestrator logic for selecting the best model for a given task
// This is a stub implementation. Replace with real logic as needed.

import getBenchmarkingManager from '../src/benchmarking/BenchmarkingManager.js';
import { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';

export interface ModelSelectionParams {
    task: string;
    universeId?: string;
    userId?: string;
    preferredVendors?: string[];
    minQualityScore?: number;
    maxLatencyMs?: number;
    // Add more fields as needed
    benchmarkType?: BenchmarkType;
    preferredServer?: string;
}

/**
 * Selects the best model for a given task using benchmarking data.
 * @param params Model selection parameters (task, universeId, userId, ...)
 * @returns The model name/id to use
 */




/**
 * Selects the best model for a given task using benchmarking data and advanced criteria.
 * @param params Model selection parameters (task, universeId, userId, ...)
 * @returns The model name/id to use
 */

export async function selectBestModel(params: ModelSelectionParams): Promise<string> {
    const allBenchmarks = await getBenchmarkingManager().getAllModelBenchmarks();
    if (!Array.isArray(allBenchmarks) || allBenchmarks.length === 0) return 'default-model';

    // Determine which benchmark type to use for quality
    const benchmarkType: BenchmarkType = params.benchmarkType ?? 'task-planning';
    const minQuality = params.minQualityScore ?? 0.0;
    const maxLatency = params.maxLatencyMs ?? Infinity;

    // Filter models by quality score and vendor preference
    let candidates = allBenchmarks.filter(mb => {
        const score = mb.benchmarks[benchmarkType]?.score ?? 0;
        if (score < minQuality) return false;
        if (params.preferredVendors && params.preferredVendors.length > 0) {
            return params.preferredVendors.some(v => mb.modelId.includes(v));
        }
        return true;
    });

    if (candidates.length === 0) return 'default-model';

    // For each candidate, select the server with lowest latency (unless preferredServer specified)
    candidates = candidates.filter(mb => {
        const latencies = mb.serverLatencies;
        if (params.preferredServer && latencies[params.preferredServer] !== undefined) {
            return latencies[params.preferredServer] <= maxLatency;
        }
        // Otherwise, check if any server meets latency requirement
        return Object.values(latencies).map(v => v as number).some(l => l <= maxLatency);
    });

    if (candidates.length === 0) return 'default-model';

    // Sort by quality score DESC, then lowest latency ASC
    candidates.sort((a, b) => {
        const scoreA = a.benchmarks[benchmarkType]?.score ?? 0;
        const scoreB = b.benchmarks[benchmarkType]?.score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        // Compare lowest latency
        const minLatA = Math.min(...Object.values(a.serverLatencies).map(v => v as number));
        const minLatB = Math.min(...Object.values(b.serverLatencies).map(v => v as number));
        return minLatA - minLatB;
    });

    return candidates.length > 0 ? candidates[0].modelId : 'default-model';
}