/**
 * Comprehensive metrics collection for queue optimization
 */

import { JobId } from 'shared/types/universal-job';
import { ServerId } from 'shared/types/server';
import { TaskType } from 'shared/types/model-selection';
import { logger } from '../../../shared/logging/logger.js';

export interface APICallMetrics {
    readonly endpoint: string;
    readonly method: string;
    readonly responseTime: number;
    readonly statusCode: number;
    readonly requestSize?: number;
    readonly responseSize?: number;
    readonly userAgent?: string;
    readonly timestamp: Date;
    readonly jobId?: JobId;
    readonly serverId?: ServerId;
    readonly modelId?: string;
    readonly taskType?: TaskType;
}

export interface ServerPerformanceMetrics {
    readonly serverId: ServerId;
    readonly timestamp: Date;
    readonly cpuUsage: number;
    readonly memoryUsage: number;
    readonly gpuUsage?: number;
    readonly activeConnections: number;
    readonly queueDepth: number;
    readonly responseTime: number;
    readonly errorRate: number;
    readonly throughput: number; // requests per second
}

export interface ExecutionMetrics {
    readonly jobId: JobId;
    readonly serverId: ServerId;
    readonly modelId: string;
    readonly taskType: TaskType;
    readonly executionTime: number;
    readonly queueTime: number;
    readonly tokenCount?: number;
    readonly tokensPerSecond?: number;
    readonly memoryUsed: number;
    readonly success: boolean;
    readonly errorType?: string;
    readonly timestamp: Date;
}

export interface ServerMetrics {
    readonly serverId: ServerId;
    readonly timeWindow: string;
    readonly totalRequests: number;
    readonly successfulRequests: number;
    readonly avgResponseTime: number;
    readonly p95ResponseTime: number;
    readonly p99ResponseTime: number;
    readonly errorRate: number;
    readonly throughput: number;
    readonly avgCpuUsage: number;
    readonly avgMemoryUsage: number;
    readonly avgGpuUsage?: number;
}

export class MetricsService {
    private apiCallMetrics: APICallMetrics[] = [];
    private serverMetrics: Map<ServerId, ServerPerformanceMetrics[]> = new Map();
    private executionMetrics: ExecutionMetrics[] = [];
    private readonly maxMetricsAge = 24 * 60 * 60 * 1000; // 24 hours
    private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour

    constructor() {
        // Start cleanup task
        setInterval(() => this.cleanupOldMetrics(), this.cleanupInterval);
        logger.info('MetricsService: Initialized with cleanup interval', {
            cleanupInterval: this.cleanupInterval
        });
    }

