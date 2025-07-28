// ai-server/benchmarking/benchmarkRunner.ts
/**
 * Shared utility to run one or more benchmarks for a model/server pair.
 * Does not persist results. Used by both BenchmarkingManager and manual controller.
 */

import { benchmarkTypeMap } from './benchmarkUtils.js';
import { BenchmarkType, QualityBenchmarkScore } from '../../shared/types/aiQualityBenchmark.js';

/**
 * Runs the requested benchmarks for a given model/server pair.
 * @param modelId - The model to benchmark
 * @param serverId - The server to use
 * @param types - Array of BenchmarkType
 * @returns Record<BenchmarkType, QualityBenchmarkScore>
 */
export async function runBenchmarksForServer(
    modelId: string,
    serverId: string,
    types: readonly BenchmarkType[]
): Promise<Record<BenchmarkType, QualityBenchmarkScore>> {
    const benchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;
    for (const type of types) {
        let score = 0;
        let rubric = '';
        let timestamp = new Date().toISOString();
        try {
            const fn = benchmarkTypeMap[type];
            if (typeof fn === 'function') {
                // Use a default or custom prompt if needed
                score = await fn(modelId, serverId);
                rubric = '';
            } else {
                rubric = 'Unknown benchmark type';
            }
        } catch (err) {
            rubric = `Error: ${(err instanceof Error ? err.message : String(err))}`;
        }
        benchmarks[type] = { type, score, rubric, timestamp };
    }
    return benchmarks;
}
