/**
 * @fileoverview TypeScript interface for RAG AI Model Node with quality judger integration.
 * @module core/types/ragModelNode
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */

/**
 * Represents a single quality score/verdict for a job processed by a model node.
 */
export interface ModelQualityScore {
    /** The job/result ID this score is for */
    readonly jobId: string;
    /** Numeric score (0-1 or task-specific scale) */
    readonly score: number;
    /** Pass/fail verdict */
    readonly passed: boolean;
    /** Short rationale or explanation */
    readonly rationale: string;
    /** Timestamp when scored */
    readonly scoredAt: string;
    /** Optional: full details/metrics from the quality judger */
    readonly details?: Record<string, unknown>;
}

/**
 * RAG AI Model Node schema (for knowledge graph or DB).
 * Maintains a history of all quality scores/verdicts for analytics and model selection.
 */
export interface RagModelNode {
    /** Unique model/server ID */
    readonly id: string;
    /** Model name/version (e.g., 'TinyLlama-1.1', 'Ollama-v2') */
    readonly modelName: string;
    /** Model type/category (e.g., 'summarizer', 'entity-extractor') */
    readonly modelType: string;
    /** History of all quality scores/verdicts for jobs processed by this model */
    readonly qualityHistory: readonly ModelQualityScore[];
    /** Rolling average score (for fast routing/model selection) */
    readonly rollingAverageScore?: number;
    /** Last updated timestamp */
    readonly lastUpdated: string;
    /** Optional: additional metadata (hardware, config, etc.) */
    readonly metadata?: Record<string, unknown>;
}
