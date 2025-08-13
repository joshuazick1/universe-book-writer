import { Router, Request, Response, NextFunction } from 'express';
import { EnhancedRetryService } from '../services/enhanced-retry.service.js';
import { HealthCheckService } from '../services/health-check.service.js';

const router = Router();

// Enhanced generation endpoint handler
async function handleGenerateEnhanced(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        // Perform health checks and retry logic
        const healthCheckService = new HealthCheckService();
        const retryService = new EnhancedRetryService();

        const result = await retryService.executeWithRetry(async () => {
            await healthCheckService.checkServerHealth('default-server');
            // Simulate generation logic
            return { generatedText: `Enhanced response for: ${prompt}` };
        });

        res.json(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
    }
}

// Register the route
router.post('/generate-enhanced', handleGenerateEnhanced);

export default router;