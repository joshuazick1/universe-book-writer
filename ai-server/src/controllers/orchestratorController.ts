import { Request, Response } from 'express';
import { AIOrchestrator } from '../orchestrator.js';

const orchestrator = new AIOrchestrator();

/**
 * Controller to run all benchmarks across all servers and models.
 */
export async function runAllBenchmarks(req: Request, res: Response): Promise<void> {
    try {
        await orchestrator.runBenchmarks();
        res.status(200).json({ success: true, message: 'All benchmarks have been triggered successfully.' });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ success: false, message: 'Failed to run benchmarks.', error: errorMessage });
    }
}
