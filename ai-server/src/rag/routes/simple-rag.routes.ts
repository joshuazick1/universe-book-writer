/**
 * Simple RAG Router using RAGServiceManager directly
 * 
 * This provides all the RAG endpoints but uses the RAGServiceManager directly
 * instead of requiring separate service adapters.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { RAGServiceManager } from '../manager.js';
import { RAGNodeType, RAGRelationshipType } from '../core/types.js';
import { logger } from '../../../../shared/logging/logger.js';

export function createSimpleRAGRouter(manager: RAGServiceManager): Router {
    const router = Router();

    // Log route creation
    logger.info('Creating simple RAG router with all endpoints');

    /**
     * Health check
     */
    router.get('/health', (async (req: Request, res: Response) => {
        try {
            const health = await manager.healthCheck();
            res.json(health);
        } catch (error) {
            res.status(503).json({
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    /**
     * Get stats
     */
    router.get('/stats', (async (req: Request, res: Response) => {
        try {
            const stats = await manager.getStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    /**
     * Create a new node
     */
    router.post('/nodes', (async (req: Request, res: Response) => {
        try {
            const nodeData = req.body;
            logger.debug(`Creating node: ${JSON.stringify(nodeData)}`);

            const node = await manager.createNode(nodeData);
            res.status(201).json(node);
        } catch (error) {
            logger.error(`Error creating node: ${error instanceof Error ? error.message : String(error)}`);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to create node'
            });
        }
    }) as RequestHandler);

    /**
     * Get node by ID
     */
    router.get('/nodes/:id', (async (req: Request, res: Response) => {
        try {
            const node = await manager.getNode(req.params.id);
            if (!node) {
                return res.status(404).json({ error: 'Node not found' });
            }
            res.json(node);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to retrieve node'
            });
        }
    }) as RequestHandler);

    /**
     * List nodes with optional filtering
     */
    router.get('/nodes', (async (req: Request, res: Response) => {
        try {
            const query = req.query.q as string || '';
            const filters = req.query.filters ? JSON.parse(req.query.filters as string) : undefined;

            const nodes = await manager.searchNodes(query, filters);
            res.json({
                nodes,
                totalCount: nodes.length
            });
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to search nodes'
            });
        }
    }) as RequestHandler);

    /**
     * Update node
     */
    router.put('/nodes/:id', (async (req: Request, res: Response) => {
        try {
            const updates = req.body;
            const node = await manager.updateNode(req.params.id, updates);
            res.json(node);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to update node'
            });
        }
    }) as RequestHandler);

    /**
     * Delete node
     */
    router.delete('/nodes/:id', (async (req: Request, res: Response) => {
        try {
            await manager.deleteNode(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to delete node'
            });
        }
    }) as RequestHandler);

    /**
     * Create relationship
     */
    router.post('/relationships', (async (req: Request, res: Response) => {
        try {
            const relationshipData = req.body;
            const relationship = await manager.createRelationship(relationshipData);
            res.status(201).json(relationship);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to create relationship'
            });
        }
    }) as RequestHandler);

    /**
     * Get connected nodes
     */
    router.get('/nodes/:id/connected', (async (req: Request, res: Response) => {
        try {
            const maxDistance = parseInt(req.query.maxDistance as string) || 1;
            const result = await manager.getConnectedNodes(req.params.id, maxDistance);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get connected nodes'
            });
        }
    }) as RequestHandler);

    /**
     * Search nodes
     */
    router.post('/search', (async (req: Request, res: Response) => {
        try {
            const { query, filters } = req.body;
            const nodes = await manager.searchNodes(query || '', filters);

            // Convert to expected search result format
            const searchResult = {
                nodes: nodes.map(node => ({
                    node,
                    score: 1.0, // Default score since manager doesn't provide scoring
                    highlights: [],
                    matchReason: 'Content match'
                })),
                totalCount: nodes.length,
                metadata: {
                    searchTime: 0,
                    mode: 'hybrid' as const,
                    cached: false
                }
            };

            res.json(searchResult);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Search failed'
            });
        }
    }) as RequestHandler);

    /**
     * Search nodes via GET (for easier testing)
     */
    router.get('/search', (async (req: Request, res: Response) => {
        try {
            const query = req.query.query as string || '';
            const universeId = req.query.universeId as string;
            const limit = parseInt(req.query.limit as string) || 10;

            const filters: any = {};
            if (universeId) {
                filters.universeId = universeId;
            }

            const nodes = await manager.searchNodes(query, filters);

            // Limit results
            const limitedNodes = nodes.slice(0, limit);

            // Convert to expected search result format
            const searchResult = {
                nodes: limitedNodes.map(node => ({
                    node,
                    score: 1.0, // Default score since manager doesn't provide scoring
                    highlights: [],
                    matchReason: 'Content match'
                })),
                totalCount: limitedNodes.length,
                metadata: {
                    searchTime: 0,
                    mode: 'hybrid' as const,
                    cached: false
                }
            };

            res.json(searchResult);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Search failed'
            });
        }
    }) as RequestHandler);

    /**
     * Simple context assembly (simplified version)
     */
    router.post('/context', (async (req: Request, res: Response) => {
        try {
            const { nodeIds, maxLayers } = req.body;

            if (!nodeIds || !Array.isArray(nodeIds)) {
                return res.status(400).json({ error: 'nodeIds array is required' });
            }

            // Get all requested nodes and their immediate connections
            const contextNodes = [];
            for (const nodeId of nodeIds) {
                const node = await manager.getNode(nodeId);
                if (node) {
                    contextNodes.push(node);

                    // Get connected nodes if maxLayers > 1
                    if (maxLayers && maxLayers > 1) {
                        const connected = await manager.getConnectedNodes(nodeId, maxLayers - 1);
                        contextNodes.push(...connected.nodes);
                    }
                }
            }

            // Simple context result
            const contextResult = {
                layers: [{
                    nodes: contextNodes.map(node => ({
                        node,
                        relevance: 1.0,
                        connectionPath: []
                    })),
                    distance: 0
                }],
                metadata: {
                    totalNodes: contextNodes.length,
                    maxLayers: maxLayers || 1,
                    assemblyTime: 0,
                    fromCache: false
                }
            };

            res.json(contextResult);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Context assembly failed'
            });
        }
    }) as RequestHandler);

    /**
     * Universe-specific endpoints
     */
    router.get('/universes/:universeId/stats', (async (req: Request, res: Response) => {
        try {
            // Filter stats by universe - simplified implementation
            const stats = await manager.getStats();
            res.json({
                ...stats,
                universeId: req.params.universeId
            });
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get universe stats'
            });
        }
    }) as RequestHandler);

    router.post('/universes/:universeId/sync', (async (req: Request, res: Response) => {
        try {
            // Placeholder for universe sync
            res.json({
                universeId: req.params.universeId,
                status: 'synced',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Universe sync failed'
            });
        }
    }) as RequestHandler);

    /**
     * Universe management endpoints (missing from test)
     */
    router.post('/universes', (async (req: Request, res: Response) => {
        try {
            const universeData = {
                ...req.body,
                type: 'universe' as RAGNodeType
            };
            const universe = await manager.createNode(universeData);
            res.status(201).json(universe);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to create universe'
            });
        }
    }) as RequestHandler);

    router.get('/universes/user/:userId', (async (req: Request, res: Response) => {
        try {
            // Search for universes owned by user
            const universes = await manager.searchNodes('', {
                type: 'universe',
                ownerId: req.params.userId
            });
            res.json({
                universes,
                totalCount: universes.length
            });
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get user universes'
            });
        }
    }) as RequestHandler);

    logger.info(`RAG router created with ${router.stack?.length || 'multiple'} endpoints`);
    return router;
}
