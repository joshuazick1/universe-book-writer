/**
 * API and Event Versioning Utilities for the RAG Pipeline
 *
 * Use these helpers to version pipeline API endpoints, job payloads, and SSE events.
 * Ensures forward compatibility and safe evolution of the distributed pipeline.
 */

/**
 * Current pipeline API version (increment on breaking changes)
 */
export const PIPELINE_API_VERSION = 'v1';

/**
 * Attach version info to a job payload or SSE event
 */
export function withVersion<T extends object>(payload: T, version: string = PIPELINE_API_VERSION): T & { __version: string } {
    return { ...payload, __version: version };
}

/**
 * Extract version from a job payload or SSE event
 */
export function getVersion(payload: any): string {
    return typeof payload === 'object' && payload && typeof payload.__version === 'string'
        ? payload.__version
        : 'v1';
}

/**
 * Example usage:
 *
 * // When enqueuing a job or emitting an SSE event:
 * queue.add('summarizeChunk', withVersion({ chunkId, ... }, 'v1'));
 *
 * // When handling a job or event:
 * const version = getVersion(job.data);
 * if (version === 'v1') { ... }
 */
