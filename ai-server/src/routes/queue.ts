
import { Router, Request, Response, NextFunction } from 'express';
import { universalQueueService } from '../services/universal-queue.service.js';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = Router();


// Middleware to attach orchestrator instance to request
router.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).orchestrator = getOrchestratorInstance();
    next();
});

// Middleware to validate jobId param
function validateJobId(req: Request, res: Response, next: NextFunction): void {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
        res.status(400).json({ error: 'Invalid jobId' });
        return;
    }
    next();
}

// GET /api/queue/status - returns all queue status
// GET /api/queue/status - returns all jobs (pending, active, completed, failed) grouped by server/model
router.get('/status', async function (req, res) {
    try {
        const stats = universalQueueService.getQueueStats();
        const runningJobs = universalQueueService.getRunningJobs();
        const recentCompletedJobs = universalQueueService.getRecentCompletedJobs(20); // Get last 20 completed jobs

        const status = {
            stats,
            runningJobs: runningJobs.map(job => ({
                jobId: job.job.id,
                serverId: job.serverId,
                startTime: job.startTime,
                status: 'active' as const,
                type: job.job.type,
                modelId: job.job.modelId,
                retries: 0, // Could be tracked in the future
                timestamps: {
                    enqueued: new Date(job.startTime).getTime(),
                    started: new Date(job.startTime).getTime()
                }
            })),
            recentCompletedJobs: recentCompletedJobs.map(item => ({
                jobId: item.jobId,
                serverId: item.result.serverId,
                status: item.status,
                type: item.job.type,
                modelId: item.job.modelId,
                retries: 0, // Could be tracked in the future
                executionTimeMs: item.result.executionTimeMs,
                timestamps: {
                    enqueued: Date.now() - (item.result.executionTimeMs || 0) - 1000, // Estimated
                    started: Date.now() - (item.result.executionTimeMs || 0), // Estimated
                    completed: item.result.success ? Date.now() : undefined,
                    failed: !item.result.success ? Date.now() : undefined
                }
            }))
        };

        res.json(status);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch queue status', details: errorMessage });
    }
});

// GET /api/queue/jobs/:jobId - returns job status by jobId
// GET /api/queue/jobs/:jobId - returns job status by jobId (from allJobs)
router.get('/jobs/:jobId', validateJobId, async function (req, res) {
    try {
        const jobStatus = universalQueueService.getJobStatus(req.params.jobId);
        if (!jobStatus) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        res.json(jobStatus);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: 'Failed to fetch job status', details: errorMessage });
    }
});

export default router;
