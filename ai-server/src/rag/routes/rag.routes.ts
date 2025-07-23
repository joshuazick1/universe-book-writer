/**
 * RAG System API Routes
 * 
 * RESTful endpoints for the RAG knowledge graph system.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import {
    RAGNode,
    RAGRelationship,
    RAGContextRequest,
    RAGSearchRequest,
    RAGSearchMode,
    RAGNodeType,
    RAGRelationshipType
} from '../core/types.js';
import { RAGStorageService } from '../services/storage.service.js';
import { RAGContextAssemblyService } from '../services/context-assembly.service.js';
import { RAGNodeEncryptionService, RAGRelationshipEncryptionService } from '../encryption/rag-encryption.service.js';

/**
 * RAG API request/response types
 */
interface CreateNodeRequest {
    id?: string;
    type: RAGNodeType;
    content: Record<string, any>;
    metadata: {
        universeId: string;
        title: string;
        description?: string;
        tags?: string[];
        sensitivity?: 'low' | 'medium' | 'high';
        pluginData?: Record<string, any>;
    };
    privacy?: {
        encrypted?: boolean;
        encryptionLevel?: 'basic' | 'advanced' | 'quantum';
        accessControl?: {
            users: string[];
            roles: string[];
        };
    };
    timeline?: {
        startDate?: string;
        endDate?: string;
        era?: string;
        sequence?: number;
    };
}

interface SearchRequest {
    query?: string;
    mode?: RAGSearchMode;
    filters?: {
        universeId?: string;
        nodeTypes?: RAGNodeType[];
        relationshipTypes?: RAGRelationshipType[];
        tags?: string[];
        dateRange?: {
            start?: string;
            end?: string;
        };
    };
    limit?: number;
    offset?: number;
    userId: string;
}

/**
 * RAG Router Factory
 */
