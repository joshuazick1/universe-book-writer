/**
 * ModelRecommendation
 * Metadata for a model recommendation in the RAG pipeline UI.
 * @module shared/types/models
 */
export interface ModelRecommendation {
    readonly name: string;
    readonly friendlyName?: string;
    readonly quality?: string; // e.g. "High", "Medium", "Low"
    readonly isRecommended?: boolean;
    readonly description?: string;
}

export type ModelId = string;

import type { LatencyMetrics, ThroughputMetrics } from './aiQualityBenchmark';

export interface ModelQualityReport {
    readonly modelId: ModelId;
    readonly accuracy: number;
    /**
     * Latency metrics (cold, warm, warmup, all warm times)
     */
    readonly latency: LatencyMetrics;
    /**
     * Throughput metrics (average, all times)
     */
    readonly throughput: ThroughputMetrics;
    readonly lastBenchmarked: string;
}

export interface ModelMetadata {
    readonly id: ModelId;
    readonly name: string;
    readonly description?: string;
    readonly tags?: string[];
    readonly quality?: string;
    readonly isRecommended?: boolean;
}
