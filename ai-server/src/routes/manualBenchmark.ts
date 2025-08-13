import { Router } from 'express';
import { BenchmarkingManager } from '../benchmarking/BenchmarkingManager.js';
import { EnhancedUpdateRAGSystem } from '../benchmarking/enhanced-updateRAGSystem.js';
import { logger } from '../../../shared/logging/logger.js';
import { decodeIfBase64 } from '../utils/decodeUtils.js';
import { universalQueueService } from '../services/universal-queue.service.js';
import { JobBuilder } from '../utils/job-builder.js';
import { IntelligentLoadBalancerService } from '../services/intelligent-load-balancer.service.js';
import { ModelRegistryService } from '../services/model-registry.service.js';
import { BenchmarkDataService } from '../services/benchmark-data.service.js';
import { JobType } from '../../../shared/types/universal-job.js';
import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { detectEmbeddingModel, logBenchmarkDetails } from '../benchmarking/benchmarkUtils.js';
const router = Router();

const modelRegistry = new ModelRegistryService();
const benchmarkData = new BenchmarkDataService();
const loadBalancer = new IntelligentLoadBalancerService(modelRegistry, benchmarkData);

const jobBuilder = new JobBuilder(JobType.QUALITY_BENCHMARK, {
    modelId: '', // Placeholder, to be set dynamically
    benchmarkType: '', // Placeholder, to be set dynamically
});

// Replace direct instantiation with the shared instance
const queueService = universalQueueService;
const benchmarkingManager = new BenchmarkingManager(queueService, jobBuilder);

// Initialize enhanced RAG system for node creation
const enhancedRAGSystem = new EnhancedUpdateRAGSystem();

/**
 * @route POST /api/manual/benchmark
 * @desc Run manual benchmarks with intelligent warmup workflow:
 *       1. Server Infrastructure: Always test server health (model-agnostic)
 *       2. Intelligent Warmup: 
 *          - Single quality test: Run it 3 times and average results
 *          - Multiple quality tests: Run top 3 prioritized tests for warmup, then remaining tests
 *       3. Only requested quality benchmarks are executed (no automatic performance tests)
 * @access Public
 */
interface ManualBenchmarkRequest {
    serverIdOrUrl: string;
    modelId: string;
    benchmarkTypes: BenchmarkType[];
}

