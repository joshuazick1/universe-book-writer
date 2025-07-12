import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type {
    RAGNode,
    RAGRelationship,
    RAGNodeType,
    RAGRelationshipType
} from '../core/types.js';
import type { RAGStorageBackend } from '../services/storage.service.js';
import { logger } from '../../../../shared/logging/logger.js';
[{
    "resource": "/c:/Users/jzick/Universe_Book_Writer/ai-server/src/rag/adapters/factory.ts",
    "owner": "typescript",
    "code": "2304",
    "severity": 8,
    "message": "Cannot find name 'logInfo'.",
    "source": "ts",
    "startLineNumber": 32,
    "startColumn": 9,
    "endLineNumber": 32,
    "endColumn": 16,
    "origin": "extHost1"
}, {
    "resource": "/c:/Users/jzick/Universe_Book_Writer/ai-server/src/rag/adapters/factory.ts",
    "owner": "typescript",
    "code": "2304",
    "severity": 8,
    "message": "Cannot find name 'logInfo'.",
    "source": "ts",
    "startLineNumber": 82,
    "startColumn": 9,
    "endLineNumber": 82,
    "endColumn": 16,
    "origin": "extHost1"
}, {
    "resource": "/c:/Users/jzick/Universe_Book_Writer/ai-server/src/rag/adapters/factory.ts",
    "owner": "typescript",
    "code": "2304",
    "severity": 8,
    "message": "Cannot find name 'logInfo'.",
    "source": "ts",
    "startLineNumber": 132,
    "startColumn": 13,
    "endLineNumber": 132,
    "endColumn": 20,
    "origin": "extHost1"
}, {
    "resource": "/c:/Users/jzick/Universe_Book_Writer/ai-server/src/rag/adapters/factory.ts",
    "owner": "typescript",
    "code": "2552",
    "severity": 8,
    "message": "Cannot find name 'logError'. Did you mean 'onerror'?",
    "source": "ts",
    "startLineNumber": 135,
    "startColumn": 13,
    "endLineNumber": 135,
    "endColumn": 21,
    "relatedInformation": [
        {
            "startLineNumber": 28965,
            "startColumn": 13,
            "endLineNumber": 28965,
            "endColumn": 20,
            "message": "'onerror' is declared here.",
            "resource": "/c:/Users/jzick/AppData/Local/Programs/Microsoft VS Code/resources/app/extensions/node_modules/typescript/lib/lib.dom.d.ts"
        }
    ],
    "origin": "extHost1"
}, {
    "resource": "/c:/Users/jzick/Universe_Book_Writer/ai-server/src/rag/adapters/factory.ts",
    "owner": "typescript",
    "code": "2304",
    "severity": 8,
    "message": "Cannot find name 'logInfo'.",
    "source": "ts",
    "startLineNumber": 139,
    "startColumn": 17,
    "endLineNumber": 139,
    "endColumn": 24,
    "origin": "extHost1"
}]
/**
 * Configuration for MongoDB storage adapter
 */
export interface MongoDBStorageConfig {
    /** MongoDB connection string */
    connectionString: string;
    /** Database name */
    database?: string;
    /** Additional MongoDB options */
    options?: Record<string, any>;
}

/**
 * MongoDB storage adapter for the RAG system
 * Implements the RAGStorageBackend interface for persistent storage
 */
export class MongoDBRagAdapter implements RAGStorageBackend {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private nodesCollection: Collection<any> | null = null; // regular nodes
    private systemNodesCollection: Collection<any> | null = null; // system nodes
    private relationshipsCollection: Collection<any> | null = null;
    private indicesCollection: Collection<any> | null = null;

    constructor(private config: MongoDBStorageConfig) { }

