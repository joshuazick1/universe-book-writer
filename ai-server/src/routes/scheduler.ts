import express, { Router, Request, Response } from 'express';
import { AutomaticBenchmarkSchedulerService } from '../services/automatic-benchmark-scheduler.service.js';
import { BenchmarkGapAnalyzerService } from '../services/benchmark-gap-analyzer.service.js';
import { BenchmarkStalenessDetectorService } from '../services/benchmark-staleness-detector.service.js';
import {
    getBenchmarkConfig,
    updateBenchmarkConfig,
    deleteBenchmarkConfig,
    getEffectiveBenchmarkConfig,
    setGlobalBenchmarkConfig
} from '../database/benchmarkConfig.js';





/**
 * Creates and returns the scheduler router for benchmark configuration management.
 * @returns {Router} Express router with benchmark config endpoints
 */
export default function createSchedulerRoutes(): Router {
    const router = express.Router();

    // Get config for a server
    router.get('/config/:serverId', async (req: Request<{ serverId: string }>, res: Response): Promise<void> => {
        try {
            const config = await getBenchmarkConfig(req.params.serverId);
            if (!config) {
                res.status(404).send({ error: 'Config not found' });
                return;
            }
            res.status(200).send(config);
        } catch (error) {
            res.status(500).send({ error: (error as Error).message });
        }
    });

    // Update config for a server
    router.put('/config/:serverId', async (req: Request<{ serverId: string }>, res: Response): Promise<void> => {
        try {
            const config = { ...req.body, serverId: req.params.serverId };
            const updated = await updateBenchmarkConfig(config);
            res.status(200).send(updated);
        } catch (error) {
            res.status(500).send({ error: (error as Error).message });
        }
    });

    // Delete config for a server
    router.delete('/config/:serverId', async (req: Request<{ serverId: string }>, res: Response): Promise<void> => {
        try {
            const deleted = await deleteBenchmarkConfig(req.params.serverId);
            res.status(200).send({ deleted });
        } catch (error) {
            res.status(500).send({ error: (error as Error).message });
        }
    });

    // Get effective config (server or global fallback)
    router.get('/config-effective/:serverId', async (req: Request<{ serverId: string }>, res: Response): Promise<void> => {
        try {
            const config = await getEffectiveBenchmarkConfig(req.params.serverId);
            if (!config) {
                res.status(404).send({ error: 'Config not found' });
                return;
            }
            res.status(200).send(config);
        } catch (error) {
            res.status(500).send({ error: (error as Error).message });
        }
    });

    // Set global config
    router.put('/config-global', async (req: Request, res: Response): Promise<void> => {
        try {
            const updated = await setGlobalBenchmarkConfig(req.body);
            res.status(200).send(updated);
        } catch (error) {
            res.status(500).send({ error: (error as Error).message });
        }
    });

    // Scheduler status and statistics
    router.get('/status', (req, res) => {
        res.json({ status: 'Scheduler is running', jobs: [] });
    });

    // List all scheduled jobs
    router.get('/jobs', (req, res) => {
        res.json({ jobs: [] });
    });

    return router;
}
