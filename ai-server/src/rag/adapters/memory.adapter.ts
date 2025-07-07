import type {
    RAGNode,
    RAGRelationship
} from '../core/types.js';
import type { EncryptedRAGNode, EncryptedRAGRelationship } from '../encryption/rag-encryption.service.js';
import type { RAGStorageBackend } from '../services/storage.service.js';
import { logDebug } from '../../logger.js';

/**
 * In-memory storage adapter for the RAG system
 * Useful for testing and development
 */
export class InMemoryRagAdapter implements RAGStorageBackend {
    private nodes = new Map<string, RAGNode | EncryptedRAGNode>();
    private relationships = new Map<string, RAGRelationship | EncryptedRAGRelationship>();

    async initialize(): Promise<void> {
        // No initialization needed for in-memory storage
        logDebug('In-memory RAG adapter initialized');
    }

    async disconnect(): Promise<void> {
        this.nodes.clear();
        this.relationships.clear();
        logDebug('In-memory RAG adapter disconnected');
    }

    // Node operations
    async storeNode(node: RAGNode | EncryptedRAGNode): Promise<void> {
        this.nodes.set(node.id, node);
        logDebug(`Stored RAG node: ${node.id}`);
    }

    async retrieveNode(nodeId: string): Promise<RAGNode | EncryptedRAGNode | null> {
        return this.nodes.get(nodeId) || null;
    }

    async updateNode(node: RAGNode | EncryptedRAGNode): Promise<void> {
        if (!this.nodes.has(node.id)) {
            throw new Error(`Node not found: ${node.id}`);
        }
        this.nodes.set(node.id, node);
        // logDebug(`Updated RAG node: ${node.id}`); // Disabled noisy node log
    }

    async deleteNode(nodeId: string): Promise<void> {
        if (!this.nodes.has(nodeId)) {
            throw new Error(`Node not found: ${nodeId}`);
        }

        // Delete the node
        this.nodes.delete(nodeId);

        // Delete related relationships
        const relationshipsToDelete: string[] = [];
        for (const [id, relationship] of this.relationships) {
            if (relationship.fromNodeId === nodeId || relationship.toNodeId === nodeId) {
                relationshipsToDelete.push(id);
            }
        }

        for (const id of relationshipsToDelete) {
            this.relationships.delete(id);
        }

        logDebug(`Deleted RAG node and ${relationshipsToDelete.length} relationships: ${nodeId}`);
    }

    // Relationship operations
    async storeRelationship(relationship: RAGRelationship | EncryptedRAGRelationship): Promise<void> {
        this.relationships.set(relationship.id, relationship);
        logDebug(`Stored RAG relationship: ${relationship.id}`);
    }

    async retrieveRelationship(relationshipId: string): Promise<RAGRelationship | EncryptedRAGRelationship | null> {
        return this.relationships.get(relationshipId) || null;
    }

    async updateRelationship(relationship: RAGRelationship | EncryptedRAGRelationship): Promise<void> {
        if (!this.relationships.has(relationship.id)) {
            throw new Error(`Relationship not found: ${relationship.id}`);
        }
        this.relationships.set(relationship.id, relationship);
        // logDebug(`Updated RAG relationship: ${relationship.id}`); // Disabled noisy relationship log
    }

    async deleteRelationship(relationshipId: string): Promise<void> {
        if (!this.relationships.has(relationshipId)) {
            throw new Error(`Relationship not found: ${relationshipId}`);
        }
        this.relationships.delete(relationshipId);
        logDebug(`Deleted RAG relationship: ${relationshipId}`);
    }

