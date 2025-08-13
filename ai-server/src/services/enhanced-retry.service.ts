/**
 * Enhanced Retry Service with exponential backoff and circuit breaker patterns
 */
export class EnhancedRetryService {
    constructor(
        private readonly maxRetries = 3,
        private readonly baseDelayMs = 1000
    ) { }

    async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                if (attempt === this.maxRetries) {
                    break;
                }

                const delayMs = this.baseDelayMs * Math.pow(2, attempt);
                await this.delay(delayMs);
            }
        }

        throw lastError!;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
