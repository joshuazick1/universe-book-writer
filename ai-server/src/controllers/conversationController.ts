/**
 * Conversation Controller
 * Handles conversation session management endpoints.
 * Extracted from characterChat.ts for modularization.
 */
import { Request, Response, RequestHandler } from 'express';

/**
 * POST /api/conversations
 * Create a new conversation session
 */
export const createConversation: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId, universeId, type } = req.body;
        if (!characterId) {
            res.status(400).json({
                error: 'characterId is required'
            });
            return;
        }
        // Generate a new conversation ID
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // For now, create a simple conversation object
        // In a full implementation, this would be stored in a database
        const conversation = {
            id: conversationId,
            characterId,
            universeId: universeId || 'unknown',
            type: type || 'character_chat',
            status: 'active',
            createdAt: new Date(),
            lastActivity: new Date(),
            messageCount: 0,
            participants: [characterId],
            metadata: {
                chatSettings: {
                    responseStyle: 'character_appropriate',
                    verbosity: 'normal',
                    emotionalExpression: 0.5
                }
            }
        };
        res.status(201).json(conversation);
    } catch (error) {
        console.error('Failed to create conversation:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
