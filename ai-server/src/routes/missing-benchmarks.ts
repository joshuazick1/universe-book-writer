/**
 * Missing Benchmark API Routes
 * 
 * Endpoints for discovering and managing missing benchmark scores
 * and automatically queuing benchmark tests.
 */

import { Router } from 'express';
import { missingBenchmarkService } from '../services/missing-benchmark.service.js';
import { logger } from '../../../shared/logging/logger.js';
import { BenchmarkingManager } from '../benchmarking/BenchmarkingManager.js';
import { universalQueueService } from '../services/universal-queue.service.js';
import { JobBuilder } from '../utils/job-builder.js';
import { JobType } from '../../../shared/types/universal-job.js';

const router = Router();

// Create benchmarking manager instance
const jobBuilder = new JobBuilder(JobType.QUALITY_BENCHMARK, {});
const benchmarkingManager = new BenchmarkingManager(universalQueueService, jobBuilder);

/**
 * @route GET /api/missing-benchmarks/analysis
 * @desc Get comprehensive analysis of missing benchmark data
 * @access Public
 */
router.get('/analysis', async (req: any, res: any) => {
    try {
        logger.info('[MissingBenchmarkAPI] Getting comprehensive missing data analysis...');

        const report = await missingBenchmarkService.getComprehensiveMissingDataReport();

        logger.info(`[MissingBenchmarkAPI] Analysis complete: ${report.summary.totalNodesWithMissingScores} nodes with missing scores`);

        return res.status(200).json({
            success: true,
            data: report,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error getting analysis: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to analyze missing benchmarks',
            details: errorMessage
        });
    }
});

/**
 * @route GET /api/missing-benchmarks/nodes
 * @desc Get model-performance nodes with missing benchmark scores
 * @query requirementLevel - 'core' or 'extended' benchmark requirements
 * @access Public
 */
