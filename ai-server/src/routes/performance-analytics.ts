import { Router } from 'express';
import { ModelAggregationService } from '../services/model-aggregation.service.js';
import { ServerAggregationService } from '../services/server-aggregation.service.js';
import { IntelligentModelSelectionService } from '../services/intelligent-model-selection.service.js';
import { TaskType, TaskRequirements, ServerRequirements } from 'shared/types/performance.js';

const router = Router();

// Service instances
const modelAggregationService = new ModelAggregationService();
const serverAggregationService = new ServerAggregationService();
const intelligentModelSelectionService = new IntelligentModelSelectionService();

/**
 * GET /api/performance/models
 * List all models with performance summaries
 */
router.get('/models', async (req: any, res: any) => {
    try {
        const models = await intelligentModelSelectionService.getAllModels();

        const summaries = models.map(model => ({
            modelId: model.type === 'ai-model' ? model.metadata.modelId : 'unknown',
            title: model.title,
            lastAggregated: model.type === 'ai-model' ? model.metadata.lastAggregated : null,
            serverCount: model.type === 'ai-model' ? model.metadata.serverCount : 0,
            avgQualityScore: model.type === 'ai-model' ? model.avgQualityScore : null,
            avgColdLatency: model.type === 'ai-model' ? model.performanceProfile?.avgColdLatency : null,
            avgWarmLatency: model.type === 'ai-model' ? model.performanceProfile?.avgWarmLatency : null,
            combinedScore: model.type === 'ai-model' ? model.loadBalancerWeights?.combinedScore : null,
        }));

        res.json({
            success: true,
            data: summaries,
            total: summaries.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model performance summaries',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/performance/models/:modelId
 * Get detailed model performance data
 */
router.get('/models/:modelId', async (req: any, res: any) => {
    try {
        const { modelId } = req.params;
        const models = await intelligentModelSelectionService.getAllModels();

        const model = models.find(m =>
            m.type === 'ai-model' && m.metadata.modelId === modelId
        );

        if (!model || model.type !== 'ai-model') {
            return res.status(404).json({
                success: false,
                error: 'Model not found',
            });
        }

        res.json({
            success: true,
            data: {
                modelId: model.metadata.modelId,
                title: model.title,
                metadata: model.metadata,
                avgQualityScore: model.avgQualityScore,
                qualityBreakdown: model.qualityBreakdown,
                performanceProfile: model.performanceProfile,
                loadBalancerWeights: model.loadBalancerWeights,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model details',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/performance/servers
 * List all servers with performance summaries
 */
router.get('/servers', async (req: any, res: any) => {
    try {
        const servers = await intelligentModelSelectionService.getServersForModel(''); // Get all servers

        const summaries = servers.map(server => ({
            serverId: server.type === 'ai-server' ? server.metadata.serverId : 'unknown',
            title: server.title,
            lastHealthCheck: server.type === 'ai-server' ? server.metadata.lastHealthCheck : null,
            modelCount: server.type === 'ai-server' ? server.metadata.modelCount : 0,
            healthScore: server.type === 'ai-server' ? server.serverHealth?.healthScore : null,
            uptime: server.type === 'ai-server' ? server.serverHealth?.uptime : null,
            avgColdLatency: server.type === 'ai-server' ? server.performanceProfile?.avgColdLatency : null,
            avgWarmLatency: server.type === 'ai-server' ? server.performanceProfile?.avgWarmLatency : null,
            modelsServed: server.type === 'ai-server' ? server.performanceProfile?.modelsServed : 0,
        }));

        res.json({
            success: true,
            data: summaries,
            total: summaries.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch server performance summaries',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/performance/servers/:serverId
 * Get detailed server performance data
 */
router.get('/servers/:serverId', async (req: any, res: any) => {
    try {
        const { serverId } = req.params;
        const servers = await intelligentModelSelectionService.getServersForModel(''); // Get all servers

        const server = servers.find(s =>
            s.type === 'ai-server' && s.metadata.serverId === serverId
        );

        if (!server || server.type !== 'ai-server') {
            return res.status(404).json({
                success: false,
                error: 'Server not found',
            });
        }

        res.json({
            success: true,
            data: {
                serverId: server.metadata.serverId,
                title: server.title,
                metadata: server.metadata,
                serverHealth: server.serverHealth,
                performanceProfile: server.performanceProfile,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch server details',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/performance/recommendations
 * Get model recommendations for task types
 */
router.get('/recommendations', async (req: any, res: any) => {
    try {
        const { taskType, limit = 5 } = req.query;

        if (!taskType || typeof taskType !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Task type is required',
            });
        }

        const rankings = await intelligentModelSelectionService.getModelRankings(taskType as TaskType);
        const topRecommendations = rankings.slice(0, parseInt(limit as string, 10));

        res.json({
            success: true,
            data: {
                taskType,
                recommendations: topRecommendations,
                total: rankings.length,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model recommendations',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * POST /api/performance/select-model
 * Intelligent model selection for specific task
 */
router.post('/select-model', async (req: any, res: any) => {
    try {
        const { taskType, requirements } = req.body as {
            taskType: TaskType;
            requirements: TaskRequirements;
        };

        if (!taskType) {
            return res.status(400).json({
                success: false,
                error: 'Task type is required',
            });
        }

        const selection = await intelligentModelSelectionService.selectBestModelForTask(
            taskType,
            requirements || { taskType }
        );

        res.json({
            success: true,
            data: selection,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to select optimal model',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
