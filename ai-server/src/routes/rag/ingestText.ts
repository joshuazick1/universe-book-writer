import express from 'express';
import { validateRagTextIngestion } from '../../middleware/validation.js';
import { ragTextController } from '../../controllers/ragTextController.js';

/**
 * RAG Text Ingestion Routes
 * POST /api/rag/ingest/text
 */
const router = express.Router();


// POST /api/rag/ingest/text
router.post('/', validateRagTextIngestion, ragTextController.ingestText);

export default router;
