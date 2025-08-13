/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'performance' (simple server latency is a performance benchmark)
 * requires: [] (no gating dependencies)
 */
export const simpleServerLatencyBenchmarkMeta = {
    suiteType: 'performance',
    requires: []
};
/**
 * Simple Server Latency Measurement
 * Measures basic server response time using a simple ping-like request.
 * 
 * @module benchmarks/measureSimpleServerLatency
 * @version 1.0.0
 */

import { logger } from 'shared/logging/logger.js';

/**
 * Measures simple server latency using a basic health check request.
 * 
 * @param serverId - The server identifier to measure
 * @param modelId - The model identifier to test
 * @returns Promise resolving to latency in milliseconds
 */
export async function measureSimpleServerLatency(
    serverId: string,
    modelId: string
): Promise<number> {
    const start = Date.now();
    try {
        // Try different health check endpoints
        const endpoints = [
            `http://${serverId}/api/tags`,
            `http://${serverId}/api/version`,
            `http://${serverId}/health`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });

                if (response.ok) {
                    const latency = Date.now() - start;
                    logger.debug(`Simple latency for ${serverId}: ${latency}ms (endpoint: ${endpoint})`);
                    return latency;
                }
            } catch (endpointErr) {
                // Try next endpoint
                continue;
            }
        }

        // If all endpoints fail, return a high latency value
        logger.warn(`All health check endpoints failed for server: ${serverId}`);
        return Date.now() - start;

    } catch (err) {
        logger.warn(`Error during simple latency measurement for ${serverId}: ${err instanceof Error ? err.message : String(err)}`);
        return Date.now() - start;
    }
}
