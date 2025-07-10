/**
 * RAG Storage Service
 * 
 * Implements the hybrid RAG-first storage strategy with database indexing.
 * RAG system is the authoritative source, database serves as performance index.
 * Now includes encrypted update tracking for private content.
 */

import { RAGNode, RAGRelationship, RAGSearchRequest, RAGSearchResult } from '../core/types.js';
import { EncryptedRAGNode, EncryptedRAGRelationship } from '../encryption/rag-encryption.service.js';
import { RAGUpdateStorageService } from './update-storage.service.js';
import { RAGUpdateEncryptionService, RAGUpdate } from '../encryption/rag-update-encryption.service.js';

/**
 * Database index entry for RAG nodes
 */
export interface RAGNodeIndex {
    /** Node ID (matches RAG node ID) */
    id: string;

    /** Node type for filtering */
    type: string;

    /** Title for quick lookup */
    title: string;

    /** Universe ID for partitioning */
    universeId: string;

    /** Owner ID for access control */
    ownerId: string;

    /** Sensitivity level */
    sensitivity: string;

    /** Tags for filtering */
    tags: string[];

    /** Creation timestamp */
    createdAt: Date;

    /** Last modified timestamp */
    modifiedAt: Date;

    /** Content version */
    version: number;

    /** Whether content is encrypted */
    encrypted: boolean;

    /** Brief summary for search */
    briefSummary: string;

    /** Full-text searchable content (unencrypted only) */
    searchableText?: string;

    /** Temporal data for timeline queries */
    temporalStart?: Date;
    temporalEnd?: Date;
    temporalSequence?: number;

    /** Importance score */
    importance?: number;
}

/**
 * Database index entry for RAG relationships
 */
export interface RAGRelationshipIndex {
    /** Relationship ID */
    id: string;

    /** Source node ID */
    fromNodeId: string;

    /** Target node ID */
    toNodeId: string;

    /** Relationship type */
    type: string;

    /** Relationship weight */
    weight: number;

    /** Universe ID */
    universeId: string;

    /** Whether currently active */
    active: boolean;

    /** Whether encrypted */
    encrypted: boolean;

    /** Creation timestamp */
    createdAt: Date;

    /** Modification timestamp */
    modifiedAt: Date;

    /** Brief description for search */
    briefDescription?: string;
}

/**
 * Storage interface for RAG data persistence
 */
export interface RAGStorageBackend {
    // Node operations
    storeNode(node: RAGNode | EncryptedRAGNode): Promise<void>;
    retrieveNode(nodeId: string): Promise<RAGNode | EncryptedRAGNode | null>;
    updateNode(node: RAGNode | EncryptedRAGNode): Promise<void>;
    deleteNode(nodeId: string): Promise<void>;

    // Relationship operations
    storeRelationship(relationship: RAGRelationship | EncryptedRAGRelationship): Promise<void>;
    retrieveRelationship(relationshipId: string): Promise<RAGRelationship | EncryptedRAGRelationship | null>;
    updateRelationship(relationship: RAGRelationship | EncryptedRAGRelationship): Promise<void>;
    deleteRelationship(relationshipId: string): Promise<void>;

    // Graph traversal
    getNodeRelationships(nodeId: string, direction?: 'in' | 'out' | 'both'): Promise<(RAGRelationship | EncryptedRAGRelationship)[]>;
    getConnectedNodes(nodeId: string, maxDistance: number): Promise<{
        nodes: (RAGNode | EncryptedRAGNode)[];
        relationships: (RAGRelationship | EncryptedRAGRelationship)[];
        distances: Map<string, number>;
    }>;

    // Search operations
    searchNodes(query: string, filters?: any): Promise<(RAGNode | EncryptedRAGNode)[]>;
    searchByEmbedding(embedding: number[], topK: number, filters?: any): Promise<{
        nodes: (RAGNode | EncryptedRAGNode)[];
        scores: number[];
    }>;
}

/**
 * Database index interface for performance optimization
 */
export interface RAGDatabaseIndex {
    // Node index operations
    indexNode(node: RAGNode | EncryptedRAGNode): Promise<void>;
    updateNodeIndex(nodeId: string, updates: Partial<RAGNodeIndex>): Promise<void>;
    removeNodeIndex(nodeId: string): Promise<void>;

