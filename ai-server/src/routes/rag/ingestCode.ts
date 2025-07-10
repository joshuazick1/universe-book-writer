import express from 'express';
import { validateRagCodeIngestion } from '../../middleware/validation.js';
import { ragCodeController } from '../../controllers/ragCodeController.js';

/**
 * RAG Code Ingestion Routes
 * POST /api/rag/ingest/code
 */
const router = express.Router();


// POST /api/rag/ingest/code
router.post('/', validateRagCodeIngestion, ragCodeController.ingestCode);

export default router;
