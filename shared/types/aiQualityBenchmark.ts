/**
 * AI Quality Benchmark Types
 * Defines generic benchmark types and scoring rubrics for extensible model evaluation.
 * @module shared/types/aiQualityBenchmark
 */

export type BenchmarkType = 'task-planning' | 'json-assembly' | 'creative-writing' | 'typescript-quality';

export interface QualityBenchmarkScore {
    /** Benchmark type */
    readonly type: BenchmarkType;
    /** Score value (0-1 or rubric-specific) */
    readonly score: number;
    /** Optional rubric details */
    readonly rubric?: string;
    /** ISO timestamp of benchmark */
    readonly timestamp: string;
}

export interface ModelQualityBenchmarks {
    /** Model identifier */
    readonly modelId: string;
    /** Map of benchmark type to score */
    readonly benchmarks: Readonly<Record<BenchmarkType, QualityBenchmarkScore>>;
    /** Latency per server (ms) */
    readonly serverLatencies: Readonly<Record<string, number>>;
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