    // Relationship index operations
    indexRelationship(relationship: RAGRelationship | EncryptedRAGRelationship): Promise<void>;
    updateRelationshipIndex(relationshipId: string, updates: Partial<RAGRelationshipIndex>): Promise<void>;
    removeRelationshipIndex(relationshipId: string): Promise<void>;

    // Fast lookup operations
    findNodesByTitle(title: string, universeId?: string): Promise<RAGNodeIndex[]>;
    findNodesByType(type: string, universeId?: string): Promise<RAGNodeIndex[]>;
    findNodesByTags(tags: string[], universeId?: string): Promise<RAGNodeIndex[]>;
    findNodesByTimeRange(start: Date, end: Date, universeId?: string): Promise<RAGNodeIndex[]>;

    // Relationship queries
    findRelationshipsByType(type: string, universeId?: string): Promise<RAGRelationshipIndex[]>;
    findNodeConnections(nodeId: string): Promise<RAGRelationshipIndex[]>;

    // Performance queries
    getUniverseStats(universeId: string): Promise<{
        nodeCount: number;
        relationshipCount: number;
        typeDistribution: Record<string, number>;
        encryptedCount: number;
    }>;

    // Full-text search on indexes
    searchNodeIndexes(query: string, filters?: {
        universeId?: string;
        type?: string;
        tags?: string[];
        sensitivity?: string;
        encrypted?: boolean;
    }): Promise<RAGNodeIndex[]>;
}

/**
 * Main RAG Storage Service implementing hybrid approach with encrypted update tracking
 */
export class RAGStorageService {
    constructor(
        private ragBackend: RAGStorageBackend,
        private dbIndex: RAGDatabaseIndex,
        private updateStorage?: RAGUpdateStorageService,
        private updateEncryption?: RAGUpdateEncryptionService
    ) { }

    /**
     * Store a new RAG node (write-through to both systems) with update tracking
     */
    async storeNode(
        node: RAGNode | EncryptedRAGNode,
        userId?: string,
        description?: string
    ): Promise<void> {
        const startTime = Date.now();

        // Store in RAG backend (authoritative)
        await this.ragBackend.storeNode(node);

        // Index in database (performance)
        await this.dbIndex.indexNode(node);

        // Track update if update tracking is enabled
        if (this.updateStorage && this.updateEncryption && userId) {
            const update = this.updateEncryption.createUpdate(
                node.id,
                node.metadata.universeId,
                userId,
                'create',
                null, // No previous node for creation
                node,
                description
            );

            // Add processing time
            update.metadata.performanceMetrics = {
                processingTime: Date.now() - startTime
            };

            await this.updateStorage.storeUpdate(update);
        }
    }

    /**
     * Retrieve node with caching strategy
     */
    /**
     * Retrieve node with caching strategy
     */
    private nodeCache: Map<string, RAGNode | EncryptedRAGNode> = new Map();
    private nodeCacheTTL: number = 5 * 60 * 1000; // 5 minutes
    private nodeCacheTimestamps: Map<string, number> = new Map();

    async retrieveNode(nodeId: string, useCache: boolean = true): Promise<RAGNode | EncryptedRAGNode | null> {
        if (useCache) {
            const cached = this.nodeCache.get(nodeId);
            const ts = this.nodeCacheTimestamps.get(nodeId);
            if (cached && ts && (Date.now() - ts < this.nodeCacheTTL)) {
                return cached;
            }
        }
        const node = await this.ragBackend.retrieveNode(nodeId);
        if (useCache && node) {
            this.nodeCache.set(nodeId, node);
            this.nodeCacheTimestamps.set(nodeId, Date.now());
        }
        return node;
    }

