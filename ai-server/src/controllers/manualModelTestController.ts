import type { Request, Response } from 'express';
import { BenchmarkType, QualityBenchmarkScore } from '../../../shared/types/aiQualityBenchmark.js';
import { sendPromptToAI } from '../services/aiPromptService.js';

/**
 * POST /api/model/manual-test
 * Allows manual testing of a model with a prompt and returns debug info.
 * Request body: { modelId: string, prompt: string, benchmarkType?: BenchmarkType }
 * Response: { modelId, prompt, aiResponse, score, benchmarkType }
 */
export async function manualModelTest(req: Request, res: Response) {
    const { modelId, prompt, benchmarkType = 'task-planning' } = req.body;
    if (!modelId || !prompt) {
        res.status(400).json({ error: 'Missing modelId or prompt' });
        return;
    }

    try {
        // Send prompt to AI and get response
        const aiResponse = await sendPromptToAI({ modelId, prompt });

        // Score the response (stub: use length or simple heuristic)
        const score: QualityBenchmarkScore = {
            type: benchmarkType,
            score: Math.min(1, aiResponse.text.length / 1000), // Example: normalize by length
            rubric: 'Length-based score (stub)',
            timestamp: new Date().toISOString(),
        };

        res.json({
            modelId,
            prompt,
            aiResponse,
            score,
            benchmarkType,
        });
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
}

/**
 * JSDoc:
 * This endpoint is for debugging and manual model evaluation. It returns the prompt, raw AI response, and a simple score for inspection.
 * Extend scoring logic for real benchmarks as needed.
 */
