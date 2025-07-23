/**
 * Express router for orchestrator endpoints
 * @module api/orchestrator/routes
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */
import { Router } from 'express';
import { pollJob, submitResult, getHealth, registerWorker, heartbeat } from './orchestratorController.js';

const router = Router();


router.post('/register-worker', registerWorker);
router.post('/heartbeat', heartbeat);
router.post('/poll-job', pollJob);
router.post('/submit-result', submitResult);
router.get('/health', getHealth);

export default router;
