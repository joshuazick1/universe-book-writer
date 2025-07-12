/**
 * SSE event emitter stub for job state changes.
 * Replace with actual implementation that streams events to clients.
 */

import type { Response } from 'express';
import { withVersion, PIPELINE_API_VERSION } from '../versioning.js';

// In-memory registry of SSE clients, keyed by sessionId (or 'global' for all)
const sseClients: Map<string, Set<Response>> = new Map();

/**
 * Register an SSE client (Express Response) for a session.
 * @param sessionId Session or pipeline run ID
 * @param res Express Response object
 */
export function registerSSEClient(sessionId: string, res: Response) {
    if (!sseClients.has(sessionId)) sseClients.set(sessionId, new Set());
    sseClients.get(sessionId)!.add(res);
}

/**
 * Unregister an SSE client (should be called on close/error)
 */
export function unregisterSSEClient(sessionId: string, res: Response) {
    const set = sseClients.get(sessionId);
    if (set) {
        set.delete(res);
        if (set.size === 0) sseClients.delete(sessionId);
    }
}

/**
 * Broadcast an event to all SSE clients for a session (or all if sessionId is 'global').
 */
function broadcastSSEEvent(sessionId: string, event: object) {
    const targets = sseClients.get(sessionId) || sseClients.get('global');
    if (!targets) return;
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of targets) {
        try {
            res.write(data);
        } catch (e) {
            // Ignore write errors (client may have disconnected)
        }
    }
}

export interface JobSSEEvent {
    jobId: string;
    sessionId: string;
    version: string;
    state: 'retry' | 'fail' | 'steal' | 'complete';
    attempt?: number;
    error?: string;
    message?: string;
}


/**
 * Emit a job SSE event, always attaching version and sessionId.
 * @param event - The event object (must include jobId, sessionId, version, state, ...)
 * @example
 * emitJobSSEEvent({ jobId, sessionId, version, state: 'complete' })
 */
export function emitJobSSEEvent(event: JobSSEEvent): void {
    const versioned = withVersion(
        {
            ...event,
            version: event.version || PIPELINE_API_VERSION,
            sessionId: event.sessionId || 'unknown',
        },
        event.version || PIPELINE_API_VERSION
    );
    broadcastSSEEvent(event.sessionId || 'global', versioned);
}
