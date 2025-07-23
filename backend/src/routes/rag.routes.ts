/**
 * RAG API Routes
 * 
 * Express router configuration for RAG integration endpoints.
 * Provides REST API access to the hybrid RAG+DB system.
 */

import { Router } from 'express';
import { RAGController } from '../controllers/rag.controller.js';
import { RAGIntegrationService } from '../services/rag-integration.service.js';

/**
 * Create RAG API routes
 */
export function createRAGRoutes(ragService: RAGIntegrationService): Router {
    const router = Router();
    const controller = new RAGController(ragService);

    // ========================================
    // NODE ENDPOINTS
    // ========================================

    /**
     * Search RAG nodes
     * GET /api/rag/nodes/search?universeId=xxx&nodeType=character&searchText=...
     */
    router.get('/nodes/search', controller.searchNodes);

    /**
     * Get specific RAG node
     * GET /api/rag/nodes/:ragId?enrichFromRAG=true
     */
    router.get('/nodes/:ragId', controller.getNode);

    /**
     * Get relationships for a node
     * GET /api/rag/nodes/:ragId/relationships?relationshipType=friendship
     */
    router.get('/nodes/:ragId/relationships', controller.getNodeRelationships);

    // ========================================
    // RELATIONSHIP ENDPOINTS
    // ========================================

    /**
     * Search RAG relationships
     * GET /api/rag/relationships/search?universeId=xxx&sourceNodeId=...
     */
    router.get('/relationships/search', controller.searchRelationships);

    // ========================================
    // UNIVERSE ENDPOINTS
    // ========================================

    /**
     * Get universe information
     * GET /api/rag/universes/:universeId
     */
    router.get('/universes/:universeId', controller.getUniverse);

    /**
     * Get user's universes
     * GET /api/rag/users/:userId/universes
     */
    router.get('/users/:userId/universes', controller.getUserUniverses);

    // ========================================
    // CONTEXT AND AI ENDPOINTS
    // ========================================

    /**
     * Assemble context for AI interaction
     * POST /api/rag/context/assemble
     * Body: { focusNodeId: string, contextLayers?: number, includeTimeline?: boolean }
     */
    router.post('/context/assemble', controller.assembleContext);

    /**
     * Advanced search with facets and timeline
     * POST /api/rag/search/advanced
     * Body: { universeId: string, query: {}, facets?: boolean, timeline?: boolean, enrichFromRAG?: boolean }
     */
    router.post('/search/advanced', controller.advancedSearch);

    // ========================================
    // SYNC AND WEBHOOK ENDPOINTS
    // ========================================

    /**
     * Trigger manual sync from RAG system
     * POST /api/rag/sync
     */
    router.post('/sync', controller.triggerSync);

    /**
     * Handle RAG system webhooks
     * POST /api/rag/webhook
     */
    router.post('/webhook', controller.handleWebhook);

    // ========================================
    // HEALTH AND MONITORING ENDPOINTS
    // ========================================

    /**
     * Get RAG integration health status
     * GET /api/rag/health
     */
    router.get('/health', controller.getHealth);

    /**
     * Get RAG system statistics
     * GET /api/rag/stats
     */
    router.get('/stats', controller.getStats);

    return router;
}

/**
 * RAG API route configuration with middleware
 */
export interface RAGRouteConfig {
    basePath: string;                 // Base path for RAG routes (e.g., '/api/rag')
    authMiddleware?: any;             // Authentication middleware
    rateLimitMiddleware?: any;        // Rate limiting middleware
    corsMiddleware?: any;             // CORS middleware
    loggerMiddleware?: any;           // Request logging middleware
}

/**
 * Create configured RAG routes with middleware
 */
