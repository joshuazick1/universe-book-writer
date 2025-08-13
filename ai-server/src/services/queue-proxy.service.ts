/**
 * Transparent proxy that maintains exact API compatibility
 */
import { UniversalQueueService } from './universal-queue.service.js';
import { UniversalJob } from '../../../shared/types/universal-job.js';

export class QueueProxyService {
    private queueService: UniversalQueueService;

    constructor(queueService: UniversalQueueService) {
        this.queueService = queueService;
    }

    /**
     * Submits a job to the queue and returns the result.
     * @param job - The job to submit.
     * @returns The result of the job submission.
     */
    async submitJob(job: UniversalJob): Promise<any> {
        console.log('Submitting job through proxy:', job);
        return this.queueService.submitJob(job);
    }

    /**
     * Retrieves the status of a job by ID.
     * @param jobId - The ID of the job to retrieve.
     * @returns The status of the job.
     */
    async getJobStatus(jobId: string): Promise<any> {
        console.log('Fetching job status through proxy for job ID:', jobId);
        return this.queueService.getJobStatus(jobId);
    }

    /**
     * Handles incoming requests and provides transparent API compatibility.
     * @param requestBody - The body of the incoming request.
     * @returns The result of the handled request.
     */
    async handleRequest(requestBody: any): Promise<any> {
        // Implementation for transparent API compatibility
    }
}