    /**
     * Update node with automatic index sync and update tracking
     */
    async updateNode(
        node: RAGNode | EncryptedRAGNode,
        userId?: string,
        description?: string
    ): Promise<void> {
        const startTime = Date.now();

        // Get previous version for update tracking
        let previousNode: RAGNode | EncryptedRAGNode | null = null;
        if (this.updateStorage && this.updateEncryption && userId) {
            previousNode = await this.ragBackend.retrieveNode(node.id);
        }

        // Update in RAG backend
        await this.ragBackend.updateNode(node);

        // Update database index
        const indexUpdate = this.createNodeIndexUpdate(node);
        await this.dbIndex.updateNodeIndex(node.id, indexUpdate);

        // Track update if update tracking is enabled
        if (this.updateStorage && this.updateEncryption && userId) {
            const update = this.updateEncryption.createUpdate(
                node.id,
                node.metadata.universeId,
                userId,
                'update',
                previousNode,
                node,
                description
            );

            // Add processing time
            update.metadata.performanceMetrics = {
                processingTime: Date.now() - startTime
            };

            await this.updateStorage.storeUpdate(update);
        }
    }

    /**
     * Delete node and cleanup indexes with update tracking
     */
    async deleteNode(
        nodeId: string,
        userId?: string,
        reason?: string
    ): Promise<void> {
        const startTime = Date.now();

        // Get node for update tracking before deletion
        let previousNode: RAGNode | EncryptedRAGNode | null = null;
        let universeId: string = '';

        if (this.updateStorage && this.updateEncryption && userId) {
            previousNode = await this.ragBackend.retrieveNode(nodeId);
            if (previousNode) {
                universeId = previousNode.metadata.universeId;
            }
        }

        // Remove from RAG backend
        await this.ragBackend.deleteNode(nodeId);

        // Remove from index
        await this.dbIndex.removeNodeIndex(nodeId);

        // Track deletion if update tracking is enabled
        if (this.updateStorage && this.updateEncryption && userId && previousNode) {
            const update = this.updateEncryption.createUpdate(
                nodeId,
                universeId,
                userId,
                'delete',
                previousNode,
                null, // No new node for deletion
                reason
            );

            // Add processing time
            update.metadata.performanceMetrics = {
                processingTime: Date.now() - startTime
            };

            await this.updateStorage.storeUpdate(update);
        }
    }

    /**
     * Store relationship with indexing and update tracking
     */
    async storeRelationship(
        relationship: RAGRelationship | EncryptedRAGRelationship,
        userId?: string,
        description?: string
    ): Promise<void> {
        const startTime = Date.now();

        // Store in RAG backend
        await this.ragBackend.storeRelationship(relationship);

        // Index in database
        await this.dbIndex.indexRelationship(relationship);

        // Track relationship creation if update tracking is enabled
        if (this.updateStorage && this.updateEncryption && userId) {
            // Get universe ID from relationship metadata
            const universeId = this.getRelationshipUniverseId(relationship);

            // Create a simplified update for relationships
            const update: RAGUpdate = {
                id: this.generateUpdateId(relationship.id, new Date()),
                nodeId: relationship.id, // Use relationship ID as node ID for tracking
                universeId: universeId,
                userId,
                timestamp: new Date(),
                operation: 'create',
                changes: {
                    modifiedFields: ['*'],
                    previousValues: {},
                    newValues: { '*': 'relationship_created' }
                },
                version: 1,
                isPrivate: this.isRelationshipPrivate(relationship),
                description: description || `Created relationship: ${relationship.type}`,
                metadata: {
                    source: 'api',
                    performanceMetrics: {
                        processingTime: Date.now() - startTime
                    }
                }
            };

            await this.updateStorage.storeUpdate(update);
        }
    }

