/**
 * Error Handling & Retry Policy Abstraction for Pipeline Steps
 *
 * Provides a wrapper to apply consistent error handling, retry, and rollback logic
 * to any PipelineStep. Use this to wrap all distributed/async pipeline steps.
 */

import type { PipelineStep, PipelineContext } from './types.js';

export interface RetryOptions {
    retries?: number; // max attempts (default: 3)
    delayMs?: number; // delay between retries (default: 500)
    backoffFactor?: number; // exponential backoff multiplier (default: 2)
    onRetry?: (err: unknown, attempt: number, context: PipelineContext) => void;
}

/**
 * Wrap a pipeline step with error handling and retry logic.
 * If all retries fail, throws the last error.
 */
export function withStepRetry<Input, Output>(
    step: PipelineStep<Input, Output>,
    options: RetryOptions = {}
): PipelineStep<Input, Output> {
    const {
        retries = 3,
        delayMs = 500,
        backoffFactor = 2,
        onRetry,
    } = options;

    return async (input: Input, context: PipelineContext): Promise<Output> => {
        let attempt = 0;
        let lastErr: unknown = undefined;
        let currentDelay = delayMs;
        while (attempt < retries) {
            try {
                return await step(input, context);
            } catch (err) {
                lastErr = err;
                attempt++;
                context.logger.warn?.(`Pipeline step failed (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
                if (onRetry) onRetry(err, attempt, context);
                if (attempt < retries) {
                    await new Promise(res => setTimeout(res, currentDelay));
                    currentDelay *= backoffFactor;
                }
            }
        }
        context.logger.error?.(`Pipeline step failed after ${retries} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
        // Optionally: trigger rollback or compensation logic here
        throw lastErr;
    };
}

/**
 * Example usage:
 *
 * import { withStepRetry } from './stepErrorHandling';
 *
 * export const safeChunkText = withStepRetry(chunkText, { retries: 4, delayMs: 300 });
 */
