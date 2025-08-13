/**
 * Worker management routes
 */

import { Router } from 'express';
import { universalWorkerService } from '../services/universal-worker.service.js';
import { WorkerInitializationService } from '../services/worker-initialization.service.js';
import { logger } from '../../../shared/logging/logger.js';

const router = Router();

/**
 * @route GET /api/worker/status
 * @desc Get worker system status
 * @access Public
 */
router.get('/status', (req, res) => {
    try {
        const status = universalWorkerService.getStatus();
        const isInitialized = WorkerInitializationService.isWorkerInitialized();

        res.json({
            initialized: isInitialized,
            ...status
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[WorkerRoutes] Error getting worker status: ${errorMessage}`);
        res.status(500).json({ error: 'Failed to get worker status' });
    }
});

/**
 * @route POST /api/worker/start
 * @desc Start the worker system
 * @access Public
 */
router.post('/start', (req, res) => {
    try {
        WorkerInitializationService.initialize();
        const status = universalWorkerService.getStatus();

        res.json({
            message: 'Worker system started successfully',
            status
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[WorkerRoutes] Error starting worker: ${errorMessage}`);
        res.status(500).json({ error: 'Failed to start worker system' });
    }
});

/**
 * @route POST /api/worker/stop
 * @desc Stop the worker system
 * @access Public
 */
router.post('/stop', (req, res) => {
    try {
        WorkerInitializationService.shutdown();

        res.json({
            message: 'Worker system stopped successfully'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[WorkerRoutes] Error stopping worker: ${errorMessage}`);
        res.status(500).json({ error: 'Failed to stop worker system' });
    }
});

export default router;
