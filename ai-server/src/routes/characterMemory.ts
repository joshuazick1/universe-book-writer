/**
 * Character Memory API Routes - REST endpoints for the character memory system
 * Handles gap-filling requests, memory retrieval, and approval workflows
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { CharacterMemoryManager } from '../services/textToRagParser/memory/characterMemoryManager.js';
import { DatabaseManager } from '../services/textToRagParser/storage/databaseManager.js';
import { 
    GapFillingRequest, 
    MemoryApprovalRequest, 
    CharacterMemory 
} from '../services/textToRagParser/core/interfaces.js';

const router = Router();

// Initialize the memory system
const dbManager = new DatabaseManager();
const memoryManager = new CharacterMemoryManager(dbManager);

/**
 * GET /api/memory/characters/:characterId
 * Get all memories for a character with filtering options
 */
const getCharacterMemories: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { 
            includeGapFilling = 'false',
            includeUnapproved = 'false',
            memoryTypes,
            canonOnly = 'false',
            limit = '50'
        } = req.query;

        const options = {
            includeGapFilling: includeGapFilling === 'true',
            includeUnapproved: includeUnapproved === 'true',
            memoryTypes: memoryTypes ? String(memoryTypes).split(',') as CharacterMemory['memoryType'][] : undefined,
            canonOnly: canonOnly === 'true',
            limit: parseInt(String(limit))
        };

        const memories = await memoryManager.getMemories(characterId, options);

        res.json({
            success: true,
            characterId,
            memories,
            count: memories.length,
            filters: options
        });
    } catch (error) {
        console.error('Error getting character memories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve character memories',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/memory/characters/:characterId/relevant
 * Get memories relevant to a specific context
 */
const getRelevantMemories: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { context, includeGapFilling = 'false', limit = '10' } = req.query;

        if (!context) {
            res.status(400).json({
                success: false,
                error: 'Context parameter is required'
            });
            return;
        }

        const options = {
            includeGapFilling: includeGapFilling === 'true',
            limit: parseInt(String(limit))
        };

        const memories = await memoryManager.getRelevantMemories(
            characterId, 
            String(context), 
            options
        );

        res.json({
            success: true,
            characterId,
            context,
            memories,
            count: memories.length
        });
    } catch (error) {
        console.error('Error getting relevant memories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve relevant memories',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/memory/gap-filling
 * Generate gap-filling memories for "What was X doing while Y happened?" queries
 */
const generateGapFilling: RequestHandler = async (req: Request, res: Response) => {
    try {
        const gapFillingRequest: GapFillingRequest = req.body;

        // Validate request
        if (!gapFillingRequest.characterId || !gapFillingRequest.query || !gapFillingRequest.timelineContext) {
            res.status(400).json({
                success: false,
                error: 'characterId, query, and timelineContext are required'
            });
            return;
        }

        const result = await memoryManager.generateGapFillingMemory(gapFillingRequest);

        res.json({
            success: true,
            gapFillingResult: result,
            message: 'Gap-filling memory generated successfully. Awaiting user approval.'
        });
    } catch (error) {
        console.error('Error generating gap-filling memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate gap-filling memory',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/memory/approve
 * Approve or reject gap-filling memories
 */
const approveMemory: RequestHandler = async (req: Request, res: Response) => {
    try {
        const approvalRequest: MemoryApprovalRequest = req.body;

        // Validate request
        if (!approvalRequest.memoryId || typeof approvalRequest.approved !== 'boolean') {
            res.status(400).json({
                success: false,
                error: 'memoryId and approved (boolean) are required'
            });
            return;
        }

        const updatedMemory = await memoryManager.processMemoryApproval(approvalRequest);

        res.json({
            success: true,
            memory: updatedMemory,
            message: `Memory ${approvalRequest.approved ? 'approved' : 'rejected'} successfully`
        });
    } catch (error) {
        console.error('Error processing memory approval:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process memory approval',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/memory/pending-approvals
 * Get all gap-filling memories awaiting approval
 */
const getPendingApprovals: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.query;
        
        const pendingMemories = await memoryManager.getPendingGapFillingMemories(
            characterId ? String(characterId) : undefined
        );

        res.json({
            success: true,
            pendingMemories,
            count: pendingMemories.length,
            characterId: characterId || 'all'
        });
    } catch (error) {
        console.error('Error getting pending approvals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pending approvals',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/memory/book-extraction
 * Create memory from book extraction
 */
const createBookMemory: RequestHandler = async (req: Request, res: Response) => {
    try {
        const {
            characterId,
            memoryType,
            content,
            sourceChunk,
            timelineAnchor,
            associatedEntities = []
        } = req.body;

        // Validate request
        if (!characterId || !memoryType || !content) {
            res.status(400).json({
                success: false,
                error: 'characterId, memoryType, and content are required'
            });
            return;
        }

        const memory = await memoryManager.createBookMemory(
            characterId,
            memoryType,
            content,
            sourceChunk,
            timelineAnchor,
            associatedEntities
        );

        res.json({
            success: true,
            memory,
            message: 'Book extraction memory created successfully'
        });
    } catch (error) {
        console.error('Error creating book extraction memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create book extraction memory',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/memory/user-interaction
 * Create memory from user interaction
 */
const createUserMemory: RequestHandler = async (req: Request, res: Response) => {
    try {
        const {
            characterId,
            memoryType,
            content,
            conversationId,
            isCanon = false,
            affectsTimeline = false,
            associatedEntities = []
        } = req.body;

        // Validate request
        if (!characterId || !memoryType || !content || !conversationId) {
            res.status(400).json({
                success: false,
                error: 'characterId, memoryType, content, and conversationId are required'
            });
            return;
        }

        const memory = await memoryManager.createUserMemory(
            characterId,
            memoryType,
            content,
            conversationId,
            isCanon,
            affectsTimeline,
            associatedEntities
        );

        res.json({
            success: true,
            memory,
            message: 'User interaction memory created successfully'
        });
    } catch (error) {
        console.error('Error creating user interaction memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user interaction memory',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * DELETE /api/memory/:memoryId
 * Delete a memory
 */
const deleteMemory: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { memoryId } = req.params;
        const { reason } = req.body;

        const deleted = await memoryManager.deleteMemory(memoryId, reason);

        if (!deleted) {
            res.status(404).json({
                success: false,
                error: 'Memory not found'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Memory deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete memory',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/memory/stats
 * Get memory system statistics
 */
const getMemoryStats: RequestHandler = async (req: Request, res: Response) => {
    try {
        const stats = await dbManager.getMemoryStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting memory stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve memory statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/memory/health
 * Health check for memory system
 */
const getMemoryHealth: RequestHandler = async (req: Request, res: Response) => {
    try {
        const stats = await dbManager.getMemoryStats();
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            systemInfo: {
                totalMemories: stats.totalMemories,
                totalCharacters: stats.totalCharacters,
                pendingApprovals: stats.pendingApprovals
            }
        });
    } catch (error) {
        console.error('Memory system health check failed:', error);
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: 'Memory system health check failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Register routes
router.get('/characters/:characterId', getCharacterMemories);
router.get('/characters/:characterId/relevant', getRelevantMemories);
router.post('/gap-filling', generateGapFilling);
router.post('/approve', approveMemory);
router.get('/pending-approvals', getPendingApprovals);
router.post('/book-extraction', createBookMemory);
router.post('/user-interaction', createUserMemory);
router.delete('/:memoryId', deleteMemory);
router.get('/stats', getMemoryStats);
router.get('/health', getMemoryHealth);

export default router;
