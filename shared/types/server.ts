/**
 * Types and interfaces for server information
 */

export type ServerId = string;

export interface ServerInfo {
    readonly id: ServerId;
    readonly baseUrl: string;
    readonly location?: { lat: number; lng: number };
    readonly availableModels: string[];
    readonly loadedModels: string[];
    readonly currentLoad: number;
    readonly queueDepth: number;
    readonly availableMemoryMB: number;
    readonly hasGPU: boolean;
    readonly isHealthy: boolean;
    readonly lastResponseTime: number;
    readonly errorRate: number;
    readonly latencyBenchmark?: number;
}

export interface ServerCapacity {
    readonly maxConcurrentJobs: number;
    readonly currentLoad: number;
    readonly availableModels: string[];
    readonly memoryUsage: number;
    readonly cpuUsage: number;
    readonly gpuUsage?: number;
}

export interface PerformanceMetrics {
    readonly avgResponseTime: number;
    readonly successRate: number;
    readonly throughput: number;
    readonly modelLoadTimes: Map<string, number>;
    readonly recentErrors: ErrorSummary[];
}

export interface ErrorSummary {
    readonly timestamp: Date;
    readonly errorType: string;
    readonly message: string;
    readonly count: number;
}