    // Graph traversal
    async getNodeRelationships(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<(RAGRelationship | EncryptedRAGRelationship)[]> {
        const result: (RAGRelationship | EncryptedRAGRelationship)[] = [];

        for (const relationship of this.relationships.values()) {
            const isSource = relationship.fromNodeId === nodeId;
            const isTarget = relationship.toNodeId === nodeId;

            if (direction === 'both' && (isSource || isTarget)) {
                result.push(relationship);
            } else if (direction === 'out' && isSource) {
                result.push(relationship);
            } else if (direction === 'in' && isTarget) {
                result.push(relationship);
            }
        }

        return result;
    }

    async getConnectedNodes(nodeId: string, maxDistance: number): Promise<{
        nodes: (RAGNode | EncryptedRAGNode)[];
        relationships: (RAGRelationship | EncryptedRAGRelationship)[];
        distances: Map<string, number>;
    }> {
        const visited = new Set<string>();
        const foundRelationshipIds = new Set<string>();
        const distances = new Map<string, number>();
        const foundNodes: (RAGNode | EncryptedRAGNode)[] = [];
        const foundRelationships: (RAGRelationship | EncryptedRAGRelationship)[] = [];

        // Start with the root node
        const rootNode = this.nodes.get(nodeId);
        if (rootNode) {
            foundNodes.push(rootNode);
            visited.add(nodeId);
            distances.set(nodeId, 0);
        }

        // BFS traversal
        const queue: { nodeId: string; distance: number }[] = [{ nodeId, distance: 0 }];

        while (queue.length > 0) {
            const { nodeId: currentNodeId, distance } = queue.shift()!;

            if (distance >= maxDistance) continue;

            // Get relationships for current node
            const relationships = await this.getNodeRelationships(currentNodeId);

            for (const relationship of relationships) {
                // Only add relationship if we haven't seen it before
                if (!foundRelationshipIds.has(relationship.id)) {
                    foundRelationshipIds.add(relationship.id);
                    foundRelationships.push(relationship);
                }

                // Find the connected node
                const connectedNodeId = relationship.fromNodeId === currentNodeId
                    ? relationship.toNodeId
                    : relationship.fromNodeId;

                if (!visited.has(connectedNodeId)) {
                    visited.add(connectedNodeId);
                    distances.set(connectedNodeId, distance + 1);

                    const connectedNode = this.nodes.get(connectedNodeId);
                    if (connectedNode) {
                        foundNodes.push(connectedNode);
                        queue.push({ nodeId: connectedNodeId, distance: distance + 1 });
                    }
                }
            }
        }

        return {
            nodes: foundNodes,
            relationships: foundRelationships,
            distances
        };
    }

    // Search operations
    async searchNodes(query: string, filters?: any): Promise<(RAGNode | EncryptedRAGNode)[]> {
        const result: (RAGNode | EncryptedRAGNode)[] = [];
        const lowerQuery = query.toLowerCase();

        for (const node of this.nodes.values()) {
            // Simple text search
            let matches = false;

            // Check title (direct property or in metadata)
            const title = node.title || (node.metadata && 'title' in node.metadata ? String(node.metadata.title) : '');
            if (title && title.toLowerCase().includes(lowerQuery)) {
                matches = true;
            } else if ('content' in node && node.content?.description?.toLowerCase().includes(lowerQuery)) {
                matches = true;
            } else if ('summaries' in node) {
                const summaries = node.summaries;
                if (summaries?.brief?.toLowerCase().includes(lowerQuery) ||
                    summaries?.medium?.toLowerCase().includes(lowerQuery) ||
                    summaries?.detailed?.toLowerCase().includes(lowerQuery)) {
                    matches = true;
                }
            }

            // Apply filters
            if (matches && filters) {
                for (const [key, value] of Object.entries(filters)) {
                    const propertyValue = this.getNestedProperty(node, key);

                    // Handle array properties (like tags)
                    if (Array.isArray(propertyValue)) {
                        if (!propertyValue.includes(value)) {
                            matches = false;
                            break;
                        }
                    } else if (propertyValue !== value) {
                        matches = false;
                        break;
                    }
                }
            }

            if (matches) {
                result.push(node);
            }
        }

        return result.slice(0, 100); // Limit results
    }

    async searchByEmbedding(embedding: number[], topK: number, filters?: any): Promise<{
        nodes: (RAGNode | EncryptedRAGNode)[];
        scores: number[];
    }> {
        // Simple implementation - calculate cosine similarity
        const candidates: { node: RAGNode | EncryptedRAGNode; score: number }[] = [];

        for (const node of this.nodes.values()) {
            // Apply filters first
            if (filters) {
                let passesFilter = true;
                for (const [key, value] of Object.entries(filters)) {
                    const propertyValue = this.getNestedProperty(node, key);

                    // Handle array properties (like tags)
                    if (Array.isArray(propertyValue)) {
                        if (!propertyValue.includes(value)) {
                            passesFilter = false;
                            break;
                        }
                    } else if (propertyValue !== value) {
                        passesFilter = false;
                        break;
                    }
                }
                if (!passesFilter) continue;
            }

            // Calculate cosine similarity
            if ('embeddings' in node && Array.isArray(node.embeddings) && node.embeddings.length > 0) {
                const score = this.cosineSimilarity(embedding, node.embeddings);
                candidates.push({ node, score });
            }
        }

        // Sort by score and take top K
        candidates.sort((a, b) => b.score - a.score);
        const topCandidates = candidates.slice(0, topK);

        return {
            nodes: topCandidates.map(c => c.node),
            scores: topCandidates.map(c => c.score)
        };
    }

    // Helper methods
    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

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

    // Utility methods for testing
    getNodeCount(): number {
        return this.nodes.size;
    }

    getRelationshipCount(): number {
        return this.relationships.size;
    }

    clear(): void {
        this.nodes.clear();
        this.relationships.clear();
    }
}