    /**
     * Fast node lookup using database index with RAG fallback
     */
    async findNodes(criteria: {
        universeId?: string;
        type?: string;
        title?: string;
        tags?: string[];
        timeRange?: { start: Date; end: Date };
        limit?: number;
    }): Promise<(RAGNode | EncryptedRAGNode)[]> {
        let indexes: RAGNodeIndex[] = [];

        // Use database index for fast filtering
        if (criteria.title) {
            indexes = await this.dbIndex.findNodesByTitle(criteria.title, criteria.universeId);
        } else if (criteria.type) {
            indexes = await this.dbIndex.findNodesByType(criteria.type, criteria.universeId);
        } else if (criteria.tags) {
            indexes = await this.dbIndex.findNodesByTags(criteria.tags, criteria.universeId);
        } else if (criteria.timeRange) {
            indexes = await this.dbIndex.findNodesByTimeRange(
                criteria.timeRange.start,
                criteria.timeRange.end,
                criteria.universeId
            );
        }

        // Apply additional filters
        indexes = this.filterIndexes(indexes, criteria);

        // Limit results for performance
        if (criteria.limit) {
            indexes = indexes.slice(0, criteria.limit);
        }

        // Retrieve full nodes from RAG backend
        const nodes: (RAGNode | EncryptedRAGNode)[] = [];
        for (const index of indexes) {
            const node = await this.ragBackend.retrieveNode(index.id);
            if (node) {
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Hybrid search: database pre-filtering + RAG semantic search
     */
    async searchNodes(request: RAGSearchRequest): Promise<RAGSearchResult> {
        const startTime = Date.now();

        // Simple in-memory cache for search results (keyed by query+filters)
        if (!this.searchCache) {
            this.searchCache = new Map();
            this.searchCacheTTL = 2 * 60 * 1000; // 2 minutes
            this.searchCacheTimestamps = new Map();
        }
        const cacheKey = JSON.stringify({
            query: request.query,
            filters: request.filters,
            universeId: request.universeId,
            mode: request.mode,
            limit: request.limit
        });
        const now = Date.now();
        const cachedResult = this.searchCache.get(cacheKey);
        const cachedTs = this.searchCacheTimestamps.get(cacheKey);
        if (cachedResult && cachedTs && (now - cachedTs < this.searchCacheTTL)) {
            return {
                ...cachedResult,
                metadata: {
                    ...cachedResult.metadata,
                    cached: true,
                    searchTime: Date.now() - startTime
                }
            };
        }

        // Phase 1: Database pre-filtering to reduce RAG search space
        const filters = {
            universeId: request.universeId,
            type: request.filters?.nodeTypes?.[0], // Use first type for initial filter
            tags: request.filters?.tags,
            sensitivity: request.filters?.minImportance ? undefined : 'public' // Only public if no importance filter
        };

        const candidateIndexes = await this.dbIndex.searchNodeIndexes(request.query, filters);

        // Phase 2: RAG semantic search on filtered candidates
        let ragCandidates: (RAGNode | EncryptedRAGNode)[] = [];
        if (candidateIndexes.length > 0) {
            // Retrieve full nodes for top candidates (limit to reduce cost)
            const topIndexes = candidateIndexes.slice(0, Math.min(100, candidateIndexes.length));
            for (const index of topIndexes) {
                // Use node cache for retrieval
                const node = await this.retrieveNode(index.id, true);
                if (node) {
                    ragCandidates.push(node);
                }
            }
        } else {
            // Fallback: search all nodes in universe (expensive)
            ragCandidates = await this.ragBackend.searchNodes(request.query, request.filters);
        }

        // Phase 3: Apply final filtering and ranking
        const filteredNodes = this.applyFilters(ragCandidates, request.filters);
        const rankedNodesPromise = this.rankSearchResults(filteredNodes, request.query, request.mode);
        const rankedNodes = await rankedNodesPromise;

        // Limit final results
        const limit = request.limit || 10;
        const finalNodes = rankedNodes.slice(0, limit);

        const searchTime = Date.now() - startTime;

        // AI-driven suggestions using mistral-nemo:12b (future: use orchestration-chosen model)
        const suggestions = await this.generateAISuggestions(request.query, request.universeId);

        const result: RAGSearchResult = {
            nodes: finalNodes.map(({ node, score, highlights, matchReason }: any) => ({
                node: node as RAGNode, // Note: Encrypted nodes should be decrypted before this point
                score,
                highlights,
                matchReason
            })),
            totalCount: rankedNodes.length,
            metadata: {
                searchTime,
                mode: request.mode,
                cached: false, // Will be set to true if returned from cache
                suggestions
            }
        };
        // Store in cache
        this.searchCache.set(cacheKey, result);
        this.searchCacheTimestamps.set(cacheKey, now);
        return result;
    }

    /**
     * Generate AI-driven suggestions for user queries/content using mistral-nemo:12b
     * NOTE: In the future, use an orchestration-chosen model for suggestions.
     */
    private async generateAISuggestions(query: string, universeId?: string): Promise<string[]> {
        // For now, call the local mistral-nemo:12b model via HTTP (Ollama or similar)
        // In production, this should be replaced with orchestration logic for model selection.
        try {
            const prompt = `Suggest 3 relevant topics, entities, or next steps for the following query in the context of universe '${universeId || 'default'}':\n"${query}"\nReturn as a JSON array of strings.`;
            const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
            const response = await fetchFn('http://localhost:5100/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'mistral-nemo:12b',
                    prompt,
                    stream: false
                })
            });
            if (!response.ok) return [];
            const data = await response.json();
            // Try to parse the model's output as a JSON array
            if (data && data.response) {
                try {
                    const arr = JSON.parse(data.response);
                    if (Array.isArray(arr)) return arr.map((s: any) => String(s));
                } catch {
                    // Fallback: return as single suggestion
                    return [data.response.trim()];
                }
            }
            return [];
        } catch (err) {
            return [];
        }
    }
    // --- Caching fields for searchNodes ---
    private searchCache: Map<string, RAGSearchResult> = new Map();
    private searchCacheTTL: number = 2 * 60 * 1000; // 2 minutes
    private searchCacheTimestamps: Map<string, number> = new Map();

