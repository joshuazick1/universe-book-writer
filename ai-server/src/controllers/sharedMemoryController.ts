import { Request, Response, RequestHandler } from 'express';
import { DatabaseManager } from '../services/textToRagParser/storage/databaseManager.js';

/**
 * GET /api/shared-memories/:eventId
 * Retrieve shared memory nodes by event ID
 */
export const getSharedMemoriesByEvent: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const dbManager = new DatabaseManager();
        // Assumes shared memories are linked to events via associatedEntities or a direct eventId field
        const sharedMemories = await dbManager.getSharedMemoriesByEvent(eventId);
        res.json({
            success: true,
            eventId,
            sharedMemories,
            count: sharedMemories.length
        });
    } catch (error) {
        console.error('Failed to get shared memories by event:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/shared-memories/time/:timestamp
 * Retrieve shared memory nodes by time (or time range)
 */
export const getSharedMemoriesByTime: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { timestamp } = req.params;
        const dbManager = new DatabaseManager();
        // Assumes shared memories have a createdAt or timelineAnchor field
        const sharedMemories = await dbManager.getSharedMemoriesByTime(timestamp);
        res.json({
            success: true,
            timestamp,
            sharedMemories,
            count: sharedMemories.length
        });
    } catch (error) {
        console.error('Failed to get shared memories by time:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/shared-memories/character/:characterId
 * Retrieve all shared memories involving a character
 */
export const getSharedMemoriesByCharacter: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const dbManager = new DatabaseManager();
        // Assumes shared memories have associatedEntities or similar
        const sharedMemories = await dbManager.getSharedMemoriesByCharacter(characterId);
        res.json({
            success: true,
            characterId,
            sharedMemories,
            count: sharedMemories.length
        });
    } catch (error) {
        console.error('Failed to get shared memories by character:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
