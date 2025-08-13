/**
 * Enhanced updateRAGSystem Implementation
 * 
 * This shows how the BenchmarkingManager.updateRAGSystem() method should be enhanced
 * to create proper Graph-RAG nodes with community detection and relationships.
 */

import { ensureNode } from 'shared/node/nodeService.js';
import { ModelQualityBenchmarks, BenchmarkType, QualityBenchmarkScore } from 'shared/types/aiQualityBenchmark.js';
import { Node, NodeType } from 'shared/types/nodeTypes.js';
import { logger } from 'shared/logging/logger.js';
import { sharedDatabaseConnection } from 'shared/database/database.config.js';

// Helper function to get multiple nodes by type
async function getNodes(query: { type: NodeType }): Promise<Node[]> {
    const db = (sharedDatabaseConnection as any).db;
    if (!db) throw new Error('MongoDB database connection not initialized');

    const systemTypes = ['ai-model', 'ai-server', 'model-performance'];
    const collectionName = systemTypes.includes(query.type) ? 'system_nodes' : 'nodes';
    const collection = db.collection(collectionName);

    const nodes = await collection.find({ type: query.type }).toArray();
    return nodes;
}

/**
 * Enhanced updateRAGSystem method for BenchmarkingManager class
 * This replaces the current simple implementation with graph-aware node creation
 */
export class EnhancedUpdateRAGSystem {

    /**
     * Enhanced updateRAGSystem method
     * Creates ai-server, model-performance, and ai-model nodes with graph metadata
     */
    async updateRAGSystem(result: ModelQualityBenchmarks): Promise<void> {
        console.log(`[EnhancedRAG Debug] Starting RAG system update for model: ${result.modelId}`);
        console.log(`[EnhancedRAG Debug] Server latency metrics count: ${Object.keys(result.serverLatencyMetrics || {}).length}`);
        console.log(`[EnhancedRAG Debug] Benchmark types available: ${Object.keys(result.benchmarks || {}).join(', ')}`);

        try {
            logger.info('[BenchmarkingManager] Updating RAG system with enhanced graph nodes...', undefined);

            // 1. Create/update ai-server nodes for each server
            console.log(`[EnhancedRAG Debug] Creating AI server nodes...`);
            await this.createAIServerNodes(result);
            console.log(`[EnhancedRAG Debug] AI server nodes created successfully`);

            // 2. Create/update model-performance nodes for each server-model combination  
            console.log(`[EnhancedRAG Debug] Creating model performance nodes...`);
            await this.createModelPerformanceNodes(result);
            console.log(`[EnhancedRAG Debug] Model performance nodes created successfully`);

            // 3. Create/update aggregated ai-model node with community data
            console.log(`[EnhancedRAG Debug] Creating aggregated AI model node...`);
            await this.createAggregatedAIModelNode(result);
            console.log(`[EnhancedRAG Debug] Aggregated AI model node created successfully`);

            // 4. Update community relationships (if enough data exists)
            console.log(`[EnhancedRAG Debug] Updating community relationships...`);
            await this.updateCommunityRelationships(result.modelId);
            console.log(`[EnhancedRAG Debug] Community relationships updated successfully`);

            logger.info('[BenchmarkingManager] Successfully updated RAG system with enhanced graph nodes');
            console.log(`[EnhancedRAG Debug] RAG system update completed successfully for model: ${result.modelId}`);
        } catch (err) {
            console.error(`[EnhancedRAG Debug] Failed to update RAG system for model ${result.modelId}:`, err);
            logger.error('[BenchmarkingManager] Failed to update RAG system:', String(err) as any);
        }
    }

    /**
     * Create or update ai-server nodes for each server that was benchmarked
     */
    private async createAIServerNodes(result: ModelQualityBenchmarks): Promise<void> {
        const serverIds = Object.keys(result.serverLatencyMetrics || {});
        console.log(`[EnhancedRAG Debug] Creating AI server nodes for ${serverIds.length} servers: ${serverIds.join(', ')}`);

        for (const serverId of serverIds) {
            console.log(`[EnhancedRAG Debug] Processing server: ${serverId}`);
            const metrics = result.serverLatencyMetrics![serverId];
            console.log(`[EnhancedRAG Debug] Server metrics for ${serverId}:`, metrics);

            const serverType = this.detectServerType(serverId);
            console.log(`[EnhancedRAG Debug] Detected server type for ${serverId}: ${serverType}`);

            await ensureNode({
                type: 'ai-server',
                title: serverId,
                metadata: {
                    serverId,
                    baseUrl: serverId,
                    serverType,

                    // Available models (get from orchestrator if available, or at minimum this model)
                    availableModels: [result.modelId],

                    // Health from metrics
                    serverHealth: {
                        isHealthy: metrics.healthScore > 0.5,
                        lastHealthCheck: new Date().toISOString(),
                        responseTimeMs: metrics.tagsLatency || 9999,
                        consecutiveFailures: metrics.healthScore > 0.5 ? 0 : 1
                    },

                    // Inferred capabilities
                    capabilities: {
                        maxConcurrency: 4, // Default, should be configurable
                        estimatedMemory: this.estimateServerMemory(result.modelId),
                        serverRegion: this.inferServerRegion(serverId)
                    },

                    // Graph-RAG enhancements (realistic)
                    communityMembership: {
                        serverCluster: this.detectServerCluster(serverId),
                        capabilityGroup: 'general', // Can be enhanced with more server data
                        performanceTier: this.detectServerPerformanceTier(metrics)
                    },

                    graphMetadata: {
                        sharedModels: [result.modelId], // Will be enhanced when more data is available
                        uniqueModels: [], // Will be enhanced when comparing with other servers
                        connectivityScore: 0.5, // Default, enhanced when comparing with other servers
                        averageResponseTime: metrics.tagsLatency || 9999,
                        reliabilityScore: metrics.healthScore
                    },

                    lastUpdated: new Date().toISOString()
                }
            });

            logger.info(`[BenchmarkingManager] Created/updated ai-server node for ${serverId}`);
        }
    }

