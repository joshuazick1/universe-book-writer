import { Router } from 'express';
import { getUniverses, getUniverseCharacters } from '../../controllers/chatController.js';
import { param } from 'express-validator';

/**
 * Universe listing and universe character listing endpoints.
 */
const router = Router();

// GET /api/chat/universes
router.get('/universes', getUniverses);

// GET /api/chat/universes/:universeId/characters
router.get('/universes/:universeId/characters', param('universeId').isString().notEmpty().withMessage('universeId param is required'), getUniverseCharacters);

export default router;
