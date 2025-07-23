/**
 * Orchestrator Core Service
 * Handles job assignment, tracking, deduplication, job stealing, and first-response-wins logic.
 * @module application/orchestrator/orchestratorService
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */


import type { Job, JobResult } from '../../core/types/queue.js';
import type { WorkerInfo, OrchestratorState } from '../../core/types/orchestrator.js';
import { WorkerRegistry } from './workerRegistry.js';
import { JobTracker } from './jobTracker.js';
import { QualityJudgerService } from '../quality-judger/QualityJudgerService.js';
// Swap between in-memory and persistent store based on environment
// import { ragModelNodeStore } from '../../infrastructure/ragModelNodeStore.js';
import { ragModelNodeStore } from '../../infrastructure/ragModelNodeStore.persistent.js';
import type { ModelQualityScore } from '../../core/types/ragModelNode.js';


/**
 * OrchestratorService manages distributed job assignment, worker health, deduplication, and result handling.
 * Uses WorkerRegistry and JobTracker for state. In-memory for now; TODO: persist to Redis.
 */
export class OrchestratorService {
    private readonly workers: WorkerRegistry;
    private readonly jobs: JobTracker;
    private readonly qualityJudger: QualityJudgerService;

    constructor() {
        this.workers = new WorkerRegistry();
        this.jobs = new JobTracker();
        this.qualityJudger = new QualityJudgerService();
    }

    /**
     * Register or update a worker's health and capabilities.
     * @param info WorkerInfo
     */
    registerWorker(info: WorkerInfo) {
        this.workers.registerOrUpdateWorker(info);
        // TODO: log registration, update metrics
    }

    /**
     * Record a heartbeat for a worker (updates lastHeartbeat and status).
     * @param workerId string
     * @param timestamp string (optional)
     */
    recordHeartbeat(workerId: string, timestamp?: string) {
        this.workers.recordHeartbeat(workerId, timestamp);
    }

    /**
     * Assign a job to a worker (dynamic assignment, job stealing).
     * Returns the best available job for the worker, or undefined if none.
     * @param workerId string
     */
    /**
     * Assign a job to a worker (dynamic assignment, job stealing, assignment metadata).
     * Tracks assignedWorkerId, startedAt, and increments attempts for robust job handling.
     * @param workerId string
     */
    async assignJob(workerId: string): Promise<Job | undefined> {
        const worker = this.workers.getWorker(workerId);
        if (!worker) return undefined;
        const jobs = this.jobs.getAllJobs();
        const available = jobs.filter(jt => jt.status === 'pending' && worker.capabilities.includes(jt.job.type));
        // Prefer jobs not yet attempted, or least attempts (job stealing)
        const sorted = available.sort((a, b) => a.attempts - b.attempts);
        const jobToAssign = sorted[0];
        if (jobToAssign) {
            this.jobs.updateStatus(jobToAssign.job.id, 'in-flight');
            this.jobs.setAssignedWorker(jobToAssign.job.id, workerId);
            this.jobs.incrementAttempts(jobToAssign.job.id);
            this.jobs.setStartedAt(jobToAssign.job.id, new Date().toISOString());
            // TODO: emit assignment event/metric
            return jobToAssign.job;
        }
        return undefined;
    }

    /**
     * Submit a job result. Handles first-response-wins, deduplication, and late results.
     * @param result JobResult
     */
    /**
     * Submit a job result. Handles first-response-wins, deduplication, and late results.
     * Persists quality scores/verdicts to the corresponding AI model node in the RAG knowledge graph.
     * @param result JobResult
     */
    /**
     * Submit a job result. Handles first-response-wins, deduplication, late results, and retry/failure logic.
     * Persists quality scores/verdicts to the corresponding AI model node in the RAG knowledge graph.
     * Retries or marks jobs as failed if quality is not sufficient.
     * @param result JobResult
     */
    async submitResult(result: JobResult): Promise<void> {
        const jt = this.jobs.getJob(result.jobId);
        if (!jt) return;
        // First-response-wins: if already completed, ignore further results
        if (jt.status === 'completed') {
            // Log late result
            // TODO: emit late result event/metric
            return;
        }
        // Deduplication: check if this worker already submitted
        const already = jt.results.find(r => r.serverId === result.serverId);
        if (already) return;
        // Quality Judger integration: validate result before accepting
        const verdict = await this.qualityJudger.evaluate(result, result.type);
        // Persist quality score/verdict to the model node (RAG knowledge graph)
        const modelId = result.serverId; // Assuming serverId maps to model node id
        const qualityScore: ModelQualityScore = {
            jobId: result.jobId,
            score: verdict.score,
            passed: verdict.passed,
            rationale: verdict.rationale,
            scoredAt: new Date().toISOString(),
            details: verdict.details,
        };
        ragModelNodeStore.addQualityScore(modelId, qualityScore);
        const MAX_ATTEMPTS = 3;
        if (!verdict.passed) {
            // Log failed result, trigger retry/reassignment if under max attempts
            if (jt.attempts < MAX_ATTEMPTS) {
                this.jobs.updateStatus(result.jobId, 'pending');
                // TODO: emit retry event/metric
            } else {
                this.jobs.updateStatus(result.jobId, 'failed');
                // TODO: emit failure event/metric
            }
            return;
        }
        // Accept result, mark as completed on first valid result
        this.jobs.addResult(result.jobId, result);
        this.jobs.updateStatus(result.jobId, 'completed');
        // TODO: handle downstream updates, result routing, error cases
        // TODO: emit completion event/metric
    }

    /**
     * Get orchestrator health/status (for API, monitoring, etc.)
     */
    getHealth(): OrchestratorState {
        return {
            workers: this.workers.getAllWorkers(),
            jobs: this.jobs.getAllJobs(),
            queueLength: this.jobs.getAllJobs().filter(j => j.status === 'pending').length,
            lastUpdated: new Date().toISOString(),
        };
    }

    // TODO: add methods for event-driven updates, persistence, metrics, etc.
}
