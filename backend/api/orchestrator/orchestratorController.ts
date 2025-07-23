/**
 * Orchestrator API Controller
 * Exposes endpoints for worker polling, result submission, and health.
 * @module api/orchestrator/orchestratorController
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import type { Request, Response } from 'express';
import { OrchestratorService } from '../../application/orchestrator/orchestratorService.js';
import type { WorkerInfo } from '../../core/types/orchestrator.js';

const orchestrator = new OrchestratorService();

/**
 * POST /api/orchestrator/register-worker
 * Registers or updates a worker's health and capabilities.
 */
export const registerWorker = (req: Request, res: Response) => {
    try {
        const info: WorkerInfo = req.body;
        orchestrator.registerWorker(info);
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: (e as Error).message });
    }
};

/**
 * POST /api/orchestrator/heartbeat
 * Records a heartbeat for a worker (workerId in body).
 */
export const heartbeat = (req: Request, res: Response) => {
    const { workerId, timestamp } = req.body;
    if (!workerId) {
        res.status(400).json({ error: 'workerId required' });
        return;
    }
    orchestrator.recordHeartbeat(workerId, timestamp);
    res.status(200).json({ ok: true });
};

/**
 * POST /api/orchestrator/poll-job
 * Worker requests a job assignment.
 */
export const pollJob = async (req: Request, res: Response) => {
    const { workerId } = req.body;
    if (!workerId) {
        res.status(400).json({ error: 'workerId required' });
        return;
    }
    const job = await orchestrator.assignJob(workerId);
    if (job) {
        res.status(200).json(job);
    } else {
        res.status(204).send(); // No job available
    }
};

/**
 * POST /api/orchestrator/submit-result
 * Worker submits a job result.
 */
export const submitResult = async (req: Request, res: Response) => {
    try {
        await orchestrator.submitResult(req.body);
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: (e as Error).message });
    }
};

/**
 * GET /api/orchestrator/health
 * Returns orchestrator health/status for monitoring.
 */
export const getHealth = (_req: Request, res: Response) => {
    res.status(200).json(orchestrator.getHealth());
};
