
/**
 * Unified /api/generate endpoints (modular)
 * All handler logic is imported from the unified controller.
 */
import express from 'express';
import { param, body } from 'express-validator';
import {
    generateUniverse,
    getUniverse,
    expandUniverseElement,
    validateUniverse,
    generateCharacter,
    getCharacter,
    expandCharacterElement,
    validateCharacter,
    integrateCharacterMemories,
    integrateUniverseMemories,
    getCharacterMemories
} from '../../controllers/characterGeneratorController.js';
import {
    validateUniverseRequest,
    validateCharacterRequest
} from '../../middleware/validation.js';

const router = express.Router();

// Universe routes
router.post('/universe', validateUniverseRequest, generateUniverse);
router.get('/universe/:id', param('id').isString(), getUniverse);
router.post('/universe/:id/expand', param('id').isString(), expandUniverseElement);
router.post('/universe/:id/validate', param('id').isString(), validateUniverse);

// Character routes
router.post('/character', validateCharacterRequest, generateCharacter);
router.get('/character/:id', param('id').isString(), getCharacter);
router.post('/character/:id/expand', param('id').isString(), expandCharacterElement);
router.post('/character/:id/validate', param('id').isString(), validateCharacter);

// Memory integration routes
router.post('/character/:id/integrate-memories',
    param('id').isString(),
    body('memoryTypes').optional().isArray(),
    body('importance_threshold').optional().isNumeric(),
    integrateCharacterMemories
);
router.post('/character/:characterId/integrate-universe/:universeId',
    param('characterId').isString(),
    param('universeId').isString(),
    body('elements').optional().isArray(),
    body('detail_level').optional().isIn(['basic', 'standard', 'comprehensive']),
    integrateUniverseMemories
);
router.get('/character/:id/memories', param('id').isString(), getCharacterMemories);

export default router;
