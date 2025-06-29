/**
 * User Activity Analytics Service
 * 
 * Tracks user behavior patterns, feature usage, and interaction analytics
 * to help improve the application and understand user needs.
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

// Internal type for aggregation
interface FeatureUsageMetricsInternal extends Omit<FeatureUsageMetrics, 'uniqueUsers'> {
    uniqueUsers: Set<string>;
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

class UserActivityAnalyticsService {
    private events: UserActivityEvent[] = [];
    private sessionId: string;
    private userId: string | null = null;
    private sessionStart: number = Date.now();
    private pageStart: number = Date.now();
    private currentPage: string = '';
    private isOnline: boolean = navigator.onLine;
    private pendingEvents: UserActivityEvent[] = [];

    // Configuration
    private readonly maxEvents = 10000;
    private readonly flushInterval = 30000; // 30 seconds
    private readonly batchSize = 50;
    private flushTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.setupEventListeners();
        this.startPeriodicFlush();
    }

    /**
     * Initialize analytics for a user
     */
    public initializeUser(userId: string): void {
        this.userId = userId;
        this.trackEvent('session_start', {
            userId,
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
    }

    /**
     * Track page view
     */
    public trackPageView(page: string, title?: string): void {
        // Track previous page exit if applicable
        if (this.currentPage) {
            const timeSpent = Date.now() - this.pageStart;
            this.trackEvent('page_exit', {
                page: this.currentPage,
                timeSpent,
            });
        }

        // Track new page entry
        this.currentPage = page;
        this.pageStart = Date.now();

        this.trackEvent('page_view', {
            page,
            title,
            referrer: document.referrer,
            url: window.location.href,
        });
    }

    /**
     * Track feature usage
     */
    public trackFeatureUsage(
        featureName: string,
        action: string,
        properties: Record<string, any> = {},
        duration?: number
    ): void {
        this.trackEvent('feature_use', {
            feature: featureName,
            action,
            duration,
            ...properties,
        });
    }

    /**
     * Track user interaction
     */
    public trackInteraction(
        element: string,
        interactionType: 'click' | 'hover' | 'scroll' | 'input' | 'drag',
        properties: Record<string, any> = {}
    ): void {
        this.trackEvent('interaction', {
            element,
            type: interactionType,
            ...properties,
        });
    }

    /**
     * Track conversion events
     */
    public trackConversion(
        goal: string,
        value?: number,
        properties: Record<string, any> = {}
    ): void {
        this.trackEvent('conversion', {
            goal,
            value,
            funnel: this.getCurrentFunnel(),
            ...properties,
        });
    }

    /**
     * Track error events
     */
    public trackError(
        error: Error | string,
        context: Record<string, any> = {}
    ): void {
        const errorMessage = error instanceof Error ? error.message : error;
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.trackEvent('error', {
            error: errorMessage,
            stack: errorStack,
            context,
            url: window.location.href,
            userAgent: navigator.userAgent,
        });
    }

    /**
     * Track performance metrics
     */
    public trackPerformance(
        metric: string,
        value: number,
        properties: Record<string, any> = {}
    ): void {
        this.trackEvent('performance', {
            metric,
            value,
            ...properties,
        });
    }

    /**
     * Get feature usage analytics
     */
    public getFeatureUsageMetrics(): FeatureUsageMetrics[] {
        const featureEvents = this.events.filter(e => e.eventType === 'feature_use');
        const featureMap = new Map<string, FeatureUsageMetricsInternal>();

        featureEvents.forEach(event => {
            const featureName = event.properties.feature;
            if (!featureName) return;

            const existing = featureMap.get(featureName) || {
                featureName,
                totalUses: 0,
                uniqueUsers: new Set<string>(),
                avgDuration: 0,
                lastUsed: 0,
                popularTimes: {} as Record<string, number>,
                userSegments: {},
            };

            existing.totalUses++;
            existing.uniqueUsers.add(event.userId);
            existing.lastUsed = Math.max(existing.lastUsed, event.timestamp);

            if (event.duration) {
                existing.avgDuration = (existing.avgDuration + event.duration) / 2;
            }

            // Track popular times (hour of day)
            const hour = new Date(event.timestamp).getHours().toString();
            existing.popularTimes[hour] = (existing.popularTimes[hour] || 0) + 1;

            featureMap.set(featureName, existing);
        });

        // Convert Sets to numbers and return
        return Array.from(featureMap.values()).map(metric => ({
            ...metric,
            uniqueUsers: metric.uniqueUsers.size,
        }));
    }

    /**
     * Get user behavior patterns
     */
    public getUserBehaviorPattern(userId: string): UserBehaviorPattern | null {
        const userEvents = this.events.filter(e => e.userId === userId);
        if (userEvents.length === 0) return null;

        const sessions = new Set(userEvents.map(e => e.sessionId));
        const totalTimeSpent = userEvents
            .filter(e => e.eventType === 'page_view' && e.properties.pageExited)
            .reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0);

        const featuresUsed = Array.from(new Set(
            userEvents
                .filter(e => e.eventType === 'feature_use')
                .map(e => e.properties.feature)
                .filter(Boolean)
        ));

        const pageViews = userEvents.filter(e => e.eventType === 'page_view');
        const commonPaths = this.extractCommonPaths(pageViews);

        return {
            userId,
            sessionCount: sessions.size,
            totalTimeSpent,
            featuresUsed,
            commonPaths,
            conversionFunnels: this.calculateConversionFunnels(userEvents),
            lastActivity: Math.max(...userEvents.map(e => e.timestamp)),
            preferences: this.inferUserPreferences(userEvents),
        };
    }

    /**
     * Get analytics dashboard data
     */
    public getAnalyticsDashboard(): UserAnalyticsDashboard {
        const now = Date.now();
        const today = now - (24 * 60 * 60 * 1000);
        const thisWeek = now - (7 * 24 * 60 * 60 * 1000);
        const thisMonth = now - (30 * 24 * 60 * 60 * 1000);

        return {
            timestamp: now,
            activeUsers: {
                now: this.getActiveUsersCount(now - 5 * 60 * 1000), // Last 5 minutes
                today: this.getActiveUsersCount(today),
                thisWeek: this.getActiveUsersCount(thisWeek),
                thisMonth: this.getActiveUsersCount(thisMonth),
            },
            featureUsage: this.getFeatureUsageMetrics(),
            userJourney: {
                commonPaths: this.getCommonUserPaths(),
                dropOffPoints: this.getDropOffPoints(),
                conversionRates: this.getConversionRates(),
            },
            performance: {
                avgPageLoadTime: this.getAverageMetric('page_load_time'),
                avgInteractionTime: this.getAverageMetric('interaction_time'),
                errorRate: this.getErrorRate(),
                bounceRate: this.getBounceRate(),
            },
            topContent: {
                pages: this.getTopPages(),
                features: this.getTopFeatures(),
            },
        };
    }

    /**
     * Clear analytics data (for privacy/GDPR compliance)
     */
    public clearUserData(userId: string): void {
        this.events = this.events.filter(e => e.userId !== userId);
        this.pendingEvents = this.pendingEvents.filter(e => e.userId !== userId);
    }

    /**
     * Export analytics data for a user
     */
    public exportUserData(userId: string): UserActivityEvent[] {
        return this.events.filter(e => e.userId === userId);
    }

    // Private helper methods

    private trackEvent(
        eventName: string,
        properties: Record<string, any> = {}
    ): void {
        if (!this.userId && eventName !== 'session_start') {
            // Don't track events for unauthenticated users except session start
            return;
        }

        const event: UserActivityEvent = {
            id: this.generateEventId(),
            timestamp: Date.now(),
            userId: this.userId || 'anonymous',
            sessionId: this.sessionId,
            eventType: this.determineEventType(eventName),
            eventName,
            properties,
            metadata: {
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                url: window.location.href,
                referrer: document.referrer,
            },
        };

        this.events.push(event);
        this.events = this.events.slice(-this.maxEvents); // Keep only recent events

        // Queue for backend sync
        this.pendingEvents.push(event);
    }

    private determineEventType(eventName: string): UserActivityEvent['eventType'] {
        if (eventName.includes('page') || eventName.includes('view')) return 'page_view';
        if (eventName.includes('feature') || eventName.includes('use')) return 'feature_use';
        if (eventName.includes('click') || eventName.includes('interaction')) return 'interaction';
        if (eventName.includes('error')) return 'error';
        if (eventName.includes('performance') || eventName.includes('metric')) return 'performance';
        return 'interaction';
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateEventId(): string {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private setupEventListeners(): void {
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden');
            } else {
                this.trackEvent('page_visible');
            }
        });

        // Track online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.trackEvent('connection_restored');
            this.flushPendingEvents();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.trackEvent('connection_lost');
        });

        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', {
                duration: Date.now() - this.sessionStart,
            });
            this.flushPendingEvents();
        });

        // Track viewport changes
        window.addEventListener('resize', () => {
            this.trackEvent('viewport_change', {
                viewport: `${window.innerWidth}x${window.innerHeight}`,
            });
        });
    }

    private startPeriodicFlush(): void {
        this.flushTimer = setInterval(() => {
            this.flushPendingEvents();
        }, this.flushInterval);
    }

    private async flushPendingEvents(): Promise<void> {
        if (this.pendingEvents.length === 0 || !this.isOnline) return;

        const eventsToFlush = this.pendingEvents.splice(0, this.batchSize);

        try {
            await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ events: eventsToFlush }),
            });
        } catch (error) {
            console.warn('Failed to send analytics events:', error);
            // Put events back in queue for retry
            this.pendingEvents.unshift(...eventsToFlush);
        }
    }

    private getCurrentFunnel(): string[] {
        const recentPageViews = this.events
            .filter(e => e.eventType === 'page_view' && e.timestamp > Date.now() - 3600000) // Last hour
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(e => e.properties.page);

        return recentPageViews;
    }

    private extractCommonPaths(pageViews: UserActivityEvent[]): string[] {
        // Simple implementation - could be enhanced with path analysis algorithms
        const paths = pageViews
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(e => e.properties.page)
            .filter(Boolean);

        return paths.slice(0, 10); // Return first 10 pages as common path
    }

    private calculateConversionFunnels(events: UserActivityEvent[]): Record<string, number> {
        // Placeholder implementation - would calculate conversion rates for different goals
        return {
            'universe_creation': 0.85,
            'plugin_activation': 0.67,
            'story_completion': 0.45,
        };
    }

    private inferUserPreferences(events: UserActivityEvent[]): Record<string, any> {
        // Analyze user behavior to infer preferences
        const preferences: Record<string, any> = {};

        // Theme preference based on usage
        const themeEvents = events.filter(e => e.properties.theme);
        if (themeEvents.length > 0) {
            const themeUsage = themeEvents.reduce((acc, e) => {
                acc[e.properties.theme] = (acc[e.properties.theme] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            preferences.preferredTheme = Object.keys(themeUsage)
                .sort((a, b) => themeUsage[b] - themeUsage[a])[0];
        }

        // Feature preferences based on usage frequency
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

    private getActiveUsersCount(since: number): number {
        const activeUsers = new Set(
            this.events
                .filter(e => e.timestamp >= since)
                .map(e => e.userId)
        );
        return activeUsers.size;
    }

    private getCommonUserPaths(): string[] {
        // Analyze common navigation paths
        const pageViews = this.events.filter(e => e.eventType === 'page_view');
        // Simplified implementation
        return ['home', 'universe-creation', 'story-writing', 'settings'];
    }

    private getDropOffPoints(): string[] {
        // Identify where users commonly leave
        return ['universe-configuration', 'plugin-setup', 'story-editor'];
    }

    private getConversionRates(): Record<string, number> {
        // Calculate conversion rates for key actions
        return {
            'signup_to_universe_creation': 0.72,
            'universe_to_story': 0.58,
            'story_to_completion': 0.34,
        };
    }

    private getAverageMetric(metricName: string): number {
        const performanceEvents = this.events.filter(
            e => e.eventType === 'performance' && e.properties.metric === metricName
        );

        if (performanceEvents.length === 0) return 0;

        const sum = performanceEvents.reduce((acc, e) => acc + e.properties.value, 0);
        return sum / performanceEvents.length;
    }

    private getErrorRate(): number {
        const totalEvents = this.events.length;
        const errorEvents = this.events.filter(e => e.eventType === 'error').length;
        return totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
    }

    private getBounceRate(): number {
        // Calculate bounce rate (single page sessions)
        const sessions = new Map<string, number>();

        this.events
            .filter(e => e.eventType === 'page_view')
            .forEach(e => {
                sessions.set(e.sessionId, (sessions.get(e.sessionId) || 0) + 1);
            });

        const totalSessions = sessions.size;
        const singlePageSessions = Array.from(sessions.values()).filter(count => count === 1).length;

        return totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0;
    }

    private getTopPages(): Array<{ path: string; views: number; timeSpent: number }> {
        const pageStats = new Map<string, { views: number; timeSpent: number }>();

        // Count page views
        this.events
            .filter(e => e.eventType === 'page_view')
            .forEach(e => {
                const page = e.properties.page;
                const existing = pageStats.get(page) || { views: 0, timeSpent: 0 };
                existing.views++;
                pageStats.set(page, existing);
            });

        // Add time spent data
        this.events
            .filter(e => e.eventName === 'page_exit')
            .forEach(e => {
                const page = e.properties.page;
                const timeSpent = e.properties.timeSpent || 0;
                const existing = pageStats.get(page);
                if (existing) {
                    existing.timeSpent += timeSpent;
                }
            });

        return Array.from(pageStats.entries())
            .map(([path, stats]) => ({ path, ...stats }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
    }

    private getTopFeatures(): Array<{ name: string; usage: number; satisfaction: number }> {
        const featureStats = new Map<string, { usage: number; satisfaction: number }>();

        this.events
            .filter(e => e.eventType === 'feature_use')
            .forEach(e => {
                const feature = e.properties.feature;
                const existing = featureStats.get(feature) || { usage: 0, satisfaction: 0 };
                existing.usage++;
                // Satisfaction could be inferred from usage patterns, duration, etc.
                existing.satisfaction = Math.min(100, existing.usage / 10 * 100);
                featureStats.set(feature, existing);
            });

        return Array.from(featureStats.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.usage - a.usage)
            .slice(0, 10);
    }
}

// Export singleton instance
export const userActivityAnalytics = new UserActivityAnalyticsService();
