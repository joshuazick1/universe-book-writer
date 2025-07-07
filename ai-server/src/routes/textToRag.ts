/**
 * API routes for the Text-to-RAG Parser backend service
 */

import { Router } from 'express';
import { getTextToRAGParserService, ParsingOptions } from '../services/textToRagParser/index.js';
import { logInfo, logError } from '../logger.js';

export function createTextToRAGRoutes(): Router {
    const router = Router();
    
    /**
     * Parse text asynchronously
     * POST /api/text-to-rag/parse
     */
    router.post('/parse', (async (req: any, res: any) => {
        try {
            const { sourceText, options } = req.body;
            
            if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'sourceText is required and must be a non-empty string'
                });
            }

            const parsingOptions: ParsingOptions = {
                useChunking: options?.useChunking ?? true,
                chunkSize: options?.chunkSize ?? 2000,
                model: options?.model ?? 'llama3.1:8b',
                universeId: options?.universeId ?? 'default',
                confidenceThreshold: options?.confidenceThreshold ?? 0.6,
                enableRelationshipExtraction: options?.enableRelationshipExtraction ?? true,
                enableContextualUpdates: options?.enableContextualUpdates ?? true,
                autoCreateRAGNodes: options?.autoCreateRAGNodes ?? true,
                userId: options?.userId ?? 'anonymous'
            };

            const service = getTextToRAGParserService();
            const jobId = await service.parseText(sourceText, parsingOptions);

            res.json({
                success: true,
                jobId,
                message: 'Text parsing job started'
            });

        } catch (error) {
            logError(`Text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Parse text synchronously (for smaller texts)
     * POST /api/text-to-rag/parse-sync
     */
    router.post('/parse-sync', (async (req: any, res: any) => {
        try {
            const { sourceText, options } = req.body;
            
            if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'sourceText is required and must be a non-empty string'
                });
            }

            // Limit sync parsing to reasonable text sizes
            if (sourceText.length > 10000) {
                return res.status(400).json({
                    success: false,
                    error: 'Text too large for synchronous parsing. Use /parse endpoint for larger texts.'
                });
            }

            const parsingOptions: ParsingOptions = {
                useChunking: options?.useChunking ?? (sourceText.length > 2000),
                chunkSize: options?.chunkSize ?? 2000,
                model: options?.model ?? 'llama3.1:8b',
                universeId: options?.universeId ?? 'default',
                confidenceThreshold: options?.confidenceThreshold ?? 0.6,
                enableRelationshipExtraction: options?.enableRelationshipExtraction ?? true,
                enableContextualUpdates: options?.enableContextualUpdates ?? true,
                autoCreateRAGNodes: options?.autoCreateRAGNodes ?? false, // Default to false for sync
                userId: options?.userId ?? 'anonymous'
            };

            const service = getTextToRAGParserService();
            const results = await service.parseTextSync(sourceText, parsingOptions);

            res.json({
                success: true,
                results
            });

        } catch (error) {
            logError(`Synchronous text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Enhanced text parsing with Phase 2 features
     * POST /api/text-to-rag/parse-enhanced
     */
    router.post('/parse-enhanced', (async (req: any, res: any) => {
        try {
            const { sourceText, options } = req.body;
            
            if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'sourceText is required and must be a non-empty string'
                });
            }

            // Enhanced parsing options with Phase 2 features
            const parsingOptions: ParsingOptions = {
                useChunking: options?.useChunking ?? true,
                chunkSize: options?.chunkSize ?? 2000,
                model: options?.model ?? 'llama3.1:8b',
                universeId: options?.universeId ?? 'default',
                confidenceThreshold: options?.confidenceThreshold ?? 0.6,
                enableRelationshipExtraction: options?.enableRelationshipExtraction ?? true,
                enableContextualUpdates: options?.enableContextualUpdates ?? true,
                autoCreateRAGNodes: options?.autoCreateRAGNodes ?? true,
                userId: options?.userId ?? 'anonymous',
                
                // Phase 2 enhanced options
                enableDualAiProcessing: options?.enableDualAiProcessing ?? true,
                dualAiOptions: {
                    contextualModel: options?.dualAiOptions?.contextualModel ?? 'llama3.1:8b',
                    enableRelationshipExtraction: options?.dualAiOptions?.enableRelationshipExtraction ?? true,
                    enableEntityRefinement: options?.dualAiOptions?.enableEntityRefinement ?? true,
                    crossValidation: options?.dualAiOptions?.crossValidation ?? true,
                    ...options?.dualAiOptions
                },
                confidenceFiltering: {
                    enabled: options?.confidenceFiltering?.enabled ?? true,
                    thresholds: {
                        accept: options?.confidenceFiltering?.thresholds?.accept ?? 0.8,
                        review: options?.confidenceFiltering?.thresholds?.review ?? 0.6,
                        reject: options?.confidenceFiltering?.thresholds?.reject ?? 0.4,
                        ...options?.confidenceFiltering?.thresholds
                    },
                    options: {
                        adaptiveThresholds: options?.confidenceFiltering?.options?.adaptiveThresholds ?? true,
                        contextualAdjustment: options?.confidenceFiltering?.options?.contextualAdjustment ?? true,
                        ...options?.confidenceFiltering?.options
                    }
                },
                relationshipExtraction: {
                    enabled: options?.relationshipExtraction?.enabled ?? true,
                    confidenceThreshold: options?.relationshipExtraction?.confidenceThreshold ?? 0.7,
                    maxRelationshipsPerEntity: options?.relationshipExtraction?.maxRelationshipsPerEntity ?? 10,
                    ...options?.relationshipExtraction
                }
            };

            const service = getTextToRAGParserService();
            const jobId = await service.parseText(sourceText, parsingOptions);

            res.json({
                success: true,
                jobId,
                message: 'Enhanced text parsing job started with dual-AI processing',
                features: {
                    dualAiProcessing: parsingOptions.enableDualAiProcessing,
                    confidenceFiltering: parsingOptions.confidenceFiltering.enabled,
                    relationshipExtraction: parsingOptions.relationshipExtraction.enabled
                }
            });

        } catch (error) {
            logError(`Enhanced text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Enhanced synchronous parsing with Phase 2 features  
     * POST /api/text-to-rag/parse-enhanced-sync
     */
    router.post('/parse-enhanced-sync', (async (req: any, res: any) => {
        try {
            const { sourceText, options } = req.body;
            
            if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'sourceText is required and must be a non-empty string'
                });
            }

            // Limit sync parsing to reasonable text sizes
            if (sourceText.length > 8000) {
                return res.status(400).json({
                    success: false,
                    error: 'Text too large for enhanced synchronous parsing. Use /parse-enhanced endpoint for larger texts.'
                });
            }

            // Enhanced parsing options with Phase 2 features
            const parsingOptions: ParsingOptions = {
                useChunking: options?.useChunking ?? (sourceText.length > 2000),
                chunkSize: options?.chunkSize ?? 2000,
                model: options?.model ?? 'llama3.1:8b',
                universeId: options?.universeId ?? 'default',
                confidenceThreshold: options?.confidenceThreshold ?? 0.6,
                enableRelationshipExtraction: options?.enableRelationshipExtraction ?? true,
                enableContextualUpdates: options?.enableContextualUpdates ?? true,
                autoCreateRAGNodes: options?.autoCreateRAGNodes ?? false,
                userId: options?.userId ?? 'anonymous',
                
                // Phase 2 enhanced options
                enableDualAiProcessing: options?.enableDualAiProcessing ?? true,
                dualAiOptions: {
                    contextualModel: options?.dualAiOptions?.contextualModel ?? 'llama3.1:8b',
                    enableRelationshipExtraction: options?.dualAiOptions?.enableRelationshipExtraction ?? true,
                    enableEntityRefinement: options?.dualAiOptions?.enableEntityRefinement ?? true,
                    crossValidation: options?.dualAiOptions?.crossValidation ?? true,
                    ...options?.dualAiOptions
                },
                confidenceFiltering: {
                    enabled: options?.confidenceFiltering?.enabled ?? true,
                    thresholds: {
                        accept: options?.confidenceFiltering?.thresholds?.accept ?? 0.8,
                        review: options?.confidenceFiltering?.thresholds?.review ?? 0.6,
                        reject: options?.confidenceFiltering?.thresholds?.reject ?? 0.4,
                        ...options?.confidenceFiltering?.thresholds
                    },
                    options: {
                        adaptiveThresholds: options?.confidenceFiltering?.options?.adaptiveThresholds ?? true,
                        contextualAdjustment: options?.confidenceFiltering?.options?.contextualAdjustment ?? true,
                        ...options?.confidenceFiltering?.options
                    }
                },
                relationshipExtraction: {
                    enabled: options?.relationshipExtraction?.enabled ?? true,
                    confidenceThreshold: options?.relationshipExtraction?.confidenceThreshold ?? 0.7,
                    maxRelationshipsPerEntity: options?.relationshipExtraction?.maxRelationshipsPerEntity ?? 10,
                    ...options?.relationshipExtraction
                }
            };

            const service = getTextToRAGParserService();
            const results = await service.parseTextSync(sourceText, parsingOptions);

            res.json({
                success: true,
                results,
                features: {
                    dualAiProcessing: parsingOptions.enableDualAiProcessing,
                    confidenceFiltering: parsingOptions.confidenceFiltering.enabled,
                    relationshipExtraction: parsingOptions.relationshipExtraction.enabled
                }
            });

        } catch (error) {
            logError(`Enhanced synchronous text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Get job status
     * GET /api/text-to-rag/job/:jobId/status
     */
    router.get('/job/:jobId/status', (async (req: any, res: any) => {
        try {
            const { jobId } = req.params;
            
            const service = getTextToRAGParserService();
            const job = service.getJobStatus(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }

            res.json({
                success: true,
                job: {
                    id: job.id,
                    status: job.status,
                    type: job.type,
                    universeId: job.universeId,
                    userId: job.userId,
                    createdAt: job.createdAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    progress: job.progress,
                    error: job.error
                }
            });

        } catch (error) {
            logError(`Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Get job results
     * GET /api/text-to-rag/job/:jobId/results
     */
    router.get('/job/:jobId/results', (async (req: any, res: any) => {
        try {
            const { jobId } = req.params;
            
            const service = getTextToRAGParserService();
            const job = service.getJobStatus(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }

            if (job.status !== 'completed') {
                return res.status(400).json({
                    success: false,
                    error: `Job is not completed. Current status: ${job.status}`,
                    status: job.status
                });
            }

            const results = service.getJobResults(jobId);
            res.json({
                success: true,
                results
            });

        } catch (error) {
            logError(`Failed to get job results: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Cancel a job
     * DELETE /api/text-to-rag/job/:jobId
     */
    router.delete('/job/:jobId', (async (req: any, res: any) => {
        try {
            const { jobId } = req.params;
            
            const service = getTextToRAGParserService();
            const cancelled = service.cancelJob(jobId);

            if (!cancelled) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found or cannot be cancelled'
                });
            }

            res.json({
                success: true,
                message: 'Job cancelled successfully'
            });

        } catch (error) {
            logError(`Failed to cancel job: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Get queue statistics
     * GET /api/text-to-rag/queue/stats
     */
    router.get('/queue/stats', (async (req: any, res: any) => {
        try {
            const service = getTextToRAGParserService();
            const stats = service.getQueueStats();

            res.json({
                success: true,
                stats
            });

        } catch (error) {
            logError(`Failed to get queue stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Get processing statistics and queue metrics
     * GET /api/text-to-rag/stats
     */
    router.get('/stats', (async (req: any, res: any) => {
        try {
            const service = getTextToRAGParserService();
            const queueStats = service.getQueueStats();
            const healthStatus = await service.getHealthStatus();

            res.json({
                success: true,
                stats: {
                    queue: queueStats,
                    health: healthStatus,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logError(`Failed to get processing statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Get enhanced job details including Phase 2 feature usage
     * GET /api/text-to-rag/job/:jobId/details
     */
    router.get('/job/:jobId/details', (async (req: any, res: any) => {
        try {
            const { jobId } = req.params;
            
            const service = getTextToRAGParserService();
            const job = service.getJobStatus(jobId);
            const results = service.getJobResults(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }

            res.json({
                success: true,
                job: {
                    id: job.id,
                    status: job.status,
                    type: job.type,
                    universeId: job.universeId,
                    userId: job.userId,
                    createdAt: job.createdAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    progress: job.progress,
                    error: job.error,
                    // Include processing details if available
                    ...(results && {
                        results: {
                            entityCount: results.entities.length,
                            statistics: results.statistics,
                            processingTime: results.processingTime,
                            ragNodesCreated: results.ragNodesCreated?.length || 0
                        }
                    })
                }
            });

        } catch (error) {
            logError(`Failed to get job details: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    /**
     * Health check endpoint for Phase 2 features
     * GET /api/text-to-rag/health
     */
    router.get('/health', (async (req: any, res: any) => {
        try {
            const service = getTextToRAGParserService();
            const healthStatus = await service.getHealthStatus();

            if (healthStatus.healthy) {
                res.json({
                    success: true,
                    status: 'healthy',
                    features: {
                        dualAiProcessing: true,
                        confidenceFiltering: true,
                        relationshipExtraction: true,
                        ragIntegration: true
                    },
                    details: healthStatus.details
                });
            } else {
                res.status(503).json({
                    success: false,
                    status: 'unhealthy',
                    details: healthStatus.details
                });
            }

        } catch (error) {
            logError(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }) as any);

    return router;
}

/**
 * Initialize and mount the text-to-RAG parser service
 */
export async function initializeTextToRAGService(): Promise<void> {
    try {
        logInfo('Initializing Text-to-RAG Parser Service...');
        const service = getTextToRAGParserService({
            aiServerUrl: 'http://localhost:5100', // Use local AI server
            queueConfig: {
                maxConcurrentJobs: 2, // Conservative limit
                jobTimeout: 600000, // 10 minutes
                maxRetries: 2
            }
        });
        
        await service.initialize();
        logInfo('Text-to-RAG Parser Service initialized successfully');
        
    } catch (error) {
        logError(`Failed to initialize Text-to-RAG Parser Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}
