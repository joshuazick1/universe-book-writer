/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'performance' (server latency is a performance benchmark)
 * requires: [] (no gating dependencies)
 */
export const serverLatenciesBenchmarkMeta = {
    suiteType: 'performance',
    requires: []
};
/**
 * Server Latency Measurement
 * Measures cold and warm latency for model inference on specific servers.
 * 
 * @module benchmarks/measureServerLatencies
 * @version 1.0.0
 */

import { logger } from 'shared/logging/logger.js';

/**
 * Measures server latencies including cold start and warm request times.
 * 
 * @param serverId - The server identifier to measure
 * @param modelId - The model identifier to test
 * @param prompt - The prompt to use for latency testing
 * @param callModelAPI - The API function to use for making calls
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @returns Promise resolving to latency measurements
 */
export async function measureServerLatencies(
    serverId: string,
    modelId: string,
    prompt: string,
    callModelAPI: (
        serverId: string,
        modelId: string,
        prompt: string,
        maxRetries?: number,
        baseDelayMs?: number,
        timeoutMs?: number,
        temperature?: number
    ) => Promise<string>,
    timeoutMs: number = 5 * 60 * 1000
): Promise<{ cold: number; warmAvg: number; warmup: number; warmAll: number[] }> {
    logger.info(`[Benchmark] [Latencies] Measuring cold latency for server: ${serverId}`);

    const startCold = Date.now();
    try {
        await callModelAPI(serverId, modelId, prompt, 3, 500, timeoutMs);
    } catch (err) {
        logger.warn('Error during cold latency measurement: ' + (err instanceof Error ? err.message : String(err)));
    }
    const cold = Date.now() - startCold;

    logger.info(`[Benchmark] [Latencies] Cold latency: ${cold}ms`);

    const warmAll: number[] = [];
    for (let i = 0; i < 3; i++) {
        const startWarm = Date.now();
        try {
            await callModelAPI(serverId, modelId, prompt, 3, 500, timeoutMs);
        } catch (err) {
            logger.warn(`Error during warm latency measurement ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
        }
        warmAll.push(Date.now() - startWarm);
    }

    const warmAvg = warmAll.reduce((a, b) => a + b, 0) / warmAll.length;
    const warmup = cold - warmAvg;

    logger.info(`[Benchmark] [Latencies] Warm avg: ${warmAvg}ms, Warmup: ${warmup}ms, Warm all: [${warmAll.join(', ')}]ms`);

    return { cold, warmAvg, warmup, warmAll };
}
