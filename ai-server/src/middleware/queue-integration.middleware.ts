/**
 * Transparent middleware for performance tracking and queue integration
 */

import { Request, Response, NextFunction } from 'express';
import { MetricsService, APICallMetrics } from '../services/metrics.service.js';
import { logger } from '../../../shared/logging/logger.js';

export interface QueueIntegratedRequest extends Request {
    queueMetrics?: {
        startTime: number;
        jobId?: string;
        serverId?: string;
        modelId?: string;
        taskType?: string;
    };
}

export class QueueIntegrationMiddleware {
    constructor(private readonly metricsService: MetricsService) { }

    /**
     * Middleware function to track performance and integrate with queue metrics
     */
    trackPerformance() {
        const metricsService = this.metricsService; // Capture service reference
        const extractJobId = this.extractJobId.bind(this);
        const extractServerId = this.extractServerId.bind(this);
        const extractModelId = this.extractModelId.bind(this);
        const extractTaskType = this.extractTaskType.bind(this);

        return (req: QueueIntegratedRequest, res: Response, next: NextFunction) => {
            const startTime = Date.now();

            // Initialize queue metrics on request
            req.queueMetrics = {
                startTime,
                jobId: extractJobId(req),
                serverId: extractServerId(req),
                modelId: extractModelId(req),
                taskType: extractTaskType(req)
            };

            // Capture original res.end to measure response time
            const originalEnd = res.end.bind(res);
            let responseSize = 0;

            // Override res.write to capture response size
            const originalWrite = res.write.bind(res);
            res.write = function (chunk: any, ...args: any[]) {
                if (chunk) {
                    responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, 'utf8');
                }
                return originalWrite(chunk, ...args);
            };

            // Override res.end to capture final metrics
            res.end = function (chunk?: any, ...args: any[]) {
                if (chunk) {
                    responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, 'utf8');
                }

                const responseTime = Date.now() - startTime;

                // Record API call metrics
                const metrics: APICallMetrics = {
                    endpoint: req.originalUrl,
                    method: req.method,
                    responseTime,
                    statusCode: res.statusCode,
                    requestSize: req.get('content-length') ? parseInt(req.get('content-length')!) : undefined,
                    responseSize,
                    userAgent: req.get('user-agent'),
                    timestamp: new Date(),
                    jobId: req.queueMetrics?.jobId,
                    serverId: req.queueMetrics?.serverId,
                    modelId: req.queueMetrics?.modelId,
                    taskType: req.queueMetrics?.taskType as any
                };

                // Record metrics asynchronously to avoid blocking the response
                setImmediate(() => {
                    metricsService.recordAPICall(metrics).catch((error: any) => {
                        logger.error('QueueIntegrationMiddleware: Failed to record API metrics', {
                            error: error instanceof Error ? error.message : 'Unknown error',
                            endpoint: req.originalUrl
                        });
                    });
                });

                logger.debug('QueueIntegrationMiddleware: Request completed', {
                    endpoint: req.originalUrl,
                    method: req.method,
                    statusCode: res.statusCode,
                    responseTime,
                    jobId: req.queueMetrics?.jobId
                });

                return originalEnd(chunk, ...args);
            };

            next();
        };
    }

    /**
     * Middleware for AI-specific endpoints to add model/task context
     */
    addAIContext() {
        return (req: QueueIntegratedRequest, res: Response, next: NextFunction) => {
            // Extract AI-specific context from request body or params
            try {
                if (req.body) {
                    const { model, task_type, taskType } = req.body;

                    if (req.queueMetrics) {
                        req.queueMetrics.modelId = req.queueMetrics.modelId || model;
                        req.queueMetrics.taskType = req.queueMetrics.taskType || task_type || taskType;
                    }
                }

                // Add context from URL parameters
                if (req.params.model) {
                    if (req.queueMetrics) {
                        req.queueMetrics.modelId = req.queueMetrics.modelId || req.params.model;
                    }
                }

            } catch (error) {
                logger.debug('QueueIntegrationMiddleware: Failed to extract AI context', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    endpoint: req.originalUrl
                });
            }

            next();
        };
    }

    /**
     * Middleware to log slow requests
     */
    slowRequestLogger(thresholdMs: number = 5000) {
        return (req: QueueIntegratedRequest, res: Response, next: NextFunction) => {
            const originalEnd = res.end.bind(res);

            res.end = function (chunk?: any, ...args: any[]) {
                const responseTime = Date.now() - (req.queueMetrics?.startTime || Date.now());

                if (responseTime > thresholdMs) {
                    logger.warn('QueueIntegrationMiddleware: Slow request detected', {
                        endpoint: req.originalUrl,
                        method: req.method,
                        responseTime,
                        statusCode: res.statusCode,
                        jobId: req.queueMetrics?.jobId,
                        serverId: req.queueMetrics?.serverId,
                        modelId: req.queueMetrics?.modelId
                    });
                }

                return originalEnd(chunk, ...args);
            };

            next();
        };
    }

    /**
     * Extract job ID from request headers or query parameters
     */
    private extractJobId(req: Request): string | undefined {
        return req.get('x-job-id') ||
            req.query.jobId as string ||
            req.query.job_id as string;
    }

    /**
     * Extract server ID from request headers
     */
    private extractServerId(req: Request): string | undefined {
        return req.get('x-server-id') ||
            req.get('x-forwarded-server');
    }

    /**
     * Extract model ID from request body or parameters
     */
    private extractModelId(req: Request): string | undefined {
        if (req.body && req.body.model) {
            return req.body.model;
        }

        if (req.params.model) {
            return req.params.model;
        }

        return req.query.model as string;
    }

    /**
     * Extract task type from request body or infer from endpoint
     */
    private extractTaskType(req: Request): string | undefined {
        // Check request body first
        if (req.body && (req.body.task_type || req.body.taskType)) {
            return req.body.task_type || req.body.taskType;
        }

        // Infer from endpoint path
        const path = req.originalUrl.toLowerCase();

        if (path.includes('chat') || path.includes('conversation')) {
            return 'conversation';
        } else if (path.includes('generate') || path.includes('completion')) {
            return 'generation';
        } else if (path.includes('embed')) {
            return 'embedding-generation';
        } else if (path.includes('summarize')) {
            return 'summarization';
        } else if (path.includes('code')) {
            return 'code-generation';
        }

        return undefined;
    }

    /**
     * Track performance metrics
     */
    trackPerformanceMetrics(req: QueueIntegratedRequest, res: Response, next: NextFunction): void {
        // Implementation for tracking performance metrics
    }
}

/**
 * Factory function to create middleware instances
 */
export function createQueueIntegrationMiddleware(metricsService: MetricsService): QueueIntegrationMiddleware {
    return new QueueIntegrationMiddleware(metricsService);
}
