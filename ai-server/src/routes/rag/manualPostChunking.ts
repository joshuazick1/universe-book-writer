import { Router } from 'express';
import { manualPostChunking } from '../../controllers/ragTextController.js';

/**
 * Manual Post-Chunking Reprocessing Route
 * POST /api/rag/manual-post-chunking
 * Triggers post-chunking pipeline steps for a specified book.
 *
 * Request body:
 *   - universeId: string
 *   - bookId: string
 */
const router = Router();

router.post('/manual-post-chunking', (req, res, next) => {
    // @ts-expect-error: manualPostChunking is an async handler, but Express types are too strict
    manualPostChunking(req, res, next);
});

export default router;
