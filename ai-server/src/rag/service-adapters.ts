/**
 * RAG Service Wrapper for Express Routes
 * 
 * This wrapper adapts the RAGServiceManager interface to work with the existing
 * createRAGRouter function, providing the necessary service interfaces.
 */

import { RAGServiceManager } from './manager.js';
import {
    RAGNode,
    RAGRelationship,
    RAGSearchRequest,
    RAGSearchResult,
    RAGContextRequest,
    RAGContextResult,
    RAGContextLayer,
    RAGContextNode,
    RAGContextStrategy
} from './core/types.js';

/**
 * Storage service adapter that uses RAGServiceManager internally
 */
export class RAGStorageServiceAdapter {
    constructor(private manager: RAGServiceManager) { }

    async storeNode(node: RAGNode): Promise<void> {
        // Extract data without id and timestamps for createNode
        const { id, timestamps, ...nodeData } = node;
        await this.manager.createNode(nodeData);
    }

    async retrieveNode(nodeId: string): Promise<RAGNode | null> {
        return await this.manager.getNode(nodeId);
    }

    async updateNode(nodeId: string, updates: Partial<RAGNode>): Promise<void> {
        await this.manager.updateNode(nodeId, updates);
    }

    async deleteNode(nodeId: string): Promise<void> {
        await this.manager.deleteNode(nodeId);
    }

    async storeRelationship(relationship: RAGRelationship): Promise<void> {
        // Extract data without id and timestamps for createRelationship
        const { id, timestamps, ...relationshipData } = relationship;
        await this.manager.createRelationship(relationshipData);
    }

    async searchNodes(request: RAGSearchRequest): Promise<RAGSearchResult> {
        // Use the manager's search method and adapt the result
        const startTime = Date.now();
        const nodes = await this.manager.searchNodes(request.query || '', request.filters);
        const searchTime = Date.now() - startTime;

        // Convert RAGNode[] to RAGSearchNode[]
        const searchNodes = nodes.map(node => ({
            node,
            score: 1.0, // Default score since manager doesn't provide scoring
            highlights: [], // Empty highlights for now
            matchReason: 'Direct match' // Default reason
        }));

        return {
            nodes: searchNodes,
            totalCount: nodes.length,
            metadata: {
                searchTime,
                mode: request.mode || 'semantic',
                cached: false
            }
        };
    }

    async getRelatedNodes(nodeId: string, userId: string): Promise<RAGNode[]> {
        // Use getConnectedNodes with distance 1 for immediate connections
        const result = await this.manager.getConnectedNodes(nodeId, 1);
        return result.nodes;
    }
}

/**
 * Context assembly service adapter
 */
export class RAGContextAssemblyServiceAdapter {
    constructor(private manager: RAGServiceManager) { }

    async assembleContext(request: RAGContextRequest): Promise<RAGContextResult> {
        // Since RAGServiceManager doesn't have assembleContext, 
        // implement a basic version using available methods
        const startTime = Date.now();

        // Get the focal node
        const focalNode = await this.manager.getNode(request.focalNodeId);
        if (!focalNode) {
            throw new Error(`Focal node not found: ${request.focalNodeId}`);
        }

        // Build context layers
        const layers: RAGContextLayer[] = [];
        const processedNodes = new Set<string>();
        processedNodes.add(focalNode.id);

        // Create layers up to maxDistance
        for (let distance = 1; distance <= request.maxDistance; distance++) {
            const layerNodes: RAGContextNode[] = [];
            const layerRelationships: RAGRelationship[] = [];

            // For now, just get direct connections from focal node
            if (distance === 1) {
                const connected = await this.manager.getConnectedNodes(focalNode.id, 1);
                for (const node of connected.nodes) {
                    if (!processedNodes.has(node.id)) {
                        layerNodes.push({
                            node,
                            detailLevel: 'detailed',
                            relevanceScore: 1.0,
                            pathFromFocal: [focalNode.id, node.id]
                        });
                        processedNodes.add(node.id);
                    }
                }
            }

            if (layerNodes.length > 0) {
                layers.push({
                    distance,
                    nodes: layerNodes,
                    relationships: layerRelationships
                });
            }
        }

        const assemblyTime = Date.now() - startTime;

        return {
            focalNode,
            layers,
            tokenCount: 0, // Would need to implement token counting
            metadata: {
                assembledAt: new Date(),
                strategy: request.strategy || 'balanced',
                filters: request.filters,
                performance: {
                    assemblyTime,
                    nodesProcessed: processedNodes.size,
                    relationshipsProcessed: 0
                }
            }
        };
    }
}

/**
 * Create service adapters from RAGServiceManager
 */
export function createServiceAdapters(manager: RAGServiceManager) {
    return {
        storage: new RAGStorageServiceAdapter(manager),
        contextAssembly: new RAGContextAssemblyServiceAdapter(manager),
        // Encryption services are optional - will be undefined if not available
        nodeEncryption: undefined,
        relationshipEncryption: undefined
    };
}
