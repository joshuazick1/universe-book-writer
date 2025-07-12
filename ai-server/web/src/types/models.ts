/**
 * ModelRecommendation
 * Metadata for a model recommendation in the RAG pipeline UI.
 */
export interface ModelRecommendation {
    readonly name: string;
    readonly friendlyName?: string;
    readonly quality?: string; // e.g. "High", "Medium", "Low"
    readonly isRecommended?: boolean;
    readonly description?: string;
}

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

/**
 * General model metadata for selection, display, and orchestration.
 */
export interface ModelMetadata {
    readonly id: ModelId;
    readonly name: string;
    readonly friendlyName?: string;
    readonly description?: string;
    readonly provider?: string;
    readonly tags?: readonly string[];
    readonly qualityReport?: ModelQualityReport;
    readonly isRecommended?: boolean;
    readonly isExperimental?: boolean;
    readonly isDefault?: boolean;
}
