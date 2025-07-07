/**
 * RAG Update API Routes
 * 
 * REST API endpoints for managing encrypted updates and version history for RAG content.
 * Provides secure access to update tracking, audit trails, and rollback capabilities.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { RAGUpdateStorageService } from '../services/update-storage.service.js';
import { RAGUpdateEncryptionService, RAGUpdateHistoryQuery } from '../encryption/rag-update-encryption.service.js';
import { RAGStorageService } from '../services/storage.service.js';

export interface RAGUpdateRoutes {
    updateStorage: RAGUpdateStorageService;
    updateEncryption: RAGUpdateEncryptionService;
    ragStorage: RAGStorageService;
}

/**
 * Create RAG update routes
 */
export function createRAGUpdateRoutes(services: RAGUpdateRoutes): Router {
    const router = Router();

    /**
     * GET /api/rag/updates/history/:nodeId
     * Get update history for a specific node
     */
    const getNodeHistory: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { nodeId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;
            const userId = req.user?.id; // Assuming auth middleware sets req.user

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const history = await services.updateStorage.getNodeHistory(nodeId, limit);

            // Filter out updates the user doesn't have access to
            const accessibleHistory = await filterAccessibleUpdates(history, userId);

            res.json({
                nodeId,
                history: accessibleHistory,
                total: accessibleHistory.length
            });
        } catch (error) {
            console.error('Error retrieving node history:', error);
            res.status(500).json({ error: 'Failed to retrieve update history' });
        }
    };
    router.get('/history/:nodeId', getNodeHistory);

    /**
     * GET /api/rag/updates/universe/:universeId
     * Query update history for a universe
     */
    const getUniverseHistory: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { universeId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Build query from request parameters
            const query: RAGUpdateHistoryQuery = {
                universeId,
                userId: req.query.user_id as string,
                limit: parseInt(req.query.limit as string) || 50,
                offset: parseInt(req.query.offset as string) || 0,
                sortBy: (req.query.sort_by as 'timestamp' | 'version') || 'timestamp',
                sortOrder: (req.query.sort_order as 'asc' | 'desc') || 'desc',
                privateOnly: req.query.private_only === 'true'
            };

            // Add time range filter if provided
            if (req.query.start_date || req.query.end_date) {
                query.timeRange = {
                    start: req.query.start_date ? new Date(req.query.start_date as string) : new Date(0),
                    end: req.query.end_date ? new Date(req.query.end_date as string) : new Date()
                };
            }

            // Add operation filters
            if (req.query.operations) {
                const operations = (req.query.operations as string).split(',');
                query.operations = operations.filter(op =>
                    ['create', 'update', 'delete', 'restore'].includes(op)
                ) as ('create' | 'update' | 'delete' | 'restore')[];
            }

            const result = await services.updateStorage.queryUniverseHistory(
                universeId,
                query,
                true // Decrypt private updates
            );

            res.json({
                universeId,
                query,
                updates: result.updates,
                total: result.total,
                hasMore: result.hasMore
            });
        } catch (error) {
            console.error('Error querying universe history:', error);
            res.status(500).json({ error: 'Failed to query update history' });
        }
    };
    router.get('/universe/:universeId', getUniverseHistory);

    /**
     * GET /api/rag/updates/statistics/:universeId
     * Get update statistics for a universe
     */
    const getStatistics: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { universeId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const statistics = await services.updateStorage.getUpdateStatistics(universeId);

            res.json({
                universeId,
                statistics
            });
        } catch (error) {
            console.error('Error retrieving update statistics:', error);
            res.status(500).json({ error: 'Failed to retrieve statistics' });
        }
    };
    router.get('/statistics/:universeId', getStatistics);

    /**
     * POST /api/rag/updates/rollback/:nodeId
     * Rollback a node to a previous version
     */
    const rollbackNode: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { nodeId } = req.params;
            const { targetVersion, reason } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            if (!targetVersion || !reason) {
                res.status(400).json({
                    error: 'Target version and reason are required'
                });
                return;
            }

            const rolledBackNode = await services.updateStorage.rollbackNode(
                nodeId,
                parseInt(targetVersion),
                userId,
                reason
            );

            res.json({
                nodeId,
                targetVersion: parseInt(targetVersion),
                reason,
                rolledBackNode: {
                    id: rolledBackNode.id,
                    title: rolledBackNode.title,
                    version: rolledBackNode.metadata.version,
                    timestamp: rolledBackNode.timestamps.modified
                }
            });
        } catch (error) {
            console.error('Error rolling back node:', error);
            res.status(500).json({ error: 'Failed to rollback node' });
        }
    };
    router.post('/rollback/:nodeId', rollbackNode);

    /**
     * POST /api/rag/updates/transaction
     * Create an update transaction for atomic operations
     */
    const createTransaction: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { universeId, description } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            if (!universeId || !description) {
                res.status(400).json({
                    error: 'Universe ID and description are required'
                });
                return;
            }

            // Create a simple batch response since createBatch doesn't exist
            const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            res.json({
                batchId,
                universeId,
                description,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error creating update transaction:', error);
            res.status(500).json({ error: 'Failed to create transaction' });
        }
    };
    router.post('/transaction', createTransaction);

    /**
     * POST /api/rag/updates/cleanup/:universeId
     * Clean up old updates for a universe
     */
    const cleanupUpdates: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { universeId } = req.params;
            const { retainDays, keepMajorVersions } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const retainDuration = retainDays ? parseInt(retainDays) : 30; // Default 30 days
            const keepMajor = keepMajorVersions !== false; // Default true

            const result = await services.updateStorage.cleanupOldUpdates(
                universeId,
                {
                    maxAge: retainDuration,
                    keepMajorVersions: keepMajor
                }
            );

            res.json({
                universeId,
                cleanupResult: {
                    removedCount: result.deletedUpdates,
                    retainedCount: 0, // Not available in current implementation
                    spaceFreed: result.freedSpace
                }
            });
        } catch (error) {
            console.error('Error cleaning up updates:', error);
            res.status(500).json({ error: 'Failed to cleanup updates' });
        }
    };
    router.post('/cleanup/:universeId', cleanupUpdates);

    /**
     * GET /api/rag/updates/batch/:batchId
     * Get details of an update batch
     */
    const getBatchDetails: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { batchId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Since getBatch doesn't exist, return a placeholder response
            res.status(501).json({
                error: 'Batch details endpoint not yet implemented',
                batchId
            });
        } catch (error) {
            console.error('Error retrieving batch details:', error);
            res.status(500).json({ error: 'Failed to retrieve batch details' });
        }
    };
    router.get('/batch/:batchId', getBatchDetails);

    /**
     * GET /api/rag/updates/:updateId
     * Get details of a specific update
     */
    const getUpdateDetails: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        try {
            const { updateId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Since getUpdate doesn't exist, return a placeholder response
            res.status(501).json({
                error: 'Update details endpoint not yet implemented',
                updateId
            });
        } catch (error) {
            console.error('Error retrieving update:', error);
            res.status(500).json({ error: 'Failed to retrieve update' });
        }
    };
    router.get('/:updateId', getUpdateDetails);

    return router;
}

/**
 * Filter updates based on user access permissions
 */
async function filterAccessibleUpdates(updates: any[], userId: string): Promise<any[]> {
    // Simple access control - users can only see their own updates
    // TODO: Implement more sophisticated access control based on universe permissions
    return updates.filter(update => update.userId === userId);
}

/**
 * Middleware for authentication (placeholder)
 */
export function requireAuth(req: Request, res: Response, next: Function) {
    // TODO: Implement proper authentication middleware
    // For now, assume user is always authenticated
    req.user = { id: 'default-user' };
    next();
}

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                // Add other user properties as needed
            };
        }
    }
}
