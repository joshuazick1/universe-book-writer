// ai-server/types/models.ts
/**
 * Model and pipeline types for orchestrator and benchmarking integration.
 *
 * @module types/models
 */

/**
 * Unique identifier for a model.
 * Example: 'ollama-mistral', 'ollama-llama3'
 */
export type ModelId = string;

/**
 * Quality report for a model, used in benchmarking and recommendations.
 */
export interface ModelQualityReport {
    /** Model identifier */
    readonly modelId: ModelId;
    /** Accuracy metric (0-1) */
    readonly accuracy: number;
    /** Latency in ms */
    readonly latency: number;
    /** Throughput (requests/sec or similar) */
    readonly throughput: number;
    /** ISO timestamp of last benchmark */
    readonly lastBenchmarked: string;
}
