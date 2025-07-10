import { Router } from 'express';
import { generateGapFillingMemory, approveGapFillingMemory } from '../../controllers/gapFillingController.js';
// TODO: Implement and import validation middleware for gap-filling
import { validateCharacterId, validateGapFillingRequest, validateGapFillingApproval } from '../../middleware/validation.js';

/**
 * Gap-Filling Memory Routes
 * Handles endpoints for generating and approving gap-filling character memories.
 *
 * @module routes/memory/gapFilling
 */
const router = Router();


// POST /api/characters/:characterId/gap-filling
router.post('/characters/:characterId/gap-filling', validateCharacterId, validateGapFillingRequest, generateGapFillingMemory);

// POST /api/characters/:characterId/gap-filling/approval
router.post('/characters/:characterId/gap-filling/approval', validateCharacterId, validateGapFillingApproval, approveGapFillingMemory);

export default router;
