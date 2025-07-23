/**
 * RAG Context Assembly Service
 * 
 * Implements the Obsidian-style knowledge graph context assembly with
 * multi-layer summarization and distance-based detail levels.
 */

import {
    RAGNode,
    RAGRelationship,
    RAGContextRequest,
    RAGContextResult,
    RAGContextLayer,
    RAGContextNode,
    RAGContextMetadata,
    RAGContextStrategy,
    RAGContextFilters
} from '../core/types.js';
import { RAGStorageService } from './storage.service.js';
import { RAGNodeEncryptionService, RAGRelationshipEncryptionService, EncryptedRAGNode, EncryptedRAGRelationship } from '../encryption/rag-encryption.service.js';

/**
 * Graph traversal result
 */
interface GraphTraversalResult {
    nodesByDistance: Map<number, Set<string>>; // distance -> node IDs
    relationships: Map<string, RAGRelationship[]>; // node ID -> relationships
    pathsToFocal: Map<string, string[]>; // node ID -> path from focal
    relevanceScores: Map<string, number>; // node ID -> relevance score
}

/**
 * Context assembly performance metrics
 */
interface AssemblyMetrics {
    startTime: number;
    traversalTime: number;
    retrievalTime: number;
    summarizationTime: number;
    totalTime: number;
    nodesProcessed: number;
    relationshipsProcessed: number;
    cacheHits: number;
    cacheMisses: number;
}

/**
 * Context cache entry
 */
interface ContextCacheEntry {
    result: RAGContextResult;
    timestamp: Date;
    expiresAt: Date;
    accessCount: number;
}

/**
 * RAG Context Assembly Service
 */
export class RAGContextAssemblyService {
    private contextCache = new Map<string, ContextCacheEntry>();
    private cacheSize = 100; // Maximum cache entries
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes default

    constructor(
        private storageService: RAGStorageService,
        private nodeEncryptionService?: RAGNodeEncryptionService,
        private relationshipEncryptionService?: RAGRelationshipEncryptionService
    ) { }

