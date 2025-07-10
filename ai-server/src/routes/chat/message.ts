import { Router } from 'express';
import { processMessage } from '../../controllers/chatController.js';
import { body } from 'express-validator';

/**
 * Chat message processing endpoint.
 */
const router = Router();

// POST /api/chat/process-message
router.post(
    '/process-message',
    body('characterId').isString().notEmpty().withMessage('characterId is required'),
    body('message').isString().notEmpty().withMessage('message is required'),
    processMessage
);

export default router;
