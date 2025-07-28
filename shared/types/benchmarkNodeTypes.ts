/**
 * BenchmarkNode - Node structure for persisting benchmarking results.
 * Used for storing per-server, per-model benchmark results in the node system.
 *
 * @module shared/types/benchmarkNodeTypes
 */
import { BenchmarkType, QualityBenchmarkScore, LatencyMetrics, ThroughputMetrics } from './aiQualityBenchmark.js';

export interface BenchmarkNodeMetadata {
    modelId: string;
    serverId: string;
    runId?: string;
    coldLatency?: number;
    coldQuality?: QualityBenchmarkScore;
    warmLatencies?: number[];
    qualityResults: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>>;
    aggregatedResults?: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>>;
    error?: string;
    startedAt: string;
    completedAt: string;
    /** Health status of the server for this benchmark run ('healthy' | 'unhealthy') */
    health?: 'healthy' | 'unhealthy';
    /** Optional vector embedding for this node's performance summary */
    embeddings?: number[];
    additional?: Record<string, unknown>;
}

export interface BenchmarkNodeInput {
    type: 'model-performance';
    title: string; // e.g., `${modelId}:${serverId}:${runId}`
    metadata: BenchmarkNodeMetadata;
}

export interface BenchmarkNode {
    id: string;
    type: 'model-performance';
    title: string;
    metadata: BenchmarkNodeMetadata;
    createdAt: string;
    updatedAt: string;
}