    /**
     * Get connected nodes with performance optimization
     */
    async getConnectedNodes(
        nodeId: string,
        maxDistance: number,
        filters?: { types?: string[]; universeId?: string }
    ): Promise<{
        nodes: (RAGNode | EncryptedRAGNode)[];
        relationships: (RAGRelationship | EncryptedRAGRelationship)[];
        distances: Map<string, number>;
    }> {
        // Use database index for initial relationship discovery
        const relationshipIndexes = await this.dbIndex.findNodeConnections(nodeId);

        // Filter relationships if needed
        const filteredRelIndexes = filters?.universeId ?
            relationshipIndexes.filter(r => r.universeId === filters.universeId) :
            relationshipIndexes;

        // Use RAG backend for full graph traversal
        return await this.ragBackend.getConnectedNodes(nodeId, maxDistance);
    }

    /**
     * Get universe statistics
     */
    async getUniverseStats(universeId: string): Promise<{
        nodeCount: number;
        relationshipCount: number;
        typeDistribution: Record<string, number>;
        encryptedCount: number;
    }> {
        return await this.dbIndex.getUniverseStats(universeId);
    }

    /**
     * Sync database indexes with RAG data (for maintenance)
     */
    async syncIndexes(universeId?: string): Promise<{
        nodesProcessed: number;
        relationshipsProcessed: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let nodesProcessed = 0;
        let relationshipsProcessed = 0;

        // --- Full sync logic ---
        try {
            // 1. Scan all RAG nodes
            // (Assume ragBackend.searchNodes with empty query returns all nodes)
            const allNodes: (RAGNode | EncryptedRAGNode)[] = await this.ragBackend.searchNodes('', universeId ? { universeId } : undefined);
            const indexedNodes: Map<string, RAGNodeIndex> = new Map();
            // Gather all indexed node IDs for this universe
            const allNodeIndexes = universeId
                ? await this.dbIndex.searchNodeIndexes('', { universeId })
                : await this.dbIndex.searchNodeIndexes('', {});
            for (const idx of allNodeIndexes) indexedNodes.set(idx.id, idx);

            // Sync nodes: update/create missing indexes
            for (const node of allNodes) {
                try {
                    await this.dbIndex.indexNode(node);
                    nodesProcessed++;
                    indexedNodes.delete((node as any).id);
                } catch (err: any) {
                    errors.push(`Node ${((node as any).id)}: ${err.message || err}`);
                }
            }
            // Remove orphaned node indexes
            for (const orphanId of indexedNodes.keys()) {
                try {
                    await this.dbIndex.removeNodeIndex(orphanId);
                } catch (err: any) {
                    errors.push(`Orphan node index ${orphanId}: ${err.message || err}`);
                }
            }

            // 2. Scan all RAG relationships
            // (Assume ragBackend.getNodeRelationships for all nodes, or implement a method to get all relationships)
            // For now, collect all relationships from all nodes (may be optimized)
            const relMap: Map<string, RAGRelationship | EncryptedRAGRelationship> = new Map();
            for (const node of allNodes) {
                try {
                    const rels = await this.ragBackend.getNodeRelationships((node as any).id, 'both');
                    for (const rel of rels) {
                        relMap.set((rel as any).id, rel);
                    }
                } catch (err: any) {
                    errors.push(`Relationships for node ${((node as any).id)}: ${err.message || err}`);
                }
            }
            // Gather all indexed relationship IDs for this universe
            const allRelIndexes = universeId
                ? await this.dbIndex.findRelationshipsByType('', universeId)
                : await this.dbIndex.findRelationshipsByType('', undefined);
            const indexedRels: Map<string, RAGRelationshipIndex> = new Map();
            for (const idx of allRelIndexes) indexedRels.set(idx.id, idx);

            // Sync relationships: update/create missing indexes
            for (const rel of relMap.values()) {
                try {
                    await this.dbIndex.indexRelationship(rel);
                    relationshipsProcessed++;
                    indexedRels.delete((rel as any).id);
                } catch (err: any) {
                    errors.push(`Relationship ${((rel as any).id)}: ${err.message || err}`);
                }
            }
            // Remove orphaned relationship indexes
            for (const orphanId of indexedRels.keys()) {
                try {
                    await this.dbIndex.removeRelationshipIndex(orphanId);
                } catch (err: any) {
                    errors.push(`Orphan relationship index ${orphanId}: ${err.message || err}`);
                }
            }
        } catch (err: any) {
            errors.push(`Sync failed: ${err.message || err}`);
        }

        return {
            nodesProcessed,
            relationshipsProcessed,
            errors
        };
    }

