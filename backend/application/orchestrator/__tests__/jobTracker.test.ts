/**
 * Unit tests for JobTracker
 */
import { JobTracker } from '../jobTracker.js';
import type { Job, JobResult } from '../../../core/types/queue.js';

describe('JobTracker', () => {
    let tracker: JobTracker;
    beforeEach(() => {
        tracker = new JobTracker();
    });

    it('adds and retrieves a job', () => {
        const job: Job = {
            id: 'j1',
            chunkId: 'c1',
            type: 'summarize',
            payload: { text: 'test' },
            version: 1,
        };
        tracker.addJob(job);
        expect(tracker.getJob('j1')?.job).toEqual(job);
    });

    it('updates job status', () => {
        const job: Job = {
            id: 'j2',
            chunkId: 'c2',
            type: 'summarize',
            payload: { text: 'test' },
            version: 1,
        };
        tracker.addJob(job);
        tracker.updateStatus('j2', 'in-flight');
        expect(tracker.getJob('j2')?.status).toBe('in-flight');
    });

    it('adds a result to a job', () => {
        const job: Job = {
            id: 'j3',
            chunkId: 'c3',
            type: 'summarize',
            payload: { text: 'test' },
            version: 1,
        };
        const result: JobResult = {
            jobId: 'j3',
            chunkId: 'c3',
            type: 'summarize',
            result: { summary: '...' },
            status: 'success',
            serverId: 'w1',
            receivedAt: new Date().toISOString(),
            isFirst: true,
        };
        tracker.addJob(job);
        tracker.addResult('j3', result);
        expect(tracker.getJob('j3')?.results[0]).toEqual(result);
    });
});
