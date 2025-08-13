import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = Router();

// GET /api/queue/status - returns all queue status
// GET /api/queue/status - returns all jobs (pending, active, completed, failed) grouped by server/model
router.get('/status', function (req, res) {
    const orchestrator = getOrchestratorInstance();
    // getQueueStatus now returns all jobs grouped by server/model
    const status = orchestrator.getQueueStatus();
    res.json(status);
});

// GET /api/queue/jobs/:jobId - returns job status by jobId
// GET /api/queue/jobs/:jobId - returns job status by jobId (from allJobs)
router.get('/jobs/:jobId', function (req, res) {
    const orchestrator = getOrchestratorInstance();
    const job = orchestrator.getJobStatus(req.params.jobId);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    res.json(job);
});

export default router;
