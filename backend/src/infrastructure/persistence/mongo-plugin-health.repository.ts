/**
 * MongoDB Plugin Health Repository
 * 
 * Repository for storing and retrieving plugin health monitoring data.
 */

import { MongoClient, Db, Collection } from 'mongodb';
import {
    PluginHealthMetric,
    PluginLoadEvent,
    PluginErrorEvent,
    PluginPerformanceEvent,
    PluginHealthReport,
    PluginHealthDashboardMetrics,
    PluginHealthTrend,
    PluginPerformanceMetrics
} from '../../types/plugin-health.types.js';

export class PluginHealthMonitoringRepository {
    private db: Db;
    private healthMetricsCollection: Collection<PluginHealthMetric>;
    private loadEventsCollection: Collection<PluginLoadEvent>;
    private errorEventsCollection: Collection<PluginErrorEvent>;
    private performanceEventsCollection: Collection<PluginPerformanceEvent>;

    constructor(client: MongoClient, dbName: string = 'universe_book_writer') {
        this.db = client.db(dbName);
        this.healthMetricsCollection = this.db.collection('plugin_health_metrics');
        this.loadEventsCollection = this.db.collection('plugin_load_events');
        this.errorEventsCollection = this.db.collection('plugin_error_events');
        this.performanceEventsCollection = this.db.collection('plugin_performance_events');

        this.createIndexes();
    }

    /**
     * Create database indexes for optimal query performance
     */
    private async createIndexes(): Promise<void> {
        try {
            // Health metrics indexes
            await this.healthMetricsCollection.createIndexes([
                { key: { pluginName: 1, timestamp: -1 } },
                { key: { status: 1, timestamp: -1 } },
                { key: { timestamp: -1 } },
                { key: { 'performance.avgResponseTime': -1 } },
            ]);

            // Load events indexes
            await this.loadEventsCollection.createIndexes([
                { key: { pluginName: 1, startTime: -1 } },
                { key: { success: 1, startTime: -1 } },
                { key: { duration: -1 } },
            ]);

            // Error events indexes
            await this.errorEventsCollection.createIndexes([
                { key: { pluginName: 1, timestamp: -1 } },
                { key: { severity: 1, timestamp: -1 } },
                { key: { operation: 1, timestamp: -1 } },
            ]);

            // Performance events indexes
            await this.performanceEventsCollection.createIndexes([
                { key: { pluginName: 1, timestamp: -1 } },
                { key: { operation: 1, timestamp: -1 } },
                { key: { duration: -1 } },
            ]);
        } catch (error) {
            console.error('Failed to create plugin health indexes:', error);
        }
    }

    /**
     * Record plugin health metric
     */
    async recordHealthMetric(metric: PluginHealthMetric): Promise<void> {
        await this.healthMetricsCollection.insertOne(metric);
    }

    /**
     * Record plugin load event
     */
    async recordLoadEvent(event: PluginLoadEvent): Promise<void> {
        await this.loadEventsCollection.insertOne(event);
    }

    /**
     * Record plugin error event
     */
    async recordErrorEvent(event: PluginErrorEvent): Promise<void> {
        await this.errorEventsCollection.insertOne(event);
    }

    /**
     * Record plugin performance event
     */
    async recordPerformanceEvent(event: PluginPerformanceEvent): Promise<void> {
        await this.performanceEventsCollection.insertOne(event);
    }

    /**
     * Get dashboard metrics
     */
    async getDashboardMetrics(options: {
        timeRange: string;
        pluginName?: string;
    }): Promise<PluginHealthDashboardMetrics> {
        const timeRangeMs = this.parseTimeRange(options.timeRange);
        const since = new Date(Date.now() - timeRangeMs);

        const filter: any = { timestamp: { $gte: since.getTime() } };
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }

        // Get latest health metrics
        const healthMetrics = await this.healthMetricsCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .toArray();

        // Get load events
        const loadEvents = await this.loadEventsCollection
            .find({
                startTime: { $gte: since.getTime() },
                ...(options.pluginName ? { pluginName: options.pluginName } : {})
            })
            .toArray();

        // Get error events
        const errorEvents = await this.errorEventsCollection
            .find({
                timestamp: { $gte: since.getTime() },
                ...(options.pluginName ? { pluginName: options.pluginName } : {})
            })
            .toArray();

