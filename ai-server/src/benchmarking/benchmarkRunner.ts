// ai-server/benchmarking/benchmarkRunner.ts
/**
 * Shared utility to run one or more benchmarks for a model/server pair.
 * Does not persist results. Used by both BenchmarkingManager and manual controller.
 * 
 * LEGACY FILE: Consider using BenchmarkJobExecutor with queue system for new implementations.
 */

import { BenchmarkType, QualityBenchmarkScore } from 'shared/types/aiQualityBenchmark.js';
import { BenchmarkJobExecutor } from '../executors/benchmark-executor.js';
import { UniversalJob, JobType } from 'shared/types/universal-job.js';

/**
 * Runs the requested benchmarks for a given model/server pair.
 * @param modelId - The model to benchmark
 * @param serverId - The server to use
 * @param types - Array of BenchmarkType
 * @returns Record<BenchmarkType, QualityBenchmarkScore>
 * @deprecated Use BenchmarkJobExecutor with queue system for better performance and dependency management
 */
export async function runBenchmarksForServer(
    modelId: string,
    serverId: string,
    types: readonly BenchmarkType[]
): Promise<Record<BenchmarkType, QualityBenchmarkScore>> {
    console.warn('[benchmarkRunner] runBenchmarksForServer is deprecated. Consider using BenchmarkJobExecutor with queue system.');

    const benchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;

    // Use the new executor for consistency, but wrap it for legacy compatibility
    const executor = new BenchmarkJobExecutor();

    for (const type of types) {
        let score = 0;
        let rubric = '';
        let timestamp = new Date().toISOString();

        try {
            // Create a job for the new executor
            const job: UniversalJob = {
                id: `legacy-benchmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: JobType.QUALITY_BENCHMARK,
                category: 'benchmark' as any,
                modelId,
                payload: {
                    modelId,
                    benchmarkType: type,
                    prompt: 'Default benchmark prompt for legacy compatibility'
                },
                priority: 'normal' as any,
                dependencies: [],
                constraints: {
                    serverAffinity: serverId,
                    requiresModel: modelId,
                    canSteal: false,
                    stealable: false
                },
                metadata: {
                    submittedAt: new Date(),
                    tags: [type, 'legacy'],
                    correlationId: `legacy-benchmark-${type}`
                },
                timeout: {
                    executionTimeoutMs: 15 * 60 * 1000, // 15 minutes for CPU inference
                    queueTimeoutMs: 20 * 60 * 1000 // 20 minutes queue timeout
                },
                retryPolicy: {
                    maxRetries: 3,
                    retryDelayMs: 1000,
                    exponentialBackoff: true
                }
            };

            const result = await executor.execute(job);

            if (result.success && result.result) {
                score = result.result.score || 0;
                rubric = result.result.rubric || '';
            } else {
                rubric = result.error || 'Unknown error occurred';
            }

        } catch (err) {
            // Fallback to dynamic benchmark function call for compatibility
            console.warn(`Queue-based execution failed for ${type}, falling back to direct call:`, err);

            try {
                // Convert benchmark type to function name (e.g., 'advanced-code-generation' -> 'evaluateAdvancedCodeGeneration')
                const functionName = type
                    .split('-')
                    .map((part, index) => index === 0 ? 'evaluate' + part.charAt(0).toUpperCase() + part.slice(1) : part.charAt(0).toUpperCase() + part.slice(1))
                    .join('');

                // Dynamically import the benchmark function
                const benchmarkModule = await import('./benchmarks/index.js');
                const fn = (benchmarkModule as any)[functionName];

                if (typeof fn === 'function') {
                    // Pass proper timeout for CPU inference (15 minutes)
                    const result = await fn(modelId, serverId, 15 * 60 * 1000);
                    score = result.score || 0;
                    rubric = result.rubric || '';
                } else {
                    rubric = `Unknown benchmark function: ${functionName}`;
                }
            } catch (directErr) {
                rubric = `Error: ${(directErr instanceof Error ? directErr.message : String(directErr))}`;
            }
        }

        benchmarks[type] = { type, score, rubric, timestamp };
    }

    return benchmarks;
}

/**
 * Queue-aware benchmark runner that integrates with the Universal Queue System
 * @param modelId - The model to benchmark
 * @param serverId - The server to use  
 * @param types - Array of BenchmarkType
 * @returns Promise<Record<BenchmarkType, QualityBenchmarkScore>>
 */
export async function runBenchmarksWithQueue(
    modelId: string,
    serverId: string,
    types: readonly BenchmarkType[]
): Promise<Record<BenchmarkType, QualityBenchmarkScore>> {
    const executor = new BenchmarkJobExecutor();
    const results: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;

    for (const benchmarkType of types) {
        const job: UniversalJob = {
            id: `queue-benchmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: JobType.QUALITY_BENCHMARK,
            category: 'benchmark' as any,
            modelId,
            payload: {
                modelId,
                benchmarkType,
                prompt: 'Queue-based benchmark execution'
            },
            priority: 'normal' as any,
            dependencies: [],
            constraints: {
                serverAffinity: serverId,
                requiresModel: modelId,
                canSteal: false,
                stealable: false
            },
            metadata: {
                submittedAt: new Date(),
                tags: [benchmarkType, 'queue-based'],
                correlationId: `queue-benchmark-${benchmarkType}`
            },
            timeout: {
                executionTimeoutMs: 30000,
                queueTimeoutMs: 60000
            },
            retryPolicy: {
                maxRetries: 3,
                retryDelayMs: 1000,
                exponentialBackoff: true
            }
        };

        const result = await executor.execute(job);

        if (result.success && result.result) {
            results[benchmarkType] = {
                type: benchmarkType,
                score: result.result.score || 0,
                rubric: result.result.rubric || '',
                timestamp: result.result.timestamp || new Date().toISOString()
            };
        } else {
            results[benchmarkType] = {
                type: benchmarkType,
                score: 0,
                rubric: result.error || 'Execution failed',
                timestamp: new Date().toISOString()
            };
        }
    }

    return results;
}
