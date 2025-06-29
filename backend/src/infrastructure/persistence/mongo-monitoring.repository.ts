/**
 * MongoDB Monitoring Repository
 * 
 * Database repository for storing and retrieving monitoring data including
 * error events, performance metrics, and system health information.
 */

import { Collection, MongoClient, Db } from 'mongodb';
import { ErrorEventData, PerformanceMetricData } from '../../api/validators/monitoring.validators.js';

export interface StoredError extends ErrorEventData {
    _id?: string;
    serverTimestamp: Date;
    ipAddress?: string;
    referer?: string;
}

export interface StoredPerformanceMetric extends PerformanceMetricData {
    _id?: string;
    serverTimestamp: Date;
    ipAddress?: string;
}

export interface ErrorMetrics {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: StoredError[];
    errorRate: number;
    topErrors: Array<{ message: string; count: number; lastSeen: Date }>;
}

export interface PerformanceMetrics {
    totalMetrics: number;
    metricsByType: Record<string, number>;
    averageDurations: Record<string, number>;
    recentMetrics: StoredPerformanceMetric[];
    slowOperations: StoredPerformanceMetric[];
}

export interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical';
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
    lastChecked: Date;
    issues: string[];
}

export interface ApplicationInsights {
    timeRange: {
        start: Date;
        end: Date;
    };
    errorMetrics: ErrorMetrics;
    performanceMetrics: PerformanceMetrics;
    userActivity: {
        activeUsers: number;
        sessionCount: number;
        averageSessionDuration: number;
    };
    systemHealth: SystemHealth;
}

export class MongoMonitoringRepository {
    private db: Db;
    private errorsCollection: Collection<StoredError>;
    private metricsCollection: Collection<StoredPerformanceMetric>;

    constructor(private client: MongoClient, databaseName: string = 'universe_book_writer') {
        this.db = client.db(databaseName);
        this.errorsCollection = this.db.collection('monitoring_errors');
        this.metricsCollection = this.db.collection('monitoring_performance');

        this.setupIndexes();
    }

    /**
     * Setup database indexes for optimal query performance
     */
    private async setupIndexes(): Promise<void> {
        try {
            // Error collection indexes
            await this.errorsCollection.createIndex({ timestamp: -1 });
            await this.errorsCollection.createIndex({ serverTimestamp: -1 });
            await this.errorsCollection.createIndex({ category: 1, timestamp: -1 });
            await this.errorsCollection.createIndex({ severity: 1, timestamp: -1 });
            await this.errorsCollection.createIndex({ userId: 1, timestamp: -1 });
            await this.errorsCollection.createIndex({ sessionId: 1 });
            await this.errorsCollection.createIndex({ resolved: 1, timestamp: -1 });

            // Performance collection indexes
            await this.metricsCollection.createIndex({ timestamp: -1 });
            await this.metricsCollection.createIndex({ serverTimestamp: -1 });
            await this.metricsCollection.createIndex({ type: 1, timestamp: -1 });
            await this.metricsCollection.createIndex({ userId: 1, timestamp: -1 });
            await this.metricsCollection.createIndex({ sessionId: 1 });
            await this.metricsCollection.createIndex({ duration: -1, timestamp: -1 });

            // Compound indexes for complex queries
            await this.errorsCollection.createIndex({
                category: 1,
                severity: 1,
                timestamp: -1
            });
            await this.metricsCollection.createIndex({
                type: 1,
                name: 1,
                timestamp: -1
            });
        } catch (error) {
            console.error('Failed to setup monitoring indexes:', error);
        }
    }

    /**
     * Store error event
     */
    public async storeError(errorData: StoredError): Promise<StoredError> {
        const result = await this.errorsCollection.insertOne({
            ...errorData,
            timestamp: errorData.timestamp || Date.now(),
            serverTimestamp: errorData.serverTimestamp || new Date(),
            resolved: errorData.resolved || false,
        });

        return { ...errorData, _id: result.insertedId.toString() };
    }

    /**
     * Store performance metric
     */
    public async storePerformanceMetric(metricData: StoredPerformanceMetric): Promise<StoredPerformanceMetric> {
        const result = await this.metricsCollection.insertOne({
            ...metricData,
            timestamp: metricData.timestamp || Date.now(),
            serverTimestamp: metricData.serverTimestamp || new Date(),
        });

        return { ...metricData, _id: result.insertedId.toString() };
    }

