/**
 * Shared types for AI orchestrator modules
 *
 * @module ai-server-types
 */

export interface AIServer {
    id: string;
    url: string;
    type: 'ollama' | 'other';
    healthy: boolean;
    lastResponseTime: number;
    models: string[];
    /** Max concurrent requests allowed for this server (configurable, default 4) */
    maxConcurrency?: number;
}

/**
 * Request queue entry for a server/model
 */
export interface RequestQueueEntry<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    fn: (server: AIServer) => Promise<T>;
}
