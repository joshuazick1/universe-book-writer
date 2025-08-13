/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'performance' (server throughput is a performance benchmark)
 * requires: [] (no gating dependencies)
 */
export const serverThroughputBenchmarkMeta = {
    suiteType: 'performance',
    requires: []
};
/**
 * Server Throughput Measurement
 * Measures throughput by running parallel requests and averaging response times.
 * 
 * @module benchmarks/measureServerThroughput
 * @version 1.0.0
 */

import { logger } from 'shared/logging/logger.js';

/**
 * Measures server throughput using parallel request execution.
 * 
 * @param serverId - The server identifier to measure
 * @param modelId - The model identifier to test
 * @param prompt - The prompt to use for throughput testing
 * @param callModelAPI - The API function to use for making calls
 * @param parallel - Number of parallel requests (default: 5)
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @returns Promise resolving to throughput measurements
 */
export async function measureServerThroughput(
    serverId: string,
    modelId: string,
    prompt: string,
    callModelAPI: (
        serverId: string,
        modelId: string,
        prompt: string,
        timeoutMs?: number
    ) => Promise<string>,
    parallel: number = 5,
    timeoutMs: number = 5 * 60 * 1000
): Promise<{ average: number; all: number[] }> {
    logger.info(`[Benchmark] [Throughput] Measuring throughput for server: ${serverId} with ${parallel} parallel requests`);

    const timings: number[] = [];

    const promises = Array.from({ length: parallel }, async (_, index) => {
        const start = Date.now();
        try {
            await callModelAPI(serverId, modelId, prompt, timeoutMs);
            const duration = Date.now() - start;
            timings.push(duration);
            logger.debug(`Request ${index + 1} completed in ${duration}ms`);
        } catch (err) {
            logger.warn(`Error during throughput measurement request ${index + 1}: ${err instanceof Error ? err.message : String(err)}`);
            timings.push(timeoutMs); // Use timeout as penalty time
        }
    });

    await Promise.all(promises);

    const average = timings.reduce((a, b) => a + b, 0) / timings.length;

    logger.info(`[Benchmark] [Throughput] Average response time: ${average}ms, All timings: [${timings.join(', ')}]ms`);

    return { average, all: timings };
}
