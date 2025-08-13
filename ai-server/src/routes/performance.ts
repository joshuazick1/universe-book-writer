/**
 * Model Performance API Routes
 * 
 * Provides REST endpoints for querying model performance data
 * integrated with the RAG knowledge graph system.
 */

import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';
import { getModelPerformanceRAGService } from '../services/modelPerformanceRAG.service.js';
import { logger } from '../../../shared/logging/logger.js';
import type { ModelSelectionCriteria, ModelSelectionResult } from '../../../shared/types/models.js';

const router = Router();

/**
 * GET /api/orchestrator/performance/models
 * Get performance overview of all models with RAG-enhanced data
 */
router.get('/models', async (req, res) => {
    try {
        const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
        const performanceService = await getModelPerformanceRAGService(orchestrator);

        const {
            taskType,
            maxLatency,
            minThroughput,
            quality,
            search
        } = req.query;

        // If search query provided, use RAG search
        if (search) {
            const results = await performanceService.queryModelPerformance(search as string);
            res.json({
                success: true,
                data: results,
                source: 'rag-search',
                query: search
            });
            return;
        }

        // If task-specific requirements provided, get best models
        if (taskType || maxLatency || minThroughput || quality) {
            const requirements: any = {};
            if (maxLatency) requirements.maxLatency = parseInt(maxLatency as string);
            if (minThroughput) requirements.minThroughput = parseFloat(minThroughput as string);
            if (quality) requirements.quality = quality;

            const bestModels = await performanceService.getBestModelsForTask(
                taskType as string || 'general',
                requirements
            );

            res.json({
                success: true,
                data: bestModels,
                source: 'rag-analysis',
                criteria: { taskType, ...requirements }
            });
            return;
        }

        // Default: return all models with basic performance data
        const servers = orchestrator.getServers();
        const performanceData = [];

        for (const server of servers) {
            for (const model of server.models) {
                const benchmark = orchestrator.getBenchmark(server.id, model);
                if (benchmark) {
                    performanceData.push({
                        serverId: server.id,
                        modelName: model,
                        performance: benchmark,
                        serverHealth: server.healthy,
                        inFlight: orchestrator.getInFlight(server.id, model)
                    });
                }
            }
        }

        res.json({
            success: true,
            data: performanceData,
            source: 'orchestrator-direct',
            totalModels: performanceData.length
        });

    } catch (error) {
        logger.error(`Error getting model performance: ${error}`);
        res.status(500).json({
            success: false,
            error: 'Failed to get model performance data',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/orchestrator/performance/models/:modelName
 * Get detailed performance analysis for a specific model
 */
router.get('/models/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
        const performanceService = await getModelPerformanceRAGService(orchestrator);

        // Query RAG for comprehensive model performance data
        const performanceNodes = await performanceService.queryModelPerformance(
            `model ${modelName} performance metrics latency throughput trends`
        );

        const modelPerformance = performanceNodes.filter((node: any) =>
            node.content?.modelName === modelName
        );

        if (modelPerformance.length === 0) {
            res.status(404).json({
                success: false,
                error: `No performance data found for model: ${modelName}`
            });
            return;
        }

        // Aggregate performance across all servers
        const aggregatedData = {
            modelName,
            servers: modelPerformance.map(node => ({
                serverId: node.content.serverId,
                metrics: node.content.performanceMetrics,
                trends: node.content.trends,
                contextualPerformance: node.content.contextualPerformance,
                lastUpdated: node.metadata?.lastUpdated
            })),
            summary: {
                averageLatency: modelPerformance.reduce((sum: number, node: any) =>
                    sum + node.content.performanceMetrics.latencyMs, 0) / modelPerformance.length,
                averageThroughput: modelPerformance.reduce((sum: number, node: any) =>
                    sum + node.content.performanceMetrics.throughput, 0) / modelPerformance.length,
                totalServers: modelPerformance.length,
                bestServer: modelPerformance.reduce((best: any, current: any) =>
                    current.content.performanceMetrics.latencyMs < best.content.performanceMetrics.latencyMs
                        ? current : best
                ).content.serverId
            }
        };

        res.json({
            success: true,
            data: aggregatedData,
            source: 'rag-detailed-analysis'
        });

    } catch (error) {
        logger.error(`Error getting model ${req.params.modelName} performance: ${error}`);
        res.status(500).json({
            success: false,
            error: 'Failed to get model performance details',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/orchestrator/performance/query
 * Natural language query for model performance data
 */
router.post('/query', async (req, res) => {
    try {
        const { query, filters = {} } = req.body;

        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Query parameter is required and must be a string'
            });
            return;
        }

        const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
        const performanceService = await getModelPerformanceRAGService(orchestrator);

        const results = await performanceService.queryModelPerformance(query);

        // Apply additional filters if provided
        let filteredResults = results;
        if (filters.serverId) {
            filteredResults = results.filter((node: any) =>
                node.content?.serverId === filters.serverId
            );
        }
        if (filters.minLatency || filters.maxLatency) {
            filteredResults = filteredResults.filter((node: any) => {
                const latency = node.content?.performanceMetrics?.latencyMs;
                if (!latency) return false;
                if (filters.minLatency && latency < filters.minLatency) return false;
                if (filters.maxLatency && latency > filters.maxLatency) return false;
                return true;
            });
        }

        res.json({
            success: true,
            data: filteredResults,
            query,
            filters,
            totalResults: filteredResults.length,
            source: 'rag-natural-language-query'
        });

    } catch (error) {
        logger.error(`Error processing performance query: ${error}`);
        res.status(500).json({
            success: false,
            error: 'Failed to process performance query',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/orchestrator/performance/recommendations/:taskType
 * Get model recommendations for specific task types
 */
router.get('/recommendations/:taskType', async (req, res) => {
    try {
        const { taskType } = req.params;
        const {
            maxLatency,
            minThroughput,
            quality = 'standard',
            limit = 5
        } = req.query;

        const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
        const performanceService = await getModelPerformanceRAGService(orchestrator);

        const requirements: any = { quality };
        if (maxLatency) requirements.maxLatency = parseInt(maxLatency as string);
        if (minThroughput) requirements.minThroughput = parseFloat(minThroughput as string);

        const recommendations = await performanceService.getBestModelsForTask(taskType, requirements);

        // Enhance recommendations with additional context
        const enhancedRecommendations = recommendations.slice(0, parseInt(limit as string)).map((rec: any) => ({
            ...rec,
            recommendation: {
                reason: `Optimized for ${taskType} with ${quality} quality requirements`,
                confidence: rec.score,
                estimatedLatency: `~${Math.round(rec.score * 1000)}ms`,
                suitability: rec.score > 0.8 ? 'excellent' : rec.score > 0.6 ? 'good' : 'acceptable'
            }
        }));

        res.json({
            success: true,
            data: enhancedRecommendations,
            taskType,
            requirements,
            source: 'rag-task-optimization'
        });

    } catch (error) {
        logger.error(`Error getting recommendations for ${req.params.taskType}: ${error}`);
        res.status(500).json({
            success: false,
            error: 'Failed to get model recommendations',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * POST /api/orchestrator/performance/sync
 * Manually trigger benchmark data sync to RAG
 */
router.post('/sync', async (req, res) => {
    try {
        const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();
        const performanceService = await getModelPerformanceRAGService(orchestrator);

        await performanceService.syncBenchmarkDataToRAG();

        res.json({
            success: true,
            message: 'Benchmark data synchronized to RAG system',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`Error syncing benchmark data to RAG: ${error}`);
        res.status(500).json({
            success: false,
            error: 'Failed to sync benchmark data to RAG',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * GET /api/orchestrator/performance/health
 * Get health status of performance monitoring system
 */
router.get('/health', async (req, res) => {
    try {
        const orchestrator = req.app?.locals?.orchestrator || getOrchestratorInstance();

        const servers = orchestrator.getServers();
        const totalServers = servers.length;
        const healthyServers = servers.filter((s: any) => s.healthy).length;

        let totalBenchmarks = 0;
        let recentBenchmarks = 0;
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        for (const server of servers) {
            for (const model of server.models) {
                const benchmark = orchestrator.getBenchmark(server.id, model);
                if (benchmark) {
                    totalBenchmarks++;
                    if (benchmark.lastTested > oneDayAgo) {
                        recentBenchmarks++;
                    }
                }
            }
        }

        const health = {
            status: healthyServers > 0 ? 'healthy' : 'unhealthy',
            servers: {
                total: totalServers,
                healthy: healthyServers,
                unhealthy: totalServers - healthyServers
            },
            benchmarks: {
                total: totalBenchmarks,
                recent: recentBenchmarks,
                coverage: totalBenchmarks > 0 ? (recentBenchmarks / totalBenchmarks) * 100 : 0
            },
            ragIntegration: {
                enabled: true,
                lastSync: new Date().toISOString() // This would be tracked by the service
            }
        };

        res.json({
            success: true,
            data: health,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`Error getting performance health: ${error}`);
        res.status(500).json({
            success: false,
            error: 'Failed to get performance health status',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router;
