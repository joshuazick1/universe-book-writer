/**
 * RAG API Controller
 * 
 * REST API endpoints for interacting with the RAG integration system.
 * Provides high-performance database queries with optional RAG enrichment.
 */

import { Request, Response } from 'express';
import { RAGIntegrationService } from '../services/rag-integration.service.js';
import { RAGNodeQuery, RAGRelationshipQuery } from '../schemas/rag-storage.schema.js';

/**
 * Controller for RAG API endpoints
 */
export class RAGController {
    constructor(private ragService: RAGIntegrationService) { }

    /**
     * Search RAG nodes with database performance
     * GET /api/rag/nodes/search
     */
    searchNodes = async (req: Request, res: Response): Promise<void> => {
        try {
            const query: RAGNodeQuery & { enrichFromRAG?: boolean } = {
                universeId: req.query.universeId as string,
                nodeType: req.query.nodeType as string,
                searchText: req.query.searchText as string,
                tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
                encryptionLevel: req.query.encryptionLevel as 'none' | 'partial' | 'full',
                timelineRange: req.query.timelineFrom || req.query.timelineTo ? {
                    from: req.query.timelineFrom ? Number(req.query.timelineFrom) : undefined,
                    to: req.query.timelineTo ? Number(req.query.timelineTo) : undefined
                } : undefined,
                pluginType: req.query.pluginType as string,
                limit: req.query.limit ? Number(req.query.limit) : 50,
                offset: req.query.offset ? Number(req.query.offset) : 0,
                enrichFromRAG: req.query.enrichFromRAG === 'true'
            };

            // Validate required parameters
            if (!query.universeId) {
                res.status(400).json({
                    error: 'universeId is required'
                });
                return;
            }

            const results = await this.ragService.searchNodes(query);

            res.json({
                success: true,
                data: results,
                query: {
                    ...query,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('RAG nodes search failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get specific RAG node with optional enrichment
     * GET /api/rag/nodes/:ragId
     */
    getNode = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ragId } = req.params;
            const enrichFromRAG = req.query.enrichFromRAG === 'true';

            // Get from database index first
            const dbNode = await this.ragService.storageAdapter.getRAGNodeById(ragId);

            if (!dbNode) {
                res.status(404).json({
                    error: 'Node not found'
                });
                return;
            }

            let result: any = {
                success: true,
                data: dbNode
            };

            // Enrich with RAG data if requested
            if (enrichFromRAG) {
                const ragData = await this.ragService.getRichRAGData([ragId]);
                if (ragData.length > 0) {
                    result.enriched = ragData[0];
                }
            }

            res.json(result);

        } catch (error) {
            console.error('RAG node retrieval failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Search RAG relationships
     * GET /api/rag/relationships/search
     */
    searchRelationships = async (req: Request, res: Response): Promise<void> => {
        try {
            const query: RAGRelationshipQuery = {
                universeId: req.query.universeId as string,
                sourceNodeId: req.query.sourceNodeId as string,
                targetNodeId: req.query.targetNodeId as string,
                relationshipType: req.query.relationshipType as string,
                temporalScope: req.query.temporalScope as 'always' | 'period' | 'event',
                timelinePosition: req.query.timelinePosition ? Number(req.query.timelinePosition) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : 50,
                offset: req.query.offset ? Number(req.query.offset) : 0
            };

            // Validate required parameters
            if (!query.universeId) {
                res.status(400).json({
                    error: 'universeId is required'
                });
                return;
            }

            const results = await this.ragService.storageAdapter.searchRAGRelationships(query);

            res.json({
                success: true,
                data: results,
                query: {
                    ...query,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('RAG relationships search failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get relationships for a specific node
     * GET /api/rag/nodes/:ragId/relationships
     */
    getNodeRelationships = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ragId } = req.params;
            const relationshipType = req.query.relationshipType as string;

            const relationships = await this.ragService.storageAdapter.getNodeRelationships(ragId, relationshipType);

            res.json({
                success: true,
                data: relationships,
                nodeId: ragId,
                relationshipType
            });

        } catch (error) {
            console.error('Node relationships retrieval failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get AI context for a node
     * POST /api/rag/context/assemble
     */
    assembleContext = async (req: Request, res: Response): Promise<void> => {
        try {
            const { focusNodeId, contextLayers = 3, includeTimeline = true } = req.body;

            if (!focusNodeId) {
                res.status(400).json({
                    error: 'focusNodeId is required'
                });
                return;
            }

            const context = await this.ragService.getContextForAI(focusNodeId, contextLayers);

            res.json({
                success: true,
                data: context,
                parameters: {
                    focusNodeId,
                    contextLayers,
                    includeTimeline,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Context assembly failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get universe information
     * GET /api/rag/universes/:universeId
     */
    getUniverse = async (req: Request, res: Response): Promise<void> => {
        try {
            const { universeId } = req.params;

            const universe = await this.ragService.storageAdapter.getUniverseById(universeId);

            if (!universe) {
                res.status(404).json({
                    error: 'Universe not found'
                });
                return;
            }

            res.json({
                success: true,
                data: universe
            });

        } catch (error) {
            console.error('Universe retrieval failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get user's universes
     * GET /api/rag/users/:userId/universes
     */
    getUserUniverses = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;

            const universes = await this.ragService.storageAdapter.getUserUniverses(userId);

            res.json({
                success: true,
                data: universes,
                count: universes.length
            });

        } catch (error) {
            console.error('User universes retrieval failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Trigger manual sync from RAG system
     * POST /api/rag/sync
     */
    triggerSync = async (req: Request, res: Response): Promise<void> => {
        try {
            const results = await this.ragService.syncFromRAG();

            res.json({
                success: true,
                data: results,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Manual sync failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Handle RAG system webhooks
     * POST /api/rag/webhook
     */
    handleWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            const event = req.body;

            // Validate webhook event structure
            if (!event.type || !event.data || !event.timestamp) {
                res.status(400).json({
                    error: 'Invalid webhook event structure'
                });
                return;
            }

            await this.ragService.handleRAGWebhook(event);

            res.json({
                success: true,
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            console.error('Webhook processing failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get RAG integration health status
     * GET /api/rag/health
     */
    getHealth = async (req: Request, res: Response): Promise<void> => {
        try {
            const health = await this.ragService.getHealthStatus();
            const stats = await this.ragService.storageAdapter.getStats();

            res.json({
                success: true,
                data: {
                    ...health,
                    statistics: stats,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Health check failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get RAG system statistics
     * GET /api/rag/stats
     */
    getStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.ragService.storageAdapter.getStats();

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Stats retrieval failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Advanced search with facets and filters
     * POST /api/rag/search/advanced
     */
    advancedSearch = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                universeId,
                query = {},
                facets = true,
                timeline = false,
                enrichFromRAG = false,
                contextDepth = 1
            } = req.body;

            if (!universeId) {
                res.status(400).json({
                    error: 'universeId is required'
                });
                return;
            }

            // Build search query
            const searchQuery: RAGNodeQuery & { enrichFromRAG?: boolean } = {
                universeId,
                ...query,
                enrichFromRAG
            };

            const results = await this.ragService.searchNodes(searchQuery);

            // Add timeline data if requested
            let timelineData;
            if (timeline && results.nodes.length > 0) {
                // Build timeline for found nodes
                timelineData = results.nodes
                    .filter(node => node.timelinePosition !== undefined)
                    .sort((a, b) => (a.timelinePosition || 0) - (b.timelinePosition || 0))
                    .map(node => ({
                        ragId: node.ragId,
                        title: node.title,
                        timelinePosition: node.timelinePosition,
                        stardateEquivalent: node.stardateEquivalent,
                        nodeType: node.nodeType
                    }));
            }

            res.json({
                success: true,
                data: {
                    ...results,
                    timeline: timelineData
                },
                parameters: {
                    universeId,
                    query,
                    facets,
                    timeline,
                    enrichFromRAG,
                    contextDepth,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Advanced search failed:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}

/**
 * Create RAG controller instance
 */
export function createRAGController(ragService: RAGIntegrationService): RAGController {
    return new RAGController(ragService);
}