export function createRAGRouter(
    storageService: RAGStorageService,
    contextAssemblyService: RAGContextAssemblyService,
    nodeEncryptionService?: RAGNodeEncryptionService,
    relationshipEncryptionService?: RAGRelationshipEncryptionService
): Router {
    const router = Router();

    /**
     * Health check endpoint
     */
    router.get('/health', (async (req: Request, res: Response) => {
        try {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                encryption: {
                    nodes: !!nodeEncryptionService,
                    relationships: !!relationshipEncryptionService
                }
            });
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }) as RequestHandler);

    /**
     * NODE ENDPOINTS
     */

    // Create a new node
    router.post('/nodes', (async (req: Request, res: Response) => {
        try {
            const nodeData: CreateNodeRequest = req.body;

            // Validate required fields
            if (!nodeData.type || !nodeData.content || !nodeData.metadata) {
                return res.status(400).json({
                    error: 'Missing required fields: type, content, and metadata are required'
                });
            }

            if (!nodeData.metadata.universeId || !nodeData.metadata.title) {
                return res.status(400).json({
                    error: 'Missing required metadata: universeId and title are required'
                });
            }

            // Create the node
            // Get ownerId from auth context (middleware should set req.user)
            // Fallback to 'api-user' if not present
            const ownerId = (req as any).user?.id || 'api-user';
            const node: RAGNode = {
                id: nodeData.id || crypto.randomUUID(),
                type: nodeData.type,
                title: nodeData.metadata.title,
                content: {
                    description: nodeData.content.description || '',
                    attributes: nodeData.content.attributes,
                    structured: nodeData.content.structured,
                    fullText: nodeData.content.fullText
                },
                summaries: {
                    brief: '',
                    medium: '',
                    detailed: ''
                },
                embeddings: [],
                metadata: {
                    universeId: nodeData.metadata.universeId,
                    ownerId,
                    sensitivity: nodeData.metadata.sensitivity === 'low' ? 'public' :
                        nodeData.metadata.sensitivity === 'medium' ? 'private' :
                            nodeData.metadata.sensitivity === 'high' ? 'sensitive' : 'public',
                    tags: nodeData.metadata.tags || [],
                    version: 1
                },
                privacy: {
                    encrypted: nodeData.privacy?.encrypted || false,
                    encryptionLevel: nodeData.privacy?.encryptionLevel === 'advanced' ? 'sensitive' :
                        nodeData.privacy?.encryptionLevel === 'quantum' ? 'restricted' : 'basic',
                    accessList: nodeData.privacy?.accessControl?.users || [],
                    shareable: true
                },
                temporal: nodeData.timeline ? {
                    startDate: nodeData.timeline.startDate ? new Date(nodeData.timeline.startDate) : undefined,
                    endDate: nodeData.timeline.endDate ? new Date(nodeData.timeline.endDate) : undefined,
                    universeTime: nodeData.timeline.era,
                    sequence: nodeData.timeline.sequence
                } : undefined,
                pluginData: nodeData.metadata.pluginData,

                timestamps: {
                    created: new Date(),
                    modified: new Date()
                },
                active: true
            };

            await storageService.storeNode(node, ownerId);
            res.status(201).json(node);
        } catch (error) {
            console.error('Error creating node:', error);
            res.status(500).json({
                error: 'Failed to create node',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    // Get a node by ID
    router.get('/nodes/:id', (async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const node = await storageService.retrieveNode(id);

            if (!node) {
                return res.status(404).json({ error: 'Node not found' });
            }

            res.json(node);
        } catch (error) {
            console.error('Error retrieving node:', error);
            res.status(500).json({
                error: 'Failed to retrieve node',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    // Find nodes using database index
    router.get('/nodes', (async (req: Request, res: Response) => {
        try {
            const criteria = {
                universeId: req.query.universeId as string,
                type: req.query.type as string,
                title: req.query.title as string,
                tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50
            };

            const nodes = await storageService.findNodes(criteria);
            res.json(nodes);
        } catch (error) {
            console.error('Error finding nodes:', error);
            res.status(500).json({
                error: 'Failed to find nodes',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    // Update a node
    router.put('/nodes/:id', (async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData: Partial<RAGNode> = req.body;
            const ownerId = (req as any).user?.id || 'api-user';

            const existingNode = await storageService.retrieveNode(id);
            if (!existingNode) {
                return res.status(404).json({ error: 'Node not found' });
            }

            // Merge updates with existing node
            const updatedNode: RAGNode = {
                ...existingNode as RAGNode,
                ...updateData,
                id: id, // Ensure ID doesn't change
                metadata: {
                    ...existingNode.metadata,
                    ...updateData.metadata,
                    version: (existingNode.metadata?.version || 1) + 1,
                    ownerId
                },
                timestamps: {
                    ...existingNode.timestamps,
                    modified: new Date()
                }
            };

            await storageService.updateNode(updatedNode, ownerId);
            res.json(updatedNode);
        } catch (error) {
            console.error('Error updating node:', error);
            res.status(500).json({
                error: 'Failed to update node',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    // Delete a node
    router.delete('/nodes/:id', (async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const ownerId = (req as any).user?.id || 'api-user';
            await storageService.deleteNode(id, ownerId);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting node:', error);
            res.status(500).json({
                error: 'Failed to delete node',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    /**
     * RELATIONSHIP ENDPOINTS
     */

    // Store a new relationship
    router.post('/relationships', (async (req: Request, res: Response) => {
        try {
            const relationshipData = req.body;

            // Validate required fields
            if (!relationshipData.type || !relationshipData.sourceId || !relationshipData.targetId || !relationshipData.metadata) {
                return res.status(400).json({
                    error: 'Missing required fields: type, sourceId, targetId, and metadata are required'
                });
            }

            const relationship: RAGRelationship = {
                ...relationshipData,
                id: relationshipData.id || crypto.randomUUID(),
                metadata: {
                    ...relationshipData.metadata,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                version: 1
            };

            await storageService.storeRelationship(relationship);
            res.status(201).json(relationship);
        } catch (error) {
            console.error('Error creating relationship:', error);
            res.status(500).json({
                error: 'Failed to create relationship',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    /**
     * CONTEXT ASSEMBLY ENDPOINTS
     */

    // Get context for a focal node
    router.post('/context', (async (req: Request, res: Response) => {
        try {
            const contextRequest: RAGContextRequest = req.body;

            // Validate required fields
            if (!contextRequest.focalNodeId) {
                return res.status(400).json({
                    error: 'Missing required field: focalNodeId'
                });
            }

            // Verify focal node exists
            const focalNode = await storageService.retrieveNode(contextRequest.focalNodeId);
            if (!focalNode) {
                return res.status(404).json({ error: 'Focal node not found' });
            }

            const contextResult = await contextAssemblyService.assembleContext(contextRequest);
            res.json(contextResult);
        } catch (error) {
            console.error('Error assembling context:', error);
            res.status(500).json({
                error: 'Failed to assemble context',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    /**
     * SEARCH ENDPOINTS
     */

    // Search nodes and relationships  
    router.post('/search', (async (req: Request, res: Response) => {
        try {
            const searchRequest: SearchRequest = req.body;
            // Get userId from auth context if not provided
            const userId = searchRequest.userId || (req as any).user?.id || 'api-user';

            if (!searchRequest.query || !userId) {
                return res.status(400).json({
                    error: 'Missing required fields: query and userId are required'
                });
            }

            const ragSearchRequest: RAGSearchRequest = {
                query: searchRequest.query,
                mode: searchRequest.mode || 'hybrid',
                filters: searchRequest.filters,
                limit: searchRequest.limit || 50,
                userId,
                universeId: searchRequest.filters?.universeId
            };

            const results = await storageService.searchNodes(ragSearchRequest);
            res.json(results);
        } catch (error) {
            console.error('Error searching:', error);
            res.status(500).json({
                error: 'Failed to search',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    // Get connected nodes
    router.get('/nodes/:id/connected', (async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const depth = parseInt(req.query.depth as string) || 1;
            const maxNodes = parseInt(req.query.maxNodes as string) || 100;

            const result = await storageService.getConnectedNodes(id, depth, {
                universeId: req.query.universeId as string
            });
            res.json(result);
        } catch (error) {
            console.error('Error getting connected nodes:', error);
            res.status(500).json({
                error: 'Failed to get connected nodes',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    /**
     * UNIVERSE ENDPOINTS
     */

    // Get universe statistics
    router.get('/universes/:universeId/stats', (async (req: Request, res: Response) => {
        try {
            const { universeId } = req.params;
            const stats = await storageService.getUniverseStats(universeId);
            res.json(stats);
        } catch (error) {
            console.error('Error getting universe stats:', error);
            res.status(500).json({
                error: 'Failed to get universe stats',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    // Sync indexes for universe
    router.post('/universes/:universeId/sync', (async (req: Request, res: Response) => {
        try {
            const { universeId } = req.params;
            const result = await storageService.syncIndexes(universeId);
            res.json(result);
        } catch (error) {
            console.error('Error syncing indexes:', error);
            res.status(500).json({
                error: 'Failed to sync indexes',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as RequestHandler);

    return router;
}
