/**
 * RAG Storage Database Adapter
 * 
 * Database adapter for the hybrid RAG+DB storage system.
 * Implements the database index layer that works with the RAG system
 * in the AI server to provide high-performance queries and metadata management.
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import {
    IRAGNodeDocument,
    IRAGRelationshipDocument,
    IUniverseDocument,
    RAGNodeQuery,
    RAGRelationshipQuery,
    RAGNodeSearchResult,
    RAGRelationshipSearchResult,
    RAGNodeValidation,
    RAGRelationshipValidation,
    UniverseValidation,
    COLLECTIONS,
    IndexDefinition
} from '../schemas/rag-storage.schema.js';

/**
 * Database adapter for RAG storage operations
 */
export class RAGStorageAdapter {
    private client: MongoClient;
    private db!: Db; // Definite assignment assertion - will be set in connect()
    private isConnected: boolean = false;

    constructor(
        private connectionString: string,
        private databaseName: string = 'verseforge_rag_dev'
    ) {
        this.client = new MongoClient(connectionString);
    }

    /**
     * Connect to MongoDB and initialize collections/indexes
     */
    async connect(): Promise<void> {
        if (this.isConnected) return;

        await this.client.connect();
        this.db = this.client.db(this.databaseName);

        // Initialize collections and indexes
        await this.initializeCollections();

        this.isConnected = true;
        console.log(`Connected to RAG storage database: ${this.databaseName}`);
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log('Disconnected from RAG storage database');
        }
    }

    /**
     * Initialize collections and create indexes
     */
    private async initializeCollections(): Promise<void> {
        // Create collections if they don't exist
        const collections = await this.db.listCollections().toArray();
        const existingNames = collections.map(c => c.name);

        for (const collectionName of Object.values(COLLECTIONS)) {
            if (!existingNames.includes(collectionName)) {
                await this.db.createCollection(collectionName);
                console.log(`Created collection: ${collectionName}`);
            }
        }

        // Create indexes
        await this.createIndexes();
    }

    /**
     * Create database indexes for performance
     */
    private async createIndexes(): Promise<void> {
        // RAG Nodes indexes
        const ragNodesCollection = this.db.collection(COLLECTIONS.RAG_NODES);
        const existingIndexes = await ragNodesCollection.indexes();
        console.log('Existing indexes for rag_nodes:', existingIndexes);
        for (const indexSpec of RAGNodeValidation.indexes) {
            try {
                console.log('Attempting to create index on rag_nodes:', indexSpec);
                await ragNodesCollection.createIndex(indexSpec as any);
            } catch (error) {
                console.warn(`Failed to create RAG nodes index:`, indexSpec, error);
            }
        }

        // RAG Relationships indexes
        const ragRelationshipsCollection = this.db.collection(COLLECTIONS.RAG_RELATIONSHIPS);
        for (const indexSpec of RAGRelationshipValidation.indexes) {
            try {
                await ragRelationshipsCollection.createIndex(indexSpec as any);
            } catch (error) {
                console.warn(`Failed to create RAG relationships index:`, indexSpec, error);
            }
        }

        // Universes indexes
        const universesCollection = this.db.collection(COLLECTIONS.UNIVERSES);
        for (const indexSpec of UniverseValidation.indexes) {
            try {
                await universesCollection.createIndex(indexSpec as any);
            } catch (error) {
                console.warn(`Failed to create universes index:`, indexSpec, error);
            }
        }

        console.log('RAG storage indexes created');
    }

    // ========================================
    // RAG NODE OPERATIONS
    // ========================================

    /**
     * Create or update a RAG node in the database index
     */
    async upsertRAGNode(node: Omit<IRAGNodeDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
        const errors = RAGNodeValidation.validate(node);
        if (errors.length > 0) {
            throw new Error(`RAG node validation failed: ${errors.join(', ')}`);
        }

        const collection = this.db.collection<IRAGNodeDocument>(COLLECTIONS.RAG_NODES);
        const now = new Date();

        const result = await collection.findOneAndUpdate(
            { ragId: node.ragId },
            {
                $set: {
                    ...node,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        return result!._id!;
    }

    /**
     * Search RAG nodes with filtering and pagination
     */
    async searchRAGNodes(query: RAGNodeQuery): Promise<RAGNodeSearchResult> {
        const collection = this.db.collection<IRAGNodeDocument>(COLLECTIONS.RAG_NODES);

        // Build MongoDB query
        const mongoQuery: any = {
            universeId: query.universeId
        };

        if (query.nodeType) {
            mongoQuery.nodeType = query.nodeType;
        }

        if (query.encryptionLevel) {
            mongoQuery.encryptionLevel = query.encryptionLevel;
        }

        if (query.pluginType) {
            mongoQuery.pluginType = query.pluginType;
        }

        if (query.tags && query.tags.length > 0) {
            mongoQuery.tags = { $in: query.tags };
        }

        if (query.timelineRange) {
            const timelineQuery: any = {};
            if (query.timelineRange.from !== undefined) {
                timelineQuery.$gte = query.timelineRange.from;
            }
            if (query.timelineRange.to !== undefined) {
                timelineQuery.$lte = query.timelineRange.to;
            }
            if (Object.keys(timelineQuery).length > 0) {
                mongoQuery.timelinePosition = timelineQuery;
            }
        }

        if (query.searchText) {
            mongoQuery.$text = { $search: query.searchText };
        }

        // Execute search
        const cursor = collection.find(mongoQuery)
            .sort({ lastAccessedAt: -1 })
            .skip(query.offset || 0)
            .limit(query.limit || 50);

        const nodes = await cursor.toArray();
        const totalCount = await collection.countDocuments(mongoQuery);

        // Generate facets
        const facets = await this.generateRAGNodeFacets(mongoQuery);

        return {
            nodes,
            totalCount,
            facets
        };
    }

    /**
     * Get RAG node by ID
     */
    async getRAGNodeById(ragId: string): Promise<IRAGNodeDocument | null> {
        const collection = this.db.collection<IRAGNodeDocument>(COLLECTIONS.RAG_NODES);

        // Update access tracking
        await collection.updateOne(
            { ragId },
            {
                $inc: { accessCount: 1 },
                $set: { lastAccessedAt: new Date() }
            }
        );

        return await collection.findOne({ ragId });
    }

    /**
     * Delete RAG node
     */
    async deleteRAGNode(ragId: string): Promise<boolean> {
        const collection = this.db.collection<IRAGNodeDocument>(COLLECTIONS.RAG_NODES);
        const result = await collection.deleteOne({ ragId });
        return result.deletedCount > 0;
    }

    /**
     * Generate facets for RAG node search results
     */
    private async generateRAGNodeFacets(baseQuery: any): Promise<RAGNodeSearchResult['facets']> {
        const collection = this.db.collection<IRAGNodeDocument>(COLLECTIONS.RAG_NODES);

        const [nodeTypesFacet, tagsFacet, encryptionFacet] = await Promise.all([
            // Node types facet
            collection.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$nodeType', count: { $sum: 1 } } }
            ]).toArray(),

            // Tags facet
            collection.aggregate([
                { $match: baseQuery },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 }
            ]).toArray(),

            // Encryption levels facet
            collection.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$encryptionLevel', count: { $sum: 1 } } }
            ]).toArray()
        ]);

        return {
            nodeTypes: Object.fromEntries(nodeTypesFacet.map(f => [f._id, f.count])),
            tags: Object.fromEntries(tagsFacet.map(f => [f._id, f.count])),
            encryptionLevels: Object.fromEntries(encryptionFacet.map(f => [f._id, f.count]))
        };
    }

    // ========================================
    // RAG RELATIONSHIP OPERATIONS
    // ========================================

    /**
     * Create or update a RAG relationship
     */
    async upsertRAGRelationship(relationship: Omit<IRAGRelationshipDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
        const errors = RAGRelationshipValidation.validate(relationship);
        if (errors.length > 0) {
            throw new Error(`RAG relationship validation failed: ${errors.join(', ')}`);
        }

        const collection = this.db.collection<IRAGRelationshipDocument>(COLLECTIONS.RAG_RELATIONSHIPS);
        const now = new Date();

        const result = await collection.findOneAndUpdate(
            { relationshipId: relationship.relationshipId },
            {
                $set: {
                    ...relationship,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        return result!._id!;
    }

    /**
     * Search RAG relationships
     */
    async searchRAGRelationships(query: RAGRelationshipQuery): Promise<RAGRelationshipSearchResult> {
        const collection = this.db.collection<IRAGRelationshipDocument>(COLLECTIONS.RAG_RELATIONSHIPS);

        // Build MongoDB query
        const mongoQuery: any = {
            universeId: query.universeId
        };

        if (query.sourceNodeId) {
            mongoQuery.sourceNodeId = query.sourceNodeId;
        }

        if (query.targetNodeId) {
            mongoQuery.targetNodeId = query.targetNodeId;
        }

        if (query.relationshipType) {
            mongoQuery.relationshipType = query.relationshipType;
        }

        if (query.temporalScope) {
            mongoQuery.temporalScope = query.temporalScope;
        }

        if (query.timelinePosition !== undefined) {
            mongoQuery.$and = [
                {
                    $or: [
                        { validFrom: { $lte: query.timelinePosition } },
                        { validFrom: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { validUntil: { $gte: query.timelinePosition } },
                        { validUntil: { $exists: false } }
                    ]
                }
            ];
        }

        // Execute search
        const cursor = collection.find(mongoQuery)
            .sort({ createdAt: -1 })
            .skip(query.offset || 0)
            .limit(query.limit || 50);

        const relationships = await cursor.toArray();
        const totalCount = await collection.countDocuments(mongoQuery);

        // Generate relationship types facet
        const relationshipTypesFacet = await collection.aggregate([
            { $match: mongoQuery },
            { $group: { _id: '$relationshipType', count: { $sum: 1 } } }
        ]).toArray();

        return {
            relationships,
            totalCount,
            relationshipTypes: Object.fromEntries(relationshipTypesFacet.map(f => [f._id, f.count]))
        };
    }

    /**
     * Get relationships for a specific node
     */
    async getNodeRelationships(nodeId: string, relationshipType?: string): Promise<IRAGRelationshipDocument[]> {
        const collection = this.db.collection<IRAGRelationshipDocument>(COLLECTIONS.RAG_RELATIONSHIPS);

        const query: any = {
            $or: [
                { sourceNodeId: nodeId },
                { targetNodeId: nodeId }
            ]
        };

        if (relationshipType) {
            query.relationshipType = relationshipType;
        }

        return await collection.find(query).toArray();
    }

    /**
     * Delete RAG relationship
     */
    async deleteRAGRelationship(relationshipId: string): Promise<boolean> {
        const collection = this.db.collection<IRAGRelationshipDocument>(COLLECTIONS.RAG_RELATIONSHIPS);
        const result = await collection.deleteOne({ relationshipId });
        return result.deletedCount > 0;
    }

    // ========================================
    // UNIVERSE OPERATIONS
    // ========================================

    /**
     * Create or update universe
     */
    async upsertUniverse(universe: Omit<IUniverseDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
        const errors = UniverseValidation.validate(universe);
        if (errors.length > 0) {
            throw new Error(`Universe validation failed: ${errors.join(', ')}`);
        }

        const collection = this.db.collection<IUniverseDocument>(COLLECTIONS.UNIVERSES);
        const now = new Date();

        const result = await collection.findOneAndUpdate(
            { universeId: universe.universeId },
            {
                $set: {
                    ...universe,
                    updatedAt: now
                },
                $setOnInsert: {
                    createdAt: now
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        return result!._id!;
    }

    /**
     * Get universe by ID
     */
    async getUniverseById(universeId: string): Promise<IUniverseDocument | null> {
        const collection = this.db.collection<IUniverseDocument>(COLLECTIONS.UNIVERSES);
        return await collection.findOne({ universeId });
    }

    /**
     * Get universes for a user
     */
    async getUserUniverses(userId: string): Promise<IUniverseDocument[]> {
        const collection = this.db.collection<IUniverseDocument>(COLLECTIONS.UNIVERSES);

        return await collection.find({
            $or: [
                { ownerId: userId },
                { collaborators: userId }
            ]
        })
            .sort({ lastActivityAt: -1 })
            .toArray();
    }

    /**
     * Update universe statistics
     */
    async updateUniverseStats(universeId: string, nodeCount: number, relationshipCount: number): Promise<void> {
        const collection = this.db.collection<IUniverseDocument>(COLLECTIONS.UNIVERSES);

        await collection.updateOne(
            { universeId },
            {
                $set: {
                    nodeCount,
                    relationshipCount,
                    lastActivityAt: new Date()
                }
            }
        );
    }

    /**
     * Delete universe and all its content
     */
    async deleteUniverse(universeId: string): Promise<void> {
        // Delete in order: relationships, nodes, universe
        await this.db.collection(COLLECTIONS.RAG_RELATIONSHIPS).deleteMany({ universeId });
        await this.db.collection(COLLECTIONS.RAG_NODES).deleteMany({ universeId });
        await this.db.collection(COLLECTIONS.UNIVERSES).deleteOne({ universeId });
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Health check for database connection
     */
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
        try {
            await this.db.admin().ping();
            return { status: 'healthy', message: 'Database connection is active' };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Clear all RAG data: universes, nodes, and relationships
     * DANGER: This wipes the entire RAG database.
     */
    async clearAll(): Promise<void> {
        await Promise.all([
            this.db.collection(COLLECTIONS.UNIVERSES).deleteMany({}),
            this.db.collection(COLLECTIONS.RAG_NODES).deleteMany({}),
            this.db.collection(COLLECTIONS.RAG_RELATIONSHIPS).deleteMany({})
        ]);
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        universes: number;
        nodes: number;
        relationships: number;
        indexes: number;
    }> {
        const [universeCount, nodeCount, relationshipCount] = await Promise.all([
            this.db.collection(COLLECTIONS.UNIVERSES).countDocuments(),
            this.db.collection(COLLECTIONS.RAG_NODES).countDocuments(),
            this.db.collection(COLLECTIONS.RAG_RELATIONSHIPS).countDocuments()
        ]);

        // Count indexes across all collections
        const indexCounts = await Promise.all([
            this.db.collection(COLLECTIONS.UNIVERSES).listIndexes().toArray(),
            this.db.collection(COLLECTIONS.RAG_NODES).listIndexes().toArray(),
            this.db.collection(COLLECTIONS.RAG_RELATIONSHIPS).listIndexes().toArray()
        ]);

        const totalIndexes = indexCounts.reduce((sum, indexes) => sum + indexes.length, 0);

        return {
            universes: universeCount,
            nodes: nodeCount,
            relationships: relationshipCount,
            indexes: totalIndexes
        };
    }
}

/**
 * Create and configure RAG storage adapter instance
 */
export function createRAGStorageAdapter(
    connectionString: string = 'mongodb://localhost:27017',
    databaseName: string = 'verseforge_rag_dev'
): RAGStorageAdapter {
    return new RAGStorageAdapter(connectionString, databaseName);
}
