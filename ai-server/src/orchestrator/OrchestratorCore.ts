/**
 * OrchestratorCore: Core orchestration logic for AI server registry, routing, and concurrency management.
 *
 * Responsibilities:
 * - Registry of AI servers (add/remove/get)
 * - Request routing and failover
 * - Concurrency management (in-flight tracking, queueing)
 * - Main orchestration logic (tryRequestWithFailover, getBestServerForModel)
 * - Activity tracking
 * - Marking failures and cooldowns
 *
 * Does NOT include health checks, benchmarking, RAG integration, hybrid sync, or shutdown logic.
 *
 * @module OrchestratorCore
 */

import { AIServer, RequestQueueEntry } from '../../../shared/types/aiOrchestratorTypes.js';

/**
 * Core orchestrator class for AI server registry and routing.
 */
export class OrchestratorCore {
    private servers: AIServer[] = [];
    private inFlight: Map<string, number> = new Map();
    private failureCooldown: Map<string, number> = new Map();
    private permanentBan: Set<string> = new Set();
    private cooldownMs = 2 * 60 * 1000; // 2 minutes, configurable
    private lastActivity: number = Date.now();
    private requestQueues: Map<string, RequestQueueEntry<any>[]> = new Map();
    private maxQueueLength = 10;

    /** Call this on any orchestrator activity */
    recordActivity() {
        this.lastActivity = Date.now();
    }

    /** Add a new AI server to the registry */
    addServer(server: Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>) {
        if (this.servers.some(s => s.id === server.id || s.url === server.url)) {
            return;
        }
        this.servers.push({ ...server, healthy: false, lastResponseTime: Infinity, models: [] });
    }

    /** Remove a server by ID */
    removeServer(id: string) {
        this.servers = this.servers.filter(s => s.id !== id);
    }

    /** Get all registered servers (deduplicated by id) */
    getServers(): AIServer[] {
        const seen = new Set<string>();
        const deduped: AIServer[] = [];
        for (const s of this.servers) {
            if (!seen.has(s.id)) {
                deduped.push(s);
                seen.add(s.id);
            }
        }
        return deduped;
    }

    /** Get in-flight request count for a server/model */
    getInFlight(serverId: string, model: string): number {
        return this.inFlight.get(`${serverId}:${model}`) || 0;
    }

    /** Increment in-flight request count for a server/model */
    incrementInFlight(serverId: string, model: string) {
        const key = `${serverId}:${model}`;
        this.inFlight.set(key, (this.inFlight.get(key) || 0) + 1);
    }

    /** Decrement in-flight request count for a server/model */
    decrementInFlight(serverId: string, model: string) {
        const key = `${serverId}:${model}`;
        const val = (this.inFlight.get(key) || 1) - 1;
        if (val <= 0) this.inFlight.delete(key);
        else this.inFlight.set(key, val);
    }

    /** Mark a server/model as failed and start cooldown */
    markFailure(serverId: string, model: string) {
        this.failureCooldown.set(`${serverId}:${model}`, Date.now());
    }

    /** Check if a server/model is in cooldown */
    isInCooldown(serverId: string, model: string): boolean {
        const key = `${serverId}:${model}`;
        const lastFail = this.failureCooldown.get(key);
        if (!lastFail) return false;
        return Date.now() - lastFail < this.cooldownMs;
    }

    /**
     * Enqueue a request for a server/model, or reject if queue is full
     */
    enqueueRequest<T>(serverId: string, model: string, entry: RequestQueueEntry<T>) {
        const key = `${serverId}:${model}`;
        const queue = this.requestQueues.get(key) || [];
        if (queue.length >= this.maxQueueLength) {
            entry.reject({
                status: 429,
                message: `Too many requests for model '${model}' on server '${serverId}'. Please retry later.`,
                retryAfter: 5
            });
            return;
        }
        queue.push(entry);
        this.requestQueues.set(key, queue);
    }

