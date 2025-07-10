import { Router } from 'express';
import { getCharacter } from '../../controllers/chatController.js';
import { validateCharacterId } from '../../middleware/validation.js';

/**
 * Character details endpoint.
 */
const router = Router();

// GET /api/chat/characters/:characterId
router.get('/characters/:characterId', validateCharacterId, getCharacter);

export default router;
