/**
 * Worker Registry/Health Monitor
 * Tracks available workers, health, and performance.
 * @module application/orchestrator/workerRegistry
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import type { WorkerInfo } from '../../core/types/orchestrator.js';

/**
 * WorkerRegistry manages worker registration, health, and performance metrics.
 * Supports heartbeats, response time tracking, and status updates.
 */
export class WorkerRegistry {
    private workers: Map<string, WorkerInfo> = new Map();
    private readonly heartbeatTimeoutMs: number;

    /**
     * @param heartbeatTimeoutMs - How long (ms) before a worker is considered unresponsive. Default: 30000ms
     */
    constructor(heartbeatTimeoutMs = 30000) {
        this.heartbeatTimeoutMs = heartbeatTimeoutMs;
    }

    /**
     * Register or update a worker's info (full overwrite).
     */
    registerOrUpdateWorker(info: WorkerInfo) {
        this.workers.set(info.id, info);
    }

    /**
     * Record a heartbeat for a worker, updating lastHeartbeat and status.
     * If the worker is new, it must be registered first.
     */
    recordHeartbeat(id: string, timestamp: string = new Date().toISOString()) {
        const worker = this.workers.get(id);
        if (worker) {
            this.workers.set(id, {
                ...worker,
                lastHeartbeat: timestamp,
                status: 'healthy',
            });
        }
    }

    /**
     * Update a worker's average response time (ms).
     */
    updateResponseTime(id: string, responseTimeMs: number) {
        const worker = this.workers.get(id);
        if (worker) {
            this.workers.set(id, {
                ...worker,
                avgResponseTimeMs: responseTimeMs,
            });
        }
    }

    /**
     * Mark a worker as unresponsive/offline.
     */
    markUnresponsive(id: string) {
        const worker = this.workers.get(id);
        if (worker) {
            this.workers.set(id, {
                ...worker,
                status: 'unresponsive',
            });
        }
    }

    /**
     * Remove a worker from the registry.
     */
    removeWorker(id: string) {
        this.workers.delete(id);
    }

    /**
     * Get a worker by ID.
     */
    getWorker(id: string): WorkerInfo | undefined {
        return this.workers.get(id);
    }

    /**
     * Get all workers (optionally filter by status).
     */
    getAllWorkers(status?: WorkerInfo['status']): WorkerInfo[] {
        const all = Array.from(this.workers.values());
        return status ? all.filter(w => w.status === status) : all;
    }

    /**
     * Run a health check on all workers, marking those with stale heartbeats as unresponsive.
     * Should be called periodically by orchestrator.
     */
    checkHealth(now: number = Date.now()) {
        for (const [id, worker] of this.workers.entries()) {
            const last = Date.parse(worker.lastHeartbeat);
            if (isNaN(last) || now - last > this.heartbeatTimeoutMs) {
                this.workers.set(id, {
                    ...worker,
                    status: 'unresponsive',
                });
            }
        }
    }
}
