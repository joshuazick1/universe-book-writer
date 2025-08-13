/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (style transfer is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const styleTransferBenchmarkMeta = {
  suiteType: 'quality',
  requires: []
};

/**
 * Quality Benchmarks Runner
 * Executes various quality benchmarks for model evaluation.
 * 
 * @module benchmarks/runQualityBenchmarks
 * @version 1.0.0
 */

import { logger } from 'shared/logging/logger.js';
import type { BenchmarkType, QualityBenchmarkScore } from 'shared/types/aiQualityBenchmark.js';
import { evaluateJSONAssembly } from './evaluateJSONAssembly.js';
import { evaluateCreativeWriting } from './evaluateCreativeWriting.js';
import { evaluateTaskPlanning } from './evaluateTaskPlanning.js';
import { evaluateTypescriptQuality } from './evaluateTypescriptQuality.js';

/**
 * Runs quality benchmarks for a given model and server combination.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param types - Array of benchmark types to run
 * @returns Promise resolving to benchmark results
 */
export async function runQualityBenchmarks(
    modelId: string,
    serverId: string,
    types: readonly BenchmarkType[]
): Promise<Record<BenchmarkType, QualityBenchmarkScore>> {
    const results: Record<string, QualityBenchmarkScore> = {};

    logger.info(`[Benchmark] Running quality benchmarks for model ${modelId} on server ${serverId}`);

    for (const type of types) {
        try {
            logger.debug(`Running benchmark: ${type}`);
            let score: number = 0;

            switch (type) {
                case 'json-assembly':
                    score = await evaluateJSONAssembly(modelId, serverId);
                    break;
                case 'creative-writing':
                    score = await evaluateCreativeWriting(modelId, serverId);
                    break;
                case 'task-planning':
                    score = await evaluateTaskPlanning(modelId, serverId);
                    break;
                case 'typescript-quality':
                    score = await evaluateTypescriptQuality(modelId, serverId);
                    break;
                default:
                    logger.warn(`Unknown benchmark type: ${type}`);
                    score = 0;
            }

            // Create QualityBenchmarkScore object
            results[type] = {
                type,
                score,
                rubric: `Automated ${type} evaluation`,
                timestamp: new Date().toISOString()
            };

            logger.info(`Benchmark ${type} completed with score: ${score}`);
        } catch (err) {
            logger.error(`Error during quality benchmark for type ${type}: ${err instanceof Error ? err.message : String(err)}`);
            results[type] = {
                type,
                score: 0,
                rubric: `Failed: ${err instanceof Error ? err.message : String(err)}`,
                timestamp: new Date().toISOString()
            };
        }
    }

    return results as Record<BenchmarkType, QualityBenchmarkScore>;
}
