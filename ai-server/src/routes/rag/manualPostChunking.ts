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

router.post('/manual-post-chunking', manualPostChunking);

export default router;
