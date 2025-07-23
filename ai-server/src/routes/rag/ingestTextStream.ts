import express from 'express';
import { ragTextController } from '../../controllers/ragTextController.js';

const router = express.Router();


// SSE endpoint for real-time RAG ingestion progress
// Supports both GET (EventSource) and POST (streaming fetch)
router.get('/', ragTextController.ingestTextStream);
router.post('/', ragTextController.ingestTextStream);

export default router;
