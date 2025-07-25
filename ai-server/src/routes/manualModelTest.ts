import { Router } from 'express';
import { manualModelTest } from '../controllers/manualModelTestController.js';

const router = Router();

/**
 * POST /api/model/manual-test
 * Body: { modelId: string, prompt: string, benchmarkType?: string }
 * Returns: { modelId, prompt, aiResponse, score, benchmarkType }
 */
router.post('/manual-test', manualModelTest);

export default router;
