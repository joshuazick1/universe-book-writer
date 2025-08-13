/**
 * Graph Relationship Service
 * 
 * Service for detecting and managing relationships between nodes in the RAG system.
 * Implements relationship detection based on performance similarity, model families,
 * and capability clustering to enable graph-based insights and recommendations.
 */

import { getNode } from '../../../shared/node/nodeService.js';
import { NodeType, Node } from '../../../shared/types/nodeTypes.js';
import { logger } from '../../../shared/logging/logger.js';
import { sharedDatabaseConnection } from '../../../shared/database/database.config.js';
import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';

/**
 * Relationship types for graph connections
 */
export enum RelationshipType {
    PERFORMANCE_SIMILAR = 'performance_similar',
    MODEL_FAMILY = 'model_family',
    CAPABILITY_CLUSTER = 'capability_cluster',
    SERVER_GROUP = 'server_group',
    COMMUNITY_PEER = 'community_peer',
    BENCHMARK_CORRELATION = 'benchmark_correlation'
}

/**
 * Relationship strength levels
 */
export enum RelationshipStrength {
    WEAK = 0.3,
    MODERATE = 0.6,
    STRONG = 0.8,
    VERY_STRONG = 0.95
}

/**
 * Node relationship data structure
 */
export interface NodeRelationship {
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: RelationshipType;
    strength: number;
    metadata: {
        similarity?: number;
        sharedBenchmarks?: string[];
        performanceCorrelation?: number;
        familyScore?: number;
        capabilityOverlap?: number;
        communityRank?: number;
        detectedAt: string;
        lastUpdated: string;
    };
}

/**
 * Community scoring data
 */
export interface CommunityScore {
    nodeId: string;
    communityId: string;
    score: number;
    rank: number;
    peerNodes: string[];
    influenceMetrics: {
        connectivityScore: number;
        performanceInfluence: number;
        capabilityDiversity: number;
        networkCentrality: number;
    };
}

export class GraphRelationshipService {
    private similarityThreshold = 0.7;
    private maxRelationshipsPerNode = 10;

    constructor() {
        logger.info('[GraphRelationshipService] Initializing graph relationship detection service');
    }

    /**
     * Detect and create relationships between all nodes
     */
    async detectAllRelationships(): Promise<{
        created: number;
        updated: number;
        errors: number;
        relationships: NodeRelationship[];
    }> {
        logger.info('[GraphRelationshipService] Starting comprehensive relationship detection');

        try {
            const stats = {
                created: 0,
                updated: 0,
                errors: 0,
                relationships: [] as NodeRelationship[]
            };

            // Get all relevant nodes for relationship analysis
            const [aiModelNodes, modelPerformanceNodes, aiServerNodes] = await Promise.all([
                this.getNodes({ type: 'ai-model' as NodeType }),
                this.getNodes({ type: 'model-performance' as NodeType }),
                this.getNodes({ type: 'ai-server' as NodeType })
            ]);

            logger.info(`[GraphRelationshipService] Analyzing relationships for ${aiModelNodes.length} ai-model, ${modelPerformanceNodes.length} model-performance, and ${aiServerNodes.length} ai-server nodes`);

            // Detect performance similarity relationships
            const performanceRelationships = await this.detectPerformanceSimilarity(modelPerformanceNodes);
            stats.relationships.push(...performanceRelationships);

            // Detect model family relationships
            const familyRelationships = await this.detectModelFamilies(aiModelNodes);
            stats.relationships.push(...familyRelationships);

            // Detect capability clustering relationships
            const capabilityRelationships = await this.detectCapabilityClusters(modelPerformanceNodes);
            stats.relationships.push(...capabilityRelationships);

            // Detect server group relationships
            const serverRelationships = await this.detectServerGroups(aiServerNodes);
            stats.relationships.push(...serverRelationships);

            // Create relationships in the database
            for (const relationship of stats.relationships) {
                try {
                    await this.createRelationship(relationship);
                    stats.created++;
                } catch (error) {
                    logger.error(`[GraphRelationshipService] Error creating relationship:`, { error });
                    stats.errors++;
                }
            }

            logger.info(`[GraphRelationshipService] Relationship detection complete: ${stats.created} created, ${stats.errors} errors`);
            return stats;

        } catch (error) {
            logger.error('[GraphRelationshipService] Error in relationship detection:', { error });
            throw error;
        }
    }

