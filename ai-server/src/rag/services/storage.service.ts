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
    async retrieveNode(nodeId: string, useCache: boolean = true): Promise<RAGNode | EncryptedRAGNode | null> {
        // Always retrieve from authoritative RAG source
        return await this.ragBackend.retrieveNode(nodeId);
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
                const node = await this.ragBackend.retrieveNode(index.id);
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
        const rankedNodes = this.rankSearchResults(filteredNodes, request.query, request.mode);

        // Limit final results
        const limit = request.limit || 10;
        const finalNodes = rankedNodes.slice(0, limit);

        const searchTime = Date.now() - startTime;

        return {
            nodes: finalNodes.map(({ node, score, highlights, matchReason }) => ({
                node: node as RAGNode, // Note: Encrypted nodes should be decrypted before this point
                score,
                highlights,
                matchReason
            })),
            totalCount: rankedNodes.length,
            metadata: {
                searchTime,
                mode: request.mode,
                cached: false, // TODO: Implement caching
                suggestions: [] // TODO: Implement suggestions
            }
        };
    }

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

        // TODO: Implement full sync logic
        // This would involve:
        // 1. Scanning all RAG nodes/relationships
        // 2. Comparing with database indexes
        // 3. Updating/creating missing indexes
        // 4. Removing orphaned indexes

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
    private rankSearchResults(
        nodes: (RAGNode | EncryptedRAGNode)[],
        query: string,
        mode: string
    ): Array<{
        node: RAGNode | EncryptedRAGNode;
        score: number;
        highlights: string[];
        matchReason: string;
    }> {
        return nodes.map(node => {
            // Simple ranking for now - TODO: Implement sophisticated ranking
            const isEncrypted = 'encryptedContent' in node;
            const nodeData = node as RAGNode;

            let score = 0.5; // Base score
            let highlights: string[] = [];
            let matchReason = 'General match';

            if (!isEncrypted && nodeData.content) {
                const content = nodeData.content.description.toLowerCase();
                const queryLower = query.toLowerCase();

                if (node.title.toLowerCase().includes(queryLower)) {
                    score += 0.3;
                    highlights.push(node.title);
                    matchReason = 'Title match';
                }

                if (content.includes(queryLower)) {
                    score += 0.2;
                    const index = content.indexOf(queryLower);
                    const start = Math.max(0, index - 50);
                    const end = Math.min(content.length, index + query.length + 50);
                    highlights.push(content.substring(start, end));
                    matchReason = matchReason === 'Title match' ? 'Title and content match' : 'Content match';
                }
            }

            return {
                node,
                score,
                highlights,
                matchReason
            };
        }).sort((a, b) => b.score - a.score);
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