router.get('/nodes', async (req: any, res: any) => {
    try {
        const requirementLevel = req.query.requirementLevel === 'extended' ? 'extended' : 'core';

        logger.info(`[MissingBenchmarkAPI] Finding nodes with missing scores (${requirementLevel} requirements)...`);

        const missingNodes = await missingBenchmarkService.findModelPerformanceNodesWithMissingScores(requirementLevel);

        return res.status(200).json({
            success: true,
            data: {
                requirementLevel,
                nodes: missingNodes,
                totalCount: missingNodes.length,
                highPriorityCount: missingNodes.filter(n => n.priority === 'high').length,
                mediumPriorityCount: missingNodes.filter(n => n.priority === 'medium').length,
                lowPriorityCount: missingNodes.filter(n => n.priority === 'low').length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error finding missing nodes: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to find nodes with missing scores',
            details: errorMessage
        });
    }
});

/**
 * @route GET /api/missing-benchmarks/servers
 * @desc Get servers needing health checks
 * @query maxAgeDays - Maximum age in days before health check is stale (default: 1)
 * @access Public
 */
router.get('/servers', async (req: any, res: any) => {
    try {
        const maxAgeDays = parseInt(req.query.maxAgeDays as string) || 1;

        logger.info(`[MissingBenchmarkAPI] Finding servers needing health checks (max age: ${maxAgeDays} days)...`);

        const staleServers = await missingBenchmarkService.findServersNeedingHealthChecks(maxAgeDays);

        return res.status(200).json({
            success: true,
            data: {
                maxAgeDays,
                servers: staleServers,
                totalCount: staleServers.length,
                unhealthyCount: staleServers.filter(s => !s.isHealthy).length,
                neverCheckedCount: staleServers.filter(s => !s.lastHealthCheck).length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error finding stale servers: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to find servers needing health checks',
            details: errorMessage
        });
    }
});

/**
 * @route GET /api/missing-benchmarks/models
 * @desc Get models needing aggregation from performance data
 * @query maxAgeDays - Maximum age in days before aggregation is stale (default: 7)
 * @access Public
 */
router.get('/models', async (req: any, res: any) => {
    try {
        const maxAgeDays = parseInt(req.query.maxAgeDays as string) || 7;

        logger.info(`[MissingBenchmarkAPI] Finding models needing aggregation (max age: ${maxAgeDays} days)...`);

        const staleModels = await missingBenchmarkService.findModelsNeedingAggregation(maxAgeDays);

        return res.status(200).json({
            success: true,
            data: {
                maxAgeDays,
                models: staleModels,
                totalCount: staleModels.length,
                withIncompleteDataCount: staleModels.filter(m => m.hasIncompleteData).length,
                neverAggregatedCount: staleModels.filter(m => !m.lastAggregated).length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error finding models needing aggregation: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to find models needing aggregation',
            details: errorMessage
        });
    }
});

/**
 * @route GET /api/missing-benchmarks/queue
 * @desc Generate automatic benchmark queue for missing scores
 * @query maxItems - Maximum number of items to include in queue (default: 10)
 * @access Public
 */
router.get('/queue', async (req: any, res: any) => {
    try {
        const maxItems = parseInt(req.query.maxItems as string) || 10;

        logger.info(`[MissingBenchmarkAPI] Generating automatic benchmark queue (max items: ${maxItems})...`);

        const queueItems = await missingBenchmarkService.generateAutomaticBenchmarkQueue(maxItems);

        return res.status(200).json({
            success: true,
            data: {
                queueItems,
                totalCount: queueItems.length,
                highPriorityCount: queueItems.filter(q => q.priority === 'high').length,
                estimatedDuration: queueItems.length * 5 + ' minutes' // Rough estimate
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error generating queue: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate automatic benchmark queue',
            details: errorMessage
        });
    }
});

/**
 * @route POST /api/missing-benchmarks/queue/execute
 * @desc Execute automatic benchmark queue for missing scores
 * @body maxItems - Maximum number of benchmarks to queue (default: 5)
 * @body priorityFilter - Filter by priority: 'high', 'medium', 'low', or 'all' (default: 'all')
 * @access Public
 */
router.post('/queue/execute', async (req: any, res: any) => {
    try {
        const { maxItems = 5, priorityFilter = 'all' } = req.body;

        logger.info(`[MissingBenchmarkAPI] Executing automatic benchmark queue (max: ${maxItems}, priority: ${priorityFilter})...`);

        // Get queue items
        const allQueueItems = await missingBenchmarkService.generateAutomaticBenchmarkQueue(maxItems * 3); // Get more to filter

        // Filter by priority if specified
        const filteredItems = priorityFilter === 'all' ?
            allQueueItems :
            allQueueItems.filter(item => item.priority === priorityFilter);

        // Limit to maxItems
        const queueItems = filteredItems.slice(0, maxItems);

        // Execute benchmarks
        const results = [];
        for (const item of queueItems) {
            try {
                logger.info(`[MissingBenchmarkAPI] Queuing benchmark for ${item.modelId} on ${item.serverId}...`);

                // Use the benchmarking manager to queue the benchmark
                const benchmarkResult = await benchmarkingManager.runQueueBasedManualBenchmarks(
                    item.serverId,
                    item.modelId,
                    item.benchmarkTypes
                );

                results.push({
                    serverId: item.serverId,
                    modelId: item.modelId,
                    benchmarkTypes: item.benchmarkTypes,
                    success: true,
                    benchmarkCount: Object.keys(benchmarkResult.benchmarks || {}).length
                });

                logger.info(`[MissingBenchmarkAPI] Successfully queued benchmark for ${item.modelId} on ${item.serverId}`);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`[MissingBenchmarkAPI] Failed to queue benchmark for ${item.modelId} on ${item.serverId}: ${errorMessage}`);

                results.push({
                    serverId: item.serverId,
                    modelId: item.modelId,
                    benchmarkTypes: item.benchmarkTypes,
                    success: false,
                    error: errorMessage
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        logger.info(`[MissingBenchmarkAPI] Queue execution complete: ${successCount} successful, ${failureCount} failed`);

        return res.status(200).json({
            success: true,
            data: {
                executed: results,
                summary: {
                    totalExecuted: results.length,
                    successful: successCount,
                    failed: failureCount,
                    priorityFilter,
                    maxItems
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error executing queue: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to execute automatic benchmark queue',
            details: errorMessage
        });
    }
});

/**
 * @route POST /api/missing-benchmarks/node/:nodeId/benchmark
 * @desc Queue benchmark for a specific node with missing scores
 * @param nodeId - The RAG node ID to benchmark
 * @access Public
 */
router.post('/node/:nodeId/benchmark', async (req: any, res: any) => {
    try {
        const { nodeId } = req.params;

        logger.info(`[MissingBenchmarkAPI] Queuing benchmark for specific node: ${nodeId}...`);

        // Find the specific node
        const missingNodes = await missingBenchmarkService.findModelPerformanceNodesWithMissingScores('extended');
        const targetNode = missingNodes.find(node => node.nodeId === nodeId);

        if (!targetNode) {
            return res.status(404).json({
                success: false,
                error: 'Node not found or has no missing benchmarks',
                nodeId
            });
        }

        // Queue the benchmark
        const benchmarkResult = await benchmarkingManager.runQueueBasedManualBenchmarks(
            targetNode.serverId,
            targetNode.modelId,
            targetNode.missingBenchmarks
        );

        logger.info(`[MissingBenchmarkAPI] Successfully queued benchmark for node ${nodeId}`);

        return res.status(200).json({
            success: true,
            data: {
                nodeId,
                serverId: targetNode.serverId,
                modelId: targetNode.modelId,
                benchmarkTypes: targetNode.missingBenchmarks,
                benchmarkCount: Object.keys(benchmarkResult.benchmarks || {}).length,
                result: benchmarkResult
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[MissingBenchmarkAPI] Error queuing benchmark for node: ${errorMessage}`);
        return res.status(500).json({
            success: false,
            error: 'Failed to queue benchmark for node',
            details: errorMessage
        });
    }
});

export default router;