export function createConfiguredRAGRoutes(
    ragService: RAGIntegrationService,
    config: RAGRouteConfig
): Router {
    const router = Router();

    // Apply middleware in order
    if (config.corsMiddleware) {
        router.use(config.corsMiddleware);
    }

    if (config.loggerMiddleware) {
        router.use(config.loggerMiddleware);
    }

    if (config.rateLimitMiddleware) {
        router.use(config.rateLimitMiddleware);
    }

    if (config.authMiddleware) {
        // Auth middleware for protected endpoints
        router.use([
            '/nodes/search',
            '/nodes/:ragId',
            '/relationships/search',
            '/universes/:universeId',
            '/users/:userId/universes',
            '/context/assemble',
            '/search/advanced',
            '/sync'
        ], config.authMiddleware);
    }

    // Mount RAG routes
    const ragRoutes = createRAGRoutes(ragService);
    router.use(ragRoutes);

    return router;
}

/**
 * Route documentation for API docs generation
 */
export const RAG_ROUTE_DOCS = {
    '/api/rag/nodes/search': {
        method: 'GET',
        description: 'Search RAG nodes using database indexes',
        parameters: [
            { name: 'universeId', type: 'string', required: true, description: 'Universe ID to search within' },
            { name: 'nodeType', type: 'string', required: false, description: 'Filter by node type (character, location, etc.)' },
            { name: 'searchText', type: 'string', required: false, description: 'Full-text search query' },
            { name: 'tags', type: 'string', required: false, description: 'Comma-separated tags to filter by' },
            { name: 'encryptionLevel', type: 'string', required: false, description: 'Filter by encryption level (none, partial, full)' },
            { name: 'timelineFrom', type: 'number', required: false, description: 'Timeline range start position' },
            { name: 'timelineTo', type: 'number', required: false, description: 'Timeline range end position' },
            { name: 'pluginType', type: 'string', required: false, description: 'Filter by plugin type' },
            { name: 'limit', type: 'number', required: false, description: 'Maximum results to return (default: 50)' },
            { name: 'offset', type: 'number', required: false, description: 'Results offset for pagination (default: 0)' },
            { name: 'enrichFromRAG', type: 'boolean', required: false, description: 'Include rich RAG data in response' }
        ],
        response: {
            success: true,
            data: {
                nodes: 'IRAGNodeDocument[]',
                totalCount: 'number',
                facets: 'object',
                ragEnriched: 'any[] (if enrichFromRAG=true)'
            }
        }
    },

    '/api/rag/nodes/:ragId': {
        method: 'GET',
        description: 'Get specific RAG node by ID',
        parameters: [
            { name: 'ragId', type: 'string', required: true, description: 'RAG node ID' },
            { name: 'enrichFromRAG', type: 'boolean', required: false, description: 'Include rich RAG data' }
        ],
        response: {
            success: true,
            data: 'IRAGNodeDocument',
            enriched: 'any (if enrichFromRAG=true)'
        }
    },

    '/api/rag/context/assemble': {
        method: 'POST',
        description: 'Assemble multi-layer context for AI interaction',
        body: {
            focusNodeId: 'string (required)',
            contextLayers: 'number (optional, default: 3)',
            includeTimeline: 'boolean (optional, default: true)'
        },
        response: {
            success: true,
            data: 'assembled context object',
            parameters: 'request parameters with timestamp'
        }
    },

    '/api/rag/search/advanced': {
        method: 'POST',
        description: 'Advanced search with facets, timeline, and enrichment',
        body: {
            universeId: 'string (required)',
            query: 'object (search parameters)',
            facets: 'boolean (optional, default: true)',
            timeline: 'boolean (optional, default: false)',
            enrichFromRAG: 'boolean (optional, default: false)',
            contextDepth: 'number (optional, default: 1)'
        },
        response: {
            success: true,
            data: {
                nodes: 'IRAGNodeDocument[]',
                totalCount: 'number',
                facets: 'object',
                timeline: 'array (if timeline=true)',
                ragEnriched: 'any[] (if enrichFromRAG=true)'
            }
        }
    },

    '/api/rag/health': {
        method: 'GET',
        description: 'Get RAG integration system health status',
        response: {
            success: true,
            data: {
                status: 'healthy | degraded | unhealthy',
                aiServer: 'health status object',
                database: 'health status object',
                statistics: 'database statistics',
                timestamp: 'ISO timestamp'
            }
        }
    }
};
