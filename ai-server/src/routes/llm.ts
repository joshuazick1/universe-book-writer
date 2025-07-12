import { Router, Request, Response } from 'express';
import express from 'express';
import { getOllamaModelResponse } from '../services/llm/ollamaService.js';

const router = Router();

/**
 * POST /api/llm/eval
 * Body: { model: string, prompt: string, input: string }
 * Returns: { response: string }
 */
router.post('/eval', express.json({ limit: '10mb' }), async (req: Request, res: Response): Promise<void> => {
    // Defensive: log and inspect the incoming body
    if (!req.body || typeof req.body !== 'object') {
        console.error('Invalid or missing JSON body:', req.body);
        res.status(400).json({ error: 'Missing or invalid JSON body' });
        return;
    }
    const { model, prompt, input } = req.body;
    if (!model || !prompt || !input) {
        console.error('Missing required fields:', req.body);
        res.status(400).json({ error: 'Missing model, prompt, or input' });
        return;
    }
    try {
        // Compose the full prompt for the LLM
        const fullPrompt = `${prompt}\nSummary: ${input}\nScore (1-5) and rationale:`;
        const response = await getOllamaModelResponse(model, fullPrompt);
        res.json({ response });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
