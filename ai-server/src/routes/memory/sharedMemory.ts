import { Router } from 'express';
import {
    getSharedMemoriesByEvent,
    getSharedMemoriesByTime,
    getSharedMemoriesByCharacter
} from '../../controllers/sharedMemoryController.js';
import { validateCharacterId } from '../../middleware/validation.js';

/**
 * Shared Memory Routes
 * Handles endpoints for retrieving shared memories by event, time, or character.
 *
 * @module routes/memory/sharedMemory
 */
const router = Router();

// GET /api/shared-memories/event/:eventId
router.get('/shared-memories/event/:eventId', getSharedMemoriesByEvent);

// GET /api/shared-memories/time/:timestamp
router.get('/shared-memories/time/:timestamp', getSharedMemoriesByTime);

// GET /api/shared-memories/character/:characterId
router.get('/shared-memories/character/:characterId', validateCharacterId, getSharedMemoriesByCharacter);

export default router;
