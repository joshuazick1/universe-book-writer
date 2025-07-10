import { Request, Response, RequestHandler } from 'express';
import { CharacterMemoryManager } from '../services/textToRagParser/memory/characterMemoryManager.js';
import { DatabaseManager } from '../services/textToRagParser/storage/databaseManager.js';

/**
 * POST /api/characters/:characterId/memories
 * Get or add memories for a specific character
 */
export const getCharacterMemories: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { filters } = req.body;
        const dbManager = new DatabaseManager();
        const memoryManager = new CharacterMemoryManager(dbManager);
        const memories = await memoryManager.getMemories(characterId, filters || {});
        res.json({
            success: true,
            memories,
            totalCount: memories.length,
            characterId
        });
    } catch (error) {
        console.error('Failed to get character memories:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};


/**
 * POST /api/characters/:characterId/memories/add
 * Add a new memory for a specific character
 */
export const addCharacterMemory: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { type, content, importance, tags, timestamp } = req.body;
        const dbManager = new DatabaseManager();
        const memoryManager = new CharacterMemoryManager(dbManager);
        // Required fields: characterId, type (memoryType), content
        const memory = await memoryManager.createUserMemory(
            characterId,
            type,
            content,
            '', // conversationId (empty string if not provided)
            true, // isCanon
            true, // affectsTimeline
            tags || []
        );
        // Optionally set additional fields if provided
        if (importance !== undefined) memory.importance = importance;
        if (timestamp) memory.createdAt = new Date(timestamp);
        await dbManager.updateCharacterMemory(memory);
        res.status(201).json({
            success: true,
            memory
        });
    } catch (error) {
        console.error('Failed to add character memory:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
