/**
 * BullMQ Queue Setup for Distributed RAG Enrichment Pipeline
 *
 * This module initializes the BullMQ queue, scheduler, and provides helpers for job management.
 *
 * @module infrastructure/queue/bullmqQueue
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import { Queue, Worker, JobsOptions, Job as BullJob } from 'bullmq';
import IORedis from 'ioredis';
import type { Job, JobResult } from '../../core/types/queue.js';

/**
 * Redis connection instance for BullMQ
 */
export const redisConnection = new IORedis.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

/**
 * Name of the enrichment job queue
 */
export const ENRICHMENT_QUEUE_NAME = 'enrichment-jobs';

/**
 * BullMQ queue instance for enrichment jobs
 */
export const enrichmentQueue = new Queue(ENRICHMENT_QUEUE_NAME, {
    connection: redisConnection,
});

// QueueScheduler is not available in this BullMQ version or export. Remove for compatibility.

/**
 * Add a job to the enrichment queue (type-safe, with runtime validation).
 * @param name - Job type (e.g., 'summarize', 'entity-extract')
 * @param data - Job payload (must conform to Job interface)
 * @param options - BullMQ job options
 * @returns The created job
 */
export async function addEnrichmentJob(
    name: string,
    data: Job,
    options?: JobsOptions
): Promise<BullJob<Job>> {
    // Basic runtime validation for Job shape
    if (
        !data ||
        typeof data !== 'object' ||
        typeof data.id !== 'string' ||
        typeof data.chunkId !== 'string' ||
        typeof data.type !== 'string' ||
        typeof data.payload !== 'object' ||
        typeof data.version !== 'number'
    ) {
        throw new Error('Invalid Job payload: must conform to Job interface');
    }
    return enrichmentQueue.add(name, data, options);
}

/**
 * Create a worker for the enrichment queue
 * @param processor - Async function to process jobs
 * @returns The BullMQ Worker instance
 * @example
 * createEnrichmentWorker(async (job) => { ... });
 */
export function createEnrichmentWorker(
    processor: (job: BullJob<Job>) => Promise<JobResult | void>
): Worker<Job> {
    return new Worker<Job>(ENRICHMENT_QUEUE_NAME, processor, {
        connection: redisConnection,
    });
}