    async initialize(): Promise<void> {
        try {
            logger.info('Initializing MongoDB RAG adapter');

            if (!this.config.connectionString) {
                throw new Error('MongoDB connection string is required');
            }

            this.client = new MongoClient(this.config.connectionString, this.config.options);
            await this.client.connect();

            this.db = this.client.db(this.config.database || 'verseforge_rag');
            this.nodesCollection = this.db.collection('rag_nodes');
            this.systemNodesCollection = this.db.collection('system_nodes');
            this.relationshipsCollection = this.db.collection('rag_relationships');
            this.indicesCollection = this.db.collection('rag_indices');

            // Create essential indices for performance
            await this.createEssentialIndices();

            logger.info('MongoDB RAG adapter initialized successfully');
        } catch (error) {
            logger.error(`Failed to initialize MongoDB RAG adapter: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.nodesCollection = null;
            this.relationshipsCollection = null;
            this.indicesCollection = null;
            logger.info('MongoDB RAG adapter disconnected');
        }
    }

    // Node operations - RAGStorageBackend interface implementation
    /**
     * Determines if a node is a system node based on its type
     */
    private isSystemNode(node: any): boolean {
        const systemTypes = ['ai-server', 'ai-model', 'model-performance', 'orchestrator'];
        return systemTypes.includes(node.type);
    }

    private getNodeCollectionByType(type: string): Collection<any> {
        if (['ai-server', 'ai-model', 'model-performance', 'orchestrator'].includes(type)) {
            if (!this.systemNodesCollection) throw new Error('MongoDB system_nodes collection not initialized');
            return this.systemNodesCollection;
        } else {
            if (!this.nodesCollection) throw new Error('MongoDB rag_nodes collection not initialized');
            return this.nodesCollection;
        }
    }

    async storeNode(node: any): Promise<void> {
        const collection = this.getNodeCollectionByType(node.type);
        await collection.replaceOne(
            { id: node.id },
            node,
            { upsert: true }
        );
        logger.debug(`Stored ${this.isSystemNode(node) ? 'system' : 'RAG'} node: ${node.id}`);
    }

    async retrieveNode(nodeId: string): Promise<any> {
        // Try system_nodes first, then rag_nodes
        if (!this.systemNodesCollection || !this.nodesCollection) throw new Error('MongoDB adapter not initialized');
        let node = await this.systemNodesCollection.findOne({ id: nodeId });
        if (node) return node;
        node = await this.nodesCollection.findOne({ id: nodeId });
        return node || null;
    }

    async updateNode(node: any): Promise<void> {
        const collection = this.getNodeCollectionByType(node.type);
        const result = await collection.replaceOne(
            { id: node.id },
            node
        );
        if (result.matchedCount === 0) {
            throw new Error(`Node with id ${node.id} not found`);
        }
        // logDebug(`Updated ${this.isSystemNode(node) ? 'system' : 'RAG'} node: ${node.id}`);
    }

    async deleteNode(nodeId: string): Promise<void> {
        if (!this.systemNodesCollection || !this.nodesCollection) throw new Error('MongoDB adapter not initialized');
        // Also delete related relationships
        if (this.relationshipsCollection) {
            await this.relationshipsCollection.deleteMany({
                $or: [{ sourceId: nodeId }, { targetId: nodeId }]
            });
        }
        // Try to delete from both collections (id is unique)
        await this.systemNodesCollection.deleteOne({ id: nodeId });
        await this.nodesCollection.deleteOne({ id: nodeId });
        logger.debug(`Deleted node (from both collections if present) and relationships: ${nodeId}`);
    }

    // Relationship operations - RAGStorageBackend interface implementation
    async storeRelationship(relationship: any): Promise<void> {
        if (!this.relationshipsCollection) throw new Error('MongoDB adapter not initialized');

        await this.relationshipsCollection.replaceOne(
            { id: relationship.id },
            relationship,
            { upsert: true }
        );

        logger.debug(`Stored RAG relationship: ${relationship.id}`);
    }

    async retrieveRelationship(relationshipId: string): Promise<any> {
        if (!this.relationshipsCollection) throw new Error('MongoDB adapter not initialized');

        const relationship = await this.relationshipsCollection.findOne({ id: relationshipId });
        return relationship || null;
    }

    async updateRelationship(relationship: any): Promise<void> {
        if (!this.relationshipsCollection) throw new Error('MongoDB adapter not initialized');

        const result = await this.relationshipsCollection.replaceOne(
            { id: relationship.id },
            relationship
        );

        if (result.matchedCount === 0) {
            throw new Error(`Relationship with id ${relationship.id} not found`);
        }

        // logDebug(`Updated RAG relationship: ${relationship.id}`); // Disabled noisy relationship log
    }

    async deleteRelationship(relationshipId: string): Promise<void> {
        if (!this.relationshipsCollection) throw new Error('MongoDB adapter not initialized');

        await this.relationshipsCollection.deleteOne({ id: relationshipId });

        logger.debug(`Deleted RAG relationship: ${relationshipId}`);
    }

    // Graph traversal operations
    async getNodeRelationships(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<any[]> {
        if (!this.relationshipsCollection) throw new Error('MongoDB adapter not initialized');

        let filter: any;
        switch (direction) {
            case 'in':
                filter = { targetId: nodeId };
                break;
            case 'out':
                filter = { sourceId: nodeId };
                break;
            case 'both':
            default:
                filter = { $or: [{ sourceId: nodeId }, { targetId: nodeId }] };
                break;
        }

        const relationships = await this.relationshipsCollection.find(filter).toArray();
        return relationships;
    }

    async getConnectedNodes(nodeId: string, maxDistance: number): Promise<{
        nodes: any[];
        relationships: any[];
        distances: Map<string, number>;
    }> {
        if (!this.nodesCollection || !this.relationshipsCollection) {
            throw new Error('MongoDB adapter not initialized');
        }

        const visited = new Set<string>();
        const distances = new Map<string, number>();
        const nodes: any[] = [];
        const relationships: any[] = [];

        // BFS traversal for connected nodes
        const queue: { nodeId: string; distance: number }[] = [{ nodeId, distance: 0 }];
        visited.add(nodeId);
        distances.set(nodeId, 0);

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current.distance > maxDistance) continue;

            // Get the current node
            const currentNode = await this.nodesCollection.findOne({ id: current.nodeId });
            if (currentNode) {
                nodes.push(currentNode);
            }

            // Get relationships for this node
            const nodeRelationships = await this.relationshipsCollection.find({
                $or: [{ sourceId: current.nodeId }, { targetId: current.nodeId }]
            }).toArray();

            relationships.push(...nodeRelationships);

            // Add connected nodes to queue if within distance
            if (current.distance < maxDistance) {
                for (const rel of nodeRelationships) {
                    const connectedNodeId = rel.sourceId === current.nodeId ? rel.targetId : rel.sourceId;

                    if (!visited.has(connectedNodeId)) {
                        visited.add(connectedNodeId);
                        distances.set(connectedNodeId, current.distance + 1);
                        queue.push({ nodeId: connectedNodeId, distance: current.distance + 1 });
                    }
                }
            }
        }

        return { nodes, relationships, distances };
    }

    // Search operations
    async searchNodes(query: string, filters?: any): Promise<any[]> {
        if (!this.nodesCollection || !this.systemNodesCollection) throw new Error('MongoDB adapter not initialized');

        // Build search filter
        const searchFilter: any = {};

        // Text search across content and metadata
        if (query) {
            searchFilter.$or = [
                { 'content.description': { $regex: query, $options: 'i' } },
                { 'summaries.brief': { $regex: query, $options: 'i' } },
                { 'summaries.medium': { $regex: query, $options: 'i' } },
                { 'summaries.detailed': { $regex: query, $options: 'i' } },
                { 'metadata.tags': { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } }
            ];
        }

        // Apply additional filters
        if (filters) {
            Object.assign(searchFilter, filters);
        }

        // Always filter for active nodes
        searchFilter.active = true;

        // Query both collections and merge results
        let queryBuilder1 = this.nodesCollection.find(searchFilter);
        let queryBuilder2 = this.systemNodesCollection.find(searchFilter);

        if (filters?.limit) {
            queryBuilder1 = queryBuilder1.limit(filters.limit);
            queryBuilder2 = queryBuilder2.limit(filters.limit);
        }
        if (filters?.offset) {
            queryBuilder1 = queryBuilder1.skip(filters.offset);
            queryBuilder2 = queryBuilder2.skip(filters.offset);
        }

        const [nodes, systemNodes] = await Promise.all([
            queryBuilder1.toArray(),
            queryBuilder2.toArray()
        ]);
        const allNodes = [...nodes, ...systemNodes];
        logger.debug(`Search found ${allNodes.length} nodes for query: "${query}"`);
        return allNodes;
    }

    async searchByEmbedding(embedding: number[], topK: number, filters?: any): Promise<{
        nodes: any[];
        scores: number[];
    }> {
        if (!this.nodesCollection) throw new Error('MongoDB adapter not initialized');

        // Note: This is a basic implementation using cosine similarity
        // For production, consider using MongoDB Vector Search or a dedicated vector database

        const searchFilter = { ...(filters || {}), active: true };
        const allNodes = await this.nodesCollection.find(searchFilter).toArray();

        // Calculate cosine similarity
        const nodesWithScores = allNodes
            .map(node => {
                if (!node.embeddings || node.embeddings.length === 0) {
                    return { node, score: 0 };
                }

                const score = this.cosineSimilarity(embedding, node.embeddings);
                return { node, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        return {
            nodes: nodesWithScores.map(item => item.node),
            scores: nodesWithScores.map(item => item.score)
        };
    }

    // Additional utility methods
    async getNodesByType(type: RAGNodeType, universeId?: string): Promise<any[]> {
        if (!this.nodesCollection) throw new Error('MongoDB adapter not initialized');

        const filter: any = { type, active: true };
        if (universeId) {
            filter['metadata.universeId'] = universeId;
        }

        const nodes = await this.nodesCollection.find(filter).toArray();
        return nodes;
    }

    async getNodesByUniverse(universeId: string): Promise<any[]> {
        if (!this.nodesCollection) throw new Error('MongoDB adapter not initialized');

        const nodes = await this.nodesCollection.find({ 'metadata.universeId': universeId, active: true }).toArray();
        return nodes;
    }

    async getRelationshipsByType(type: RAGRelationshipType, universeId?: string): Promise<any[]> {
        if (!this.relationshipsCollection) throw new Error('MongoDB adapter not initialized');

        const filter: any = { type };
        if (universeId) {
            filter['metadata.universeId'] = universeId;
        }

        const relationships = await this.relationshipsCollection.find(filter).toArray();
        return relationships;
    }

    // Index management
    async createIndex(name: string, fields: Record<string, any>): Promise<void> {
        if (!this.db) throw new Error('MongoDB adapter not initialized');

        try {
            // Create index on nodes collection
            if (this.nodesCollection && fields.nodes) {
                await this.nodesCollection.createIndex(fields.nodes, { name: `${name}_nodes` });
            }

            // Create index on relationships collection
            if (this.relationshipsCollection && fields.relationships) {
                await this.relationshipsCollection.createIndex(fields.relationships, { name: `${name}_relationships` });
            }

            // Store index metadata
            if (this.indicesCollection) {
                await this.indicesCollection.insertOne({
                    name,
                    fields,
                    createdAt: new Date()
                });
            }

            logger.info(`Created RAG index: ${name}`);
        } catch (error) {
            logger.error(`Failed to create RAG index ${name}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async dropIndex(name: string): Promise<void> {
        if (!this.db) throw new Error('MongoDB adapter not initialized');

        try {
            // Drop index from collections
            if (this.nodesCollection) {
                try {
                    await this.nodesCollection.dropIndex(`${name}_nodes`);
                } catch (error) {
                    // Index might not exist, continue
                }
            }

            if (this.relationshipsCollection) {
                try {
                    await this.relationshipsCollection.dropIndex(`${name}_relationships`);
                } catch (error) {
                    // Index might not exist, continue
                }
            }

            // Remove index metadata
            if (this.indicesCollection) {
                await this.indicesCollection.deleteOne({ name });
            }

            logger.info(`Dropped RAG index: ${name}`);
        } catch (error) {
            logger.error(`Failed to drop RAG index ${name}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    async listIndices(): Promise<string[]> {
        if (!this.indicesCollection) throw new Error('MongoDB adapter not initialized');

        const indices = await this.indicesCollection.find({}, { projection: { name: 1 } }).toArray();
        return indices.map(index => index.name);
    }

    // Private helper methods
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private async createEssentialIndices(): Promise<void> {
        if (!this.nodesCollection || !this.relationshipsCollection) return;

        try {
            // Essential indices for nodes
            await this.nodesCollection.createIndex({ id: 1 }, { unique: true });
            await this.nodesCollection.createIndex({ 'metadata.universeId': 1 });
            await this.nodesCollection.createIndex({ type: 1 });
            await this.nodesCollection.createIndex({ 'metadata.tags': 1 });
            await this.nodesCollection.createIndex({ 'timestamps.created': 1 });
            await this.nodesCollection.createIndex({ active: 1 }); // Index for efficient active/inactive queries

            // Text search index for nodes
            await this.nodesCollection.createIndex({
                'content.description': 'text',
                'summaries.brief': 'text',
                'summaries.medium': 'text',
                'summaries.detailed': 'text',
                title: 'text'
            });

            // Essential indices for relationships
            await this.relationshipsCollection.createIndex({ id: 1 }, { unique: true });
            await this.relationshipsCollection.createIndex({ sourceId: 1 });
            await this.relationshipsCollection.createIndex({ targetId: 1 });
            await this.relationshipsCollection.createIndex({ type: 1 });
            await this.relationshipsCollection.createIndex({ 'metadata.universeId': 1 });

            logger.info('Created essential RAG indices in MongoDB');
        } catch (error) {
            logger.error(`Failed to create RAG indices: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw, indices are not critical for basic functionality
        }
    }
}
