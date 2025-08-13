/**
 * Benchmark Result Storage Service
 * Handles storing benchmark results to the RAG system as model-performance nodes
 */

import { logger, logToServerFile } from 'shared/logging/logger.js';
import { ensureNode } from 'shared/node/nodeService.js';
import { JobExecutionResult } from './universal-queue.service.js';
import { UniversalJob } from 'shared/types/universal-job';
import { decodeIfBase64 } from '../utils/decodeUtils.js';

export interface BenchmarkResult {
    jobId: string;
    modelId: string;
    serverId: string;
    benchmarkType: string;
    result: any;
    timestamp: string;
    executionTimeMs: number;
}

export class BenchmarkResultStorageService {
    private static instance: BenchmarkResultStorageService;

    public static getInstance(): BenchmarkResultStorageService {
        if (!this.instance) {
            this.instance = new BenchmarkResultStorageService();
        }
        return this.instance;
    }

    /**
     * Store benchmark result in the RAG system
     */
    public async storeBenchmarkResult(
        job: UniversalJob,
        executionResult: JobExecutionResult
    ): Promise<void> {
        try {
            if (!executionResult.success || !executionResult.result) {
                logger.debug(`[BenchmarkStorage] Skipping storage for failed job ${job.id}`);
                return;
            }

            const serverId = job.constraints?.serverAffinity || executionResult.serverId;
            const decodedServerId = decodeIfBase64(serverId);

            logger.info(`[BenchmarkStorage] Storing ${job.type} result for model ${job.modelId} on server ${serverId}`);
            logToServerFile(decodedServerId, 'info', `Storing result for job ${job.id}`, { job, executionResult });

            // Create the benchmark score entry
            const scoreEntry = this.createScoreEntry(job, executionResult);

            // Ensure model-performance node exists and update it with the new score
            const nodeInput = {
                type: 'model-performance',
                title: `${job.modelId}@${decodedServerId}`,
                metadata: {
                    serverId: decodedServerId,
                    modelName: job.modelId,
                    lastBenchmarked: new Date().toISOString()
                },
                scores: [scoreEntry]
            };

            // Get existing node to preserve previous scores
            const existingNode = await this.getExistingModelPerformanceNode(job.modelId, decodedServerId);
            if (existingNode && existingNode.scores) {
                // Add new score to existing scores, avoiding duplicates by runCode
                const existingScores = existingNode.scores.filter((s: any) => s.runCode !== scoreEntry.runCode);
                nodeInput.scores = [...existingScores, scoreEntry];
            }

            const node = await ensureNode(nodeInput);
            logger.info(`[BenchmarkStorage] ✅ Stored ${job.type} result for ${job.modelId} in node ${node.id}`);

        } catch (error) {
            logger.error(`[BenchmarkStorage] Error storing result for job ${job.id}`, { error });
            // Don't throw - benchmark storage failure shouldn't fail the job
        }
    }

    /**
     * Create a score entry from job and execution result
     */
    private createScoreEntry(job: UniversalJob, executionResult: JobExecutionResult): any {
        const timestamp = new Date().toISOString();
        const runCode = this.generateRunCode(job);

        const scoreEntry = {
            runCode,
            timestamp,
            jobType: job.type,
            executionTimeMs: executionResult.executionTimeMs
        };

        // Add type-specific metrics
        switch (job.type) {
            case 'server-latency':
                return {
                    ...scoreEntry,
                    serverLatency: {
                        healthScore: executionResult.result?.healthScore || 0,
                        tagsLatency: executionResult.result?.tagsLatency || 0,
                        versionLatency: executionResult.result?.versionLatency || 0,
                        generateLatency: executionResult.result?.generateLatency || 0
                    }
                };

            case 'cold-performance':
                return {
                    ...scoreEntry,
                    coldLatency: executionResult.result?.timeToFirstToken || executionResult.result?.totalResponseTime || executionResult.executionTimeMs,
                    coldPerformance: {
                        timeToFirstToken: executionResult.result?.timeToFirstToken,
                        totalResponseTime: executionResult.result?.totalResponseTime,
                        tokensGenerated: executionResult.result?.tokensGenerated || 0
                    }
                };

            case 'warm-performance':
                return {
                    ...scoreEntry,
                    warmLatencies: [executionResult.result?.avgResponseTime || executionResult.executionTimeMs],
                    warmPerformance: {
                        avgResponseTime: executionResult.result?.avgResponseTime,
                        tokensPerSecond: executionResult.result?.tokensPerSecond,
                        consistencyScore: executionResult.result?.consistencyScore || 0
                    }
                };

            case 'warmup-test':
                return {
                    ...scoreEntry,
                    warmupTest: {
                        responseTime: executionResult.result?.responseTime || executionResult.executionTimeMs,
                        benchmarkType: job.payload?.benchmarkType,
                        warmupSlot: (job.metadata as any)?.warmupSlot || 1
                    }
                };

            case 'quality-benchmark':
                const qualityResult = {
                    [job.payload?.benchmarkType || 'unknown']: {
                        score: executionResult.result?.score || 0,
                        bleuScore: executionResult.result?.bleuScore,
                        rougeScore: executionResult.result?.rougeScore,
                        rubric: executionResult.result?.rubric
                    }
                };
                return {
                    ...scoreEntry,
                    qualityResults: qualityResult
                };

            default:
                return {
                    ...scoreEntry,
                    genericResult: executionResult.result
                };
        }
    }

    /**
     * Generate a unique run code for this benchmark execution
     */
    private generateRunCode(job: UniversalJob): string {
        const date = new Date().toISOString().split('T')[0];
        const sequence = (job.metadata as any)?.sequence || 'benchmark';
        const order = (job.metadata as any)?.order || 0;
        return `${date}-${sequence}-${order}-${job.id.slice(-8)}`;
    }

    /**
     * Get existing model performance node
     */
    private async getExistingModelPerformanceNode(modelId: string, serverId: string): Promise<any> {
        try {
            // Use direct MongoDB query like missing-benchmark.service.ts does
            const { sharedDatabaseConnection } = await import('../../../shared/database/database.config.js');
            const db = (sharedDatabaseConnection as any).db;
            if (!db) {
                logger.warn('[BenchmarkStorage] MongoDB database connection not initialized');
                return null;
            }

            const collection = db.collection('system_nodes');
            const node = await collection.findOne({
                type: 'model-performance',
                'metadata.serverId': serverId,
                'metadata.modelName': modelId
            });

            return node;
        } catch (error) {
            logger.warn(`[BenchmarkStorage] Could not fetch existing node for ${modelId}@${serverId}: ${error}`);
            return null;
        }
    }
}

// Export singleton instance
export const benchmarkResultStorageService = BenchmarkResultStorageService.getInstance();
