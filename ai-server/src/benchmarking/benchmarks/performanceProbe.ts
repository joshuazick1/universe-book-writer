/**
 * Performance Probe Benchmark
 * 
 * Lightweight, high-frequency server health check for benchmarking infrastructure.
 * Used to monitor server liveness, latency, and basic response integrity.
 *
 * @module benchmarks/performanceProbe
 * @version 1.0.0
 * @author VerseForge AI Server
 */

import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'performance' (probe is a performance benchmark)
 * requires: [] (no gating dependencies)
 */
export const performanceProbeBenchmarkMeta = {
    suiteType: 'performance',
    requires: []
} as const;

/**
 * Executes a lightweight health check against the model server.
 * Returns 1 for healthy, 0 for failure, and logs latency.
 *
 * @param serverId - The server identifier hosting the model
 * @param modelId - The model identifier to probe
 * @param timeoutMs - Request timeout in milliseconds (default: 2000)
 * @returns Promise resolving to a score (1 = healthy, 0 = unhealthy)
 */
export async function performanceProbe(
    serverId: string,
    modelId: string,
    timeoutMs = 2000
): Promise<number> {
    const probePrompt = 'ping';
    const start = Date.now();
    try {
        const response = await callModelAPI(serverId, modelId, probePrompt, 1, 1, timeoutMs);
        const latency = Date.now() - start;
        logger.info(`Performance probe for ${modelId}@${serverId}: latency ${latency}ms`);
        if (typeof response === 'string' && response.trim().length > 0) {
            return 1;
        }
        return 0;
    } catch (err) {
        logger.warn(`Performance probe failed for ${modelId}@${serverId}: ${err instanceof Error ? err.message : String(err)}`);
        return 0;
    }
}

/**
 * README
 *
 * Usage:
 *   import { performanceProbe, performanceProbeBenchmarkMeta } from './performanceProbe.js';
 *   await performanceProbe('server-1', 'llama2');
 *
 * Edge Cases:
 *   - Handles timeouts and network errors gracefully.
 *   - Returns 0 for any failure or empty response.
 */
