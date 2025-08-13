/**
 * Benchmark-specific job executors that integrate with the queue system
 * Replaces the legacy benchmarkRunner with queue-aware execution
 */

import { UniversalJob } from 'shared/types/universal-job';
import { JobType } from 'shared/types/universal-job';
import { JobExecutionResult } from '../services/universal-queue.service.js';
import { BenchmarkingManager } from '../benchmarking/BenchmarkingManager.js';
import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { decodeIfBase64 } from '../utils/decodeUtils.js';

export interface JobExecutor {
    execute(job: UniversalJob): Promise<JobExecutionResult>;
}

export class BenchmarkJobExecutor implements JobExecutor {
    async execute(job: UniversalJob): Promise<JobExecutionResult> {
        const startTime = Date.now();

        try {
            let result: any;

            switch (job.type) {
                case JobType.COLD_LATENCY:
                    result = await this.executeColdLatency(job);
                    break;

                case JobType.WARM_LATENCY:
                    result = await this.executeWarmLatency(job);
                    break;

                case JobType.QUALITY_BENCHMARK:
                    result = await this.executeQualityBenchmark(job);
                    break;

                default:
                    throw new Error(`Unsupported benchmark job type: ${job.type}`);
            }

            return {
                jobId: job.id,
                success: true,
                result,
                executionTimeMs: Date.now() - startTime,
                serverId: job.constraints?.serverAffinity || 'unknown'
            };

        } catch (error) {
            return {
                jobId: job.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTimeMs: Date.now() - startTime,
                serverId: job.constraints?.serverAffinity || 'unknown'
            };
        }
    }

    private async executeColdLatency(job: UniversalJob): Promise<any> {
        const { modelId, prompt } = job.payload;
        const serverId = job.constraints?.serverAffinity!;

        // Ensure model is not loaded (cold start)
        await this.ensureModelUnloaded(serverId, modelId);

        // Measure latency
        const startTime = performance.now();
        const response = await this.callModel(serverId, modelId, prompt);
        const latencyMs = performance.now() - startTime;

        return {
            latencyMs,
            response,
            modelId,
            serverId,
            timestamp: new Date().toISOString(),
            benchmarkType: 'cold-latency'
        };
    }

    private async executeWarmLatency(job: UniversalJob): Promise<any> {
        const { modelId, prompt } = job.payload;
        const serverId = job.constraints?.serverAffinity!;

        // Model should already be loaded from previous calls
        const startTime = performance.now();
        const response = await this.callModel(serverId, modelId, prompt);
        const latencyMs = performance.now() - startTime;

        return {
            latencyMs,
            response,
            modelId,
            serverId,
            iteration: this.getIterationFromTags(job.metadata?.tags),
            timestamp: new Date().toISOString(),
            benchmarkType: 'warm-latency'
        };
    }

    private async executeQualityBenchmark(job: UniversalJob): Promise<any> {
        const { modelId, benchmarkType, prompt } = job.payload;
        const serverId = job.constraints?.serverAffinity!;

        // Decode the server ID to get the actual URL
        const decodedServerId = decodeIfBase64(serverId);

        console.log(`[Benchmark] [Quality] Executing ${benchmarkType} for model ${modelId} on server ${decodedServerId}`);
        if (prompt) {
            console.log(`[Benchmark] [Quality] Using custom prompt: ${prompt.substring(0, 100)}...`);
        }

        // Use BenchmarkingManager for dynamic benchmark execution, passing through the prompt
        const result = await BenchmarkingManager.executeBenchmarkType(benchmarkType as BenchmarkType, modelId, decodedServerId, prompt);

        console.log(`[Benchmark] [Quality] Result for ${benchmarkType}: score=${result.score}, rubric=${result.rubric}`);

        return {
            benchmarkType,
            score: result.score,
            modelId,
            serverId: decodedServerId,
            timestamp: result.timestamp,
            type: benchmarkType,
            rubric: result.rubric
        };
    }

    private async ensureModelUnloaded(serverId: string, modelId: string): Promise<void> {
        // Decode the server ID to get the actual URL
        const decodedServerId = decodeIfBase64(serverId);

        try {
            // Call the model management API to unload the model
            const response = await fetch(`http://${decodedServerId}/api/models/${modelId}/unload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`Failed to unload model ${modelId} on server ${decodedServerId}:`, response.statusText);
            }

            // Wait a bit to ensure the model is actually unloaded
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.warn(`Error ensuring model ${modelId} is unloaded on server ${decodedServerId}:`, error);
            // Don't throw - this is not critical for benchmarking
        }
    }

    private async callModel(serverId: string, modelId: string, prompt: string): Promise<string> {
        // Decode the server ID to get the actual URL
        const decodedServerId = decodeIfBase64(serverId);

        try {
            const response = await fetch(`http://${decodedServerId}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelId,
                    prompt: prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.response || '';

        } catch (error) {
            console.error(`Error calling model ${modelId} on server ${decodedServerId}:`, error);
            throw error;
        }
    }

    private getIterationFromTags(tags?: string[]): number {
        if (!tags) return 1;

        for (const tag of tags) {
            const match = tag.match(/iteration-(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }

        return 1;
    }
}

/**
 * Legacy compatibility function - runs benchmarks for a server using queue jobs
 * @deprecated Use BenchmarkJobExecutor with queue system instead
 */
export async function runBenchmarksForServer(
    modelId: string,
    serverId: string,
    types: readonly BenchmarkType[]
): Promise<Record<BenchmarkType, any>> {
    console.warn('[benchmarkRunner] runBenchmarksForServer is deprecated. Use BenchmarkJobExecutor with queue system instead.');

    const executor = new BenchmarkJobExecutor();
    const results: Record<BenchmarkType, any> = {} as Record<BenchmarkType, any>;

    for (const benchmarkType of types) {
        try {
            // Create a dummy job for the legacy function
            const job: UniversalJob = {
                id: `legacy-${Date.now()}-${Math.random()}`,
                type: JobType.QUALITY_BENCHMARK,
                category: 'benchmark' as any,
                modelId,
                payload: { modelId, benchmarkType, prompt: 'Default benchmark prompt' },
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
                    tags: [benchmarkType, 'legacy'],
                    correlationId: `legacy-executor-${benchmarkType}`
                },
                timeout: {
                    executionTimeoutMs: 30000,
                    queueTimeoutMs: 60000
                },
                retryPolicy: {
                    maxRetries: 1,
                    retryDelayMs: 1000,
                    exponentialBackoff: false
                }
            };

            const result = await executor.execute(job);
            if (result.success) {
                results[benchmarkType] = result.result;
            } else {
                results[benchmarkType] = {
                    type: benchmarkType,
                    score: 0,
                    rubric: result.error || 'Unknown error',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            results[benchmarkType] = {
                type: benchmarkType,
                score: 0,
                rubric: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            };
        }
    }

    return results;
}
