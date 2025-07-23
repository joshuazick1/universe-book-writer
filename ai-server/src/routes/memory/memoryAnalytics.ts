import { Router } from 'express';
import { getCharacterMemoryAnalytics } from '../../controllers/index.js';
import { validateCharacterId } from '../../middleware/validation.js';

/**
 * Character Memory Analytics Routes
 * Handles endpoints for retrieving character memory analytics.
 *
 * @module routes/memory/memoryAnalytics
 */
const router = Router();

// POST /api/characters/:characterId/memory-analytics
router.post('/characters/:characterId/memory-analytics', validateCharacterId, getCharacterMemoryAnalytics);

export default router;
