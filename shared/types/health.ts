/**
 * Shared health status types for model/server health tracking
 * @module shared/types/health
 * @description Centralized types for health status, params, and health update structures
 * @example
 * import type { HealthStatusParams, HealthStatusUpdate } from './health';
 */

// NOTE: Do not import backend types here; use 'any' or minimal interface for cross-project compatibility

export type HealthStatus = 'unhealthy' | 'healthy';

export interface HealthStatusUpdate {
    status: HealthStatus;
    reason: string;
    unhealthyCount: number;
    baseExpiryMs: number;
    createdTime: Date;
    reportedAt: string;
    lastHealthStatus?: string;
    expiresAt: string;
}

export interface HealthStatusParams {
    ragManager: any; // Backend type, see ai-server/src/rag/manager.js
    benchmarkManager?: any; // Backend type, see ai-server/src/benchmarkManager.js
    serverId: string;
    modelName: string;
    status: HealthStatus;
    reason: string;
    expiryMs?: number;
}