    /**
     * Create index update from node
     */
    private createNodeIndexUpdate(node: RAGNode | EncryptedRAGNode): Partial<RAGNodeIndex> {
        const isEncrypted = 'encryptedContent' in node;
        const nodeData = node as RAGNode; // Safe cast for common fields

        return {
            type: node.type,
            title: node.title,
            universeId: node.metadata?.universeId || (node as any).publicMetadata?.universeId,
            ownerId: node.metadata?.ownerId || 'unknown',
            sensitivity: node.metadata?.sensitivity || 'private',
            tags: node.metadata?.tags || [],
            modifiedAt: node.timestamps.modified,
            version: node.metadata?.version || 1,
            encrypted: isEncrypted,
            briefSummary: isEncrypted ? '[Encrypted]' : nodeData.summaries?.brief || '',
            searchableText: isEncrypted ? undefined : nodeData.content?.description,
            temporalStart: node.temporal?.startDate ? new Date(node.temporal.startDate) : undefined,
            temporalEnd: node.temporal?.endDate ? new Date(node.temporal.endDate) : undefined,
            temporalSequence: node.temporal?.sequence,
            importance: node.metadata?.importance
        };
    }

    /**
     * Filter node indexes based on criteria
     */
    private filterIndexes(indexes: RAGNodeIndex[], criteria: any): RAGNodeIndex[] {
        return indexes.filter(index => {
            if (criteria.universeId && index.universeId !== criteria.universeId) return false;
            if (criteria.type && index.type !== criteria.type) return false;
            if (criteria.tags && !criteria.tags.some((tag: string) => index.tags.includes(tag))) return false;
            return true;
        });
    }

    /**
     * Apply filters to RAG nodes
     */
    private applyFilters(
        nodes: (RAGNode | EncryptedRAGNode)[],
        filters?: any
    ): (RAGNode | EncryptedRAGNode)[] {
        if (!filters) return nodes;

        return nodes.filter(node => {
            if (filters.nodeTypes && !filters.nodeTypes.includes(node.type)) return false;
            if (filters.universeIds && node.metadata && !filters.universeIds.includes(node.metadata.universeId)) return false;
            if (filters.tags && node.metadata && !filters.tags.some((tag: string) => node.metadata.tags.includes(tag))) return false;
            return true;
        });
    }

