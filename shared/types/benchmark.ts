/**
 * @fileoverview Shared type definitions for Benchmark entities.
 * @module shared/types/benchmark
 *
 * Defines interfaces and types for benchmarking models and servers.
 *
 * @example
 * import { BenchmarkResult } from 'shared/types/benchmark';
 *
 * @edgecase
 * Handles missing scores and server-specific extensions.
 */

import { TimeSeriesPoint } from 'shared/utils/timeSeries.js';

export interface BenchmarkResult {
    readonly serverId: string;
    readonly modelId: string;
    readonly benchmarks: Record<string, QualityBenchmarkScore>;
}

export interface QualityBenchmarkScore {
    readonly score: number;
    readonly details?: string;
    readonly timestamp: string;
}

export interface BenchmarkMetadata {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly tags: string[];
}

export interface SuiteType {
    readonly suiteId: string;
    readonly suiteName: string;
    readonly benchmarks: BenchmarkMetadata[];
}

export interface GatingDependency {
    readonly dependencyId: string;
    readonly description: string;
    readonly isResolved: boolean;
}

export interface ModelCost {
    readonly modelId: string;
    readonly costPerToken: number;
    readonly maxTokens: number;
}

export interface CostThresholds {
    readonly warningThreshold: number;
    readonly errorThreshold: number;
}

export interface BenchmarkJob {
    readonly jobId: string;
    readonly type: string;
    readonly status: JobStatus;
    readonly scheduleRequest: ScheduleRequest;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScheduleRequest {
    readonly serverId: string;
    readonly modelId: string;
    readonly frequency: FrequencySettings;
}

export interface PerformanceMetrics {
    readonly serverId: string;
    readonly dataPoints: TimeSeriesPoint[];
    readonly latency: number;
    readonly throughput: number;
    readonly errorRate: number;
}

export interface HistoricalData {
    readonly timestamps: string[];
    readonly metrics: PerformanceMetrics[];
}

export interface ServerConfig {
    readonly serverId: string;
    readonly maxJobs: number;
    readonly priority: number;
}

export interface FrequencySettings {
    readonly interval: string;
    readonly maxRetries: number;
}

export interface DashboardStatus {
    readonly activeJobs: number;
    readonly queuedJobs: number;
    readonly serverHealth: ServerHealth;
}

export interface ServerHealth {
    readonly cpuUsage: number;
    readonly memoryUsage: number;
    readonly diskUsage: number;
}

export interface JobProgress {
    readonly jobId: string;
    readonly progressPercentage: number;
}

export interface GatingResult {
    readonly isSuccess: boolean;
    readonly reasons: FailureReason[];
}

export interface FailureReason {
    readonly code: string;
    readonly message: string;
}