    /**
     * Create or update model-performance nodes for each server-model combination
     */
    private async createModelPerformanceNodes(result: ModelQualityBenchmarks): Promise<void> {
        const serverIds = Object.keys(result.serverLatencyMetrics || {});

        for (const serverId of serverIds) {
            const coldPerf = result.serverColdPerformance?.[serverId];
            const warmPerf = result.serverWarmPerformance?.[serverId];
            const latency = result.serverLatencies?.[serverId];

            await ensureNode({
                type: 'model-performance',
                title: `${result.modelId} on ${serverId}`,
                metadata: {
                    serverId,
                    modelName: result.modelId,

                    // Performance metrics (new structure)
                    coldPerformance: coldPerf || {},
                    warmPerformance: warmPerf || {},

                    // Quality benchmarks (detailed results)
                    benchmarks: result.benchmarks,

                    // Reliability metrics (derive from benchmark success)
                    reliability: {
                        successRate: this.calculateSuccessRate(result.benchmarks),
                        errorRate: this.calculateErrorRate(result.benchmarks),
                        avgErrorRecoveryTime: 0 // Could be enhanced with retry data
                    },

                    // Graph-RAG enhancements
                    communityMembership: {
                        performanceCluster: this.detectPerformanceTier(latency, result.benchmarks),
                        optimalWorkload: this.detectCapabilityCluster(result.benchmarks),
                        peerComparisons: [] // Will be populated during community analysis
                    },

                    graphMetadata: {
                        performanceEmbedding: await this.generatePerformanceEmbedding(result.benchmarks, coldPerf, warmPerf),
                        edges: [] // Will be populated during relationship analysis
                    },

                    // Legacy compatibility
                    serverLatency: latency,

                    lastTested: new Date().toISOString(),
                    testCount: 1 // Could be enhanced to track actual test count
                }
            });

            logger.info(`[BenchmarkingManager] Created/updated model-performance node for ${result.modelId} on ${serverId}`);
        }
    }

    /**
     * Create or update aggregated ai-model node with community data
     */
    private async createAggregatedAIModelNode(result: ModelQualityBenchmarks): Promise<void> {
        const serverIds = Object.keys(result.serverLatencyMetrics || {});

        // Aggregate performance metrics across servers
        const aggregatedMetrics = this.aggregatePerformanceMetrics(result);
        const qualityProfile = this.createQualityProfile(result.benchmarks);

        await ensureNode({
            type: 'ai-model',
            title: result.modelId,
            metadata: {
                modelId: result.modelId,
                modelType: this.detectModelType(result.modelId),
                availableServers: serverIds,

                // Aggregated performance metrics
                aggregatedMetrics,
                qualityProfile,

                // Model selection metadata
                recommendedUseCases: this.generateRecommendedUseCases(result.benchmarks),
                promptCompatibility: this.calculatePromptCompatibility(result.benchmarks),

                // Graph-RAG enhancements
                communityMembership: {
                    modelFamily: this.detectModelFamily(result.modelId),
                    capabilityCluster: this.detectCapabilityCluster(result.benchmarks),
                    similarModels: [], // Will be populated during community analysis
                    communityRank: 0.5 // Default, updated during community analysis
                },

                graphMetadata: {
                    semanticEmbedding: await this.generateModelEmbedding(result),
                    modelRelationships: [], // Will be populated during relationship analysis
                    hierarchyLevel: this.calculateHierarchyLevel(result.benchmarks),
                    parentModels: this.detectParentModels(result.modelId),
                    childModels: [] // Will be populated as derived models are discovered
                },

                // Legacy compatibility - preserve existing structure
                benchmarks: result.benchmarks,
                qualityScores: result.benchmarks,
                serverLatencyMetrics: result.serverLatencyMetrics,
                serverColdPerformance: result.serverColdPerformance,
                serverWarmPerformance: result.serverWarmPerformance,
                serverLatencies: result.serverLatencies,
                serverLatencyDetails: result.serverLatencyDetails,
                serverThroughput: result.serverThroughput,

                lastBenchmarked: new Date().toISOString(),
                benchmarkCount: Object.keys(result.benchmarks).length,
                benchmarkingStrategy: 'queue-based-workflow'
            }
        });

        logger.info(`[BenchmarkingManager] Created/updated ai-model node for ${result.modelId}`);
    }

