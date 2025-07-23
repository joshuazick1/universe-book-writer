/**
 * Unit tests for queue selection logic
 * @see ../../docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import { selectQueue } from '../queueSelection.js';
import { ENRICHMENT_QUEUE_NAME } from '../bullmqQueue.js';

describe('Queue Selection', () => {
    it('should return the enrichment queue for any job type', () => {
        expect(selectQueue('summarize', { chunkId: 'abc' })).toBe(ENRICHMENT_QUEUE_NAME);
        expect(selectQueue('entity-extract', { chunkId: 'def' })).toBe(ENRICHMENT_QUEUE_NAME);
    });
});