    /**
     * Assemble context for a focal node
     */
    async assembleContext(request: RAGContextRequest): Promise<RAGContextResult> {
        const metrics: AssemblyMetrics = {
            startTime: Date.now(),
            traversalTime: 0,
            retrievalTime: 0,
            summarizationTime: 0,
            totalTime: 0,
            nodesProcessed: 0,
            relationshipsProcessed: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // Check cache first
        const cacheKey = this.generateCacheKey(request);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            metrics.cacheHits = 1;
            return {
                ...cached,
                metadata: {
                    ...cached.metadata,
                    performance: {
                        ...cached.metadata.performance,
                        cacheHitRate: 1.0
                    }
                }
            };
        }
        metrics.cacheMisses = 1;

        try {
            // Phase 1: Retrieve focal node
            const focalNode = await this.retrieveAndDecryptNode(request.focalNodeId, request.userId);
            if (!focalNode) {
                throw new Error(`Focal node not found: ${request.focalNodeId}`);
            }

            // Phase 2: Graph traversal to find connected nodes
            const traversalStart = Date.now();
            const traversalResult = await this.traverseGraph(
                request.focalNodeId,
                request.maxDistance,
                request.filters,
                request.userId
            );
            metrics.traversalTime = Date.now() - traversalStart;
            metrics.nodesProcessed = Array.from(traversalResult.nodesByDistance.values())
                .reduce((sum, set) => sum + set.size, 0);
            metrics.relationshipsProcessed = Array.from(traversalResult.relationships.values())
                .reduce((sum, rels) => sum + rels.length, 0);

            // Phase 3: Retrieve and decrypt connected nodes
            const retrievalStart = Date.now();
            const allNodes = await this.retrieveConnectedNodes(traversalResult, request.userId);
            metrics.retrievalTime = Date.now() - retrievalStart;

            // Phase 4: Apply strategy-specific context assembly
            const contextLayers = await this.assembleContextLayers(
                focalNode,
                allNodes,
                traversalResult,
                request
            );

            // Phase 5: Apply token budget and summarization
            const summarizationStart = Date.now();
            const optimizedLayers = await this.optimizeForTokenBudget(
                contextLayers,
                request.maxTokens,
                request.strategy
            );
            metrics.summarizationTime = Date.now() - summarizationStart;

            // Calculate total token count
            const tokenCount = this.calculateTokenCount(focalNode, optimizedLayers);

            metrics.totalTime = Date.now() - metrics.startTime;

            const result: RAGContextResult = {
                focalNode,
                layers: optimizedLayers,
                tokenCount,
                metadata: {
                    assembledAt: new Date(),
                    strategy: request.strategy || 'balanced',
                    filters: request.filters,
                    performance: {
                        assemblyTime: metrics.totalTime,
                        nodesProcessed: metrics.nodesProcessed,
                        relationshipsProcessed: metrics.relationshipsProcessed,
                        cacheHitRate: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
                    },
                    warnings: this.generateWarnings(request, tokenCount, optimizedLayers)
                }
            };

            // Cache the result
            this.addToCache(cacheKey, result);

            return result;

        } catch (error) {
            throw new Error(`Context assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Traverse the knowledge graph to find connected nodes
     */
    private async traverseGraph(
        focalNodeId: string,
        maxDistance: number,
        filters?: RAGContextFilters,
        userId?: string
    ): Promise<GraphTraversalResult> {
        const nodesByDistance = new Map<number, Set<string>>();
        const relationships = new Map<string, RAGRelationship[]>();
        const pathsToFocal = new Map<string, string[]>();
        const relevanceScores = new Map<string, number>();
        const visited = new Set<string>();
        const queue: Array<{ nodeId: string; distance: number; path: string[] }> = [];

        // Initialize with focal node
        nodesByDistance.set(0, new Set([focalNodeId]));
        pathsToFocal.set(focalNodeId, []);
        relevanceScores.set(focalNodeId, 1.0);
        queue.push({ nodeId: focalNodeId, distance: 0, path: [] });

        while (queue.length > 0 && queue[0].distance < maxDistance) {
            const { nodeId, distance, path } = queue.shift()!;

            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            // Get relationships for this node
            const nodeRelationships = await this.storageService.getConnectedNodes(nodeId, 1);
            const decryptedRels = await this.decryptRelationshipsIfNeeded(nodeRelationships.relationships);
            const filteredRels = this.filterRelationships(decryptedRels, filters);

            relationships.set(nodeId, filteredRels);

            // Process connected nodes
            for (const rel of filteredRels) {
                const connectedNodeId = rel.fromNodeId === nodeId ? rel.toNodeId : rel.fromNodeId;

                if (visited.has(connectedNodeId)) continue;

                const newDistance = distance + 1;
                const newPath = [...path, nodeId];

                // Add to distance map
                if (!nodesByDistance.has(newDistance)) {
                    nodesByDistance.set(newDistance, new Set());
                }
                nodesByDistance.get(newDistance)!.add(connectedNodeId);

                // Set path if not already set (shortest path)
                if (!pathsToFocal.has(connectedNodeId)) {
                    pathsToFocal.set(connectedNodeId, newPath);
                }

                // Calculate relevance score
                const relationshipStrength = rel.weight || 0.5;
                const distanceDecay = Math.pow(0.7, newDistance); // Exponential decay
                const relevance = relationshipStrength * distanceDecay;

                const existingRelevance = relevanceScores.get(connectedNodeId) || 0;
                relevanceScores.set(connectedNodeId, Math.max(existingRelevance, relevance));

                // Add to queue for further traversal
                if (newDistance < maxDistance) {
                    queue.push({ nodeId: connectedNodeId, distance: newDistance, path: newPath });
                }
            }
        }

        return {
            nodesByDistance,
            relationships,
            pathsToFocal,
            relevanceScores
        };
    }

    /**
     * Retrieve and decrypt connected nodes
     */
    private async retrieveConnectedNodes(
        traversalResult: GraphTraversalResult,
        userId: string
    ): Promise<Map<string, RAGNode>> {
        const nodes = new Map<string, RAGNode>();

        for (const nodeSet of traversalResult.nodesByDistance.values()) {
            for (const nodeId of nodeSet) {
                const node = await this.retrieveAndDecryptNode(nodeId, userId);
                if (node) {
                    nodes.set(nodeId, node);
                }
            }
        }

        return nodes;
    }

    /**
     * Retrieve and decrypt a single node
     */
    private async retrieveAndDecryptNode(nodeId: string, userId: string): Promise<RAGNode | null> {
        const nodeOrEncrypted = await this.storageService.retrieveNode(nodeId);
        if (!nodeOrEncrypted) return null;

        // Check if encrypted
        if ('encryptedContent' in nodeOrEncrypted) {
            const encryptedNode = nodeOrEncrypted as EncryptedRAGNode;

            // Check access permissions
            if (!this.hasAccess(encryptedNode, userId)) {
                return null; // User doesn't have access
            }

            // Decrypt if encryption service is available
            if (this.nodeEncryptionService) {
                try {
                    return await this.nodeEncryptionService.decryptNode(encryptedNode);
                } catch (error) {
                    console.warn(`Failed to decrypt node ${nodeId}:`, error);
                    return null;
                }
            } else {
                console.warn(`Encrypted node ${nodeId} found but no encryption service available`);
                return null;
            }
        }

        return nodeOrEncrypted as RAGNode;
    }

    /**
     * Assemble context layers based on strategy
     */
    private async assembleContextLayers(
        focalNode: RAGNode,
        allNodes: Map<string, RAGNode>,
        traversalResult: GraphTraversalResult,
        request: RAGContextRequest
    ): Promise<RAGContextLayer[]> {
        const layers: RAGContextLayer[] = [];

        // Process each distance layer
        for (let distance = 1; distance <= request.maxDistance; distance++) {
            const nodeIdsAtDistance = traversalResult.nodesByDistance.get(distance);
            if (!nodeIdsAtDistance || nodeIdsAtDistance.size === 0) continue;

            const layerNodes: RAGContextNode[] = [];
            const layerRelationships: RAGRelationship[] = [];

            for (const nodeId of nodeIdsAtDistance) {
                const node = allNodes.get(nodeId);
                if (!node) continue;

                const relevanceScore = traversalResult.relevanceScores.get(nodeId) || 0;
                const pathFromFocal = traversalResult.pathsToFocal.get(nodeId) || [];

                // Determine appropriate detail level based on distance and strategy
                const detailLevel = this.getDetailLevel(distance, relevanceScore, request.strategy);

                layerNodes.push({
                    node,
                    detailLevel,
                    relevanceScore,
                    pathFromFocal
                });

                // Add relationships for this node
                const nodeRels = traversalResult.relationships.get(nodeId) || [];
                layerRelationships.push(...nodeRels);
            }

            // Sort nodes by relevance
            layerNodes.sort((a, b) => b.relevanceScore - a.relevanceScore);

            // Generate layer summary based on strategy
            const summary = await this.generateLayerSummary(layerNodes, distance, request.strategy);

            layers.push({
                distance,
                nodes: layerNodes,
                relationships: layerRelationships,
                summary
            });
        }

        return layers;
    }

    /**
     * Optimize context for token budget
     */
    private async optimizeForTokenBudget(
        layers: RAGContextLayer[],
        maxTokens: number,
        strategy?: RAGContextStrategy
    ): Promise<RAGContextLayer[]> {
        let currentTokens = 0;
        const optimizedLayers: RAGContextLayer[] = [];

        // Reserve tokens for focal node (always included at full detail)
        const focalTokens = 500; // Estimate
        currentTokens += focalTokens;

        for (const layer of layers) {
            const optimizedNodes: RAGContextNode[] = [];

            for (const contextNode of layer.nodes) {
                const nodeTokens = this.estimateNodeTokens(contextNode);

                if (currentTokens + nodeTokens <= maxTokens) {
                    optimizedNodes.push(contextNode);
                    currentTokens += nodeTokens;
                } else {
                    // Try with reduced detail level
                    const reducedNode = this.reduceDetailLevel(contextNode);
                    const reducedTokens = this.estimateNodeTokens(reducedNode);

                    if (currentTokens + reducedTokens <= maxTokens) {
                        optimizedNodes.push(reducedNode);
                        currentTokens += reducedTokens;
                    } else {
                        // Skip this node - token budget exceeded
                        break;
                    }
                }
            }

            if (optimizedNodes.length > 0) {
                optimizedLayers.push({
                    ...layer,
                    nodes: optimizedNodes
                });
            }

            // Stop if we're close to token limit
            if (currentTokens >= maxTokens * 0.9) {
                break;
            }
        }

        return optimizedLayers;
    }

    /**
     * Determine detail level based on distance and strategy
     */
    private getDetailLevel(
        distance: number,
        relevanceScore: number,
        strategy?: RAGContextStrategy
    ): 'full' | 'detailed' | 'medium' | 'brief' {
        if (distance === 0) return 'full';

        switch (strategy) {
            case 'focused':
                return distance === 1 ? 'detailed' : 'brief';
            case 'broad':
                return distance <= 2 ? 'medium' : 'brief';
            case 'balanced':
            default:
                if (distance === 1 && relevanceScore > 0.7) return 'detailed';
                if (distance <= 2) return 'medium';
                return 'brief';
        }
    }

    /**
     * Generate summary for a context layer
     */
    private async generateLayerSummary(
        nodes: RAGContextNode[],
        distance: number,
        strategy?: RAGContextStrategy
    ): Promise<string> {
        if (nodes.length === 0) return `No nodes at distance ${distance}`;

        const nodeTypes = [...new Set(nodes.map(n => n.node.type))];
        const highRelevanceCount = nodes.filter(n => n.relevanceScore > 0.7).length;

        let summary = `Distance ${distance}: ${nodes.length} nodes`;

        if (nodeTypes.length > 0) {
            summary += ` (${nodeTypes.join(', ')})`;
        }

        if (highRelevanceCount > 0) {
            summary += `, ${highRelevanceCount} highly relevant`;
        }

        return summary;
    }

    /**
     * Reduce detail level of a context node
     */
    private reduceDetailLevel(contextNode: RAGContextNode): RAGContextNode {
        const detailMap = {
            'full': 'detailed',
            'detailed': 'medium',
            'medium': 'brief',
            'brief': 'brief'
        } as const;

        return {
            ...contextNode,
            detailLevel: detailMap[contextNode.detailLevel]
        };
    }

    /**
     * Estimate token count for a context node
     */
    private estimateNodeTokens(contextNode: RAGContextNode): number {
        const { node, detailLevel } = contextNode;

        // Rough token estimation (4 characters per token average)
        switch (detailLevel) {
            case 'full':
                return Math.ceil((node.content?.description?.length || 0) / 4) + 100;
            case 'detailed':
                return Math.ceil((node.summaries?.detailed?.length || 0) / 4) + 50;
            case 'medium':
                return Math.ceil((node.summaries?.medium?.length || 0) / 4) + 25;
            case 'brief':
                return Math.ceil((node.summaries?.brief?.length || 0) / 4) + 10;
            default:
                return 50;
        }
    }

    /**
     * Calculate total token count for context
     */
    private calculateTokenCount(focalNode: RAGNode, layers: RAGContextLayer[]): number {
        let total = this.estimateNodeTokens({
            node: focalNode,
            detailLevel: 'full',
            relevanceScore: 1.0,
            pathFromFocal: []
        });

        for (const layer of layers) {
            for (const contextNode of layer.nodes) {
                total += this.estimateNodeTokens(contextNode);
            }
        }

        return total;
    }

    /**
     * Filter relationships based on criteria
     */
    private filterRelationships(
        relationships: RAGRelationship[],
        filters?: RAGContextFilters
    ): RAGRelationship[] {
        if (!filters) return relationships;

        return relationships.filter(rel => {
            if (filters.relationshipTypes && !filters.relationshipTypes.includes(rel.type)) {
                return false;
            }

            if (filters.timeRange) {
                if (rel.temporal?.startDate) {
                    const startDate = new Date(rel.temporal.startDate);
                    if (startDate < filters.timeRange.start || startDate > filters.timeRange.end) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Check if user has access to encrypted node
     */
    /**
     * Check if user has access to encrypted node
     * Implements RBAC: owner, shareable, or explicit access list
     */
    private hasAccess(encryptedNode: EncryptedRAGNode, userId: string): boolean {
        if (encryptedNode.metadata?.ownerId === userId) return true;
        if (encryptedNode.privacy?.shareable === true) return true;
        if (Array.isArray(encryptedNode.privacy?.accessList) && encryptedNode.privacy.accessList.includes(userId)) return true;
        // Add more RBAC/permission logic as needed (e.g., universe roles)
        return false;
    }

    /**
     * Generate cache key for context request
     */
    private generateCacheKey(request: RAGContextRequest): string {
        const key = `${request.focalNodeId}-${request.maxDistance}-${request.maxTokens}-${request.strategy || 'balanced'}`;
        if (request.filters) {
            const filterKey = JSON.stringify(request.filters, Object.keys(request.filters).sort());
            return `${key}-${Buffer.from(filterKey).toString('base64')}`;
        }
        return key;
    }

    /**
     * Get context from cache
     */
    private getFromCache(key: string): RAGContextResult | null {
        const entry = this.contextCache.get(key);
        if (!entry) return null;

        if (entry.expiresAt < new Date()) {
            this.contextCache.delete(key);
            return null;
        }

        entry.accessCount++;
        return entry.result;
    }

    /**
     * Add context to cache
     */
    private addToCache(key: string, result: RAGContextResult): void {
        // Remove oldest entries if cache is full
        if (this.contextCache.size >= this.cacheSize) {
            const oldestKey = Array.from(this.contextCache.entries())
                .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())[0][0];
            this.contextCache.delete(oldestKey);
        }

        const now = new Date();
        this.contextCache.set(key, {
            result,
            timestamp: now,
            expiresAt: new Date(now.getTime() + this.cacheTimeout),
            accessCount: 0
        });
    }

    /**
     * Generate warnings for context assembly
     */
    private generateWarnings(
        request: RAGContextRequest,
        tokenCount: number,
        layers: RAGContextLayer[]
    ): string[] {
        const warnings: string[] = [];

        if (tokenCount > request.maxTokens * 0.95) {
            warnings.push('Context is very close to token limit, some content may be truncated');
        }

        if (layers.length === 0) {
            warnings.push('No connected nodes found within specified distance');
        }

        const totalNodes = layers.reduce((sum, layer) => sum + layer.nodes.length, 0);
        if (totalNodes > 50) {
            warnings.push('Large number of connected nodes may affect performance');
        }

        return warnings;
    }

    /**
     * Clear expired entries from cache
     */
    clearExpiredCache(): void {
        const now = new Date();
        for (const [key, entry] of this.contextCache.entries()) {
            if (entry.expiresAt < now) {
                this.contextCache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        totalAccess: number;
    } {
        const totalAccess = Array.from(this.contextCache.values())
            .reduce((sum, entry) => sum + entry.accessCount, 0);

        const hits = Array.from(this.contextCache.values())
            .filter(entry => entry.accessCount > 0).length;

        return {
            size: this.contextCache.size,
            maxSize: this.cacheSize,
            hitRate: totalAccess > 0 ? hits / totalAccess : 0,
            totalAccess
        };
    }

    /**
     * Check if a relationship is encrypted
     */
    private isEncryptedRelationship(relationship: RAGRelationship | EncryptedRAGRelationship): relationship is EncryptedRAGRelationship {
        return 'encryptedData' in relationship && !('metadata' in relationship);
    }

    /**
     * Decrypt relationships if needed
     */
    private async decryptRelationshipsIfNeeded(relationships: (RAGRelationship | EncryptedRAGRelationship)[]): Promise<RAGRelationship[]> {
        const decryptedRelationships: RAGRelationship[] = [];

        for (const rel of relationships) {
            if (this.isEncryptedRelationship(rel)) {
                if (this.relationshipEncryptionService) {
                    try {
                        const decrypted = await this.relationshipEncryptionService.decryptRelationship(rel);
                        decryptedRelationships.push(decrypted);
                    } catch (error) {
                        console.warn(`Failed to decrypt relationship ${rel.id}:`, error);
                    }
                } else {
                    console.warn(`Encrypted relationship ${rel.id} found but no encryption service available`);
                }
            } else {
                decryptedRelationships.push(rel as RAGRelationship);
            }
        }

        return decryptedRelationships;
    }
}