    /**
     * Update community relationships using graph-based analysis
     */
    private async updateCommunityRelationships(modelId: string): Promise<void> {
        try {
            logger.info(`[BenchmarkingManager] Updating community relationships for ${modelId}`);

            // Get all model nodes to analyze relationships
            const modelNodes = await getNodes({ type: 'ai-model' as NodeType });
            const performanceNodes = await getNodes({ type: 'model-performance' as NodeType });

            if (modelNodes.length < 2) {
                logger.info(`[BenchmarkingManager] Insufficient models (${modelNodes.length}) for community analysis`);
                return;
            }

            // Find the current model node
            const currentModelNode = modelNodes.find((node: Node) =>
                node.metadata?.modelId === modelId || node.title === modelId
            );

            if (!currentModelNode) {
                logger.warn(`[BenchmarkingManager] Model node not found for ${modelId}`);
                return;
            }

            // Calculate similarity with other models
            const similarities = await this.calculateModelSimilarities(currentModelNode, modelNodes, performanceNodes);

            // Update the model node with community relationships
            await this.updateModelCommunityMetadata(currentModelNode, similarities);

            logger.info(`[BenchmarkingManager] Updated community relationships for ${modelId} with ${similarities.length} similar models`);

        } catch (error) {
            logger.error(`[BenchmarkingManager] Failed to update community relationships for ${modelId}:`, String(error) as any);
        }
    }

    // Helper methods for community detection and metadata generation

    private detectServerType(serverId: string): 'ollama' | 'openai-compatible' {
        // Simple heuristics - can be enhanced
        if (serverId.includes('localhost') || serverId.includes('ollama')) {
            return 'ollama';
        }
        return 'ollama'; // Default for now
    }

    private estimateServerMemory(modelId: string): string {
        const modelLower = modelId.toLowerCase();

        // Enhanced estimation based on model parameters and type
        if (modelLower.includes('70b') || modelLower.includes('72b')) return '48GB+';
        if (modelLower.includes('34b') || modelLower.includes('35b')) return '24GB+';
        if (modelLower.includes('13b') || modelLower.includes('14b') || modelLower.includes('15b')) return '16GB+';
        if (modelLower.includes('7b') || modelLower.includes('8b')) return '8GB+';
        if (modelLower.includes('3b') || modelLower.includes('4b')) return '4GB+';
        if (modelLower.includes('1b') || modelLower.includes('2b')) return '2GB+';

        // Model type specific estimates
        if (modelLower.includes('embed') || modelLower.includes('embedding')) return '1GB+';
        if (modelLower.includes('code') && modelLower.includes('llama')) return '16GB+'; // CodeLlama tends to be larger
        if (modelLower.includes('mixtral')) return '48GB+'; // Mixtral models are typically large
        if (modelLower.includes('phi')) return '4GB+'; // Phi models are typically smaller

        // Default based on common patterns
        if (modelLower.includes('instruct') || modelLower.includes('chat')) return '8GB+';

        return '8GB+'; // Conservative default
    }

    private inferServerRegion(serverId: string): string {
        // Enhanced region inference with better heuristics
        const serverLower = serverId.toLowerCase();

        // Local detection
        if (serverLower.includes('localhost') ||
            serverLower.includes('127.0.0.1') ||
            serverLower.includes('0.0.0.0') ||
            serverLower.includes('192.168.') ||
            serverLower.includes('10.0.') ||
            serverLower.includes('172.16.')) {
            return 'local';
        }

        // Cloud provider detection
        if (serverLower.includes('aws') || serverLower.includes('amazon')) return 'aws';
        if (serverLower.includes('azure') || serverLower.includes('microsoft')) return 'azure';
        if (serverLower.includes('gcp') || serverLower.includes('google')) return 'gcp';
        if (serverLower.includes('digitalocean') || serverLower.includes('do.')) return 'digitalocean';
        if (serverLower.includes('vultr')) return 'vultr';
        if (serverLower.includes('linode')) return 'linode';

        // Geographic indicators (basic)
        if (serverLower.includes('us-') || serverLower.includes('usa') || serverLower.includes('america')) return 'us';
        if (serverLower.includes('eu-') || serverLower.includes('europe')) return 'eu';
        if (serverLower.includes('asia') || serverLower.includes('ap-')) return 'asia';

        // Try to parse URL for domain-based inference
        try {
            const url = new URL(serverId.startsWith('http') ? serverId : `http://${serverId}`);
            const hostname = url.hostname;

            // TLD-based inference
            if (hostname.endsWith('.com') || hostname.endsWith('.net') || hostname.endsWith('.org')) return 'global';
            if (hostname.endsWith('.us')) return 'us';
            if (hostname.endsWith('.eu') || hostname.endsWith('.de') || hostname.endsWith('.fr') || hostname.endsWith('.uk')) return 'eu';
            if (hostname.endsWith('.jp') || hostname.endsWith('.cn') || hostname.endsWith('.kr')) return 'asia';

        } catch {
            // Failed to parse as URL
        }

        return 'unknown';
    }

