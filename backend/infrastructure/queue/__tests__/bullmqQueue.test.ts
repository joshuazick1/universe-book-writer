/**
 * Unit tests for BullMQ queue setup and job management
 * @see ../../docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import { enrichmentQueue, addEnrichmentJob, createEnrichmentWorker } from '../bullmqQueue.js';
import { QueueEvents } from 'bullmq';
import type { Job, JobResult } from '../../../core/types/queue.js';

describe('BullMQ Queue Infrastructure', () => {
    it('should add a Job to the queue and process it, returning a JobResult', async () => {
        const jobData: Job = {
            id: 'job-1',
            chunkId: 'chunk-1',
            type: 'summarize',
            payload: { text: 'Hello world' },
            version: 1,
        };
        let processedResult: JobResult | undefined;

        // Create a worker that returns a JobResult
        const worker = createEnrichmentWorker(async (job) => {
            expect(job.data).toEqual(jobData);
            processedResult = {
                jobId: job.data.id,
                chunkId: job.data.chunkId,
                type: job.data.type,
                result: { summary: 'Processed: ' + (job.data.payload.text ?? '') },
                status: 'success',
                serverId: 'test-worker',
                receivedAt: new Date().toISOString(),
                isFirst: true,
            };
            return processedResult;
        });

        // Add a job
        const job = await addEnrichmentJob('summarize', jobData);
        expect(job.id).toBeDefined();

        // Wait for job to be processed
        await new Promise<void>((resolve, reject) => {
            const events = new QueueEvents(enrichmentQueue.name, { connection: enrichmentQueue.opts.connection });
            events.on('completed', ({ jobId }) => {
                if (jobId === job.id) {
                    resolve();
                }
            });
            setTimeout(() => reject(new Error('Job not processed in time')), 5000);
        });

        expect(processedResult).toBeDefined();
        expect(processedResult?.status).toBe('success');
        await worker.close();
    });
});
