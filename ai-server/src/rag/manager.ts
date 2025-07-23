import type {
    RAGNode,
    RAGRelationship
} from './core/types.js';
import type { RAGStorageBackend } from './services/storage.service.js';
import { StorageAdapterFactory, type StorageAdapterConfig } from './adapters/factory.js';
import { logger } from '../../../shared/logging/logger.js';

/**
 * Configuration for the RAG service manager
 */
export interface RAGServiceConfig {
    /** Storage adapter configuration */
    storage: StorageAdapterConfig;
}

/**
 * RAG Service Manager (Simplified)
 * 
 * Coordinates the RAG system components and provides a unified interface
 * for node/relationship management and search operations.
 */
export class RAGServiceManager {
    private storage: RAGStorageBackend | null = null;
    private initialized = false;

    constructor(private config: RAGServiceConfig) { }

    /**
     * Initialize the RAG service manager
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing RAG Service Manager');

            // Initialize storage adapter
            this.storage = await StorageAdapterFactory.createAdapter(this.config.storage);
            logger.info(`Storage adapter initialized: ${this.config.storage.type}`);

            this.initialized = true;
            logger.info('RAG Service Manager initialized successfully');
        } catch (error) {
            logger.error(`Failed to initialize RAG Service Manager: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Disconnect and cleanup resources
     */
    async disconnect(): Promise<void> {
        if (this.storage && 'disconnect' in this.storage && typeof this.storage.disconnect === 'function') {
            await this.storage.disconnect();
        }
        this.storage = null;
        this.initialized = false;

        logger.info('RAG Service Manager disconnected');
    }

    /**
     * Check if the service is properly initialized
     */
    private ensureInitialized(): void {
        if (!this.initialized || !this.storage) {
            throw new Error('RAG Service Manager not initialized');
        }
    }

    // Node Management
    /**
     * Create a new RAG node
     */
    async createNode(nodeData: Omit<RAGNode, 'timestamps'> | Omit<RAGNode, 'id' | 'timestamps'>): Promise<RAGNode> {
        this.ensureInitialized();

        const node: RAGNode = {
            ...nodeData,
            id: 'id' in nodeData ? nodeData.id : this.generateId(),
            timestamps: {
                created: new Date(),
                modified: new Date()
            }
        };

        await this.storage!.storeNode(node);

        logger.debug(`Created RAG node: ${node.id}`);
        return node;
    }

    /**
     * Get a RAG node by ID
     */
    async getNode(nodeId: string): Promise<RAGNode | null> {
        this.ensureInitialized();

        const node = await this.storage!.retrieveNode(nodeId);
        return node as RAGNode | null;
    }

    /**
     * Update a RAG node
     */
    async updateNode(nodeId: string, updates: Partial<RAGNode>): Promise<RAGNode> {
        this.ensureInitialized();

        const existingNode = await this.getNode(nodeId);
        if (!existingNode) {
            throw new Error(`Node not found: ${nodeId}`);
        }

        const updatedNode: RAGNode = {
            ...existingNode,
            ...updates,
            id: nodeId, // Ensure ID doesn't change
            timestamps: {
                ...existingNode.timestamps,
                modified: new Date()
            }
        };

        await this.storage!.updateNode(updatedNode);

        // logDebug(`Updated RAG node: ${nodeId}`); // Disabled noisy node log
        return updatedNode;
    }

    /**
     * Delete a RAG node
     */
    async deleteNode(nodeId: string): Promise<void> {
        this.ensureInitialized();

        await this.storage!.deleteNode(nodeId);
        logger.debug(`Deleted RAG node: ${nodeId}`);
    }

    // Relationship Management
    /**
     * Create a new RAG relationship
     */
    async createRelationship(relationshipData: Omit<RAGRelationship, 'timestamps'> | Omit<RAGRelationship, 'id' | 'timestamps'>): Promise<RAGRelationship> {
        this.ensureInitialized();

        const relationship: RAGRelationship = {
            ...relationshipData,
            id: 'id' in relationshipData ? relationshipData.id : this.generateId(),
            timestamps: {
                created: new Date(),
                modified: new Date()
            }
        };

        await this.storage!.storeRelationship(relationship);

        logger.debug(`Created RAG relationship: ${relationship.id}`);
        return relationship;
    }

