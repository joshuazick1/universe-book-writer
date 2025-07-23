/**
 * User Activity Analytics Types
 * 
 * Type definitions for user activity tracking and analytics.
 */

export interface UserActivityEvent {
    id: string;
    timestamp: number;
    userId: string;
    sessionId: string;
    eventType: 'page_view' | 'feature_use' | 'interaction' | 'error' | 'performance';
    eventName: string;
    properties: Record<string, any>;
    duration?: number;
    metadata?: {
        userAgent: string;
        viewport: string;
        url: string;
        referrer?: string;
    };
}

export interface FeatureUsageMetrics {
    featureName: string;
    totalUses: number;
    uniqueUsers: number;
    avgDuration: number;
    lastUsed: number;
    popularTimes: Record<string, number>; // Hour of day usage patterns
    userSegments: Record<string, number>; // Usage by user type/role
}

export interface UserBehaviorPattern {
    userId: string;
    sessionCount: number;
    totalTimeSpent: number;
    featuresUsed: string[];
    commonPaths: string[];
    conversionFunnels: Record<string, number>;
    lastActivity: number;
    preferences: Record<string, any>;
}

export interface UserAnalyticsDashboard {
    timestamp: number;
    activeUsers: {
        now: number;
        today: number;
        thisWeek: number;
        thisMonth: number;
    };
    featureUsage: FeatureUsageMetrics[];
    userJourney: {
        commonPaths: string[];
        dropOffPoints: string[];
        conversionRates: Record<string, number>;
    };
    performance: {
        avgPageLoadTime: number;
        avgInteractionTime: number;
        errorRate: number;
        bounceRate: number;
    };
    topContent: {
        pages: Array<{ path: string; views: number; timeSpent: number }>;
        features: Array<{ name: string; usage: number; satisfaction: number }>;
    };
}

export interface AnalyticsQuery {
    timeRange?: '1h' | '24h' | '7d' | '30d' | '90d';
    userId?: string;
    eventType?: UserActivityEvent['eventType'];
    featureName?: string;
    page?: string;
    limit?: number;
    offset?: number;
}

export interface AnalyticsAggregation {
    groupBy: 'hour' | 'day' | 'week' | 'month' | 'user' | 'feature' | 'page';
    metrics: ('count' | 'unique_users' | 'avg_duration' | 'total_duration')[];
    filters?: Record<string, any>;
}

export interface UserSegment {
    name: string;
    criteria: Record<string, any>;
    userCount: number;
    avgEngagement: number;
    topFeatures: string[];
    conversionRate: number;
}

export interface ConversionFunnel {
    name: string;
    steps: Array<{
        name: string;
        eventCriteria: Record<string, any>;
        userCount: number;
        conversionRate: number;
        avgTimeToNext?: number;
    }>;
    totalConversionRate: number;
    avgCompletionTime: number;
}

export interface AnalyticsExport {
    userId: string;
    events: UserActivityEvent[];
    summary: {
        totalEvents: number;
        dateRange: {
            start: number;
            end: number;
        };
        eventTypes: Record<string, number>;
        featuresUsed: string[];
        pagesVisited: string[];
    };
}

export interface AnalyticsConfig {
    retentionDays: number;
    batchSize: number;
    flushInterval: number;
    anonymizeAfterDays: number;
    enabledEvents: UserActivityEvent['eventType'][];
    sensitiveFields: string[];
    exportFormats: ('json' | 'csv' | 'xlsx')[];
}

export interface AnalyticsAlert {
    id: string;
    name: string;
    condition: {
        metric: string;
        operator: 'gt' | 'lt' | 'eq' | 'ne';
        threshold: number;
        timeWindow: string;
    };
    recipients: string[];
    enabled: boolean;
    lastTriggered?: number;
}