router.post('/benchmark', (async (req: any, res: any) => {
    const { serverIdOrUrl, modelId, benchmarkTypes } = req.body as ManualBenchmarkRequest;

    if (!serverIdOrUrl || !modelId || !Array.isArray(benchmarkTypes)) {
        return res.status(400).json({ error: 'Invalid request. serverIdOrUrl, modelId, and benchmarkTypes are required.' });
    }

    try {
        // Resolve server details using serverId
        const serverDetails = universalQueueService.getServerDetails(serverIdOrUrl);
        if (!serverDetails) {
            return res.status(400).json({ error: `Server with ID '${serverIdOrUrl}' not found.` });
        }

        logger.info(`[ManualBenchmark] Resolved server details: ${JSON.stringify(serverDetails)}`);

        // Use resolved server details for further processing
        const serverIdentifier = serverDetails.baseUrl;

        logger.info(`[ManualBenchmark] Starting benchmark workflow for server: ${serverIdentifier}, model: ${modelId}, types: ${benchmarkTypes.join(', ')}`);

        // Register the server first if it's a URL
        if (serverIdOrUrl.startsWith('http')) {
            logger.info(`[ManualBenchmark] Registering server: ${serverIdentifier}`);
            universalQueueService.registerServer({
                id: serverIdentifier,
                baseUrl: serverIdentifier,
                availableModels: [modelId],
                loadedModels: [modelId],
                currentLoad: 0,
                queueDepth: 0,
                availableMemoryMB: 8192,
                hasGPU: true,
                isHealthy: true,
                lastResponseTime: 0,
                errorRate: 0
            });
            logger.info(`[ManualBenchmark] Server registered successfully: ${serverIdentifier}`);
        }

        // Step 1: Detect if this is an embedding model
        logger.info(`[ManualBenchmark] Detecting model type for ${modelId}...`);
        const embeddingDetection = await detectEmbeddingModel(modelId, serverIdentifier, 30000);

        let finalBenchmarkTypes = benchmarkTypes as readonly BenchmarkType[];

        if (embeddingDetection.isEmbedding) {
            logger.info(`[ManualBenchmark] Detected embedding model ${modelId}. Switching to embedding-specific benchmarks.`);

            // Override with embedding-specific benchmarks
            finalBenchmarkTypes = ['embedding-quality', 'embedding-speed'] as const;

            // If user specifically requested certain embedding benchmarks, use those instead
            const requestedEmbeddingTypes = benchmarkTypes.filter(type =>
                ['embedding-quality', 'embedding-speed', 'vector-similarity', 'embedding-dimensions', 'embedding-clustering'].includes(type)
            );

            if (requestedEmbeddingTypes.length > 0) {
                finalBenchmarkTypes = requestedEmbeddingTypes as readonly BenchmarkType[];
                logger.info(`[ManualBenchmark] Using user-requested embedding benchmarks: ${finalBenchmarkTypes.join(', ')}`);
            }

        } else if (embeddingDetection.statusCode === 400) {
            // 400 error but embedding endpoint also failed - could be model loading issue
            logger.warn(`[ManualBenchmark] Model ${modelId} returned 400 error but is not a working embedding model. Error: ${embeddingDetection.error || 'Unknown'}`);

            // Return error with suggestion to check model
            return res.status(400).json({
                error: 'Model appears to be misconfigured or not loaded properly',
                details: embeddingDetection.error,
                suggestion: 'Please verify the model is properly loaded and accessible',
                statusCode: embeddingDetection.statusCode
            });
        } else {
            logger.info(`[ManualBenchmark] Model ${modelId} is a text generation model. Proceeding with standard benchmarks.`);
        }

        // Enhanced debugging: Log server and model details before running benchmarks
        logger.info(`[ManualBenchmark Debug] Server details:`, {
            serverIdOrUrl,
            serverIdentifier,
            modelId,
            benchmarkTypes,
        });

        // Enhanced debugging: Log embedding detection results
        logger.info(`[ManualBenchmark Debug] Embedding detection results:`, {
            isEmbedding: embeddingDetection.isEmbedding,
            statusCode: embeddingDetection.statusCode,
            error: embeddingDetection.error,
        });

        // Enhanced debugging: Log final benchmark types
        logger.info(`[ManualBenchmark Debug] Final benchmark types to run:`, {
            finalBenchmarkTypes,
        });

        // Step 2: Run the appropriate benchmarks
        const results = await benchmarkingManager.runQueueBasedManualBenchmarks(serverIdOrUrl, modelId, finalBenchmarkTypes);

        // Enhanced debugging: Log results after benchmarks
        logger.info(`[ManualBenchmark Debug] Benchmark results:`, {
            results,
        });

        // Step 3: Update RAG system with enhanced node creation
        try {
            logger.info(`[ManualBenchmark] Updating RAG system with enhanced nodes for ${modelId} on ${serverIdentifier}`);
            await enhancedRAGSystem.updateRAGSystem(results);
            logger.info(`[ManualBenchmark] Successfully updated RAG system with enhanced nodes`);
        } catch (ragError) {
            logger.error(`[ManualBenchmark] Failed to update RAG system:`, String(ragError) as any);
            // Continue with response even if RAG update fails
        }

        // Enhanced debugging: Log RAG system update details
        logger.info(`[ManualBenchmark Debug] RAG system update details:`, {
            modelId,
            serverIdentifier,
            results,
        });

        logger.info(`[ManualBenchmark] Completed benchmark workflow for server: ${serverIdentifier}, model: ${modelId}`);

        return res.status(200).json({
            success: true,
            results,
            modelType: embeddingDetection.isEmbedding ? 'embedding' : 'text-generation',
            benchmarksRun: finalBenchmarkTypes
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[ManualBenchmark] Error running benchmarks: ${errorMessage}`);
        return res.status(500).json({ error: 'Failed to run benchmarks', details: errorMessage });
    }
}) as any);

/**
 * @route POST /api/manual/rag-nodes
 * @desc Manually trigger enhanced RAG node creation for existing benchmark data
 * @access Public
 */
router.post('/rag-nodes', (async (req: any, res: any) => {
    const { modelId, serverId } = req.body;

    if (!modelId) {
        return res.status(400).json({ error: 'modelId is required' });
    }

    try {
        logger.info(`[ManualBenchmark] Manually triggering RAG node creation for model: ${modelId}, server: ${serverId || 'all'}`);

        // Create minimal benchmark data for RAG system update
        const mockBenchmarkData = {
            modelId,
            benchmarks: {
                'creative-writing': { score: 0, details: 'Manual trigger' },
                'task-planning': { score: 0, details: 'Manual trigger' },
                'json-assembly': { score: 0, details: 'Manual trigger' },
                'typescript-quality': { score: 0, details: 'Manual trigger' }
            },
            serverLatencies: serverId ? { [serverId]: 1000 } : {},
            serverLatencyMetrics: serverId ? { [serverId]: { healthScore: 1.0, tagsLatency: 1000 } } : {},
            serverColdPerformance: {},
            serverWarmPerformance: {},
            serverThroughput: {}
        };

        await enhancedRAGSystem.updateRAGSystem(mockBenchmarkData as any);

        logger.info(`[ManualBenchmark] Successfully created enhanced RAG nodes for ${modelId}`);

        return res.status(200).json({
            success: true,
            message: `Enhanced RAG nodes created for model: ${modelId}`,
            nodesCreated: ['ai-server', 'model-performance', 'ai-model']
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[ManualBenchmark] Error creating RAG nodes: ${errorMessage}`);
        return res.status(500).json({ error: 'Failed to create RAG nodes', details: errorMessage });
    }
}) as any);

export default router;