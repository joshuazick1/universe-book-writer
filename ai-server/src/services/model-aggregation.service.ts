import { QualityBreakdown, PerformanceProfile, LoadBalancerWeights, Node, ModelPerformanceNode, AiModelNode } from 'shared/types/performance.js';
import { ensureNode, queryNodesByType } from 'shared/node/nodeService.js';
import { logToServerFile } from 'shared/logging/logger.js';

export class ModelAggregationService {
    private async fetchPerformanceNodesForModel(modelId: string): Promise<ModelPerformanceNode[]> {
        // Query for model-performance nodes with specific modelId
        const allNodes = await queryNodesByType('model-performance');
        return allNodes.filter(node => node.metadata?.modelId === modelId) as unknown as ModelPerformanceNode[];
    }

    private async saveAiModelNode(aiModelNode: AiModelNode): Promise<void> {
        // Use ensureNode to create or update the ai-model node
        await ensureNode({
            type: 'ai-model',
            title: aiModelNode.title,
            metadata: {
                ...aiModelNode.metadata,
                loadBalancerWeights: aiModelNode.loadBalancerWeights
            }
        });
    }

    private async getAllPerformanceNodes(): Promise<ModelPerformanceNode[]> {
        // Query for all model-performance nodes
        const nodes = await queryNodesByType('model-performance');
        return nodes as unknown as ModelPerformanceNode[];
    }

    public async aggregateModelPerformance(modelId: string): Promise<void> {
        console.log(`[ModelAggregation Debug] Starting aggregation for model: ${modelId}`);
        try {
            // Fetch all model-performance nodes for the given modelId
            console.log(`[ModelAggregation Debug] Fetching performance nodes for model: ${modelId}`);
            const performanceNodes: ModelPerformanceNode[] = await this.fetchPerformanceNodesForModel(modelId);
            console.log(`[ModelAggregation Debug] Found ${performanceNodes.length} performance nodes for model: ${modelId}`);

            logToServerFile(modelId, 'info', `Aggregating performance for model ${modelId}`, { performanceNodes });

            // Calculate quality breakdown and performance profile
            console.log(`[ModelAggregation Debug] Calculating quality breakdown for model: ${modelId}`);
            const qualityBreakdown = this.calculateQualityBreakdown(performanceNodes);
            console.log(`[ModelAggregation Debug] Quality breakdown calculated:`, qualityBreakdown);

            console.log(`[ModelAggregation Debug] Calculating performance profile for model: ${modelId}`);
            const performanceProfile = this.calculatePerformanceProfile(performanceNodes);
            console.log(`[ModelAggregation Debug] Performance profile calculated:`, performanceProfile);

            // Calculate load balancer weights
            const qualityValues = Object.values(qualityBreakdown);
            const avgQualityScore = qualityValues.length > 0
                ? qualityValues.reduce((sum, task) => sum + task.avg, 0) / qualityValues.length
                : 0;
            console.log(`[ModelAggregation Debug] Average quality score: ${avgQualityScore}`);

            const loadBalancerWeights = this.calculateLoadBalancerWeights(avgQualityScore, performanceProfile.avgColdLatency);
            console.log(`[ModelAggregation Debug] Load balancer weights calculated:`, loadBalancerWeights);

            // Update or create the ai-model node
            const aiModelNode: AiModelNode = {
                type: 'ai-model',
                title: modelId,
                metadata: {
                    modelId,
                    lastAggregated: new Date().toISOString(),
                    serverCount: performanceNodes.length
                },
                avgQualityScore: avgQualityScore,
                qualityBreakdown: qualityBreakdown,
                performanceProfile: performanceProfile,
                loadBalancerWeights: loadBalancerWeights
            };

            // Ensure quality scores are aggregated and stored in the ai-model node
            const aggregatedQualityScores = this.calculateQualityBreakdown(performanceNodes);
            aiModelNode.aggregatedScores = aggregatedQualityScores;

            console.log(`[ModelAggregation Debug] Saving ai-model node for: ${modelId}`);
            logToServerFile(modelId, 'info', `Model aggregation complete for ${modelId}`, { aiModelNode });

            await this.saveAiModelNode(aiModelNode);
            console.log(`[ModelAggregation Debug] Aggregation completed successfully for model: ${modelId}`);
        } catch (error) {
            console.error(`[ModelAggregation Debug] Error aggregating performance for model ${modelId}:`, error);
            logToServerFile(modelId, 'error', `Error aggregating performance for model ${modelId}`, { error });
            throw error;
        }
    }

