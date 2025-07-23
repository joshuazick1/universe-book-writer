/**
 * @fileoverview Types/interfaces for quality judger rubrics, scores, and verdicts.
 * @module core/types/qualityJudger
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */

/**
 * Rubric for a specific task type (summarization, entity extraction, etc.)
 */
export interface TaskRubric {
    readonly taskType: string;
    readonly metrics: readonly RubricMetric[];
}

export interface RubricMetric {
    readonly name: string;
    readonly description: string;
    readonly weight: number; // 0-1, sum to 1 per rubric
    readonly validator: string; // e.g., 'schema', 'regex', 'bleu', 'llm'
    readonly params?: Record<string, unknown>;
}

/**
 * Quality verdict for a job result
 */
export interface QualityVerdict {
    readonly passed: boolean;
    readonly score: number;
    readonly rationale: string;
    readonly details?: Record<string, unknown>;
}

