/**
 * Represents an orchestrator server instance for model generation.
 */
interface Server {
    healthy: boolean;
    models: string[];
    url: string;
    // Add other properties as needed
}

import getOrchestratorInstance from '../orchestrator-instance.js';
import { Router } from 'express';
import fetch from 'node-fetch';
import { logger } from '../../../shared/logging/logger.js';
import { QueueProxyService } from '../services/queue-proxy.service.js';


const router = Router();
console.log('[DEBUG] generate.ts router loaded');

// POST /api/generate
router.post('/api/generate', async (req, res) => {
    // Create required dependencies
    // Use the shared instance instead of creating a new one
    const { universalQueueService } = await import('../services/universal-queue.service.js');
    const queueProxyService = new QueueProxyService(universalQueueService);
    const result = await queueProxyService.handleRequest(req.body);
    res.json(result);
});

// Return plain text 404 for /api/generate/stream (Ollama compatibility)
router.all('/stream', (req, res) => {
    res.status(404).type('text/plain').send('404 page not found');
});

export default router;
