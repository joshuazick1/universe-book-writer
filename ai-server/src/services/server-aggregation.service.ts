import { ServerHealth, ServerPerformanceProfile, ModelPerformanceNode, AiServerNode } from 'shared/types/performance.js';
import { ensureNode, queryNodesByType } from 'shared/node/nodeService.js';
import { logToServerFile } from 'shared/logging/logger.js';

export class ServerAggregationService {
    private async fetchPerformanceNodesForServer(serverId: string): Promise<ModelPerformanceNode[]> {
        // Query for model-performance nodes with specific serverId
        const allNodes = await queryNodesByType('model-performance');
        return allNodes.filter(node => node.metadata?.serverId === serverId) as unknown as ModelPerformanceNode[];
    }

    private async saveAiServerNode(aiServerNode: AiServerNode): Promise<void> {
        // Use ensureNode to create or update the ai-server node
        await ensureNode({
            type: 'ai-server',
            title: aiServerNode.title,
            metadata: {
                ...aiServerNode.metadata,
                serverHealth: aiServerNode.serverHealth,
                performanceProfile: aiServerNode.performanceProfile
            }
        });
    }

    private async getAllPerformanceNodes(): Promise<ModelPerformanceNode[]> {
        // Query for all model-performance nodes
        const nodes = await queryNodesByType('model-performance');
        return nodes as unknown as ModelPerformanceNode[];
    }

    public async aggregateServerPerformance(serverId: string): Promise<void> {
        console.log(`[ServerAggregation Debug] Starting aggregation for server: ${serverId}`);
        try {
            console.log(`[ServerAggregation Debug] Fetching performance nodes for server: ${serverId}`);
            const performanceNodes: ModelPerformanceNode[] = await this.fetchPerformanceNodesForServer(serverId);
            console.log(`[ServerAggregation Debug] Found ${performanceNodes.length} performance nodes for server: ${serverId}`);

            // Calculate server health and performance profile
            console.log(`[ServerAggregation Debug] Calculating server health for: ${serverId}`);
            const serverHealth = this.calculateServerHealth(performanceNodes);
            console.log(`[ServerAggregation Debug] Server health calculated:`, serverHealth);

            console.log(`[ServerAggregation Debug] Calculating performance profile for: ${serverId}`);
            const performanceProfile = this.calculateServerPerformanceProfile(performanceNodes);
            console.log(`[ServerAggregation Debug] Performance profile calculated:`, performanceProfile);

            // Update or create the ai-server node
            const aiServerNode: AiServerNode = {
                type: 'ai-server',
                title: serverId,
                metadata: {
                    serverId,
                    lastHealthCheck: new Date().toISOString(),
                    modelCount: performanceNodes.length
                },
                serverHealth,
                performanceProfile
            };

            console.log(`[ServerAggregation Debug] Saving ai-server node for: ${serverId}`);
            logToServerFile(serverId, 'info', `Server aggregation complete for ${serverId}`, { aiServerNode });

            await this.saveAiServerNode(aiServerNode);
            console.log(`[ServerAggregation Debug] Aggregation completed successfully for server: ${serverId}`);
        } catch (error) {
            console.error(`[ServerAggregation Debug] Error aggregating performance for server ${serverId}:`, error);
            logToServerFile(serverId, 'error', `Error aggregating performance for server ${serverId}`, { error });
            throw error;
        }
    }

    public async aggregateAllServers(): Promise<void> {
        console.log(`[ServerAggregation Debug] Starting aggregation for all servers`);
        // Get all unique server IDs from performance nodes
        const allPerformanceNodes = await this.getAllPerformanceNodes();
        const serverIds = Array.from(new Set(allPerformanceNodes.map((node: ModelPerformanceNode) => node.metadata?.serverId).filter(Boolean))) as string[];

        console.log(`[ServerAggregation Debug] Found ${serverIds.length} unique servers to aggregate: ${serverIds.join(', ')}`);

        // Aggregate each server in parallel with error handling
        const aggregationPromises = serverIds.map(async (serverId: string) => {
            try {
                console.log(`[ServerAggregation Debug] Starting aggregation for server: ${serverId}`);
                await this.aggregateServerPerformance(serverId);
                console.log(`[ServerAggregation Debug] ✓ Aggregated server: ${serverId}`);
            } catch (error) {
                console.error(`[ServerAggregation Debug] ✗ Failed to aggregate server ${serverId}:`, error);
                throw new Error(`Server aggregation failed for ${serverId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        await Promise.all(aggregationPromises);
        console.log(`[ServerAggregation Debug] Completed aggregation for all ${serverIds.length} servers`);
    }

    private calculateServerHealth(performanceNodes: ModelPerformanceNode[]): ServerHealth {
        if (performanceNodes.length === 0) {
            return {
                endpointLatency: 0,
                healthScore: 0,
                uptime: 0
            };
        }

        let totalLatency = 0;
        let totalErrors = 0;

        performanceNodes.forEach(node => {
            try {
                totalLatency += node.coldLatency || 0;
                // Count errors as nodes with very high latency (>30s) or failed quality results
                let hasQualityErrors = false;
                if (node.qualityResults && typeof node.qualityResults === 'object') {
                    hasQualityErrors = Object.values(node.qualityResults).some(result =>
                        result && typeof result === 'object' && 'score' in result && (result as any).score < 0.3
                    );
                }
                const hasErrors = (node.coldLatency || 0) > 30000 || hasQualityErrors;
                if (hasErrors) totalErrors++;
            } catch (error) {
                console.error(`[ServerAggregation Debug] Error processing node:`, error);
                totalErrors++; // Count processing errors as failures
            }
        });

        const avgLatency = totalLatency / performanceNodes.length;
        const errorRate = totalErrors / performanceNodes.length;
        const healthScore = Math.max(0, 100 - (errorRate * 50) - (Math.min(avgLatency / 1000, 50)));

        return {
            endpointLatency: avgLatency,
            healthScore,
            uptime: healthScore > 50 ? 99.9 : 90.0 // Estimated uptime based on health
        };
    }

    private calculateServerPerformanceProfile(performanceNodes: ModelPerformanceNode[]): ServerPerformanceProfile {
        if (performanceNodes.length === 0) {
            return {
                avgColdLatency: 0,
                avgWarmLatency: 0,
                bestModel: '',
                worstModel: '',
                modelsServed: 0
            };
        }

        let totalColdLatency = 0;
        let totalWarmLatency = 0;
        let bestModel = '';
        let worstModel = '';
        let minLatency = Infinity;
        let maxLatency = -Infinity;

        performanceNodes.forEach(node => {
            const warmLatencies = node.warmLatencies;
            const avgWarmLatency = warmLatencies.reduce((a: number, b: number) => a + b, 0) / (warmLatencies.length || 1);

            totalColdLatency += node.coldLatency;
            totalWarmLatency += avgWarmLatency;

            if (node.coldLatency < minLatency) {
                minLatency = node.coldLatency;
                bestModel = node.metadata?.modelId || '';
            }
            if (node.coldLatency > maxLatency) {
                maxLatency = node.coldLatency;
                worstModel = node.metadata?.modelId || '';
            }
        });

        return {
            avgColdLatency: totalColdLatency / performanceNodes.length,
            avgWarmLatency: totalWarmLatency / performanceNodes.length,
            bestModel,
            worstModel,
            modelsServed: performanceNodes.length
        };
    }
}
