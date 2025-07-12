/**
 * Job Tracker
 * Tracks job status, in-flight/completed/failed, and reassignments.
 * @module application/orchestrator/jobTracker
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import type { Job, JobResult } from '../../core/types/queue.js';
import type { JobTracking } from '../../core/types/orchestrator.js';

export class JobTracker {
    private jobs: Map<string, JobTracking> = new Map();


    addJob(job: Job) {
        this.jobs.set(job.id, {
            job,
            status: 'pending',
            attempts: 0,
            results: [],
            // assignedWorkerId, startedAt, completedAt are optional and undefined by default
        });
    }

    /**
     * Set the assigned worker for a job.
     */
    setAssignedWorker(jobId: string, workerId: string) {
        const jt = this.jobs.get(jobId);
        if (jt) {
            this.jobs.set(jobId, { ...jt, assignedWorkerId: workerId });
        }
    }

    /**
     * Increment the attempts counter for a job.
     */
    incrementAttempts(jobId: string) {
        const jt = this.jobs.get(jobId);
        if (jt) {
            this.jobs.set(jobId, { ...jt, attempts: jt.attempts + 1 });
        }
    }

    /**
     * Set the startedAt timestamp for a job.
     */
    setStartedAt(jobId: string, timestamp: string) {
        const jt = this.jobs.get(jobId);
        if (jt) {
            this.jobs.set(jobId, { ...jt, startedAt: timestamp });
        }
    }

    updateStatus(jobId: string, status: JobTracking['status']) {
        const jt = this.jobs.get(jobId);
        if (jt) {
            this.jobs.set(jobId, { ...jt, status });
        }
    }

    addResult(jobId: string, result: JobResult) {
        const jt = this.jobs.get(jobId);
        if (jt) {
            this.jobs.set(jobId, { ...jt, results: [...jt.results, result] });
        }
    }

    getJob(jobId: string): JobTracking | undefined {
        return this.jobs.get(jobId);
    }

    getAllJobs(): JobTracking[] {
        return Array.from(this.jobs.values());
    }
}
