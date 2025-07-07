/**
 * RAG Service - Frontend API Client
 * 
 * Provides a clean interface for the frontend to interact with RAG endpoints
 */

export interface RAGNode {
    id: string;
    type: string;
    content: Record<string, any>;
    metadata: {
        universeId: string;
        title: string;
        description?: string;
        tags?: string[];
        sensitivity?: 'low' | 'medium' | 'high';
    };
    timeline?: {
        startDate?: string;
        endDate?: string;
        era?: string;
    };
    timestamps: {
        created: Date;
        modified: Date;
    };
}

export interface RAGRelationship {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    type: string;
    properties: {
        strength: number;
        description?: string;
    };
    metadata: {
        universeId: string;
        title: string;
        tags?: string[];
        sensitivity?: 'low' | 'medium' | 'high';
    };
}

export interface RAGSearchResult {
    nodes: Array<{
        node: RAGNode;
        score: number;
        highlights: string[];
        matchReason: string;
    }>;
    totalCount: number;
    metadata: {
        searchTime: number;
        mode: string;
        cached: boolean;
    };
}

export class RAGService {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:5100') {
        this.baseUrl = baseUrl;
    }

    /**
     * Health check for RAG system
     */
    async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
        const response = await fetch(`${this.baseUrl}/api/rag/health`);
        return response.json();
    }

    /**
     * Create a new RAG node
     */
    async createNode(nodeData: Omit<RAGNode, 'id' | 'timestamps'>): Promise<RAGNode> {
        const response = await fetch(`${this.baseUrl}/api/rag/nodes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nodeData),
        });

        if (!response.ok) {
            throw new Error(`Failed to create node: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get a RAG node by ID
     */
    async getNode(nodeId: string): Promise<RAGNode | null> {
        const response = await fetch(`${this.baseUrl}/api/rag/nodes/${nodeId}`);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to get node: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Update a RAG node
     */
    async updateNode(nodeId: string, updates: Partial<RAGNode>): Promise<RAGNode> {
        const response = await fetch(`${this.baseUrl}/api/rag/nodes/${nodeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error(`Failed to update node: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Delete a RAG node
     */
    async deleteNode(nodeId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/rag/nodes/${nodeId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete node: ${response.statusText}`);
        }
    }

    /**
     * Search RAG nodes
     */
    async searchNodes(
        query: string,
        options: {
            universeId?: string;
            limit?: number;
            nodeType?: string;
        } = {}
    ): Promise<RAGSearchResult> {
        const params = new URLSearchParams();
        params.append('query', query);

        if (options.universeId) {
            params.append('universeId', options.universeId);
        }

        if (options.limit) {
            params.append('limit', options.limit.toString());
        }

        if (options.nodeType) {
            params.append('nodeType', options.nodeType);
        }

        const response = await fetch(`${this.baseUrl}/api/rag/search?${params}`);

        if (!response.ok) {
            throw new Error(`Failed to search nodes: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create a new RAG relationship
     */
    async createRelationship(relationshipData: Omit<RAGRelationship, 'id'>): Promise<RAGRelationship> {
        const response = await fetch(`${this.baseUrl}/api/rag/relationships`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(relationshipData),
        });

        if (!response.ok) {
            throw new Error(`Failed to create relationship: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get relationships for a node
     */
    async getNodeRelationships(nodeId: string): Promise<RAGRelationship[]> {
        const response = await fetch(`${this.baseUrl}/api/rag/nodes/${nodeId}/relationships`);

        if (!response.ok) {
            throw new Error(`Failed to get node relationships: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Delete a relationship
     */
    async deleteRelationship(relationshipId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/rag/relationships/${relationshipId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete relationship: ${response.statusText}`);
        }
    }

    /**
     * Get nodes by universe
     */
    async getUniverseNodes(universeId: string, limit: number = 50): Promise<RAGNode[]> {
        const response = await fetch(`${this.baseUrl}/api/rag/universes/${universeId}/nodes?limit=${limit}`);

        if (!response.ok) {
            throw new Error(`Failed to get universe nodes: ${response.statusText}`);
        }

        const result = await response.json();
        return result.nodes || [];
    }

    /**
     * Get system statistics
     */
    async getStats(): Promise<any> {
        const response = await fetch(`${this.baseUrl}/api/rag/stats`);

        if (!response.ok) {
            throw new Error(`Failed to get stats: ${response.statusText}`);
        }

        return response.json();
    }
}

// Export singleton instance
export const ragService = new RAGService();
