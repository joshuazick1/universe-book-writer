import { TaskType, TaskRequirements, ModelSelection, ServerRequirements, ServerSelection, ModelRanking, QualityBreakdown, PerformanceProfile, ServerHealth } from 'shared/types/performance.js';
import { Node, AiModelNode, AiServerNode } from 'shared/types/performance.js';
import { queryNodesByType } from 'shared/node/nodeService.js';

export class IntelligentModelSelectionService {
    public async selectBestModelForTask(taskType: TaskType, requirements: TaskRequirements): Promise<ModelSelection> {
        // Fetch all models and their performance profiles
        const models = (await this.getAllModels()) as AiModelNode[];

        // Filter models based on task requirements
        const filteredModels = models.filter(model => {
            return model.qualityBreakdown?.[taskType]?.avg >= (requirements.minQualityScore || 0) &&
                model.performanceProfile?.avgColdLatency <= (requirements.maxLatency || Infinity);
        });

        // Rank models by their fit for the task
        const rankedModels = filteredModels.map(model => {
            const fitScore = this.calculateTaskFitScore(model, requirements);
            return { model, fitScore };
        }).sort((a, b) => b.fitScore - a.fitScore);

        // Select the best model
        const bestModel = rankedModels[0]?.model;
        if (!bestModel) {
            throw new Error('No suitable model found for the task.');
        }

        return {
            modelId: bestModel.metadata.modelId,
            serverId: bestModel.performanceProfile.bestServer || 'unknown',
            confidence: rankedModels[0].fitScore,
            estimatedQuality: bestModel.qualityBreakdown[taskType]?.avg || 0,
            estimatedLatency: bestModel.performanceProfile.avgColdLatency || Infinity,
            reasoning: ['Selected based on highest task fit score']
        };
    }

    public async selectBestServerForModel(modelId: string, requirements: ServerRequirements): Promise<ServerSelection> {
        // Fetch all servers serving the model
        const servers = (await this.getServersForModel(modelId)) as AiServerNode[];

        // Filter servers based on requirements
        const filteredServers = servers.filter(server => {
            return server.serverHealth?.healthScore >= (requirements.minHealthScore || 0) &&
                server.performanceProfile?.avgColdLatency <= (requirements.maxLatency || Infinity);
        });

        // Rank servers by their performance
        const rankedServers = filteredServers.map(server => {
            const score = (server.serverHealth?.healthScore || 0) / (server.performanceProfile?.avgColdLatency || 1);
            return { server, score };
        }).sort((a, b) => b.score - a.score);

        // Select the best server
        const bestServer = rankedServers[0]?.server;
        if (!bestServer) {
            throw new Error('No suitable server found for the model.');
        }

        return {
            serverId: bestServer.metadata.serverId,
            confidence: rankedServers[0].score,
            reasoning: ['Selected based on highest performance score']
        };
    }

    public async getModelRankings(taskType: TaskType): Promise<ModelRanking[]> {
        // Fetch all models and their performance profiles
        const models = (await this.getAllModels()) as AiModelNode[];

        // Rank models by their quality score for the task
        const rankings = models.map(model => {
            const qualityScore = model.qualityBreakdown[taskType]?.avg || 0;
            return { modelId: model.metadata.modelId, score: qualityScore };
        }).sort((a, b) => b.score - a.score);

        // Assign ranks
        return rankings.map((ranking, index) => ({
            ...ranking,
            rank: index + 1
        }));
    }

    private calculateTaskFitScore(modelProfile: any, taskRequirements: TaskRequirements): number {
        const qualityScore = modelProfile.qualityBreakdown[taskRequirements.taskType]?.avg || 0;
        const latencyScore = 1 / (modelProfile.performanceProfile.avgColdLatency || 1);
        return qualityScore * 0.7 + latencyScore * 0.3; // Weighted scoring
    }

    public async getAllModels(): Promise<AiModelNode[]> {
        // Query for all ai-model nodes
        const nodes = await queryNodesByType('ai-model');
        return nodes as unknown as AiModelNode[];
    }

    public async getServersForModel(modelId: string): Promise<AiServerNode[]> {
        // Query for all ai-server nodes that serve this model
        const allServers = await queryNodesByType('ai-server');
        // Filter servers that have this model (simplified - in reality would check model availability)
        return allServers.filter(server => {
            // Check if server has this model in its performance profile
            return (server as any).performanceProfile?.modelsServed > 0;
        }) as unknown as AiServerNode[];
    }

    private isAiModel(node: Node): node is Node & { type: 'ai-model'; qualityBreakdown: QualityBreakdown; performanceProfile: PerformanceProfile; metadata: { modelId: string } } {
        return node.type === 'ai-model';
    }

    private isAiServer(node: Node): node is Node & { type: 'ai-server'; serverHealth: ServerHealth; performanceProfile: PerformanceProfile; metadata: { serverId: string } } {
        return node.type === 'ai-server';
    }
}