    public async aggregateAllModels(): Promise<void> {
        console.log(`[ModelAggregation Debug] Starting aggregation for all models`);
        // Get all unique model IDs from performance nodes
        const allPerformanceNodes = await this.getAllPerformanceNodes();
        const modelIds = Array.from(new Set(allPerformanceNodes.map((node: ModelPerformanceNode) => node.metadata?.modelId).filter(Boolean))) as string[];

        console.log(`[ModelAggregation Debug] Found ${modelIds.length} unique models to aggregate: ${modelIds.join(', ')}`);

        // Aggregate each model in parallel with error handling
        const aggregationPromises = modelIds.map(async (modelId: string) => {
            try {
                console.log(`[ModelAggregation Debug] Starting aggregation for model: ${modelId}`);
                await this.aggregateModelPerformance(modelId);
                console.log(`[ModelAggregation Debug] ✓ Aggregated model: ${modelId}`);
            } catch (error) {
                console.error(`[ModelAggregation Debug] ✗ Failed to aggregate model ${modelId}:`, error);
                throw new Error(`Model aggregation failed for ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        await Promise.all(aggregationPromises);
        console.log(`[ModelAggregation Debug] Completed aggregation for all ${modelIds.length} models`);
    }

    private calculateQualityBreakdown(performanceNodes: ModelPerformanceNode[]): QualityBreakdown {
        const breakdown: QualityBreakdown = {};
        console.log(`[ModelAggregation Debug] Calculating quality breakdown for ${performanceNodes.length} nodes`);

        performanceNodes.forEach((node, index) => {
            console.log(`[ModelAggregation Debug] Processing node ${index + 1}:`, {
                title: node.title,
                hasQualityResults: !!node.qualityResults,
                qualityResultsKeys: node.qualityResults ? Object.keys(node.qualityResults) : []
            });

            // Check if the node has quality results
            if (!node.qualityResults || typeof node.qualityResults !== 'object') {
                console.warn(`[ModelAggregation Debug] Node ${node.title} has no quality results, skipping`);
                return;
            }

            Object.entries(node.qualityResults).forEach(([taskType, result]) => {
                if (!breakdown[taskType]) {
                    breakdown[taskType] = { avg: 0, min: Infinity, max: -Infinity, servers: 0 };
                }

                const taskBreakdown = breakdown[taskType];
                const qualityResult = result as { score: number };

                if (typeof qualityResult.score === 'number' && !isNaN(qualityResult.score)) {
                    taskBreakdown.avg += qualityResult.score;
                    taskBreakdown.min = Math.min(taskBreakdown.min, qualityResult.score);
                    taskBreakdown.max = Math.max(taskBreakdown.max, qualityResult.score);
                    taskBreakdown.servers += 1;
                    console.log(`[ModelAggregation Debug] Added score for ${taskType}: ${qualityResult.score}`);
                } else {
                    console.warn(`[ModelAggregation Debug] Invalid score for ${taskType}:`, qualityResult);
                }
            });
        });

        // Finalize averages
        Object.values(breakdown).forEach(taskBreakdown => {
            if (taskBreakdown.servers > 0) {
                taskBreakdown.avg /= taskBreakdown.servers;
            }
        });

        console.log(`[ModelAggregation Debug] Final quality breakdown:`, breakdown);
        return breakdown;
    }

    private calculatePerformanceProfile(performanceNodes: ModelPerformanceNode[]): PerformanceProfile {
        if (performanceNodes.length === 0) {
            console.warn(`[ModelAggregation Debug] No performance nodes to calculate profile from`);
            return {
                avgColdLatency: 0,
                avgWarmLatency: 0,
                bestServer: '',
                worstServer: ''
            };
        }

        console.log(`[ModelAggregation Debug] Calculating performance profile for ${performanceNodes.length} nodes`);

        let totalColdLatency = 0;
        let totalWarmLatency = 0;
        let bestServer = '';
        let worstServer = '';
        let minLatency = Infinity;
        let maxLatency = -Infinity;
        let validNodes = 0;

        performanceNodes.forEach((node, index) => {
            console.log(`[ModelAggregation Debug] Processing performance node ${index + 1}:`, {
                title: node.title,
                hasColdLatency: typeof node.coldLatency === 'number',
                coldLatency: node.coldLatency,
                hasWarmLatencies: Array.isArray(node.warmLatencies),
                warmLatenciesLength: Array.isArray(node.warmLatencies) ? node.warmLatencies.length : 0,
                serverId: node.serverId || node.metadata?.serverId
            });

            // Use fallback values if properties don't exist
            const coldLatency = typeof node.coldLatency === 'number' ? node.coldLatency : 9999;
            const warmLatencies = Array.isArray(node.warmLatencies) ? node.warmLatencies : [9999];
            const avgWarmLatency = warmLatencies.reduce((a: number, b: number) => a + b, 0) / (warmLatencies.length || 1);
            const serverId = node.serverId || node.metadata?.serverId || 'unknown';

            if (coldLatency < 9999) { // Only count valid latencies
                totalColdLatency += coldLatency;
                totalWarmLatency += avgWarmLatency;
                validNodes++;

                if (coldLatency < minLatency) {
                    minLatency = coldLatency;
                    bestServer = serverId;
                }
                if (coldLatency > maxLatency) {
                    maxLatency = coldLatency;
                    worstServer = serverId;
                }
            }
        });

        const result = {
            avgColdLatency: validNodes > 0 ? totalColdLatency / validNodes : 0,
            avgWarmLatency: validNodes > 0 ? totalWarmLatency / validNodes : 0,
            bestServer,
            worstServer
        };

        console.log(`[ModelAggregation Debug] Performance profile result:`, result);
        return result;

        return {
            avgColdLatency: totalColdLatency / performanceNodes.length,
            avgWarmLatency: totalWarmLatency / performanceNodes.length,
            bestServer,
            worstServer
        };
    }

    private calculateLoadBalancerWeights(qualityScore: number, performanceScore: number): LoadBalancerWeights {
        const combinedScore = (qualityScore * 0.6) + (performanceScore * 0.4);

        return {
            qualityWeight: qualityScore,
            performanceWeight: performanceScore,
            reliabilityWeight: 1 - combinedScore, // Example reliability calculation
            combinedScore
        };
    }
}
