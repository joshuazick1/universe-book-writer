// orchestrator.types.ts
// Types and interfaces for AI orchestrator

export interface AIServer {
    id: string;
    url: string;
    type: 'ollama' | 'other';
    healthy: boolean;
    lastResponseTime: number;
    models: string[];
    maxConcurrency?: number;
}

export interface ServerModelBenchmark {
    latencyMs: number;
    throughput: number; // requests/sec
    lastTested: number;
    modelLoadTimeMs?: number;
}

export interface RequestQueueEntry<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    fn: (server: AIServer) => Promise<T>;
}
