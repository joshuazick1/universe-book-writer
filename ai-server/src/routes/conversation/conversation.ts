import { Router } from 'express';
import { createConversation } from '../../controllers/conversationController.js';
import { body } from 'express-validator';

/**
 * Conversation session endpoints.
 */
const router = Router();

// POST /api/conversations
router.post(
    '/conversations',
    body('characterId').isString().notEmpty().withMessage('characterId is required'),
    createConversation
);

// TODO: Implement getConversation and listConversations in the controller and add here

export default router;