    /**
     * Record API call metrics
     */
    async recordAPICall(metrics: APICallMetrics): Promise<void> {
        try {
            this.apiCallMetrics.push(metrics);

            logger.debug('MetricsService: Recorded API call', {
                endpoint: metrics.endpoint,
                responseTime: metrics.responseTime,
                statusCode: metrics.statusCode
            });

            // Optional: Trigger alerts for slow responses
            if (metrics.responseTime > 5000) {
                logger.warn('MetricsService: Slow API response detected', {
                    endpoint: metrics.endpoint,
                    responseTime: metrics.responseTime,
                    serverId: metrics.serverId
                });
            }

        } catch (error) {
            logger.error('MetricsService: Failed to record API call metrics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Record server performance metrics
     */
    async recordServerPerformance(metrics: ServerPerformanceMetrics): Promise<void> {
        try {
            if (!this.serverMetrics.has(metrics.serverId)) {
                this.serverMetrics.set(metrics.serverId, []);
            }

            this.serverMetrics.get(metrics.serverId)!.push(metrics);

            logger.debug('MetricsService: Recorded server performance', {
                serverId: metrics.serverId,
                cpuUsage: metrics.cpuUsage,
                memoryUsage: metrics.memoryUsage,
                queueDepth: metrics.queueDepth
            });

            // Alert on high resource usage
            if (metrics.cpuUsage > 90 || metrics.memoryUsage > 90) {
                logger.warn('MetricsService: High resource usage detected', {
                    serverId: metrics.serverId,
                    cpuUsage: metrics.cpuUsage,
                    memoryUsage: metrics.memoryUsage
                });
            }

        } catch (error) {
            logger.error('MetricsService: Failed to record server performance metrics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Record job execution metrics
     */
    async recordExecution(metrics: ExecutionMetrics): Promise<void> {
        try {
            this.executionMetrics.push(metrics);

            logger.debug('MetricsService: Recorded execution metrics', {
                jobId: metrics.jobId,
                serverId: metrics.serverId,
                executionTime: metrics.executionTime,
                success: metrics.success
            });

        } catch (error) {
            logger.error('MetricsService: Failed to record execution metrics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get server metrics for a specific time window
     */
    async getServerMetrics(serverId: ServerId, timeWindow: string): Promise<ServerMetrics> {
        try {
            const serverData = this.serverMetrics.get(serverId) || [];
            const windowMs = this.parseTimeWindow(timeWindow);
            const cutoff = new Date(Date.now() - windowMs);

            const relevantMetrics = serverData.filter(m => m.timestamp >= cutoff);

            if (relevantMetrics.length === 0) {
                return this.createEmptyServerMetrics(serverId, timeWindow);
            }

            const totalRequests = this.apiCallMetrics.filter(
                m => m.serverId === serverId && m.timestamp >= cutoff
            ).length;

            const successfulRequests = this.apiCallMetrics.filter(
                m => m.serverId === serverId &&
                    m.timestamp >= cutoff &&
                    m.statusCode >= 200 && m.statusCode < 400
            ).length;

            const responseTimes = this.apiCallMetrics
                .filter(m => m.serverId === serverId && m.timestamp >= cutoff)
                .map(m => m.responseTime)
                .sort((a, b) => a - b);

            return {
                serverId,
                timeWindow,
                totalRequests,
                successfulRequests,
                avgResponseTime: responseTimes.length > 0
                    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                    : 0,
                p95ResponseTime: responseTimes.length > 0
                    ? responseTimes[Math.floor(responseTimes.length * 0.95)]
                    : 0,
                p99ResponseTime: responseTimes.length > 0
                    ? responseTimes[Math.floor(responseTimes.length * 0.99)]
                    : 0,
                errorRate: totalRequests > 0
                    ? (totalRequests - successfulRequests) / totalRequests
                    : 0,
                throughput: totalRequests / (windowMs / 1000), // requests per second
                avgCpuUsage: relevantMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / relevantMetrics.length,
                avgMemoryUsage: relevantMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / relevantMetrics.length,
                avgGpuUsage: relevantMetrics.some(m => m.gpuUsage !== undefined)
                    ? relevantMetrics
                        .filter(m => m.gpuUsage !== undefined)
                        .reduce((sum, m) => sum + (m.gpuUsage || 0), 0) /
                    relevantMetrics.filter(m => m.gpuUsage !== undefined).length
                    : undefined
            };

        } catch (error) {
            logger.error('MetricsService: Failed to get server metrics', {
                error: error instanceof Error ? error.message : 'Unknown error',
                serverId,
                timeWindow
            });
            return this.createEmptyServerMetrics(serverId, timeWindow);
        }
    }

    /**
     * Get execution statistics for a model/task combination
     */
    getExecutionStats(modelId: string, taskType: TaskType, timeWindow: string): {
        totalExecutions: number;
        successRate: number;
        avgExecutionTime: number;
        avgQueueTime: number;
        avgTokensPerSecond: number;
    } {
        const windowMs = this.parseTimeWindow(timeWindow);
        const cutoff = new Date(Date.now() - windowMs);

        const relevantExecutions = this.executionMetrics.filter(
            m => m.modelId === modelId &&
                m.taskType === taskType &&
                m.timestamp >= cutoff
        );

        if (relevantExecutions.length === 0) {
            return {
                totalExecutions: 0,
                successRate: 0,
                avgExecutionTime: 0,
                avgQueueTime: 0,
                avgTokensPerSecond: 0
            };
        }

        const successful = relevantExecutions.filter(m => m.success);
        const withTokens = relevantExecutions.filter(m => m.tokensPerSecond !== undefined);

        return {
            totalExecutions: relevantExecutions.length,
            successRate: successful.length / relevantExecutions.length,
            avgExecutionTime: relevantExecutions.reduce((sum, m) => sum + m.executionTime, 0) / relevantExecutions.length,
            avgQueueTime: relevantExecutions.reduce((sum, m) => sum + m.queueTime, 0) / relevantExecutions.length,
            avgTokensPerSecond: withTokens.length > 0
                ? withTokens.reduce((sum, m) => sum + (m.tokensPerSecond || 0), 0) / withTokens.length
                : 0
        };
    }

    /**
     * Clean up old metrics beyond retention period
     */
    private cleanupOldMetrics(): void {
        const cutoff = new Date(Date.now() - this.maxMetricsAge);

        // Clean API call metrics
        const beforeApiCount = this.apiCallMetrics.length;
        this.apiCallMetrics = this.apiCallMetrics.filter(m => m.timestamp >= cutoff);

        // Clean execution metrics
        const beforeExecCount = this.executionMetrics.length;
        this.executionMetrics = this.executionMetrics.filter(m => m.timestamp >= cutoff);

        // Clean server metrics
        let serverMetricsRemoved = 0;
        for (const [serverId, metrics] of this.serverMetrics.entries()) {
            const beforeCount = metrics.length;
            const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
            this.serverMetrics.set(serverId, filteredMetrics);
            serverMetricsRemoved += (beforeCount - filteredMetrics.length);
        }

        logger.info('MetricsService: Completed metrics cleanup', {
            apiCallMetricsRemoved: beforeApiCount - this.apiCallMetrics.length,
            executionMetricsRemoved: beforeExecCount - this.executionMetrics.length,
            serverMetricsRemoved
        });
    }

    /**
     * Parse time window string to milliseconds
     */
    private parseTimeWindow(timeWindow: string): number {
        const match = timeWindow.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 60 * 60 * 1000; // Default to 1 hour
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 60 * 60 * 1000;
        }
    }

    /**
     * Create empty server metrics object
     */
    private createEmptyServerMetrics(serverId: ServerId, timeWindow: string): ServerMetrics {
        return {
            serverId,
            timeWindow,
            totalRequests: 0,
            successfulRequests: 0,
            avgResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            errorRate: 0,
            throughput: 0,
            avgCpuUsage: 0,
            avgMemoryUsage: 0,
            avgGpuUsage: undefined
        };
    }
}