    /**
     * Dequeue and process the next request for a server/model if possible
     */
    async processNextInQueue(serverId: string, model: string) {
        const key = `${serverId}:${model}`;
        const queue = this.requestQueues.get(key);
        if (!queue || queue.length === 0) return;
        const server = this.servers.find(s => s.id === serverId);
        if (!server || !server.healthy) return;
        const max = server.maxConcurrency ?? 4;
        if (this.getInFlight(serverId, model) >= max) return;
        const entry = queue.shift();
        if (queue.length === 0) this.requestQueues.delete(key);
        if (!entry) return;
        this.incrementInFlight(serverId, model);
        try {
            const result = await entry.fn(server);
            this.decrementInFlight(serverId, model);
            entry.resolve(result);
        } catch (err) {
            this.decrementInFlight(serverId, model);
            entry.reject(err);
        } finally {
            this.processNextInQueue(serverId, model);
        }
    }

    /**
     * Find the best server for a given model, considering health, cooldown, concurrency
     * Implements fair load distribution: least-connections, then lowest latency
     * Returns the healthy server with available concurrency
     */
    getBestServerForModel(model: string): AIServer | undefined {
        const candidates = this.servers.filter(s =>
            s.healthy &&
            s.models.includes(model) &&
            !this.isInCooldown(s.id, model) &&
            !this.permanentBan.has(`${s.id}:${model}`)
        ).filter(s => {
            const max = s.maxConcurrency ?? 4;
            return this.getInFlight(s.id, model) < max;
        });
        candidates.sort((a, b) => {
            const inflightA = this.getInFlight(a.id, model);
            const inflightB = this.getInFlight(b.id, model);
            if (inflightA !== inflightB) return inflightA - inflightB;
            // Fallback to lastResponseTime if no benchmark
            return (a.lastResponseTime ?? Infinity) - (b.lastResponseTime ?? Infinity);
        });
        return candidates[0];
    }

    /**
     * Attempt a request, retrying on other servers if needed, with concurrency tracking, queuing, and fair load distribution
     * @param model The model to use
     * @param fn Function to call with (server)
     * @returns The result or throws if all fail or all at max concurrency/queue
     */
    async tryRequestWithFailover<T>(model: string, fn: (server: AIServer) => Promise<T>): Promise<T> {
        const tried: { server: string; error: string }[] = [];
        const candidates = this.servers
            .filter(s =>
                s.healthy &&
                s.models.includes(model) &&
                !this.isInCooldown(s.id, model) &&
                !this.permanentBan.has(`${s.id}:${model}`)
            )
            .sort((a, b) => {
                const inflightA = this.getInFlight(a.id, model);
                const inflightB = this.getInFlight(b.id, model);
                if (inflightA !== inflightB) {
                    return inflightA - inflightB;
                }
                return (a.lastResponseTime ?? Infinity) - (b.lastResponseTime ?? Infinity);
            });

        if (candidates.length === 0) {
            throw new Error(`No healthy servers available for model '${model}'.`);
        }
        for (const server of candidates) {
            const max = server.maxConcurrency ?? 4;
            const currentInFlight = this.getInFlight(server.id, model);
            if (currentInFlight < max) {
                this.incrementInFlight(server.id, model);
                try {
                    const result = await fn(server);
                    this.decrementInFlight(server.id, model);
                    this.processNextInQueue(server.id, model);
                    return result;
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.decrementInFlight(server.id, model);
                    this.processNextInQueue(server.id, model);
                    if (/not enough ram|model not supported|out of memory|permanent/i.test(msg)) {
                        this.permanentBan.add(`${server.id}:${model}`);
                    } else {
                        this.markFailure(server.id, model);
                    }
                    tried.push({ server: server.id, error: msg });
                }
            }
        }
        const best = candidates[0];
        return new Promise<T>((resolve, reject) => {
            this.enqueueRequest<T>(best.id, model, {
                resolve,
                reject,
                fn
            });
        });
    }
}
