import { Router, Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = Router();

/**
 * POST /api/infer
 * Runs model inference using orchestrator.runModel
 * Request body: { model: string, prompt: string, context: any, suggestions: any }
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { model, prompt, context, suggestions } = req.body;
        if (!model || !prompt) {
            res.status(400).json({ error: 'Missing required fields: model, prompt' });
            return;
        }
        const orchestrator = getOrchestratorInstance();
        const result = await orchestrator.runModel(model, prompt, context, suggestions);
        res.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Model inference failed', details: message });
    }
});

export default router;
