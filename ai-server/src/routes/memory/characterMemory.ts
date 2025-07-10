import { Router } from 'express';
import { getCharacterMemories } from '../../controllers/characterMemoryController.js';
import { validateCharacterId, validateCharacterMemory } from '../../middleware/validation.js';

/**
 * Character Memory Routes
 * Handles endpoints for retrieving, adding, and analyzing character memories.
 *
 * @module routes/memory/characterMemory
 */
const router = Router();



// POST /api/characters/:characterId/memories (get/filter)
router.post('/characters/:characterId/memories', validateCharacterId, getCharacterMemories);

// POST /api/characters/:characterId/memories/add (add new memory)
import { addCharacterMemory } from '../../controllers/characterMemoryController.js';
router.post('/characters/:characterId/memories/add', validateCharacterId, validateCharacterMemory, addCharacterMemory);

export default router;
