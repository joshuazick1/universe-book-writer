/**
 * AI Quality Benchmark Types
 * Defines generic benchmark types and scoring rubrics for extensible model evaluation.
 * @module shared/types/aiQualityBenchmark
 */

export type BenchmarkType =
    | 'task-planning'
    | 'json-assembly'
    | 'creative-writing'
    | 'typescript-quality'
    | 'dialogue-generation'
    | 'fact-extraction'
    | 'summarization'
    | 'content-moderation'
    | 'permissive-content'
    | 'style-transfer'
    | 'advanced-code-generation'
    | 'node-graph-construction'
    | 'long-form-generation'
    | 'protocol-compliance';


export interface LatencyMetrics {
    /** Cold start latency (ms) */
    cold: number;
    /** Average warm latency (ms) */
    warmAvg: number;
    /** Warmup time (ms) */
    warmup: number;
    /** All warm latencies (ms) */
    warmAll: number[];
}

export interface ThroughputMetrics {
    /** Average throughput (ms/request) */
    average: number;
    /** All request times (ms) */
    all: number[];
}

export interface QualityBenchmarkScore {
    /** Benchmark type */
    readonly type: BenchmarkType;
    /** Score value (0-1 or rubric-specific) */
    readonly score: number;
    /** Optional rubric details */
    readonly rubric?: string;
    /** ISO timestamp of benchmark */
    readonly timestamp: string;
    /** Optional latency metrics for this benchmark */
    readonly latency?: LatencyMetrics;
    /** Optional throughput metrics for this benchmark */
    readonly throughput?: ThroughputMetrics;
}


export interface ModelQualityBenchmarks {
    /** Model identifier */
    readonly modelId: string;
    /** Map of benchmark type to score */
    readonly benchmarks: Readonly<Record<BenchmarkType, QualityBenchmarkScore>>;
    /** Latency per server (ms) - legacy, for compatibility */
    readonly serverLatencies: Readonly<Record<string, number>>;
    /** Full latency metrics per server */
    readonly serverLatencyDetails?: Readonly<Record<string, LatencyMetrics>>;
    /** Throughput metrics per server */
    readonly serverThroughput?: Readonly<Record<string, ThroughputMetrics>>;
}

/**
 * Example usage:
 * const modelBenchmarks: ModelQualityBenchmarks = {
 *   modelId: 'ollama-mistral',
 *   benchmarks: {
 *     'task-planning': { type: 'task-planning', score: 0.95, timestamp: '2025-07-24T12:00:00Z' },
 *     'json-assembly': { type: 'json-assembly', score: 0.90, timestamp: '2025-07-24T12:00:00Z' },
 *   },
 *   serverLatencies: { 'serverA': 120, 'serverB': 140 }
 * };
 */
