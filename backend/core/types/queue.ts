/**
 * @fileoverview TypeScript interfaces for distributed queue jobs and results in the RAG enrichment pipeline.
 * @module core/types/queue
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */

/**
 * Represents a distributed enrichment job for a document chunk.
 *
 * @example
 * const job: Job = {
 *   id: 'uuid-123',
 *   chunkId: 'chunk-456',
 *   type: 'summarize',
 *   payload: { text: '...' },
 *   version: 2,
 *   metadata: { user: 'alice' },
 *   dependencies: ['job-789']
 * };
 */
/**
 * Distributed enrichment job for a document chunk.
 *
 * @property id - Unique job identifier (UUID recommended)
 * @property chunkId - ID of the document chunk this job operates on
 * @property type - Task type (e.g., 'summarize', 'entity-extract')
 * @property payload - Task-specific payload (e.g., text, parameters)
 * @property metadata - Optional metadata for orchestration, audit, etc.
 * @property version - Version of the chunk for incremental processing
 * @property dependencies - Optional dependencies (job IDs that must complete first)
 *
 * @example
 * const job: Job = {
 *   id: 'uuid-123',
 *   chunkId: 'chunk-456',
 *   type: 'summarize',
 *   payload: { text: '...' },
 *   version: 2,
 *   metadata: { user: 'alice' },
 *   dependencies: ['job-789']
 * };
 */
export interface JobMetadata {
    /** True if this is a benchmark job */
    benchmark?: boolean;
    /** Name of the benchmark suite, if applicable */
    benchmarkSuite?: string;
    /** Arbitrary orchestration/audit metadata */
    [key: string]: unknown;
}

export interface Job {
    /** Unique job identifier (UUID recommended) */
    readonly id: string;
    /** ID of the document chunk this job operates on */
    readonly chunkId: string;
    /** Task type (e.g., 'summarize', 'entity-extract', etc.) */
    readonly type: string;
    /** Task-specific payload (e.g., text, parameters) */
    readonly payload: Record<string, unknown>;
    /** Optional metadata for orchestration, audit, etc. */
    readonly metadata?: JobMetadata;
    /** Version of the chunk for incremental processing */
    readonly version: number;
    /** Optional dependencies (job IDs that must complete first) */
    readonly dependencies?: readonly string[];
}

/**
 * Represents the result of a distributed enrichment job.
 *
 * @property jobId - The job ID this result corresponds to
 * @property chunkId - The chunk ID this result is for
 * @property type - Task type (should match job.type)
 * @property result - Task-specific result (summary, entities, etc.)
 * @property status - 'success' | 'failed' | 'skipped'
 * @property serverId - Worker/model/server that produced this result
 * @property receivedAt - ISO timestamp when result was received
 * @property isFirst - True if this was the first valid result for the job
 *
 * @example
 * const result: JobResult = {
 *   jobId: 'uuid-123',
 *   chunkId: 'chunk-456',
 *   type: 'summarize',
 *   result: { summary: '...' },
 *   status: 'success',
 *   serverId: 'worker-1',
 *   receivedAt: new Date().toISOString(),
 *   isFirst: true
 * };
 */
export interface JobResult {
    /** The job ID this result corresponds to */
    readonly jobId: string;
    /** The chunk ID this result is for */
    readonly chunkId: string;
    /** Task type (should match job.type) */
    readonly type: string;
    /** Task-specific result (summary, entities, etc.) */
    readonly result: unknown;
    /** Status of the job result */
    readonly status: 'success' | 'failed' | 'skipped';
    /** Worker/model/server that produced this result */
    readonly serverId: string;
    /** ISO timestamp when result was received */
    readonly receivedAt: string;
    /** True if this was the first valid result for the job */
    readonly isFirst: boolean;
    /** Optional: Quality score or verdict (if available) */
    readonly qualityScore?: number;
    /** Optional: Quality verdict/rationale (if available) */
    readonly qualityVerdict?: string;
    /** Optional: Details for debugging/analytics */
    readonly details?: Record<string, unknown>;
}
