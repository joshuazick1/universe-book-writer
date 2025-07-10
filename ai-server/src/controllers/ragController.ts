import type { Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * Get comprehensive analytics from the RAG system including usage statistics, model deployment stats, and frequent combinations.
 * @route GET /api/orchestrator/rag/analytics
 */
export async function getRagAnalytics(req: Request, res: Response) {
    try {
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available',
                message: 'The orchestrator RAG integration is not initialized'
            });
        }
        const [deploymentStats, frequentCombinations] = await Promise.all([
            ragService.getModelDeploymentStats(),
            ragService.getFrequentModelServerCombinations({
                limit: 50,
                includeMetrics: true
            })
        ]);
        return res.json({
            analytics: {
                deploymentStats,
                frequentCombinations,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to fetch RAG analytics',
            message: error.message
        });
    }
}

/**
 * Search for model performance data in the RAG system.
 * @route GET /api/orchestrator/rag/model-performance
 */
export async function getRagModelPerformance(req: Request, res: Response) {
    try {
        const { search, limit } = req.query;
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }
        const query = search as string || 'model performance server';
        const results = await ragService.queryModelPerformance(query);
        const performanceData = results.slice(0, Number(limit) || 100).map((node: any) => {
            const attributes = node.content?.attributes || {};
            return {
                id: node.id,
                serverId: attributes.serverId,
                modelName: attributes.modelName,
                performanceMetrics: attributes.performanceMetrics || {},
                usageFrequency: attributes.usageFrequency || {},
                usagePatterns: attributes.usagePatterns || {},
                lastUsed: attributes.lastUsed,
                totalUsageCount: attributes.totalUsageCount || 0
            };
        });
        return res.json({
            query,
            count: performanceData.length,
            performanceData
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to query model performance',
            message: error.message
        });
    }
}

/**
 * Get best performing models for a specific task from RAG analysis.
 * @route GET /api/orchestrator/rag/best-models
 */
export async function getRagBestModels(req: Request, res: Response) {
    try {
        const { taskType, maxLatency, minThroughput, quality } = req.query;
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }
        const requirements: any = {};
        if (maxLatency) requirements.maxLatency = Number(maxLatency);
        if (minThroughput) requirements.minThroughput = Number(minThroughput);
        if (quality) requirements.quality = quality as string;
        const bestModels = await ragService.getBestModelsForTask(
            taskType as string || 'general',
            requirements
        );
        return res.json({
            taskType: taskType || 'general',
            requirements,
            bestModels,
            count: bestModels.length
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to get best models',
            message: error.message
        });
    }
}

/**
 * Get usage statistics for a specific time range.
 * @route GET /api/orchestrator/rag/usage-stats
 */
export async function getRagUsageStats(req: Request, res: Response) {
    try {
        const { startDate, endDate, serverId, modelName, taskType } = req.query;
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }
        const end = endDate ? new Date(endDate as string) : new Date();
        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const filters: any = {};
        if (serverId) filters.serverId = serverId as string;
        if (modelName) filters.modelName = modelName as string;
        if (taskType) filters.taskType = taskType as string;
        const usageStats = await ragService.getUsageStatsByTimeRange(
            { startDate: start, endDate: end },
            filters
        );
        return res.json({
            timeRange: { startDate: start, endDate: end },
            filters,
            usageStats
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to get usage statistics',
            message: error.message
        });
    }
}