    /**
     * Detect performance similarity relationships between model-performance nodes
     */
    private async detectPerformanceSimilarity(nodes: Node[]): Promise<NodeRelationship[]> {
        const relationships: NodeRelationship[] = [];

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];

                const similarity = this.calculatePerformanceSimilarity(nodeA, nodeB);

                if (similarity >= this.similarityThreshold) {
                    const correlation = this.calculateBenchmarkCorrelation(nodeA, nodeB);
                    const sharedBenchmarks = this.getSharedBenchmarks(nodeA, nodeB);

                    relationships.push({
                        sourceNodeId: nodeA.id,
                        targetNodeId: nodeB.id,
                        relationshipType: RelationshipType.PERFORMANCE_SIMILAR,
                        strength: similarity,
                        metadata: {
                            similarity,
                            performanceCorrelation: correlation,
                            sharedBenchmarks,
                            detectedAt: new Date().toISOString(),
                            lastUpdated: new Date().toISOString()
                        }
                    });
                }
            }
        }

        logger.info(`[GraphRelationshipService] Detected ${relationships.length} performance similarity relationships`);
        return relationships;
    }

    /**
     * Detect model family relationships between ai-model nodes
     */
    private async detectModelFamilies(nodes: Node[]): Promise<NodeRelationship[]> {
        const relationships: NodeRelationship[] = [];
        const familyGroups = this.groupByModelFamily(nodes);

        for (const [family, familyNodes] of familyGroups.entries()) {
            if (familyNodes.length < 2) continue;

            // Create relationships within each family
            for (let i = 0; i < familyNodes.length; i++) {
                for (let j = i + 1; j < familyNodes.length; j++) {
                    const nodeA = familyNodes[i];
                    const nodeB = familyNodes[j];

                    const familyScore = this.calculateFamilyScore(nodeA, nodeB);

                    relationships.push({
                        sourceNodeId: nodeA.id,
                        targetNodeId: nodeB.id,
                        relationshipType: RelationshipType.MODEL_FAMILY,
                        strength: familyScore,
                        metadata: {
                            familyScore,
                            detectedAt: new Date().toISOString(),
                            lastUpdated: new Date().toISOString()
                        }
                    });
                }
            }
        }

        logger.info(`[GraphRelationshipService] Detected ${relationships.length} model family relationships across ${familyGroups.size} families`);
        return relationships;
    }

    /**
     * Detect capability clustering relationships
     */
    private async detectCapabilityClusters(nodes: Node[]): Promise<NodeRelationship[]> {
        const relationships: NodeRelationship[] = [];
        const capabilityClusters = this.clusterByCapabilities(nodes);

        for (const cluster of capabilityClusters) {
            if (cluster.length < 2) continue;

            // Create relationships within each capability cluster
            for (let i = 0; i < cluster.length; i++) {
                for (let j = i + 1; j < cluster.length; j++) {
                    const nodeA = cluster[i];
                    const nodeB = cluster[j];

                    const capabilityOverlap = this.calculateCapabilityOverlap(nodeA, nodeB);

                    if (capabilityOverlap >= 0.6) {
                        relationships.push({
                            sourceNodeId: nodeA.id,
                            targetNodeId: nodeB.id,
                            relationshipType: RelationshipType.CAPABILITY_CLUSTER,
                            strength: capabilityOverlap,
                            metadata: {
                                capabilityOverlap,
                                detectedAt: new Date().toISOString(),
                                lastUpdated: new Date().toISOString()
                            }
                        });
                    }
                }
            }
        }

        logger.info(`[GraphRelationshipService] Detected ${relationships.length} capability cluster relationships`);
        return relationships;
    }

    /**
     * Detect server group relationships based on geographic and performance characteristics
     */
    private async detectServerGroups(nodes: Node[]): Promise<NodeRelationship[]> {
        const relationships: NodeRelationship[] = [];
        const serverGroups = this.groupServersByCharacteristics(nodes);

        for (const group of serverGroups) {
            if (group.length < 2) continue;

            // Create relationships within each server group
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const nodeA = group[i];
                    const nodeB = group[j];

                    const groupScore = this.calculateServerGroupScore(nodeA, nodeB);

                    if (groupScore >= 0.5) {
                        relationships.push({
                            sourceNodeId: nodeA.id,
                            targetNodeId: nodeB.id,
                            relationshipType: RelationshipType.SERVER_GROUP,
                            strength: groupScore,
                            metadata: {
                                detectedAt: new Date().toISOString(),
                                lastUpdated: new Date().toISOString()
                            }
                        });
                    }
                }
            }
        }

        logger.info(`[GraphRelationshipService] Detected ${relationships.length} server group relationships`);
        return relationships;
    }

    /**
     * Generate community-based scores and recommendations
     */
    async generateCommunityScores(): Promise<CommunityScore[]> {
        logger.info('[GraphRelationshipService] Generating community-based scores');

        try {
            const nodes = await this.getNodes({ type: 'ai-model' as NodeType });
            const relationships = await this.getAllRelationships();
            const communityScores: CommunityScore[] = [];

            // Build adjacency graph
            const graph = this.buildAdjacencyGraph(nodes, relationships);

            // Detect communities using relationship clusters
            const communities = this.detectCommunities(graph, relationships);

            // Calculate scores for each node in each community
            for (const [communityId, communityNodes] of communities.entries()) {
                for (const nodeId of communityNodes) {
                    const score = this.calculateCommunityScore(nodeId, communityNodes, graph, relationships);
                    const rank = this.calculateCommunityRank(nodeId, communityNodes, graph);
                    const peerNodes = this.findPeerNodes(nodeId, communityNodes, graph);
                    const influenceMetrics = this.calculateInfluenceMetrics(nodeId, graph, relationships);

                    communityScores.push({
                        nodeId,
                        communityId,
                        score,
                        rank,
                        peerNodes,
                        influenceMetrics
                    });
                }
            }

            logger.info(`[GraphRelationshipService] Generated community scores for ${communityScores.length} nodes across ${communities.size} communities`);
            return communityScores;

        } catch (error) {
            logger.error('[GraphRelationshipService] Error generating community scores:', { error });
            throw error;
        }
    }

    /**
     * Get graph-based insights for better server selection
     */
    async getGraphBasedInsights(modelId: string): Promise<{
        recommendations: Array<{
            serverId: string;
            score: number;
            reasons: string[];
            confidence: number;
        }>;
        communityContext: {
            communityId: string;
            peerModels: string[];
            avgPerformance: number;
            strengthIndicators: string[];
        };
        relationshipAnalysis: {
            similarModels: string[];
            performanceCluster: string;
            capabilityProfile: string[];
            networkPosition: 'central' | 'peripheral' | 'bridge';
        };
    }> {
        logger.info(`[GraphRelationshipService] Generating graph-based insights for model: ${modelId}`);

        try {
            // Get model node and its relationships
            const modelNode = await getNode({ type: 'ai-model', title: modelId });
            if (!modelNode) {
                throw new Error(`Model node not found: ${modelId}`);
            }

            const relationships = await this.getNodeRelationships(modelNode.id);
            const communityScores = await this.generateCommunityScores();

            // Find community context
            const modelCommunity = communityScores.find(cs => cs.nodeId === modelNode.id);

            // Generate server recommendations based on graph data
            const recommendations = await this.generateServerRecommendations(modelId, relationships, modelCommunity);

            // Build community context
            const communityContext = this.buildCommunityContext(modelCommunity, relationships);

            // Analyze relationships
            const relationshipAnalysis = this.analyzeNodeRelationships(modelNode, relationships);

            return {
                recommendations,
                communityContext,
                relationshipAnalysis
            };

        } catch (error) {
            logger.error(`[GraphRelationshipService] Error generating insights for ${modelId}:`, { error });
            throw error;
        }
    }

    // Helper methods

    private async getNodes(query: { type: NodeType }): Promise<Node[]> {
        const db = (sharedDatabaseConnection as any).db;
        if (!db) throw new Error('MongoDB database connection not initialized');

        const systemTypes = ['ai-model', 'ai-server', 'model-performance'];
        const collectionName = systemTypes.includes(query.type) ? 'system_nodes' : 'nodes';
        const collection = db.collection(collectionName);

        const nodes = await collection.find({ type: query.type }).toArray();
        return nodes;
    }

    private calculatePerformanceSimilarity(nodeA: Node, nodeB: Node): number {
        const benchmarksA = nodeA.metadata?.benchmarks || {};
        const benchmarksB = nodeB.metadata?.benchmarks || {};

        const sharedBenchmarks = Object.keys(benchmarksA).filter(key =>
            key in benchmarksB && benchmarksA[key] && benchmarksB[key]
        );

        if (sharedBenchmarks.length === 0) return 0;

        let totalSimilarity = 0;
        for (const benchmark of sharedBenchmarks) {
            const scoreA = benchmarksA[benchmark].score || 0;
            const scoreB = benchmarksB[benchmark].score || 0;
            const maxScore = Math.max(scoreA, scoreB);
            const minScore = Math.min(scoreA, scoreB);
            const similarity = maxScore > 0 ? minScore / maxScore : 0;
            totalSimilarity += similarity;
        }

        return totalSimilarity / sharedBenchmarks.length;
    }

    private calculateBenchmarkCorrelation(nodeA: Node, nodeB: Node): number {
        // Simplified correlation calculation
        const benchmarksA = nodeA.metadata?.benchmarks || {};
        const benchmarksB = nodeB.metadata?.benchmarks || {};

        const sharedKeys = Object.keys(benchmarksA).filter(key => key in benchmarksB);
        if (sharedKeys.length < 2) return 0;

        // Calculate Pearson correlation coefficient
        const scoresA = sharedKeys.map(key => benchmarksA[key].score || 0);
        const scoresB = sharedKeys.map(key => benchmarksB[key].score || 0);

        const meanA = scoresA.reduce((a, b) => a + b, 0) / scoresA.length;
        const meanB = scoresB.reduce((a, b) => a + b, 0) / scoresB.length;

        let numerator = 0;
        let sumSquaredA = 0;
        let sumSquaredB = 0;

        for (let i = 0; i < scoresA.length; i++) {
            const diffA = scoresA[i] - meanA;
            const diffB = scoresB[i] - meanB;
            numerator += diffA * diffB;
            sumSquaredA += diffA * diffA;
            sumSquaredB += diffB * diffB;
        }

        const denominator = Math.sqrt(sumSquaredA * sumSquaredB);
        return denominator > 0 ? numerator / denominator : 0;
    }

    private getSharedBenchmarks(nodeA: Node, nodeB: Node): string[] {
        const benchmarksA = nodeA.metadata?.benchmarks || {};
        const benchmarksB = nodeB.metadata?.benchmarks || {};

        return Object.keys(benchmarksA).filter(key =>
            key in benchmarksB && benchmarksA[key] && benchmarksB[key]
        );
    }

    private groupByModelFamily(nodes: Node[]): Map<string, Node[]> {
        const familyGroups = new Map<string, Node[]>();

        for (const node of nodes) {
            const modelName = node.title || 'unknown';
            const family = this.extractModelFamily(modelName);

            if (!familyGroups.has(family)) {
                familyGroups.set(family, []);
            }
            familyGroups.get(family)!.push(node);
        }

        return familyGroups;
    }

    private extractModelFamily(modelName: string): string {
        // Extract base model family from model name
        const familyPatterns = [
            /^(llama|llama2|llama3|llama-3)/i,
            /^(gpt|gpt-3|gpt-4)/i,
            /^(claude|claude-)/i,
            /^(mistral|mixtral)/i,
            /^(gemma|gemini)/i,
            /^(qwen|qwen2)/i,
            /^(phi|phi-)/i,
            /^(deepseek)/i,
            /^(yi|yi-)/i
        ];

        for (const pattern of familyPatterns) {
            const match = modelName.match(pattern);
            if (match) {
                return match[1].toLowerCase();
            }
        }

        // Default family based on first word
        return modelName.split(/[-_:\s]/)[0].toLowerCase();
    }

    private calculateFamilyScore(nodeA: Node, nodeB: Node): number {
        const familyA = this.extractModelFamily(nodeA.title || '');
        const familyB = this.extractModelFamily(nodeB.title || '');

        if (familyA === familyB) {
            // Same family - calculate version/size similarity
            const sizeA = this.extractModelSize(nodeA.title || '');
            const sizeB = this.extractModelSize(nodeB.title || '');

            if (sizeA && sizeB) {
                const sizeSimilarity = 1 - Math.abs(sizeA - sizeB) / Math.max(sizeA, sizeB);
                return Math.max(0.7, sizeSimilarity); // Minimum 0.7 for same family
            }

            return 0.8; // Same family, unknown sizes
        }

        return 0; // Different families
    }

    private extractModelSize(modelName: string): number | null {
        const sizeMatch = modelName.match(/(\d+(?:\.\d+)?)[bB]/);
        if (sizeMatch) {
            return parseFloat(sizeMatch[1]);
        }
        return null;
    }

    private clusterByCapabilities(nodes: Node[]): Node[][] {
        // Simplified capability clustering based on benchmark types
        const clusters: Node[][] = [];
        const processed = new Set<string>();

        for (const node of nodes) {
            if (processed.has(node.id)) continue;

            const cluster = [node];
            processed.add(node.id);

            const nodeCapabilities = this.extractCapabilities(node);

            // Find similar nodes
            for (const otherNode of nodes) {
                if (processed.has(otherNode.id)) continue;

                const otherCapabilities = this.extractCapabilities(otherNode);
                const overlap = this.calculateCapabilityOverlap(node, otherNode);

                if (overlap >= 0.6) {
                    cluster.push(otherNode);
                    processed.add(otherNode.id);
                }
            }

            clusters.push(cluster);
        }

        return clusters;
    }

    private extractCapabilities(node: Node): string[] {
        const benchmarks = node.metadata?.benchmarks || {};
        const capabilities = new Set<string>();

        // Map benchmarks to capabilities
        for (const benchmark of Object.keys(benchmarks)) {
            if (benchmark.includes('creative') || benchmark.includes('writing')) {
                capabilities.add('creative-writing');
            }
            if (benchmark.includes('code') || benchmark.includes('typescript')) {
                capabilities.add('code-generation');
            }
            if (benchmark.includes('dialogue') || benchmark.includes('conversation')) {
                capabilities.add('conversational');
            }
            if (benchmark.includes('character') || benchmark.includes('consistency')) {
                capabilities.add('character-modeling');
            }
            if (benchmark.includes('planning') || benchmark.includes('task')) {
                capabilities.add('task-planning');
            }
        }

        return Array.from(capabilities);
    }

    private calculateCapabilityOverlap(nodeA: Node, nodeB: Node): number {
        const capabilitiesA = new Set(this.extractCapabilities(nodeA));
        const capabilitiesB = new Set(this.extractCapabilities(nodeB));

        const intersection = new Set([...capabilitiesA].filter(x => capabilitiesB.has(x)));
        const union = new Set([...capabilitiesA, ...capabilitiesB]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    private groupServersByCharacteristics(nodes: Node[]): Node[][] {
        const groups: Node[][] = [];
        const processed = new Set<string>();

        for (const node of nodes) {
            if (processed.has(node.id)) continue;

            const group = [node];
            processed.add(node.id);

            // Find similar servers
            for (const otherNode of nodes) {
                if (processed.has(otherNode.id)) continue;

                const groupScore = this.calculateServerGroupScore(node, otherNode);
                if (groupScore >= 0.5) {
                    group.push(otherNode);
                    processed.add(otherNode.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    private calculateServerGroupScore(nodeA: Node, nodeB: Node): number {
        const regionA = nodeA.metadata?.region || 'unknown';
        const regionB = nodeB.metadata?.region || 'unknown';

        const memoryA = nodeA.metadata?.estimatedMemory || 0;
        const memoryB = nodeB.metadata?.estimatedMemory || 0;

        let score = 0;

        // Regional similarity
        if (regionA === regionB && regionA !== 'unknown') {
            score += 0.4;
        }

        // Memory similarity
        if (memoryA > 0 && memoryB > 0) {
            const memorySimilarity = 1 - Math.abs(memoryA - memoryB) / Math.max(memoryA, memoryB);
            score += memorySimilarity * 0.3;
        }

        // URL/provider similarity
        const urlA = nodeA.title || '';
        const urlB = nodeB.title || '';
        if (this.extractProvider(urlA) === this.extractProvider(urlB)) {
            score += 0.3;
        }

        return score;
    }

    private extractProvider(url: string): string {
        if (url.includes('localhost') || url.includes('127.0.0.1')) return 'local';
        if (url.includes('openai')) return 'openai';
        if (url.includes('anthropic')) return 'anthropic';
        if (url.includes('google')) return 'google';
        if (url.includes('azure')) return 'azure';
        if (url.includes('aws')) return 'aws';
        return 'unknown';
    }

    private async createRelationship(relationship: NodeRelationship): Promise<void> {
        // Store relationship in database
        const db = (sharedDatabaseConnection as any).db;
        const relationshipCollection = db.collection('relationships');

        await relationshipCollection.insertOne({
            sourceNodeId: relationship.sourceNodeId,
            targetNodeId: relationship.targetNodeId,
            relationshipType: relationship.relationshipType,
            strength: relationship.strength,
            metadata: relationship.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    private async getAllRelationships(): Promise<NodeRelationship[]> {
        // Implementation would fetch all relationships from database
        // For now, return empty array
        return [];
    }

    private async getNodeRelationships(nodeId: string): Promise<NodeRelationship[]> {
        // Implementation would fetch relationships for specific node
        // For now, return empty array
        return [];
    }

    private buildAdjacencyGraph(nodes: Node[], relationships: NodeRelationship[]): Map<string, Set<string>> {
        const graph = new Map<string, Set<string>>();

        // Initialize nodes
        for (const node of nodes) {
            graph.set(node.id, new Set());
        }

        // Add relationships
        for (const rel of relationships) {
            if (graph.has(rel.sourceNodeId) && graph.has(rel.targetNodeId)) {
                graph.get(rel.sourceNodeId)!.add(rel.targetNodeId);
                graph.get(rel.targetNodeId)!.add(rel.sourceNodeId);
            }
        }

        return graph;
    }

    private detectCommunities(graph: Map<string, Set<string>>, relationships: NodeRelationship[]): Map<string, Set<string>> {
        // Simplified community detection based on connected components
        const communities = new Map<string, Set<string>>();
        const visited = new Set<string>();
        let communityId = 0;

        for (const [nodeId, neighbors] of graph) {
            if (visited.has(nodeId)) continue;

            const community = new Set<string>();
            const stack = [nodeId];

            while (stack.length > 0) {
                const current = stack.pop()!;
                if (visited.has(current)) continue;

                visited.add(current);
                community.add(current);

                const currentNeighbors = graph.get(current) || new Set();
                for (const neighbor of currentNeighbors) {
                    if (!visited.has(neighbor)) {
                        stack.push(neighbor);
                    }
                }
            }

            communities.set(`community_${communityId++}`, community);
        }

        return communities;
    }

    private calculateCommunityScore(nodeId: string, communityNodes: Set<string>, graph: Map<string, Set<string>>, relationships: NodeRelationship[]): number {
        const nodeConnections = graph.get(nodeId) || new Set();
        const communityConnections = [...nodeConnections].filter(neighbor => communityNodes.has(neighbor));

        // Score based on connectivity within community
        const connectivityScore = communityConnections.length / Math.max(1, communityNodes.size - 1);

        // Score based on relationship strength
        const nodeRelationships = relationships.filter(rel =>
            rel.sourceNodeId === nodeId || rel.targetNodeId === nodeId
        );
        const avgStrength = nodeRelationships.length > 0
            ? nodeRelationships.reduce((sum, rel) => sum + rel.strength, 0) / nodeRelationships.length
            : 0;

        return (connectivityScore * 0.6 + avgStrength * 0.4);
    }

    private calculateCommunityRank(nodeId: string, communityNodes: Set<string>, graph: Map<string, Set<string>>): number {
        const nodeConnections = graph.get(nodeId) || new Set();
        const communityArray = Array.from(communityNodes);

        // Rank based on number of connections within community
        const connectionCounts = communityArray.map(id => {
            const connections = graph.get(id) || new Set();
            return [...connections].filter(neighbor => communityNodes.has(neighbor)).length;
        });

        connectionCounts.sort((a, b) => b - a);
        const nodeConnectionCount = [...nodeConnections].filter(neighbor => communityNodes.has(neighbor)).length;

        return connectionCounts.indexOf(nodeConnectionCount) + 1;
    }

    private findPeerNodes(nodeId: string, communityNodes: Set<string>, graph: Map<string, Set<string>>): string[] {
        const nodeConnections = graph.get(nodeId) || new Set();
        return [...nodeConnections].filter(neighbor => communityNodes.has(neighbor));
    }

    private calculateInfluenceMetrics(nodeId: string, graph: Map<string, Set<string>>, relationships: NodeRelationship[]): {
        connectivityScore: number;
        performanceInfluence: number;
        capabilityDiversity: number;
        networkCentrality: number;
    } {
        const nodeConnections = graph.get(nodeId) || new Set();
        const nodeRelationships = relationships.filter(rel =>
            rel.sourceNodeId === nodeId || rel.targetNodeId === nodeId
        );

        return {
            connectivityScore: nodeConnections.size / Math.max(1, graph.size),
            performanceInfluence: nodeRelationships.filter(rel =>
                rel.relationshipType === RelationshipType.PERFORMANCE_SIMILAR
            ).length / Math.max(1, nodeRelationships.length),
            capabilityDiversity: nodeRelationships.filter(rel =>
                rel.relationshipType === RelationshipType.CAPABILITY_CLUSTER
            ).length / Math.max(1, nodeRelationships.length),
            networkCentrality: this.calculateBetweennessCentrality(nodeId, graph)
        };
    }

    private calculateBetweennessCentrality(nodeId: string, graph: Map<string, Set<string>>): number {
        // Simplified betweenness centrality calculation
        // In practice, would use more sophisticated algorithm
        const nodeConnections = graph.get(nodeId) || new Set();
        const totalNodes = graph.size;

        return nodeConnections.size / Math.max(1, totalNodes - 1);
    }

    private async generateServerRecommendations(modelId: string, relationships: NodeRelationship[], community?: CommunityScore): Promise<Array<{
        serverId: string;
        score: number;
        reasons: string[];
        confidence: number;
    }>> {
        // Implementation would generate server recommendations based on graph data
        // For now, return empty array
        return [];
    }

    private buildCommunityContext(community: CommunityScore | undefined, relationships: NodeRelationship[]): {
        communityId: string;
        peerModels: string[];
        avgPerformance: number;
        strengthIndicators: string[];
    } {
        if (!community) {
            return {
                communityId: 'unknown',
                peerModels: [],
                avgPerformance: 0,
                strengthIndicators: []
            };
        }

        return {
            communityId: community.communityId,
            peerModels: community.peerNodes,
            avgPerformance: community.score,
            strengthIndicators: [
                `Network centrality: ${community.influenceMetrics.networkCentrality.toFixed(2)}`,
                `Performance influence: ${community.influenceMetrics.performanceInfluence.toFixed(2)}`,
                `Capability diversity: ${community.influenceMetrics.capabilityDiversity.toFixed(2)}`
            ]
        };
    }

    private analyzeNodeRelationships(node: Node, relationships: NodeRelationship[]): {
        similarModels: string[];
        performanceCluster: string;
        capabilityProfile: string[];
        networkPosition: 'central' | 'peripheral' | 'bridge';
    } {
        const similarModels = relationships
            .filter(rel => rel.relationshipType === RelationshipType.PERFORMANCE_SIMILAR)
            .map(rel => rel.sourceNodeId === node.id ? rel.targetNodeId : rel.sourceNodeId);

        const capabilities = this.extractCapabilities(node);

        // Determine network position based on relationship count and diversity
        const relationshipCount = relationships.length;
        const relationshipTypes = new Set(relationships.map(rel => rel.relationshipType));

        let networkPosition: 'central' | 'peripheral' | 'bridge' = 'peripheral';
        if (relationshipCount > 5 && relationshipTypes.size > 2) {
            networkPosition = 'central';
        } else if (relationshipTypes.size > 2) {
            networkPosition = 'bridge';
        }

        return {
            similarModels,
            performanceCluster: `cluster_${Math.floor(Math.random() * 10)}`, // Simplified
            capabilityProfile: capabilities,
            networkPosition
        };
    }
}