        // Get performance events
        const performanceEvents = await this.performanceEventsCollection
            .find({
                timestamp: { $gte: since.getTime() },
                ...(options.pluginName ? { pluginName: options.pluginName } : {})
            })
            .toArray();

        return this.buildDashboardMetrics(healthMetrics, loadEvents, errorEvents, performanceEvents);
    }

    /**
     * Get health report
     */
    async getHealthReport(options: {
        pluginName?: string;
        includeHistory?: boolean;
    }): Promise<PluginHealthReport> {
        const filter: any = {};
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }

        // Get latest health metrics for each plugin
        const pipeline = [
            { $match: filter },
            { $sort: { pluginName: 1, timestamp: -1 } },
            {
                $group: {
                    _id: '$pluginName',
                    latestMetric: { $first: '$$ROOT' }
                }
            },
            { $replaceRoot: { newRoot: '$latestMetric' } }
        ];

        const latestMetrics = await this.healthMetricsCollection
            .aggregate<PluginHealthMetric>(pipeline)
            .toArray();

        return this.buildHealthReport(latestMetrics);
    }

    /**
     * Get load events
     */
    async getLoadEvents(options: {
        pluginName?: string;
        limit: number;
        offset: number;
    }): Promise<PluginLoadEvent[]> {
        const filter: any = {};
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }

        return this.loadEventsCollection
            .find(filter)
            .sort({ startTime: -1 })
            .skip(options.offset)
            .limit(options.limit)
            .toArray();
    }

    /**
     * Get error events
     */
    async getErrorEvents(options: {
        pluginName?: string;
        severity?: string;
        limit: number;
        offset: number;
    }): Promise<PluginErrorEvent[]> {
        const filter: any = {};
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }
        if (options.severity) {
            filter.severity = options.severity;
        }

        return this.errorEventsCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .skip(options.offset)
            .limit(options.limit)
            .toArray();
    }

    /**
     * Get performance events
     */
    async getPerformanceEvents(options: {
        pluginName?: string;
        operation?: string;
        limit: number;
        offset: number;
    }): Promise<PluginPerformanceEvent[]> {
        const filter: any = {};
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }
        if (options.operation) {
            filter.operation = options.operation;
        }

        return this.performanceEventsCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .skip(options.offset)
            .limit(options.limit)
            .toArray();
    }

    /**
     * Get health trends
     */
    async getHealthTrends(options: {
        pluginName?: string;
        timeRange: string;
        granularity: string;
    }): Promise<PluginHealthTrend[]> {
        const timeRangeMs = this.parseTimeRange(options.timeRange);
        const granularityMs = this.parseTimeRange(options.granularity);
        const since = new Date(Date.now() - timeRangeMs);

        const filter: any = { timestamp: { $gte: since.getTime() } };
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }

        const pipeline = [
            { $match: filter },
            {
                $group: {
                    _id: {
                        interval: {
                            $subtract: [
                                '$timestamp',
                                { $mod: ['$timestamp', granularityMs] }
                            ]
                        },
                        ...(options.pluginName ? {} : { pluginName: '$pluginName' })
                    },
                    healthyCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'healthy'] }, 1, 0] }
                    },
                    warningCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'warning'] }, 1, 0] }
                    },
                    criticalCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'critical'] }, 1, 0] }
                    },
                    offlineCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
                    },
                    avgLoadTime: { $avg: '$loadTime' },
                    totalErrors: { $sum: '$errorCount' },
                    avgResponseTime: { $avg: '$performance.avgResponseTime' }
                }
            },
            { $sort: { '_id.interval': 1 } }
        ];

        const results = await this.healthMetricsCollection
            .aggregate(pipeline)
            .toArray();

        return results.map(r => ({
            timestamp: r._id.interval,
            pluginName: r._id.pluginName,
            healthyCount: r.healthyCount,
            warningCount: r.warningCount,
            criticalCount: r.criticalCount,
            offlineCount: r.offlineCount,
            avgLoadTime: r.avgLoadTime || 0,
            totalErrors: r.totalErrors,
            avgResponseTime: r.avgResponseTime || 0,
        }));
    }

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(options: {
        pluginName?: string;
        timeRange: string;
    }): Promise<PluginPerformanceMetrics> {
        const timeRangeMs = this.parseTimeRange(options.timeRange);
        const since = new Date(Date.now() - timeRangeMs);

        const filter: any = { timestamp: { $gte: since.getTime() } };
        if (options.pluginName) {
            filter.pluginName = options.pluginName;
        }

        const events = await this.performanceEventsCollection
            .find(filter)
            .toArray();

        return this.buildPerformanceMetrics(events, options.timeRange);
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.db.admin().ping();
            return true;
        } catch (error) {
            console.error('Plugin health monitoring database health check failed:', error);
            return false;
        }
    }

    /**
     * Parse time range string to milliseconds
     */
    private parseTimeRange(timeRange: string): number {
        const match = timeRange.match(/^(\d+)([smhd])$/);
        if (!match) return 3600000; // Default 1 hour

        const value = parseInt(match[1]);
        const unit = match[2];

        const multipliers = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        return value * (multipliers[unit as keyof typeof multipliers] || multipliers.h);
    }

    /**
     * Build dashboard metrics from raw data
     */
    private buildDashboardMetrics(
        healthMetrics: PluginHealthMetric[],
        loadEvents: PluginLoadEvent[],
        errorEvents: PluginErrorEvent[],
        performanceEvents: PluginPerformanceEvent[]
    ): PluginHealthDashboardMetrics {
        // Get latest metric per plugin
        const latestMetrics = new Map<string, PluginHealthMetric>();
        healthMetrics.forEach(metric => {
            const existing = latestMetrics.get(metric.pluginName);
            if (!existing || metric.timestamp > existing.timestamp) {
                latestMetrics.set(metric.pluginName, metric);
            }
        });

        const plugins = Array.from(latestMetrics.values());

        const overview = {
            totalPlugins: plugins.length,
            activePlugins: plugins.filter(p => p.status !== 'offline').length,
            healthyPlugins: plugins.filter(p => p.status === 'healthy').length,
            warningPlugins: plugins.filter(p => p.status === 'warning').length,
            criticalPlugins: plugins.filter(p => p.status === 'critical').length,
            offlinePlugins: plugins.filter(p => p.status === 'offline').length,
        };

        const performance = {
            avgLoadTime: plugins.reduce((sum, p) => sum + p.loadTime, 0) / Math.max(plugins.length, 1),
            totalLoadTime: plugins.reduce((sum, p) => sum + p.loadTime, 0),
            avgResponseTime: plugins.reduce((sum, p) => sum + p.performance.avgResponseTime, 0) / Math.max(plugins.length, 1),
            slowOperations: plugins.reduce((sum, p) => sum + p.performance.slowOperations, 0),
            totalMemoryUsage: plugins.reduce((sum, p) => sum + p.memoryUsage, 0),
        };

        const recentErrors = errorEvents.filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
        const criticalErrors = errorEvents.filter(e => e.severity === 'critical');

        const errors = {
            totalErrors: errorEvents.length,
            criticalErrors: criticalErrors.length,
            recentErrors: recentErrors.length,
            errorRate: errorEvents.length / Math.max(performanceEvents.length, 1),
        };

        // Build trend data (simplified for now)
        const trends = {
            loadTimeHistory: this.buildTrendHistory(loadEvents, 'duration'),
            errorHistory: this.buildErrorTrendHistory(errorEvents),
            performanceHistory: this.buildTrendHistory(performanceEvents, 'duration'),
        };

        const topIssues = {
            slowestPlugins: plugins
                .sort((a, b) => b.loadTime - a.loadTime)
                .slice(0, 5)
                .map(p => ({ name: p.pluginName, loadTime: p.loadTime })),

            mostErrorPronePlugins: plugins
                .sort((a, b) => b.errorCount - a.errorCount)
                .slice(0, 5)
                .map(p => ({ name: p.pluginName, errorCount: p.errorCount })),

            recentCriticalEvents: errorEvents
                .filter(e => e.severity === 'critical')
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10),
        };

        return {
            timestamp: Date.now(),
            overview,
            performance,
            errors,
            trends,
            topIssues,
        };
    }

    /**
     * Build health report from metrics
     */
    private buildHealthReport(metrics: PluginHealthMetric[]): PluginHealthReport {
        const totalPlugins = metrics.length;
        const activePlugins = metrics.filter(m => m.status !== 'offline').length;
        const healthyPlugins = metrics.filter(m => m.status === 'healthy').length;
        const warningPlugins = metrics.filter(m => m.status === 'warning').length;
        const criticalPlugins = metrics.filter(m => m.status === 'critical').length;
        const offlinePlugins = metrics.filter(m => m.status === 'offline').length;

        const totalLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0);
        const avgLoadTime = totalPlugins > 0 ? totalLoadTime / totalPlugins : 0;
        const totalMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0);
        const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);

        const slowestPlugin = metrics.reduce((slowest, current) =>
            current.loadTime > (slowest?.loadTime || 0) ? current : slowest,
            metrics[0]
        )?.pluginName;

        const mostErrorPronePlugin = metrics.reduce((mostErrors, current) =>
            current.errorCount > (mostErrors?.errorCount || 0) ? current : mostErrors,
            metrics[0]
        )?.pluginName;

        return {
            timestamp: Date.now(),
            totalPlugins,
            activePlugins,
            healthyPlugins,
            warningPlugins,
            criticalPlugins,
            offlinePlugins,
            totalLoadTime,
            avgLoadTime,
            totalMemoryUsage,
            totalErrors,
            slowestPlugin,
            mostErrorPronePlugin,
            plugins: metrics,
        };
    }

    /**
     * Build performance metrics from events
     */
    private buildPerformanceMetrics(
        events: PluginPerformanceEvent[],
        timeRange: string
    ): PluginPerformanceMetrics {
        const operations = new Map<string, number[]>();

        events.forEach(event => {
            if (!operations.has(event.operation)) {
                operations.set(event.operation, []);
            }
            operations.get(event.operation)!.push(event.duration);
        });

        const overview = {
            totalOperations: events.length,
            avgDuration: events.reduce((sum, e) => sum + e.duration, 0) / Math.max(events.length, 1),
            slowOperations: events.filter(e => e.duration > 1000).length,
            fastestOperation: events.length > 0 ? Math.min(...events.map(e => e.duration)) : 0,
            slowestOperation: events.length > 0 ? Math.max(...events.map(e => e.duration)) : 0,
        };

        const operationStats: any = {};
        operations.forEach((durations, operation) => {
            durations.sort((a, b) => a - b);
            operationStats[operation] = {
                count: durations.length,
                avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
                minDuration: durations[0],
                maxDuration: durations[durations.length - 1],
                p50Duration: durations[Math.floor(durations.length * 0.5)],
                p95Duration: durations[Math.floor(durations.length * 0.95)],
                p99Duration: durations[Math.floor(durations.length * 0.99)],
            };
        });

        // Build trends (simplified)
        const trends = this.buildPerformanceTrends(events);

        return {
            timeRange,
            overview,
            operations: operationStats,
            trends,
        };
    }

    /**
     * Build trend history from events
     */
    private buildTrendHistory(events: any[], valueField: string): { timestamp: number; value: number }[] {
        const buckets = new Map<number, number[]>();
        const bucketSize = 300000; // 5 minutes

        events.forEach(event => {
            const bucketTime = Math.floor(event.timestamp / bucketSize) * bucketSize;
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, []);
            }
            buckets.get(bucketTime)!.push(event[valueField] || 0);
        });

        return Array.from(buckets.entries())
            .map(([timestamp, values]) => ({
                timestamp,
                value: values.reduce((sum, v) => sum + v, 0) / values.length,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Build error trend history
     */
    private buildErrorTrendHistory(events: PluginErrorEvent[]): { timestamp: number; value: number }[] {
        const buckets = new Map<number, number>();
        const bucketSize = 300000; // 5 minutes

        events.forEach(event => {
            const bucketTime = Math.floor(event.timestamp / bucketSize) * bucketSize;
            buckets.set(bucketTime, (buckets.get(bucketTime) || 0) + 1);
        });

        return Array.from(buckets.entries())
            .map(([timestamp, value]) => ({ timestamp, value }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Build performance trends
     */
    private buildPerformanceTrends(events: PluginPerformanceEvent[]): { timestamp: number; avgDuration: number; operationCount: number }[] {
        const buckets = new Map<number, { durations: number[]; count: number }>();
        const bucketSize = 300000; // 5 minutes

        events.forEach(event => {
            const bucketTime = Math.floor(event.timestamp / bucketSize) * bucketSize;
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, { durations: [], count: 0 });
            }
            const bucket = buckets.get(bucketTime)!;
            bucket.durations.push(event.duration);
            bucket.count++;
        });

        return Array.from(buckets.entries())
            .map(([timestamp, bucket]) => ({
                timestamp,
                avgDuration: bucket.durations.reduce((sum, d) => sum + d, 0) / bucket.durations.length,
                operationCount: bucket.count,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }
}