    private detectServerCluster(serverId: string): string {
        // Group servers by domain/IP patterns
        try {
            const url = new URL(serverId.startsWith('http') ? serverId : `http://${serverId}`);
            return url.hostname.split('.')[0] || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    private detectServerPerformanceTier(metrics: any): string {
        const responseTime = metrics.tagsLatency || 9999;
        const healthScore = metrics.healthScore || 0;

        if (responseTime < 200 && healthScore > 0.8) return 'high-performance';
        if (responseTime < 1000 && healthScore > 0.6) return 'medium-performance';
        return 'budget-tier';
    }

    private calculateSuccessRate(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): number {
        const totalBenchmarks = Object.keys(benchmarks).length;
        const successfulBenchmarks = Object.values(benchmarks).filter(b => b.score > 0).length;
        return totalBenchmarks > 0 ? successfulBenchmarks / totalBenchmarks : 0;
    }

    private calculateErrorRate(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): number {
        return 1 - this.calculateSuccessRate(benchmarks);
    }

    private detectPerformanceTier(latency?: number, benchmarks?: Record<BenchmarkType, QualityBenchmarkScore>): string {
        const avgLatency = latency || 9999;
        const avgQuality = benchmarks ?
            Object.values(benchmarks).reduce((a, b) => a + b.score, 0) / Object.values(benchmarks).length : 0;

        if (avgLatency < 1000 && avgQuality > 0.8) return 'high-performance';
        if (avgLatency < 3000 && avgQuality > 0.6) return 'medium-performance';
        return 'budget-tier';
    }

    private detectCapabilityCluster(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): string {
        const scores = Object.entries(benchmarks);

        // Creative writing cluster
        const creativeScores = scores.filter(([type]) =>
            ['creative-writing', 'character-consistency', 'dialogue-generation', 'world-building', 'emotional-depth'].includes(type)
        ).map(([, score]) => score.score);

        // Technical cluster  
        const technicalScores = scores.filter(([type]) =>
            ['typescript-quality', 'task-planning', 'json-assembly'].includes(type)
        ).map(([, score]) => score.score);

        const avgCreative = creativeScores.length > 0 ?
            creativeScores.reduce((a, b) => a + b, 0) / creativeScores.length : 0;
        const avgTechnical = technicalScores.length > 0 ?
            technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length : 0;

        if (avgCreative > avgTechnical && avgCreative > 0.7) return 'creative-writing';
        if (avgTechnical > avgCreative && avgTechnical > 0.7) return 'technical-analysis';
        if (Math.abs(avgCreative - avgTechnical) < 0.1) return 'general-purpose';

        return 'specialized';
    }

    private detectModelFamily(modelId: string): string {
        const modelLower = modelId.toLowerCase();

        if (modelLower.includes('llama')) return 'llama';
        if (modelLower.includes('mistral')) return 'mistral';
        if (modelLower.includes('qwen')) return 'qwen';
        if (modelLower.includes('phi')) return 'phi';
        if (modelLower.includes('gemma')) return 'gemma';
        if (modelLower.includes('codellama')) return 'codellama';
        if (modelLower.includes('deepseek')) return 'deepseek';

        return 'other';
    }

    private detectModelType(modelId: string): 'text-generation' | 'embedding' | 'multimodal' {
        const modelLower = modelId.toLowerCase();

        if (modelLower.includes('embed') || modelLower.includes('embedding')) {
            return 'embedding';
        }

        // Most models are text generation for now
        return 'text-generation';
    }

    private aggregatePerformanceMetrics(result: ModelQualityBenchmarks): any {
        const latencies = Object.values(result.serverLatencies || {}).filter((lat): lat is number => typeof lat === 'number');
        const serverIds = Object.keys(result.serverLatencies || {});

        if (latencies.length === 0) {
            return {
                bestTokensPerSecond: 0,
                averageLatency: 9999,
                bestServer: '',
                worstServer: '',
                consistencyScore: 0
            };
        }

        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

        const bestServerIndex = latencies.indexOf(minLatency);
        const worstServerIndex = latencies.indexOf(maxLatency);

        // Calculate consistency (lower variance = higher consistency)
        const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length;
        const stdDev = Math.sqrt(variance);
        const consistencyScore = avgLatency > 0 ? Math.max(0, 1 - (stdDev / avgLatency)) : 0;

        return {
            bestTokensPerSecond: minLatency > 0 ? 1000 / minLatency : 0, // Rough estimate
            averageLatency: avgLatency,
            bestServer: serverIds[bestServerIndex] || '',
            worstServer: serverIds[worstServerIndex] || '',
            consistencyScore
        };
    }

    private createQualityProfile(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): any {
        const scores = Object.values(benchmarks).map(b => b.score);
        const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        // Categorize benchmarks by type
        const bookWritingTypes: BenchmarkType[] = ['creative-writing', 'character-consistency', 'dialogue-generation', 'world-building', 'emotional-depth', 'plot-coherence'];
        const technicalTypes: BenchmarkType[] = ['typescript-quality', 'task-planning', 'json-assembly'];
        const creativeTypes: BenchmarkType[] = ['creative-writing', 'world-building', 'emotional-depth', 'dialogue-generation'];

        const bookWritingScores = Object.entries(benchmarks)
            .filter(([type]) => bookWritingTypes.includes(type as BenchmarkType))
            .map(([, score]) => score.score);

        const technicalScores = Object.entries(benchmarks)
            .filter(([type]) => technicalTypes.includes(type as BenchmarkType))
            .map(([, score]) => score.score);

        const creativeScores = Object.entries(benchmarks)
            .filter(([type]) => creativeTypes.includes(type as BenchmarkType))
            .map(([, score]) => score.score);

        // Find strength and weakness areas
        const benchmarkEntries = Object.entries(benchmarks);
        const sortedByScore = benchmarkEntries.sort(([, a], [, b]) => b.score - a.score);

        const strengthAreas = sortedByScore.slice(0, 3).map(([type]) => type as BenchmarkType);
        const weaknessAreas = sortedByScore.slice(-3).map(([type]) => type as BenchmarkType);

        return {
            overallScore,
            strengthAreas,
            weaknessAreas,
            bookWritingScore: bookWritingScores.length > 0 ? bookWritingScores.reduce((a, b) => a + b, 0) / bookWritingScores.length : 0,
            technicalScore: technicalScores.length > 0 ? technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length : 0,
            creativeScore: creativeScores.length > 0 ? creativeScores.reduce((a, b) => a + b, 0) / creativeScores.length : 0
        };
    }

    private generateRecommendedUseCases(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): string[] {
        const useCases: string[] = [];
        const scores = Object.entries(benchmarks);

        // Check for strong performance in specific areas
        scores.forEach(([type, score]) => {
            if (score.score > 0.7) {
                switch (type) {
                    case 'creative-writing':
                    case 'character-consistency':
                    case 'dialogue-generation':
                        if (!useCases.includes('Creative Writing')) useCases.push('Creative Writing');
                        break;
                    case 'typescript-quality':
                    case 'task-planning':
                        if (!useCases.includes('Technical Tasks')) useCases.push('Technical Tasks');
                        break;
                    case 'world-building':
                    case 'plot-coherence':
                        if (!useCases.includes('Story Development')) useCases.push('Story Development');
                        break;
                    case 'json-assembly':
                        if (!useCases.includes('Structured Data')) useCases.push('Structured Data');
                        break;
                }
            }
        });

        return useCases.length > 0 ? useCases : ['General Purpose'];
    }

    private calculatePromptCompatibility(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): any {
        // This is a simplified implementation - could be enhanced with actual prompt analysis
        const overallScore = Object.values(benchmarks).reduce((a, b) => a + b.score, 0) / Object.values(benchmarks).length;

        return {
            shortPrompts: Math.min(1, overallScore + 0.1), // Generally better at short prompts
            longPrompts: Math.max(0, overallScore - 0.1),  // Slightly worse at long prompts
            technicalPrompts: this.getTechnicalScore(benchmarks),
            creativePrompts: this.getCreativeScore(benchmarks)
        };
    }

    private getTechnicalScore(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): number {
        const technicalTypes = ['typescript-quality', 'task-planning', 'json-assembly'];
        const technicalScores = Object.entries(benchmarks)
            .filter(([type]) => technicalTypes.includes(type))
            .map(([, score]) => score.score);

        return technicalScores.length > 0 ? technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length : 0.5;
    }

    private getCreativeScore(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): number {
        const creativeTypes = ['creative-writing', 'character-consistency', 'dialogue-generation', 'world-building', 'emotional-depth'];
        const creativeScores = Object.entries(benchmarks)
            .filter(([type]) => creativeTypes.includes(type))
            .map(([, score]) => score.score);

        return creativeScores.length > 0 ? creativeScores.reduce((a, b) => a + b, 0) / creativeScores.length : 0.5;
    }

    private calculateHierarchyLevel(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>): number {
        // Simple hierarchy based on overall performance (0-10 scale)
        const overallScore = Object.values(benchmarks).reduce((a, b) => a + b.score, 0) / Object.values(benchmarks).length;
        return Math.floor(overallScore * 10);
    }

    private detectParentModels(modelId: string): string[] {
        const modelLower = modelId.toLowerCase();
        const parents: string[] = [];

        // Enhanced parent model detection with comprehensive patterns

        // Instruction-tuned models
        if (modelLower.includes('instruct') || modelLower.includes('chat')) {
            // Remove instruct/chat variations to get base model
            let baseModel = modelId
                .replace(/[-_]?(instruct|chat)[-_]?(ed|ed-alpha|alpha|beta|v\d+)?/gi, '')
                .replace(/[-_]?(it|sft)[-_]?/gi, ''); // instruction tuned, supervised fine-tuned

            if (baseModel !== modelId && baseModel.length > 0) {
                parents.push(baseModel);
            }
        }

        // Version-based models (v2, v3, etc.)
        const versionMatch = modelId.match(/(.+?)[-_]?v(\d+)/i);
        if (versionMatch && parseInt(versionMatch[2]) > 1) {
            const baseVersion = `${versionMatch[1]}-v${parseInt(versionMatch[2]) - 1}`;
            parents.push(baseVersion);

            // Also add v1 or base without version
            if (parseInt(versionMatch[2]) > 2) {
                parents.push(`${versionMatch[1]}-v1`);
            }
            parents.push(versionMatch[1]);
        }

        // Size variations (assume smaller versions are parents)
        const sizeMatch = modelId.match(/(.+?)[-_]?(\d+)b/i);
        if (sizeMatch) {
            const size = parseInt(sizeMatch[2]);
            const baseName = sizeMatch[1];

            // Add common smaller sizes as potential parents
            const commonSizes = [1, 2, 3, 7, 8, 13, 14, 15, 20, 30, 34, 35, 70, 72];
            for (const smallerSize of commonSizes) {
                if (smallerSize < size) {
                    parents.push(`${baseName}-${smallerSize}b`);
                }
            }
        }

        // Specialized model variants
        if (modelLower.includes('code')) {
            // Code models often based on base language models
            const baseModel = modelId.replace(/[-_]?code[-_]?/gi, '');
            if (baseModel !== modelId) {
                parents.push(baseModel);
            }
        }

        // Model family relationships
        const familyRelations: Record<string, string[]> = {
            'codellama': ['llama', 'llama2'],
            'alpaca': ['llama'],
            'vicuna': ['llama'],
            'wizardlm': ['llama'],
            'mixtral': ['mistral'],
            'qwen2': ['qwen'],
            'phi-3': ['phi-2', 'phi'],
            'gemma2': ['gemma']
        };

        for (const [derived, baseModels] of Object.entries(familyRelations)) {
            if (modelLower.includes(derived)) {
                parents.push(...baseModels);
            }
        }

        // Remove duplicates and filter out invalid entries
        const uniqueParents = Array.from(new Set(parents))
            .filter(parent => parent.length > 0 && parent !== modelId)
            .slice(0, 5); // Limit to 5 most relevant parents

        return uniqueParents;
    }

    private async generatePerformanceEmbedding(
        benchmarks: Record<BenchmarkType, QualityBenchmarkScore>,
        coldPerf?: any,
        warmPerf?: any
    ): Promise<number[]> {
        const embedding: number[] = [];

        // Structured approach to embedding generation

        // 1. Core benchmark scores (normalized 0-1)
        const coreTypes: BenchmarkType[] = [
            'creative-writing', 'character-consistency', 'dialogue-generation',
            'typescript-quality', 'task-planning', 'json-assembly'
        ];

        for (const type of coreTypes) {
            const score = benchmarks[type]?.score || 0;
            embedding.push(Math.max(0, Math.min(1, score))); // Ensure 0-1 range
        }

        // 2. Performance categories (aggregated scores)
        const creativeTypes = ['creative-writing', 'character-consistency', 'dialogue-generation', 'world-building', 'emotional-depth'];
        const technicalTypes = ['typescript-quality', 'task-planning', 'json-assembly', 'fact-extraction'];
        const analysisTypes = ['summarization', 'content-moderation', 'logical-reasoning'];

        embedding.push(this.calculateCategoryScore(benchmarks, creativeTypes));
        embedding.push(this.calculateCategoryScore(benchmarks, technicalTypes));
        embedding.push(this.calculateCategoryScore(benchmarks, analysisTypes));

        // 3. Performance characteristics
        if (coldPerf) {
            embedding.push(this.normalizeMetric(coldPerf.timeToFirstToken || 0, 0, 10000)); // 0-10s range
            embedding.push(this.normalizeMetric(coldPerf.tokensPerSecond || 0, 0, 200)); // 0-200 tokens/s
        } else {
            embedding.push(0, 0);
        }

        if (warmPerf) {
            embedding.push(this.normalizeMetric(warmPerf.averageResponseTime || 0, 0, 5000)); // 0-5s range
            embedding.push(Math.max(0, Math.min(1, warmPerf.consistencyScore || 0)));
        } else {
            embedding.push(0, 0);
        }

        // 4. Quality metrics
        const scores = Object.values(benchmarks).map(b => b.score);
        if (scores.length > 0) {
            embedding.push(Math.max(...scores)); // Best score
            embedding.push(Math.min(...scores)); // Worst score
            embedding.push(scores.reduce((a, b) => a + b, 0) / scores.length); // Average
            embedding.push(this.calculateVariance(scores)); // Consistency
        } else {
            embedding.push(0, 0, 0, 0);
        }

        // 5. Capability indicators (binary features)
        const capabilities = ['creative', 'technical', 'analytical', 'conversational'];
        capabilities.forEach(cap => {
            embedding.push(this.hasCapability(benchmarks, cap) ? 1 : 0);
        });

        // Ensure fixed size (25 dimensions for performance)
        while (embedding.length < 25) {
            embedding.push(0);
        }

        return embedding.slice(0, 25);
    }

    private async generateModelEmbedding(result: ModelQualityBenchmarks): Promise<number[]> {
        const embedding: number[] = [];

        // 1. Model family encoding (one-hot with similarity groups)
        const family = this.detectModelFamily(result.modelId);
        const familyGroups = {
            'llama': ['llama', 'codellama', 'alpaca'],
            'mistral': ['mistral', 'mixtral'],
            'qwen': ['qwen', 'qwen2'],
            'phi': ['phi', 'phi-2', 'phi-3'],
            'gemma': ['gemma', 'gemma2'],
            'deepseek': ['deepseek'],
            'other': ['other']
        };

        // Enhanced family encoding with similarity
        Object.entries(familyGroups).forEach(([groupName, members]) => {
            if (members.includes(family)) {
                embedding.push(1); // Primary family
            } else {
                // Check for related families
                const similarity = this.getFamilySimilarity(family, groupName);
                embedding.push(similarity > 0.5 ? 0.5 : 0);
            }
        });

        // 2. Model characteristics
        const modelLower = result.modelId.toLowerCase();

        // Model type indicators
        embedding.push(modelLower.includes('instruct') || modelLower.includes('chat') ? 1 : 0);
        embedding.push(modelLower.includes('code') ? 1 : 0);
        embedding.push(modelLower.includes('embed') ? 1 : 0);

        // Size category
        const sizeCategory = this.categorizeModelSize(result.modelId);
        const sizeCategories = ['tiny', 'small', 'medium', 'large', 'xlarge'];
        sizeCategories.forEach(category => {
            embedding.push(category === sizeCategory ? 1 : 0);
        });

        // 3. Performance profile
        const qualityProfile = this.createQualityProfile(result.benchmarks);
        embedding.push(qualityProfile.bookWritingScore);
        embedding.push(qualityProfile.technicalScore);
        embedding.push(qualityProfile.creativeScore);
        embedding.push(qualityProfile.overallScore);

        // 4. Capability strengths (top 3 benchmark areas)
        const benchmarkScores = Object.entries(result.benchmarks)
            .map(([type, score]: [string, any]) => ({ type, score: score?.score || 0 }))
            .sort((a, b) => b.score - a.score);

        const topCapabilities = benchmarkScores.slice(0, 3);
        const allBenchmarkTypes: BenchmarkType[] = [
            'creative-writing', 'character-consistency', 'dialogue-generation',
            'typescript-quality', 'task-planning', 'json-assembly',
            'world-building', 'emotional-depth', 'fact-extraction', 'summarization'
        ];

        // One-hot encoding for top capabilities
        allBenchmarkTypes.forEach(type => {
            const isTopCapability = topCapabilities.some(cap => cap.type === type);
            embedding.push(isTopCapability ? 1 : 0);
        });

        // 5. Performance characteristics
        const aggregated = this.aggregatePerformanceMetrics(result);
        embedding.push(this.normalizeMetric(aggregated.averageLatency, 0, 10000)); // Normalized latency
        embedding.push(aggregated.consistencyScore);

        // Server diversity (how many different servers can run this model)
        const serverCount = Object.keys(result.serverLatencies || {}).length;
        embedding.push(this.normalizeMetric(serverCount, 1, 10));

        // Ensure fixed size (50 dimensions for model embedding)
        while (embedding.length < 50) {
            embedding.push(0);
        }

        return embedding.slice(0, 50);
    }

    /**
     * Calculate similarity between the current model and other models
     */
    private async calculateModelSimilarities(
        currentModel: Node,
        allModels: Node[],
        performanceNodes: Node[]
    ): Promise<Array<{ modelId: string; similarity: number; family: string; capabilities: string[] }>> {
        const similarities: Array<{ modelId: string; similarity: number; family: string; capabilities: string[] }> = [];
        const currentFamily = this.detectModelFamily(currentModel.metadata?.modelId || currentModel.title);
        const currentBenchmarks = currentModel.metadata?.benchmarks || {};

        for (const otherModel of allModels) {
            if (otherModel.id === currentModel.id) continue;

            const otherModelId = otherModel.metadata?.modelId || otherModel.title;
            const otherFamily = this.detectModelFamily(otherModelId);
            const otherBenchmarks = otherModel.metadata?.benchmarks || {};

            // Calculate similarity based on multiple factors
            let similarity = 0;

            // Family similarity (30% weight)
            const familySimilarity = currentFamily === otherFamily ? 1 : this.getFamilySimilarity(currentFamily, otherFamily);
            similarity += familySimilarity * 0.3;

            // Performance similarity (50% weight)
            const performanceSimilarity = this.calculateBenchmarkSimilarity(currentBenchmarks, otherBenchmarks);
            similarity += performanceSimilarity * 0.5;

            // Capability similarity (20% weight)
            const currentCapabilities = this.extractCapabilities(currentBenchmarks);
            const otherCapabilities = this.extractCapabilities(otherBenchmarks);
            const capabilitySimilarity = this.calculateCapabilitySimilarity(currentCapabilities, otherCapabilities);
            similarity += capabilitySimilarity * 0.2;

            if (similarity > 0.3) { // Only include reasonably similar models
                similarities.push({
                    modelId: otherModelId,
                    similarity,
                    family: otherFamily,
                    capabilities: otherCapabilities
                });
            }
        }

        // Sort by similarity and return top 10
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10);
    }

    /**
     * Update model node with community metadata
     */
    private async updateModelCommunityMetadata(
        modelNode: Node,
        similarities: Array<{ modelId: string; similarity: number; family: string; capabilities: string[] }>
    ): Promise<void> {
        const communityData = {
            similarModels: similarities.map(s => ({
                modelId: s.modelId,
                similarity: s.similarity,
                family: s.family
            })),
            communityRank: this.calculateCommunityRank(similarities),
            clusterAffinity: this.calculateClusterAffinity(similarities),
            lastCommunityUpdate: new Date().toISOString()
        };

        // Update the existing metadata
        const updatedMetadata = {
            ...modelNode.metadata,
            communityMembership: {
                ...modelNode.metadata?.communityMembership,
                ...communityData
            }
        };

        // Update the node
        await ensureNode({
            type: 'ai-model',
            title: modelNode.title,
            metadata: updatedMetadata
        });
    }

    /**
     * Calculate similarity between model families
     */
    private getFamilySimilarity(family1: string, family2: string): number {
        // Define family relationships
        const familyGroups = {
            'llama': ['llama', 'codellama', 'alpaca'],
            'mistral': ['mistral', 'mixtral'],
            'qwen': ['qwen', 'qwen2'],
            'phi': ['phi', 'phi-2', 'phi-3'],
            'gemma': ['gemma', 'gemma2']
        };

        // Check if families are in the same group
        for (const group of Object.values(familyGroups)) {
            if (group.includes(family1) && group.includes(family2)) {
                return 0.8; // High similarity within family group
            }
        }

        // Default low similarity for different families
        return 0.1;
    }

    /**
     * Calculate similarity between benchmark scores
     */
    private calculateBenchmarkSimilarity(benchmarks1: any, benchmarks2: any): number {
        const types1 = Object.keys(benchmarks1);
        const types2 = Object.keys(benchmarks2);
        const commonTypes = types1.filter(type => types2.includes(type));

        if (commonTypes.length === 0) return 0;

        let totalSimilarity = 0;
        for (const type of commonTypes) {
            const score1 = benchmarks1[type]?.score || 0;
            const score2 = benchmarks2[type]?.score || 0;

            // Calculate similarity based on score difference
            const diff = Math.abs(score1 - score2);
            const similarity = Math.max(0, 1 - diff); // Closer scores = higher similarity
            totalSimilarity += similarity;
        }

        return totalSimilarity / commonTypes.length;
    }

    /**
     * Extract capabilities from benchmark scores
     */
    private extractCapabilities(benchmarks: any): string[] {
        const capabilities: string[] = [];
        const threshold = 0.7; // Minimum score to consider a capability

        Object.entries(benchmarks).forEach(([type, result]: [string, any]) => {
            if (result?.score >= threshold) {
                // Map benchmark types to capabilities
                const capabilityMap: Record<string, string> = {
                    'creative-writing': 'creative',
                    'character-consistency': 'storytelling',
                    'dialogue-generation': 'conversational',
                    'world-building': 'creative',
                    'typescript-quality': 'coding',
                    'task-planning': 'analytical',
                    'json-assembly': 'structured-data',
                    'fact-extraction': 'analytical',
                    'summarization': 'text-processing'
                };

                const capability = capabilityMap[type];
                if (capability && !capabilities.includes(capability)) {
                    capabilities.push(capability);
                }
            }
        });

        return capabilities;
    }

    /**
     * Calculate similarity between capability sets
     */
    private calculateCapabilitySimilarity(capabilities1: string[], capabilities2: string[]): number {
        if (capabilities1.length === 0 && capabilities2.length === 0) return 1;
        if (capabilities1.length === 0 || capabilities2.length === 0) return 0;

        const intersection = capabilities1.filter(cap => capabilities2.includes(cap));
        const union = Array.from(new Set([...capabilities1, ...capabilities2]));

        return intersection.length / union.length; // Jaccard similarity
    }

    /**
     * Calculate community rank based on similarities
     */
    private calculateCommunityRank(similarities: Array<{ similarity: number }>): number {
        if (similarities.length === 0) return 0.5;

        const avgSimilarity = similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length;
        const highSimilarityCount = similarities.filter(s => s.similarity > 0.7).length;

        // Models with many high-similarity peers get higher rank
        return Math.min(1, avgSimilarity + (highSimilarityCount * 0.1));
    }

    /**
     * Calculate cluster affinity based on family and capability distribution
     */
    private calculateClusterAffinity(similarities: Array<{ family: string; capabilities: string[] }>): Record<string, number> {
        const familyCount: Record<string, number> = {};
        const capabilityCount: Record<string, number> = {};

        similarities.forEach(s => {
            familyCount[s.family] = (familyCount[s.family] || 0) + 1;
            s.capabilities.forEach(cap => {
                capabilityCount[cap] = (capabilityCount[cap] || 0) + 1;
            });
        });

        const total = similarities.length;
        const affinities: Record<string, number> = {};

        // Add family affinities
        Object.entries(familyCount).forEach(([family, count]) => {
            affinities[`family-${family}`] = count / total;
        });

        // Add capability affinities
        Object.entries(capabilityCount).forEach(([capability, count]) => {
            affinities[`capability-${capability}`] = count / total;
        });

        return affinities;
    }

    /**
     * Calculate average score for a category of benchmarks
     */
    private calculateCategoryScore(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>, types: string[]): number {
        const relevantScores = types
            .filter(type => benchmarks[type as BenchmarkType])
            .map(type => benchmarks[type as BenchmarkType].score);

        return relevantScores.length > 0 ?
            relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length : 0;
    }

    /**
     * Normalize a metric to 0-1 range
     */
    private normalizeMetric(value: number, min: number, max: number): number {
        return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }

    /**
     * Calculate variance of an array of numbers
     */
    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    /**
     * Check if model has a specific capability based on benchmarks
     */
    private hasCapability(benchmarks: Record<BenchmarkType, QualityBenchmarkScore>, capability: string): boolean {
        const threshold = 0.7;

        const capabilityMap: Record<string, BenchmarkType[]> = {
            'creative': ['creative-writing', 'character-consistency', 'dialogue-generation', 'world-building', 'emotional-depth'],
            'technical': ['typescript-quality', 'task-planning', 'json-assembly'],
            'analytical': ['fact-extraction', 'summarization', 'content-moderation'],
            'conversational': ['dialogue-generation', 'character-consistency', 'emotional-depth']
        };

        const relevantTypes = capabilityMap[capability] || [];
        const scores = relevantTypes
            .filter(type => benchmarks[type])
            .map(type => benchmarks[type].score);

        return scores.length > 0 && scores.some(score => score >= threshold);
    }

    /**
     * Categorize model size based on parameter count
     */
    private categorizeModelSize(modelId: string): string {
        const modelLower = modelId.toLowerCase();

        // Extract parameter count from model name
        const paramMatch = modelLower.match(/(\d+)b/);
        if (paramMatch) {
            const paramCount = parseInt(paramMatch[1]);

            if (paramCount >= 70) return 'xlarge';
            if (paramCount >= 30) return 'large';
            if (paramCount >= 10) return 'medium';
            if (paramCount >= 3) return 'small';
            return 'tiny';
        }

        // Fallback based on model name patterns
        if (modelLower.includes('phi') || modelLower.includes('tiny') || modelLower.includes('mini')) return 'tiny';
        if (modelLower.includes('small') || modelLower.includes('lite')) return 'small';
        if (modelLower.includes('large') || modelLower.includes('xl')) return 'large';
        if (modelLower.includes('mixtral') || modelLower.includes('70b') || modelLower.includes('72b')) return 'xlarge';

        return 'medium'; // Default
    }
}
