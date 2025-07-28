/**
 * Diagnostic: List the first 10 nodes of any type from the RAG storage.
 * @route GET /api/orchestrator/rag/diagnostic-nodes
 */
export async function getRagDiagnosticNodes(req: Request, res: Response) {
    try {
        console.log('[RAG] /rag/diagnostic-nodes endpoint called');
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            console.warn('[RAG] RAG service not available');
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }
        // Try to get the first 10 nodes of any type
        const nodes = await ragService.ragManager.searchNodes('', {}, 10);
        console.log('[RAG] First 10 nodes:', nodes);
        const summary = (nodes || []).map((n: any, idx: number) => {
            const attrs = n?.content?.attributes || {};
            return {
                idx,
                id: n?.id,
                type: n?.type,
                modelName: attrs.modelName,
                serverId: attrs.serverId,
                attributes: attrs
            };
        });
        return res.json({
            count: summary.length,
            nodes: summary
        });
    } catch (error: any) {
        console.error('[RAG] Error in /rag/diagnostic-nodes:', error);
        return res.status(500).json({
            error: 'Failed to get diagnostic nodes',
            message: error.message
        });
    }
}
import type { Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * Get comprehensive analytics from the RAG system including usage statistics, model deployment stats, and frequent combinations.
 * @route GET /api/orchestrator/rag/analytics
 */
export async function getRagAnalytics(req: Request, res: Response) {
    try {
        console.log('[RAG] /rag/analytics endpoint called');
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            console.warn('[RAG] RAG service not available');
            return res.status(503).json({
                error: 'RAG service not available',
                message: 'The orchestrator RAG integration is not initialized'
            });
        }
        // Fetch all model-performance nodes from RAG
        const ragManager = ragService.ragManager || ragService.getRagManager?.();
        if (!ragManager) {
            return res.status(500).json({ error: 'RAG manager not available' });
        }
        const perfNodes = await ragManager.searchNodes('', { nodeType: 'model-performance' }, 10000);
        // Compute deployment stats
        const uniqueModels = new Set();
        const uniqueServers = new Set();
        const modelServerMatrix: Record<string, Set<string>> = {};
        for (const n of perfNodes || []) {
            const attrs = n?.content?.attributes || n?.attributes || {};
            const model = attrs.modelName;
            const server = attrs.serverId;
            if (model && server) {
                uniqueModels.add(model);
                uniqueServers.add(server);
                if (!modelServerMatrix[model]) modelServerMatrix[model] = new Set();
                modelServerMatrix[model].add(server);
            }
        }
        // Most used models and most active servers
        const mostUsedModels = Object.entries(modelServerMatrix)
            .map(([model, servers]) => ({ model, count: servers.size }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const serverModelCounts: Record<string, number> = {};
        for (const model in modelServerMatrix) {
            for (const server of modelServerMatrix[model]) {
                serverModelCounts[server] = (serverModelCounts[server] || 0) + 1;
            }
        }
        const mostActiveServers = Object.entries(serverModelCounts)
            .map(([server, count]) => ({ server, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // Deployment matrix as object of arrays
        const deploymentMatrix: Record<string, string[]> = {};
        for (const model in modelServerMatrix) {
            deploymentMatrix[model] = Array.from(modelServerMatrix[model]);
        }
        // Frequent combinations: group by (model, server) pairs
        const combinationCounts: Record<string, number> = {};
        for (const n of perfNodes || []) {
            const attrs = n?.content?.attributes || n?.attributes || {};
            const model = attrs.modelName;
            const server = attrs.serverId;
            if (model && server) {
                const key = `${model}::${server}`;
                combinationCounts[key] = (combinationCounts[key] || 0) + 1;
            }
        }
        const frequentCombinations = Object.entries(combinationCounts)
            .map(([key, count]) => {
                const [model, server] = key.split('::');
                return { model, server, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        // Compose analytics object
        const analytics = {
            deploymentStats: {
                totalCombinations: perfNodes.length,
                uniqueModels: uniqueModels.size,
                uniqueServers: uniqueServers.size,
                mostUsedModels,
                mostActiveServers,
                deploymentMatrix
            },
            frequentCombinations,
            timestamp: new Date().toISOString()
        };
        return res.json({ analytics });
    } catch (error: any) {
        console.error('[RAG] Error in /rag/analytics:', error);
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
        console.log('[RAG] /rag/model-performance endpoint called');
        const { search, limit } = req.query;
        console.log('[RAG] Query params:', { search, limit });
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();
        if (!ragService) {
            console.warn('[RAG] RAG service not available');
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }
        // Patch: Directly fetch all nodes of type 'model-performance' from ragManager
        const nodeLimit = Number(limit) || 100;
        const nodes = await ragService.ragManager.searchNodes('', { type: 'model-performance' }, nodeLimit);
        console.log('[RAG] model-performance nodes:', nodes);
        const performanceData = (nodes || []).map((node: any) => {
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
        console.log('[RAG] performanceData:', performanceData);
        return res.json({
            count: performanceData.length,
            performanceData
        });
    } catch (error: any) {
        console.error('[RAG] Error in /rag/model-performance:', error);
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
