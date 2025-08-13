/**
 * Service for accessing and managing benchmark performance data
 */

import { TaskType, ModelBenchmarks, TaskTypeMetrics, ModelRanking } from 'shared/types/model-selection';

export interface BenchmarkResult {
    readonly modelId: string;
    readonly taskType: TaskType;
    readonly qualityScore: number;
    readonly latencyMs: number;
    readonly tokensPerSecond: number;
    readonly memoryUsageMB: number;
    readonly timestamp: Date;
}

export class BenchmarkDataService {
    private benchmarks: Map<string, ModelBenchmarks[]> = new Map();
    private taskMetrics: Map<TaskType, TaskTypeMetrics> = new Map();

    async getModelBenchmarks(modelId: string, taskType: TaskType): Promise<ModelBenchmarks | null> {
        const modelBenchmarks = this.benchmarks.get(modelId);
        if (!modelBenchmarks) return null;

        return modelBenchmarks.find(b => b.taskType === taskType) || null;
    }

    async recordBenchmarkResult(result: BenchmarkResult): Promise<void> {
        const benchmark: ModelBenchmarks = {
            modelId: result.modelId,
            taskType: result.taskType,
            qualityScore: result.qualityScore,
            avgLatencyMs: result.latencyMs,
            tokensPerSecond: result.tokensPerSecond,
            memoryUsageMB: result.memoryUsageMB,
            successRate: 1.0, // Assume success if we got a result
            energyEfficiency: 50, // Default value
            lastUpdated: result.timestamp
        };

        const existing = this.benchmarks.get(result.modelId) || [];
        const updated = existing.filter(b => b.taskType !== result.taskType);
        updated.push(benchmark);
        this.benchmarks.set(result.modelId, updated);
    }

    async getTaskTypeMetrics(taskType: TaskType): Promise<TaskTypeMetrics> {
        let metrics = this.taskMetrics.get(taskType);

        if (!metrics) {
            // Calculate metrics from available benchmarks
            const allBenchmarks = Array.from(this.benchmarks.values()).flat();
            const taskBenchmarks = allBenchmarks.filter(b => b.taskType === taskType);

            const avgLatency = taskBenchmarks.reduce((sum, b) =>
                sum + (b.avgLatencyMs || 0), 0) / taskBenchmarks.length || 0;

            const avgQuality = taskBenchmarks.reduce((sum, b) =>
                sum + (b.qualityScore || 0), 0) / taskBenchmarks.length || 0;

            const topModels = taskBenchmarks
                .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
                .slice(0, 5)
                .map(b => b.modelId);

            metrics = {
                taskType,
                averageLatency: avgLatency,
                averageQuality: avgQuality,
                topPerformingModels: topModels,
                benchmarkCount: taskBenchmarks.length
            };

            this.taskMetrics.set(taskType, metrics);
        }

        return metrics;
    }

    async getModelRankings(taskType: TaskType): Promise<ModelRanking[]> {
        const metrics = this.taskMetrics.get(taskType);
        if (!metrics) return [];

        // Simulate rankings based on quality score
        return metrics.topPerformingModels.map((modelId, index) => ({
            modelId,
            rank: index + 1,
            score: 100 - index * 10, // Example scoring
            benchmarkData: {
                modelId,
                taskType,
                qualityScore: 100 - index * 10,
                avgLatencyMs: 50 + index * 5,
                tokensPerSecond: 1000 - index * 50,
                memoryUsageMB: 2000,
                energyEfficiency: 90 - index,
                successRate: 0.99,
                lastUpdated: new Date()
            }
        }));
    }
}
