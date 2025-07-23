/**
 * Queue Selection Logic for Distributed RAG Enrichment
 *
 * This module provides a basic interface for selecting the appropriate queue (or queue group)
 * for a given enrichment job. In this initial implementation, a single queue is used, but this
 * module is designed for future extensibility (e.g., routing to different queues based on job type).
 *
 * @module infrastructure/queue/queueSelection
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import { ENRICHMENT_QUEUE_NAME } from './bullmqQueue.js';

/**
 * Selects the queue name for a given job type and payload.
 * @param jobType - The type of enrichment job (e.g., 'summarize', 'entity-extract')
 * @param payload - The job payload (for future extensibility)
 * @returns The queue name to use
 * @example
 * const queueName = selectQueue('summarize', { chunkId: 'abc123' });
 */
export function selectQueue(jobType: string, payload: Record<string, unknown>): string {
    // For now, always return the main enrichment queue
    // In the future, route based on jobType, payload, or priority
    return ENRICHMENT_QUEUE_NAME;
}
