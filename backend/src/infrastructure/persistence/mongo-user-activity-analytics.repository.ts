/**
 * MongoDB User Activity Analytics Repository
 * 
 * Repository for storing and retrieving user activity analytics data.
 */

import { MongoClient, Db, Collection } from 'mongodb';
import {
    UserActivityEvent,
    FeatureUsageMetrics,
    UserBehaviorPattern,
    UserAnalyticsDashboard,
    AnalyticsQuery,
    AnalyticsAggregation,
    ConversionFunnel,
    AnalyticsExport
} from '../../types/user-activity-analytics.types.js';

export class UserActivityAnalyticsRepository {
    private db: Db;
    private eventsCollection: Collection<UserActivityEvent>;

    constructor(client: MongoClient, dbName: string = 'universe_book_writer') {
        this.db = client.db(dbName);
        this.eventsCollection = this.db.collection('user_activity_events');

        this.createIndexes();
    }

    /**
     * Create database indexes for optimal query performance
     */
    private async createIndexes(): Promise<void> {
        try {
            await this.eventsCollection.createIndexes([
                { key: { userId: 1, timestamp: -1 } },
                { key: { eventType: 1, timestamp: -1 } },
                { key: { sessionId: 1, timestamp: -1 } },
                { key: { eventName: 1, timestamp: -1 } },
                { key: { 'properties.feature': 1, timestamp: -1 } },
                { key: { 'properties.page': 1, timestamp: -1 } },
                { key: { timestamp: -1 } },
                // TTL index for automatic cleanup
                { key: { timestamp: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60 }, // 90 days
            ]);
        } catch (error) {
            console.error('Failed to create user activity analytics indexes:', error);
        }
    }

    /**
     * Store multiple user activity events
     */
    async storeEvents(events: UserActivityEvent[]): Promise<void> {
        if (events.length === 0) return;
        await this.eventsCollection.insertMany(events);
    }

    /**
     * Store single user activity event
     */
    async storeEvent(event: UserActivityEvent): Promise<void> {
        await this.eventsCollection.insertOne(event);
    }

    /**
     * Query user activity events
     */
    async queryEvents(query: AnalyticsQuery): Promise<UserActivityEvent[]> {
        const filter: any = {};

        // Time range filter
        if (query.timeRange) {
            const now = Date.now();
            const timeRangeMs = {
                '1h': 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
                '90d': 90 * 24 * 60 * 60 * 1000,
            };
            filter.timestamp = { $gte: now - timeRangeMs[query.timeRange] };
        }

        // User filter
        if (query.userId) {
            filter.userId = query.userId;
        }

        // Event type filter
        if (query.eventType) {
            filter.eventType = query.eventType;
        }

        // Feature filter
        if (query.featureName) {
            filter['properties.feature'] = query.featureName;
        }

        // Page filter
        if (query.page) {
            filter['properties.page'] = query.page;
        }

        const cursor = this.eventsCollection
            .find(filter)
            .sort({ timestamp: -1 });

        if (query.limit) {
            cursor.limit(query.limit);
        }

        if (query.offset) {
            cursor.skip(query.offset);
        }

        return await cursor.toArray();
    }

    /**
     * Get feature usage metrics
     */
    async getFeatureUsageMetrics(timeRange: string = '30d'): Promise<FeatureUsageMetrics[]> {
        const now = Date.now();
        const timeRangeMs = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };

        const pipeline = [
            {
                $match: {
                    eventType: 'feature_use',
                    timestamp: { $gte: now - (timeRangeMs[timeRange as keyof typeof timeRangeMs] || timeRangeMs['30d']) },
                    'properties.feature': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$properties.feature',
                    totalUses: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$userId' },
                    avgDuration: { $avg: '$duration' },
                    lastUsed: { $max: '$timestamp' },
                    hourlyUsage: {
                        $push: {
                            hour: { $hour: { $toDate: '$timestamp' } },
                            userId: '$userId'
                        }
                    }
                }
            },
            {
                $project: {
                    featureName: '$_id',
                    totalUses: 1,
                    uniqueUsers: { $size: '$uniqueUsers' },
                    avgDuration: { $ifNull: ['$avgDuration', 0] },
                    lastUsed: 1,
                    popularTimes: {
                        $arrayToObject: {
                            $map: {
                                input: { $range: [0, 24] },
                                as: 'hour',
                                in: {
                                    k: { $toString: '$$hour' },
                                    v: {
                                        $size: {
                                            $filter: {
                                                input: '$hourlyUsage',
                                                cond: { $eq: ['$$this.hour', '$$hour'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    userSegments: {} // Placeholder - would require additional user data
                }
            },
            {
                $sort: { totalUses: -1 }
            }
        ];

        const results = await this.eventsCollection.aggregate(pipeline).toArray();
        return results.map(result => ({
            featureName: result.featureName,
            totalUses: result.totalUses,
            uniqueUsers: result.uniqueUsers,
            avgDuration: result.avgDuration,
            lastUsed: result.lastUsed,
            popularTimes: result.popularTimes,
            userSegments: result.userSegments,
        }));
    }

    /**
     * Get user behavior pattern
     */
    async getUserBehaviorPattern(userId: string): Promise<UserBehaviorPattern | null> {
        const userEvents = await this.eventsCollection
            .find({ userId })
            .sort({ timestamp: 1 })
            .toArray();

        if (userEvents.length === 0) return null;

        const sessions = new Set(userEvents.map(e => e.sessionId));

        const pageExitEvents = userEvents.filter(e => e.eventName === 'page_exit');
        const totalTimeSpent = pageExitEvents.reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0);

        const featuresUsed = Array.from(new Set(
            userEvents
                .filter(e => e.eventType === 'feature_use' && e.properties.feature)
                .map(e => e.properties.feature)
        ));

        const pageViews = userEvents
            .filter(e => e.eventType === 'page_view')
            .map(e => e.properties.page)
            .filter(Boolean);

        const commonPaths = this.extractCommonPaths(pageViews);
        const conversionFunnels = await this.calculateConversionFunnels(userId);

        return {
            userId,
            sessionCount: sessions.size,
            totalTimeSpent,
            featuresUsed,
            commonPaths,
            conversionFunnels,
            lastActivity: Math.max(...userEvents.map(e => e.timestamp)),
            preferences: this.inferUserPreferences(userEvents),
        };
    }

    /**
     * Get analytics dashboard data
     */
    async getAnalyticsDashboard(timeRange: string = '30d'): Promise<UserAnalyticsDashboard> {
        const now = Date.now();
        const timeRangeMs = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };

        const activeUsers = await this.getActiveUsers(timeRangeMs);
        const featureUsage = await this.getFeatureUsageMetrics(timeRange);
        const userJourney = await this.getUserJourneyData();
        const performance = await this.getPerformanceMetrics();
        const topContent = await this.getTopContent();

        return {
            timestamp: now,
            activeUsers,
            featureUsage,
            userJourney,
            performance,
            topContent,
        };
    }

    /**
     * Export user data for GDPR compliance
     */
    async exportUserData(userId: string): Promise<AnalyticsExport> {
        const events = await this.eventsCollection
            .find({ userId })
            .sort({ timestamp: 1 })
            .toArray();

        if (events.length === 0) {
            return {
                userId,
                events: [],
                summary: {
                    totalEvents: 0,
                    dateRange: { start: 0, end: 0 },
                    eventTypes: {},
                    featuresUsed: [],
                    pagesVisited: [],
                },
            };
        }

        const eventTypes = events.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const featuresUsed = Array.from(new Set(
            events
                .filter(e => e.properties.feature)
                .map(e => e.properties.feature)
        ));

        const pagesVisited = Array.from(new Set(
            events
                .filter(e => e.properties.page)
                .map(e => e.properties.page)
        ));

        return {
            userId,
            events,
            summary: {
                totalEvents: events.length,
                dateRange: {
                    start: events[0].timestamp,
                    end: events[events.length - 1].timestamp,
                },
                eventTypes,
                featuresUsed,
                pagesVisited,
            },
        };
    }

    /**
     * Delete user data for GDPR compliance
     */
    async deleteUserData(userId: string): Promise<number> {
        const result = await this.eventsCollection.deleteMany({ userId });
        return result.deletedCount;
    }

    /**
     * Aggregate analytics data
     */
    async aggregateData(aggregation: AnalyticsAggregation): Promise<any[]> {
        const pipeline: any[] = [];

        // Apply filters
        if (aggregation.filters) {
            pipeline.push({ $match: aggregation.filters });
        }

        // Group by specified dimension
        const groupBy: any = {};
        const groupId: any = {};

        switch (aggregation.groupBy) {
            case 'hour':
                groupId.hour = { $hour: { $toDate: '$timestamp' } };
                groupId.date = { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$timestamp' } } };
                break;
            case 'day':
                groupId.date = { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$timestamp' } } };
                break;
            case 'week':
                groupId.week = { $week: { $toDate: '$timestamp' } };
                groupId.year = { $year: { $toDate: '$timestamp' } };
                break;
            case 'month':
                groupId.month = { $month: { $toDate: '$timestamp' } };
                groupId.year = { $year: { $toDate: '$timestamp' } };
                break;
            case 'user':
                groupId.userId = '$userId';
                break;
            case 'feature':
                groupId.feature = '$properties.feature';
                break;
            case 'page':
                groupId.page = '$properties.page';
                break;
        }

        groupBy._id = groupId;

        // Add metrics
        aggregation.metrics.forEach(metric => {
            switch (metric) {
                case 'count':
                    groupBy.count = { $sum: 1 };
                    break;
                case 'unique_users':
                    groupBy.uniqueUsers = { $addToSet: '$userId' };
                    break;
                case 'avg_duration':
                    groupBy.avgDuration = { $avg: '$duration' };
                    break;
                case 'total_duration':
                    groupBy.totalDuration = { $sum: '$duration' };
                    break;
            }
        });

        pipeline.push({ $group: groupBy });

        // Process unique users count
        if (aggregation.metrics.includes('unique_users')) {
            pipeline.push({
                $addFields: {
                    uniqueUsers: { $size: '$uniqueUsers' }
                }
            });
        }

        pipeline.push({ $sort: { '_id': 1 } });

        return await this.eventsCollection.aggregate(pipeline).toArray();
    }

    // Private helper methods

    private async getActiveUsers(timeRangeMs: Record<string, number>): Promise<UserAnalyticsDashboard['activeUsers']> {
        const now = Date.now();

        const pipeline = [
            {
                $facet: {
                    now: [
                        { $match: { timestamp: { $gte: now - 5 * 60 * 1000 } } }, // Last 5 minutes
                        { $group: { _id: null, users: { $addToSet: '$userId' } } }
                    ],
                    today: [
                        { $match: { timestamp: { $gte: now - timeRangeMs['24h'] } } },
                        { $group: { _id: null, users: { $addToSet: '$userId' } } }
                    ],
                    thisWeek: [
                        { $match: { timestamp: { $gte: now - timeRangeMs['7d'] } } },
                        { $group: { _id: null, users: { $addToSet: '$userId' } } }
                    ],
                    thisMonth: [
                        { $match: { timestamp: { $gte: now - timeRangeMs['30d'] } } },
                        { $group: { _id: null, users: { $addToSet: '$userId' } } }
                    ]
                }
            }
        ];

        const results = await this.eventsCollection.aggregate(pipeline).toArray();
        const data = results[0];

        return {
            now: data.now[0]?.users?.length || 0,
            today: data.today[0]?.users?.length || 0,
            thisWeek: data.thisWeek[0]?.users?.length || 0,
            thisMonth: data.thisMonth[0]?.users?.length || 0,
        };
    }

    private async getUserJourneyData(): Promise<UserAnalyticsDashboard['userJourney']> {
        // Simplified implementation - would need more sophisticated path analysis
        const pageViews = await this.eventsCollection
            .find({ eventType: 'page_view' })
            .limit(1000)
            .toArray();

        const pages = pageViews.map(e => e.properties.page).filter(Boolean);
        const commonPaths = Array.from(new Set(pages)).slice(0, 10);

        return {
            commonPaths,
            dropOffPoints: ['signup', 'onboarding', 'first-universe'],
            conversionRates: {
                'signup_to_universe': 0.75,
                'universe_to_story': 0.60,
                'story_to_publish': 0.40,
            },
        };
    }

    private async getPerformanceMetrics(): Promise<UserAnalyticsDashboard['performance']> {
        const performanceEvents = await this.eventsCollection
            .find({ eventType: 'performance' })
            .toArray();

        const pageLoadEvents = performanceEvents.filter(e => e.properties.metric === 'page_load_time');
        const avgPageLoadTime = pageLoadEvents.length > 0
            ? pageLoadEvents.reduce((sum, e) => sum + e.properties.value, 0) / pageLoadEvents.length
            : 0;

        const totalEvents = await this.eventsCollection.countDocuments();
        const errorEvents = await this.eventsCollection.countDocuments({ eventType: 'error' });
        const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

        return {
            avgPageLoadTime,
            avgInteractionTime: 250, // Placeholder
            errorRate,
            bounceRate: 25, // Placeholder
        };
    }

    private async getTopContent(): Promise<UserAnalyticsDashboard['topContent']> {
        const pagesPipeline = [
            { $match: { eventType: 'page_view' } },
            { $group: { _id: '$properties.page', views: { $sum: 1 } } },
            { $sort: { views: -1 } },
            { $limit: 10 }
        ];

        const featuresPipeline = [
            { $match: { eventType: 'feature_use' } },
            { $group: { _id: '$properties.feature', usage: { $sum: 1 } } },
            { $sort: { usage: -1 } },
            { $limit: 10 }
        ];

        const [pagesResult, featuresResult] = await Promise.all([
            this.eventsCollection.aggregate(pagesPipeline).toArray(),
            this.eventsCollection.aggregate(featuresPipeline).toArray(),
        ]);

        const pages = pagesResult.map(p => ({
            path: p._id || 'unknown',
            views: p.views,
            timeSpent: 0, // Would need additional calculation
        }));

        const features = featuresResult.map(f => ({
            name: f._id || 'unknown',
            usage: f.usage,
            satisfaction: 85, // Placeholder - would need satisfaction surveys
        }));

        return { pages, features };
    }

    private extractCommonPaths(pageViews: string[]): string[] {
        // Simple implementation - return unique pages
        return Array.from(new Set(pageViews)).slice(0, 10);
    }

    private async calculateConversionFunnels(userId: string): Promise<Record<string, number>> {
        // Simplified implementation
        return {
            'signup_to_universe': 0.85,
            'universe_to_story': 0.60,
            'story_to_publish': 0.40,
        };
    }

    private inferUserPreferences(events: UserActivityEvent[]): Record<string, any> {
        const preferences: Record<string, any> = {};

        // Theme preference
        const themeEvents = events.filter(e => e.properties.theme);
        if (themeEvents.length > 0) {
            const themeUsage = themeEvents.reduce((acc, e) => {
                acc[e.properties.theme] = (acc[e.properties.theme] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            preferences.preferredTheme = Object.keys(themeUsage)
                .sort((a, b) => themeUsage[b] - themeUsage[a])[0];
        }

        // Feature preferences
        const featureEvents = events.filter(e => e.eventType === 'feature_use');
        const featureUsage = featureEvents.reduce((acc, e) => {
            acc[e.properties.feature] = (acc[e.properties.feature] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        preferences.topFeatures = Object.keys(featureUsage)
            .sort((a, b) => featureUsage[b] - featureUsage[a])
            .slice(0, 5);

        return preferences;
    }
}
