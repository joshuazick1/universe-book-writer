/**
 * Shared error handling, retry, and job stealing utility for distributed pipeline jobs.
 *
 * Usage: Wrap all job handlers with this function in the orchestrator.
 * Emits SSE events for all job state changes (retry, fail, steal, complete).
 *
 * @module jobErrorHandler
 */
import { emitJobSSEEvent } from './sseEvents.js';

export interface JobHandlerOptions {
    maxRetries?: number;
    retryDelayMs?: number;
    jobStealTimeoutMs?: number;
    version: string;
    sessionId: string;
}

export type JobHandler<T, R = void> = (jobData: T) => Promise<R>;

/**
 * Wraps a job handler with error handling, retry, and job stealing logic.
 * @param handler The job handler function to wrap.
 * @param options Retry and job stealing options.
 */
export function withJobErrorHandling<T, R = void>(
    handler: JobHandler<T, R>,
    options: JobHandlerOptions
): JobHandler<T, R> {
    const {
        maxRetries = 3,
        retryDelayMs = 2000,
        jobStealTimeoutMs = 30000,
        version,
        sessionId,
    } = options;

    return async (jobData: T): Promise<R> => {
        let attempt = 0;
        let lastError: unknown = null;
        let jobStolen = false;
        let jobCompleted = false;
        let result: R | undefined = undefined;
        let stealTimeout: NodeJS.Timeout | null = null;

        // Set up job stealing timeout
        const startStealTimer = (jobId: string) => {
            if (stealTimeout) clearTimeout(stealTimeout);
            stealTimeout = setTimeout(() => {
                jobStolen = true;
                emitJobSSEEvent({
                    jobId: (jobData as any).jobId,
                    sessionId,
                    version,
                    state: 'steal',
                    message: 'Job stolen due to timeout',
                });
                // Orchestrator should reassign the job here
            }, jobStealTimeoutMs);
        };

        try {
            const jobId = (jobData as any).jobId;
            startStealTimer(jobId);
            while (attempt <= maxRetries && !jobStolen) {
                try {
                    result = await handler(jobData);
                    jobCompleted = true;
                    emitJobSSEEvent({
                        jobId,
                        sessionId,
                        version,
                        state: 'complete',
                        attempt,
                    });
                    break;
                } catch (err) {
                    lastError = err;
                    attempt++;
                    if (attempt <= maxRetries) {
                        emitJobSSEEvent({
                            jobId,
                            sessionId,
                            version,
                            state: 'retry',
                            attempt,
                            error: String(err),
                        });
                        await new Promise((res) => setTimeout(res, retryDelayMs));
                    } else {
                        emitJobSSEEvent({
                            jobId,
                            sessionId,
                            version,
                            state: 'fail',
                            attempt,
                            error: String(err),
                        });
                    }
                }
            }
            if (!jobCompleted && !jobStolen) {
                throw lastError;
            }
            return result as R;
        } finally {
            if (stealTimeout) clearTimeout(stealTimeout);
        }
    };
}