    /**
     * Get error metrics
     */
    public async getErrorMetrics(options: {
        startTime?: Date;
        category?: string;
        severity?: string;
        userId?: string;
        limit?: number;
    }): Promise<ErrorMetrics> {
        const filter: any = {};

        if (options.startTime) {
            filter.serverTimestamp = { $gte: options.startTime };
        }
        if (options.category) {
            filter.category = options.category;
        }
        if (options.severity) {
            filter.severity = options.severity;
        }
        if (options.userId) {
            filter.userId = options.userId;
        }

        // Get total count
        const totalErrors = await this.errorsCollection.countDocuments(filter);

        // Get errors by category
        const categoryAggregation = await this.errorsCollection.aggregate([
            { $match: filter },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]).toArray();

        const errorsByCategory = categoryAggregation.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {} as Record<string, number>);

        // Get errors by severity
        const severityAggregation = await this.errorsCollection.aggregate([
            { $match: filter },
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]).toArray();

        const errorsBySeverity = severityAggregation.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {} as Record<string, number>);

        // Get recent errors
        const recentErrors = await this.errorsCollection
            .find(filter)
            .sort({ serverTimestamp: -1 })
            .limit(options.limit || 50)
            .toArray();

        // Calculate error rate (errors per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentErrorCount = await this.errorsCollection.countDocuments({
            ...filter,
            serverTimestamp: { $gte: oneHourAgo },
        });

        // Get top errors
        const topErrorsAggregation = await this.errorsCollection.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$message',
                    count: { $sum: 1 },
                    lastSeen: { $max: '$serverTimestamp' },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]).toArray();

        const topErrors = topErrorsAggregation.map(item => ({
            message: item._id,
            count: item.count,
            lastSeen: item.lastSeen,
        }));

        return {
            totalErrors,
            errorsByCategory,
            errorsBySeverity,
            recentErrors,
            errorRate: recentErrorCount,
            topErrors,
        };
    }

    /**
     * Get performance metrics
     */
    public async getPerformanceMetrics(options: {
        startTime?: Date;
        type?: string;
        userId?: string;
        limit?: number;
    }): Promise<PerformanceMetrics> {
        const filter: any = {};

        if (options.startTime) {
            filter.serverTimestamp = { $gte: options.startTime };
        }
        if (options.type) {
            filter.type = options.type;
        }
        if (options.userId) {
            filter.userId = options.userId;
        }

        // Get total count
        const totalMetrics = await this.metricsCollection.countDocuments(filter);

        // Get metrics by type
        const typeAggregation = await this.metricsCollection.aggregate([
            { $match: filter },
            { $group: { _id: '$type', count: { $sum: 1 } } },
        ]).toArray();

        const metricsByType = typeAggregation.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {} as Record<string, number>);

        // Get average durations by type
        const durationAggregation = await this.metricsCollection.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$type',
                    avgDuration: { $avg: '$duration' },
                },
            },
        ]).toArray();

        const averageDurations = durationAggregation.reduce((acc, item) => {
            acc[item._id] = Math.round(item.avgDuration);
            return acc;
        }, {} as Record<string, number>);

        // Get recent metrics
        const recentMetrics = await this.metricsCollection
            .find(filter)
            .sort({ serverTimestamp: -1 })
            .limit(options.limit || 50)
            .toArray();

        // Get slow operations (top 10% by duration)
        const slowOperations = await this.metricsCollection
            .find(filter)
            .sort({ duration: -1 })
            .limit(20)
            .toArray();

        return {
            totalMetrics,
            metricsByType,
            averageDurations,
            recentMetrics,
            slowOperations,
        };
    }

    /**
     * Get system health status
     */
    public async getSystemHealth(): Promise<SystemHealth> {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Calculate error rate
        const recentErrorCount = await this.errorsCollection.countDocuments({
            serverTimestamp: { $gte: oneHourAgo },
        });

        // Calculate average response time
        const responseTimeAggregation = await this.metricsCollection.aggregate([
            {
                $match: {
                    type: 'api-call',
                    serverTimestamp: { $gte: oneHourAgo },
                },
            },
            {
                $group: {
                    _id: null,
                    avgResponseTime: { $avg: '$duration' },
                },
            },
        ]).toArray();

        const averageResponseTime = responseTimeAggregation[0]?.avgResponseTime || 0;

        // Count critical errors
        const criticalErrorCount = await this.errorsCollection.countDocuments({
            severity: 'critical',
            serverTimestamp: { $gte: oneHourAgo },
        });

        // Determine health status
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        const issues: string[] = [];

        if (criticalErrorCount > 0) {
            status = 'critical';
            issues.push(`${criticalErrorCount} critical errors in the last hour`);
        } else if (recentErrorCount > 50) {
            status = 'warning';
            issues.push(`High error rate: ${recentErrorCount} errors in the last hour`);
        }

        if (averageResponseTime > 2000) {
            status = status === 'critical' ? 'critical' : 'warning';
            issues.push(`Slow API responses: ${Math.round(averageResponseTime)}ms average`);
        }

        return {
            status,
            errorRate: recentErrorCount,
            averageResponseTime: Math.round(averageResponseTime),
            uptime: 0, // This would typically come from process.uptime() or similar
            lastChecked: now,
            issues,
        };
    }

    /**
     * Get error by ID
     */
    public async getErrorById(id: string): Promise<StoredError | null> {
        return await this.errorsCollection.findOne({ _id: id });
    }

    /**
     * Mark error as resolved
     */
    public async resolveError(id: string, resolvedBy?: string): Promise<boolean> {
        const result = await this.errorsCollection.updateOne(
            { _id: id },
            {
                $set: {
                    resolved: true,
                    resolvedAt: new Date(),
                    resolvedBy,
                },
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Get application insights
     */
    public async getApplicationInsights(startTime: Date): Promise<ApplicationInsights> {
        const endTime = new Date();

        const [errorMetrics, performanceMetrics, systemHealth] = await Promise.all([
            this.getErrorMetrics({ startTime }),
            this.getPerformanceMetrics({ startTime }),
            this.getSystemHealth(),
        ]);

        // Calculate user activity metrics
        const userActivity = await this.calculateUserActivity(startTime, endTime);

        return {
            timeRange: { start: startTime, end: endTime },
            errorMetrics,
            performanceMetrics,
            userActivity,
            systemHealth,
        };
    }

    /**
     * Get real-time metrics
     */
    public async getRealTimeMetrics(since: Date): Promise<{
        errors: StoredError[];
        metrics: StoredPerformanceMetric[];
    }> {
        const [errors, metrics] = await Promise.all([
            this.errorsCollection
                .find({ serverTimestamp: { $gte: since } })
                .sort({ serverTimestamp: -1 })
                .limit(50)
                .toArray(),
            this.metricsCollection
                .find({ serverTimestamp: { $gte: since } })
                .sort({ serverTimestamp: -1 })
                .limit(50)
                .toArray(),
        ]);

        return { errors, metrics };
    }

    /**
     * Clean up old data
     */
    public async cleanupOldData(cutoffDate: Date): Promise<{
        deletedErrorsCount: number;
        deletedMetricsCount: number;
    }> {
        const [errorsResult, metricsResult] = await Promise.all([
            this.errorsCollection.deleteMany({
                serverTimestamp: { $lt: cutoffDate },
            }),
            this.metricsCollection.deleteMany({
                serverTimestamp: { $lt: cutoffDate },
            }),
        ]);

        return {
            deletedErrorsCount: errorsResult.deletedCount,
            deletedMetricsCount: metricsResult.deletedCount,
        };
    }

    /**
     * Calculate user activity metrics
     */
    private async calculateUserActivity(startTime: Date, endTime: Date): Promise<{
        activeUsers: number;
        sessionCount: number;
        averageSessionDuration: number;
    }> {
        // Get unique users from both error and metric collections
        const [errorUsers, metricUsers] = await Promise.all([
            this.errorsCollection.distinct('userId', {
                serverTimestamp: { $gte: startTime, $lte: endTime },
                userId: { $exists: true },
            }),
            this.metricsCollection.distinct('userId', {
                serverTimestamp: { $gte: startTime, $lte: endTime },
                userId: { $exists: true },
            }),
        ]);

        const uniqueUsers = new Set([...errorUsers, ...metricUsers]);
        const activeUsers = uniqueUsers.size;

        // Get unique sessions
        const [errorSessions, metricSessions] = await Promise.all([
            this.errorsCollection.distinct('sessionId', {
                serverTimestamp: { $gte: startTime, $lte: endTime },
            }),
            this.metricsCollection.distinct('sessionId', {
                serverTimestamp: { $gte: startTime, $lte: endTime },
            }),
        ]);

        const uniqueSessions = new Set([...errorSessions, ...metricSessions]);
        const sessionCount = uniqueSessions.size;

        // Calculate average session duration (simplified)
        const timeRangeMs = endTime.getTime() - startTime.getTime();
        const averageSessionDuration = sessionCount > 0 ? timeRangeMs / sessionCount : 0;

        return {
            activeUsers,
            sessionCount,
            averageSessionDuration: Math.round(averageSessionDuration / 1000), // Convert to seconds
        };
    }
}
