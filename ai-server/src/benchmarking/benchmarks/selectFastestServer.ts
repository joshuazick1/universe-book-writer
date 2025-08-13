/**
 * Fastest Server Selection
 * Utility to select the server with the lowest latency from a list.
 * 
 * @module benchmarks/selectFastestServer
 * @version 1.0.0
 */

import { measureSimpleServerLatency } from './measureSimpleServerLatency.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Selects the fastest server from a list based on latency measurements.
 * 
 * @param servers - Array of server identifiers to test
 * @param modelId - The model identifier to test with
 * @returns Promise resolving to the fastest server identifier
 */
export async function selectFastestServer(
    servers: string[],
    modelId: string
): Promise<string> {
    if (servers.length === 0) {
        throw new Error('No servers provided for selection');
    }

    if (servers.length === 1) {
        return servers[0];
    }

    logger.info(`[Benchmark] Selecting fastest server from ${servers.length} candidates`);

    let fastestServer = servers[0];
    let lowestLatency = Infinity;

    const latencyPromises = servers.map(async (server) => {
        try {
            const latency = await measureSimpleServerLatency(server, modelId);
            logger.debug(`Server ${server} latency: ${latency}ms`);
            return { server, latency };
        } catch (err) {
            logger.warn(`Error measuring latency for server ${server}: ${err instanceof Error ? err.message : String(err)}`);
            return { server, latency: Infinity };
        }
    });

    const results = await Promise.all(latencyPromises);

    for (const { server, latency } of results) {
        if (latency < lowestLatency) {
            lowestLatency = latency;
            fastestServer = server;
        }
    }

    logger.info(`[Benchmark] Selected fastest server: ${fastestServer} (${lowestLatency}ms)`);
    return fastestServer;
}