    /**
     * Get a RAG relationship by ID
     */
    async getRelationship(relationshipId: string): Promise<RAGRelationship | null> {
        this.ensureInitialized();

        const relationship = await this.storage!.retrieveRelationship(relationshipId);
        return relationship as RAGRelationship | null;
    }

    /**
     * Update a RAG relationship
     */
    async updateRelationship(relationshipId: string, updates: Partial<RAGRelationship>): Promise<RAGRelationship> {
        this.ensureInitialized();

        const existingRelationship = await this.getRelationship(relationshipId);
        if (!existingRelationship) {
            throw new Error(`Relationship not found: ${relationshipId}`);
        }

        const updatedRelationship: RAGRelationship = {
            ...existingRelationship,
            ...updates,
            id: relationshipId, // Ensure ID doesn't change
            timestamps: {
                ...existingRelationship.timestamps,
                modified: new Date()
            }
        };

        await this.storage!.updateRelationship(updatedRelationship);

        // logDebug(`Updated RAG relationship: ${relationshipId}`); // Disabled noisy relationship log
        return updatedRelationship;
    }

    /**
     * Delete a RAG relationship
     */
    async deleteRelationship(relationshipId: string): Promise<void> {
        this.ensureInitialized();

        await this.storage!.deleteRelationship(relationshipId);
        logger.debug(`Deleted RAG relationship: ${relationshipId}`);
    }

    // Graph Operations
    /**
     * Get all relationships for a node
     */
    async getNodeRelationships(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<RAGRelationship[]> {
        this.ensureInitialized();

        const relationships = await this.storage!.getNodeRelationships(nodeId, direction);
        return relationships as RAGRelationship[];
    }

    /**
     * Get connected nodes within a distance
     */
    async getConnectedNodes(nodeId: string, maxDistance: number): Promise<{
        nodes: RAGNode[];
        relationships: RAGRelationship[];
        distances: Map<string, number>;
    }> {
        this.ensureInitialized();

        const result = await this.storage!.getConnectedNodes(nodeId, maxDistance);

        return {
            nodes: result.nodes as RAGNode[],
            relationships: result.relationships as RAGRelationship[],
            distances: result.distances
        };
    }

    // Search Operations
    /**
     * Search for nodes using text query
     */
    async searchNodes(query: string, filters?: any): Promise<RAGNode[]> {
        this.ensureInitialized();

        const nodes = await this.storage!.searchNodes(query, filters);
        return nodes as RAGNode[];
    }

    /**
     * Search for nodes using vector similarity
     */
    async searchByEmbedding(embedding: number[], topK: number, filters?: any): Promise<{
        nodes: RAGNode[];
        scores: number[];
    }> {
        this.ensureInitialized();

        const result = await this.storage!.searchByEmbedding(embedding, topK, filters);

        return {
            nodes: result.nodes as RAGNode[],
            scores: result.scores
        };
    }

    // Utility Methods
    /**
     * Generate a unique ID for nodes and relationships
     */
    private generateId(): string {
        return `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get service statistics
     */
    async getStats(): Promise<{
        storage: string;
        nodeCount?: number;
        relationshipCount?: number;
    }> {
        this.ensureInitialized();

        const stats = {
            storage: this.config.storage.type,
            nodeCount: undefined as number | undefined,
            relationshipCount: undefined as number | undefined
        };

        // Get counts if the storage adapter supports it
        if ('getNodeCount' in this.storage! && typeof this.storage!.getNodeCount === 'function') {
            stats.nodeCount = (this.storage! as any).getNodeCount();
        }

        if ('getRelationshipCount' in this.storage! && typeof this.storage!.getRelationshipCount === 'function') {
            stats.relationshipCount = (this.storage! as any).getRelationshipCount();
        }

        return stats;
    }

    /**
     * Health check for the RAG service
     */
    async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
        const details: Record<string, any> = {
            initialized: this.initialized,
            storage: this.storage ? 'connected' : 'disconnected'
        };

        const healthy = this.initialized && this.storage !== null;

        return { healthy, details };
    }
}