    /**
     * Rank search results based on query and mode
     */
    /**
     * Sophisticated ranking: combines semantic similarity, recency, importance, and user/contextual factors.
     * Uses embedding similarity if available, otherwise falls back to keyword and metadata scoring.
     */
    private async getQueryEmbedding(query: string): Promise<number[] | null> {
        // Example: Call local embedding endpoint (Ollama or similar)
        try {
            const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
            const response = await fetchFn('http://localhost:11434/api/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'mistral-nemo:12b', prompt: query })
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (data && Array.isArray(data.embedding)) return data.embedding;
            return null;
        } catch {
            return null;
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    }

    private async rankSearchResults(
        nodes: (RAGNode | EncryptedRAGNode)[],
        query: string,
        mode: string
    ): Promise<Array<{
        node: RAGNode | EncryptedRAGNode;
        score: number;
        highlights: string[];
        matchReason: string;
    }>> {
        // Get query embedding (if available)
        const queryEmbedding = await this.getQueryEmbedding(query);
        const queryLower = query.toLowerCase();
        const now = Date.now();

        // Score nodes
        const results = await Promise.all(nodes.map(async node => {
            const isEncrypted = 'encryptedContent' in node;
            const nodeData = node as RAGNode;
            let score = 0.0;
            let highlights: string[] = [];
            let matchReason = 'General match';

            // 1. Embedding similarity (if available)
            let embeddingScore = 0;
            if (!isEncrypted && Array.isArray((node as any).embeddings) && queryEmbedding) {
                embeddingScore = this.cosineSimilarity((node as any).embeddings, queryEmbedding);
                score += 0.5 * embeddingScore;
                if (embeddingScore > 0.7) {
                    matchReason = 'Semantic match';
                }
            }

            // 2. Title and content keyword match
            if (!isEncrypted && nodeData.content) {
                if (node.title.toLowerCase().includes(queryLower)) {
                    score += 0.25;
                    highlights.push(node.title);
                    matchReason = 'Title match';
                }
                const content = nodeData.content.description.toLowerCase();
                if (content.includes(queryLower)) {
                    score += 0.15;
                    const index = content.indexOf(queryLower);
                    const start = Math.max(0, index - 50);
                    const end = Math.min(content.length, index + query.length + 50);
                    highlights.push(content.substring(start, end));
                    matchReason = matchReason === 'Title match' ? 'Title and content match' : 'Content match';
                }
            }

            // 3. Recency (favor recently modified nodes)
            if (nodeData.timestamps?.modified) {
                const ageDays = (now - new Date(nodeData.timestamps.modified).getTime()) / (1000 * 60 * 60 * 24);
                const recencyScore = Math.max(0, 1 - ageDays / 30); // Decay over 30 days
                score += 0.1 * recencyScore;
            }

            // 4. Importance (metadata)
            if (typeof nodeData.metadata?.importance === 'number') {
                score += 0.1 * Math.min(1, nodeData.metadata.importance / 10);
            }

            // 5. Tag overlap (if query contains tags)
            // (Assume tags in query are comma-separated in the query string)
            const queryTags = query.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            if (queryTags.length && nodeData.metadata?.tags) {
                const overlap = nodeData.metadata.tags.filter((t: string) => queryTags.includes(t.toLowerCase())).length;
                if (overlap > 0) {
                    score += 0.05 * overlap;
                    matchReason = 'Tag match';
                }
            }

            // 6. Sensitivity (demote highly sensitive/private nodes unless user has access)
            if (nodeData.metadata?.sensitivity === 'private') {
                score -= 0.05;
            }

            return {
                node,
                score,
                highlights,
                matchReason
            };
        }));

        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Helper method to get universe ID from relationship (handles both encrypted and unencrypted)
     */
    private getRelationshipUniverseId(relationship: RAGRelationship | EncryptedRAGRelationship): string {
        if ('metadata' in relationship && relationship.metadata) {
            return relationship.metadata.universeId;
        }
        if ('publicMetadata' in relationship && relationship.publicMetadata) {
            return relationship.publicMetadata.universeId;
        }
        throw new Error('Unable to determine universe ID from relationship');
    }

    /**
     * Helper method to determine if relationship is private/encrypted
     */
    private isRelationshipPrivate(relationship: RAGRelationship | EncryptedRAGRelationship): boolean {
        if ('encryptedMetadata' in relationship) {
            return true; // This is an encrypted relationship
        }
        if ('privacy' in relationship && relationship.privacy) {
            return relationship.privacy.encrypted;
        }
        return false;
    }

    /**
     * Generate unique update ID
     */
    private generateUpdateId(entityId: string, timestamp: Date): string {
        const crypto = require('crypto');
        const data = `${entityId}-${timestamp.toISOString()}-${Math.random()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
}
