/**
 * User Activity Analytics Tests
 * 
 * Tests for the user activity analytics system.
 */

import type { SpyInstance } from 'jest';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { userActivityAnalytics } from '../../src/services/user-activity-analytics.service.js';

// Mock browser APIs for Node.js environment
Object.defineProperty(global, 'navigator', {
    writable: true,
    value: {
        onLine: true,
        userAgent: 'Mozilla/5.0 (Test Environment)',
    }
});

Object.defineProperty(global, 'window', {
    writable: true,
    value: {
        innerWidth: 1920,
        innerHeight: 1080,
        location: {
            href: 'https://test.example.com/test-page',
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }
});

Object.defineProperty(global, 'document', {
    writable: true,
    value: {
        referrer: 'https://test.example.com/previous-page',
        hidden: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }
});

Object.defineProperty(global, 'Intl', {
    writable: true,
    value: {
        DateTimeFormat: () => ({
            resolvedOptions: () => ({ timeZone: 'America/New_York' })
        })
    }
});

// Mock fetch for the analytics service
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    } as Response)
);

describe('User Activity Analytics Service', () => {
    beforeEach(() => {
        // Reset the service state
        (userActivityAnalytics as any).events = [];
        (userActivityAnalytics as any).pendingEvents = [];
        (userActivityAnalytics as any).userId = null;
        (userActivityAnalytics as any).sessionId = (userActivityAnalytics as any).generateSessionId();
        (userActivityAnalytics as any).currentPage = '';
        (userActivityAnalytics as any).pageStart = Date.now();
        jest.clearAllMocks();
        // Reset Date.now mock if it exists
        if (jest.isMockFunction(Date.now)) {
            (Date.now as jest.MockedFunction<typeof Date.now>).mockRestore();
        }
    });

    afterEach(() => {
        // Clean up any intervals
        if ((userActivityAnalytics as any).flushTimer) {
            clearInterval((userActivityAnalytics as any).flushTimer);
        }
    });

    describe('User Initialization', () => {
        it('should initialize user tracking', () => {
            const userId = 'test-user-123';

            userActivityAnalytics.initializeUser(userId);

            expect((userActivityAnalytics as any).userId).toBe(userId);
            expect((userActivityAnalytics as any).events.length).toBeGreaterThan(0);

            const sessionStartEvent = (userActivityAnalytics as any).events.find(
                (e: any) => e.eventName === 'session_start'
            );
            expect(sessionStartEvent).toBeDefined();
            expect(sessionStartEvent.userId).toBe(userId);
        });
    });

    describe('Page View Tracking', () => {
        let nowMock: SpyInstance<number, []>;
        const baseTime = 1625097600000; // 2021-07-01T00:00:00.000Z

        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
            nowMock = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
        });

        afterEach(() => {
            nowMock.mockRestore();
        });

        it('should track page views', () => {
            const page = '/dashboard';
            const title = 'Dashboard';

            userActivityAnalytics.trackPageView(page, title);

            const events = (userActivityAnalytics as any).events;
            const pageViewEvent = events.find((e: any) => e.eventName === 'page_view');

            expect(pageViewEvent).toBeDefined();
            expect(pageViewEvent.properties.page).toBe(page);
            expect(pageViewEvent.properties.title).toBe(title);
            expect(pageViewEvent.eventType).toBe('page_view');
        });

        it('should track page exit when navigating to new page', () => {
            // Clear any previous events first
            (userActivityAnalytics as any).events = [];
            (userActivityAnalytics as any).currentPage = '';

            // Set initial page
            nowMock.mockReturnValue(baseTime);
            userActivityAnalytics.trackPageView('/page1');

            // Simulate time passing (5 seconds)
            nowMock.mockReturnValue(baseTime + 5000);
            userActivityAnalytics.trackPageView('/page2');

            const events = (userActivityAnalytics as any).events;
            const pageExitEvent = events.find((e: any) => e.eventName === 'page_exit');

            expect(pageExitEvent).toBeDefined();
            expect(pageExitEvent.properties.page).toBe('/page1');
            expect(pageExitEvent.properties.timeSpent).toBe(5000);
        });
    });

    describe('Feature Usage Tracking', () => {
        let nowMock: SpyInstance<number, []>;
        const baseTime = 1625097600000; // 2021-07-01T00:00:00.000Z

        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
            nowMock = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
        });

        afterEach(() => {
            nowMock.mockRestore();
        });

        it('should track feature usage', () => {
            const featureName = 'universe-creator';
            const action = 'create';
            const properties = { universeType: 'star-trek' };
            const duration = 1500;

            userActivityAnalytics.trackFeatureUsage(featureName, action, properties, duration);

            const events = (userActivityAnalytics as any).events;
            const featureEvent = events.find((e: any) => e.eventName === 'feature_use');

            expect(featureEvent).toBeDefined();
            expect(featureEvent.properties.feature).toBe(featureName);
            expect(featureEvent.properties.action).toBe(action);
            expect(featureEvent.properties.universeType).toBe('star-trek');
            expect(featureEvent.properties.duration).toBe(duration);
            expect(featureEvent.eventType).toBe('feature_use');
        });

        it('should calculate feature usage metrics', () => {
            // Track feature usage with specific duration
            const featureName = 'universe-creator';
            const duration = 1000;

            // Set initial time
            nowMock.mockReturnValue(baseTime);
            userActivityAnalytics.trackFeatureUsage(featureName, 'create', { universeType: 'star-trek' }, duration);

            const events = (userActivityAnalytics as any).events;
            const featureEvent = events.find((e: any) => e.eventName === 'feature_use');

            expect(featureEvent).toBeDefined();
            expect(featureEvent.properties.duration).toBe(duration);
        });
    });

    describe('Interaction Tracking', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should track user interactions', () => {
            const element = 'create-universe-button';
            const interactionType = 'click';
            const properties = { position: { x: 100, y: 200 } };

            userActivityAnalytics.trackInteraction(element, interactionType, properties);

            const events = (userActivityAnalytics as any).events;
            const interactionEvent = events.find((e: any) => e.eventName === 'interaction');

            expect(interactionEvent).toBeDefined();
            expect(interactionEvent.properties.element).toBe(element);
            expect(interactionEvent.properties.type).toBe(interactionType);
            expect(interactionEvent.properties.position).toEqual({ x: 100, y: 200 });
            expect(interactionEvent.eventType).toBe('interaction');
        });
    });

    describe('Conversion Tracking', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should track conversion events', () => {
            const goal = 'universe_created';
            const value = 1;
            const properties = { universeType: 'star-wars' };

            userActivityAnalytics.trackConversion(goal, value, properties);

            const events = (userActivityAnalytics as any).events;
            const conversionEvent = events.find((e: any) => e.eventName === 'conversion');

            expect(conversionEvent).toBeDefined();
            expect(conversionEvent.properties.goal).toBe(goal);
            expect(conversionEvent.properties.value).toBe(value);
            expect(conversionEvent.properties.universeType).toBe('star-wars');
        });
    });

    describe('Error Tracking', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should track Error objects', () => {
            const error = new Error('Test error message');
            const context = { component: 'UniverseCreator' };

            userActivityAnalytics.trackError(error, context);

            const events = (userActivityAnalytics as any).events;
            const errorEvent = events.find((e: any) => e.eventName === 'error');

            expect(errorEvent).toBeDefined();
            expect(errorEvent.properties.error).toBe('Test error message');
            expect(errorEvent.properties.stack).toBeDefined();
            expect(errorEvent.properties.context).toEqual(context);
            expect(errorEvent.eventType).toBe('error');
        });

        it('should track string errors', () => {
            const errorMessage = 'String error message';
            const context = { action: 'save-universe' };

            userActivityAnalytics.trackError(errorMessage, context);

            const events = (userActivityAnalytics as any).events;
            const errorEvent = events.find((e: any) => e.eventName === 'error');

            expect(errorEvent).toBeDefined();
            expect(errorEvent.properties.error).toBe(errorMessage);
            expect(errorEvent.properties.stack).toBeUndefined();
            expect(errorEvent.properties.context).toEqual(context);
        });
    });

    describe('Performance Tracking', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should track performance metrics', () => {
            const metric = 'page_load_time';
            const value = 1250;
            const properties = { page: '/dashboard' };

            userActivityAnalytics.trackPerformance(metric, value, properties);

            const events = (userActivityAnalytics as any).events;
            const performanceEvent = events.find((e: any) => e.eventName === 'performance');

            expect(performanceEvent).toBeDefined();
            expect(performanceEvent.properties.metric).toBe(metric);
            expect(performanceEvent.properties.value).toBe(value);
            expect(performanceEvent.properties.page).toBe('/dashboard');
            expect(performanceEvent.eventType).toBe('performance');
        });
    });

    describe('Feature Usage Analytics', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should calculate feature usage metrics', () => {
            // Reset events but don't clear after adding
            (userActivityAnalytics as any).events = [];

            userActivityAnalytics.trackFeatureUsage('universe-creator', 'create', {}, 1000);
            userActivityAnalytics.trackFeatureUsage('universe-creator', 'create', {}, 1500);
            userActivityAnalytics.trackFeatureUsage('story-writer', 'write', {}, 2000);

            // Debug: Check if events have duration
            const events = (userActivityAnalytics as any).events;
            console.log('Events:', events.map(e => ({ eventName: e.eventName, duration: e.duration, properties: e.properties })));

            const metrics = userActivityAnalytics.getFeatureUsageMetrics();
            console.log('Metrics:', metrics);

            const universeCreatorMetric = metrics.find(m => m.featureName === 'universe-creator');
            expect(universeCreatorMetric).toBeDefined();
            expect(universeCreatorMetric!.totalUses).toBe(2);
            expect(universeCreatorMetric!.uniqueUsers).toBe(1);
            // The service now correctly calculates average duration
            // (1000 + 1500) / 2 = 1250
            expect(universeCreatorMetric!.avgDuration).toBe(1250);

            const storyWriterMetric = metrics.find(m => m.featureName === 'story-writer');
            expect(storyWriterMetric).toBeDefined();
            expect(storyWriterMetric!.totalUses).toBe(1);
            expect(storyWriterMetric!.avgDuration).toBe(2000); // Single value: 2000
        });
    });

    describe('User Behavior Pattern', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should analyze user behavior patterns', () => {
            // Clear any previous events
            (userActivityAnalytics as any).events = [];

            userActivityAnalytics.trackFeatureUsage('universe-creator', 'create', {}, 1000);
            userActivityAnalytics.trackFeatureUsage('story-writer', 'write', {}, 2000);
            userActivityAnalytics.trackPageView('/dashboard');
            userActivityAnalytics.trackPageView('/universe');

            // Add a page view event with pageExited property
            (userActivityAnalytics as any).events.push({
                id: 'fake',
                timestamp: Date.now(),
                userId: 'test-user',
                sessionId: 'session',
                eventType: 'page_view',
                eventName: 'page_view',
                properties: { page: '/dashboard', pageExited: true, timeSpent: 5000 },
                metadata: {},
            });

            const pattern = userActivityAnalytics.getUserBehaviorPattern('test-user');
            expect(pattern).toBeDefined();
            expect(pattern!.featuresUsed).toContain('universe-creator');
            expect(pattern!.featuresUsed).toContain('story-writer');
            expect(pattern!.totalTimeSpent).toBe(5000);
        });

        it('should return null for non-existent user', () => {
            const pattern = userActivityAnalytics.getUserBehaviorPattern('non-existent-user');
            expect(pattern).toBeNull();
        });
    });

    describe('Analytics Dashboard', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should generate analytics dashboard data', () => {
            // Simulate various activities
            userActivityAnalytics.trackPageView('/dashboard');
            userActivityAnalytics.trackFeatureUsage('universe-creator', 'create');
            userActivityAnalytics.trackPerformance('page_load_time', 1000);
            userActivityAnalytics.trackError('Test error');

            const dashboard = userActivityAnalytics.getAnalyticsDashboard();

            expect(dashboard).toBeDefined();
            expect(dashboard.timestamp).toBeGreaterThan(0);
            expect(dashboard.activeUsers).toBeDefined();
            expect(dashboard.featureUsage).toBeDefined();
            expect(dashboard.userJourney).toBeDefined();
            expect(dashboard.performance).toBeDefined();
            expect(dashboard.topContent).toBeDefined();

            expect(dashboard.activeUsers.now).toBeGreaterThanOrEqual(0);
            expect(dashboard.featureUsage.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Data Management', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should clear user data', () => {
            const userId = 'test-user';

            // Generate some events
            userActivityAnalytics.trackPageView('/test');
            userActivityAnalytics.trackFeatureUsage('test-feature', 'test');

            expect((userActivityAnalytics as any).events.length).toBeGreaterThan(0);

            userActivityAnalytics.clearUserData(userId);

            const remainingEvents = (userActivityAnalytics as any).events.filter(
                (e: any) => e.userId === userId
            );
            expect(remainingEvents).toHaveLength(0);
        });

        it('should export user data', () => {
            const userId = 'test-user';

            // Generate some events
            userActivityAnalytics.trackPageView('/test');
            userActivityAnalytics.trackFeatureUsage('test-feature', 'test');

            const exportedData = userActivityAnalytics.exportUserData(userId);

            expect(exportedData).toBeDefined();
            expect(exportedData.length).toBeGreaterThan(0);

            exportedData.forEach(event => {
                expect(event.userId).toBe(userId);
                expect(event.id).toBeDefined();
                expect(event.timestamp).toBeDefined();
                expect(event.eventType).toBeDefined();
            });
        });
    });

    describe('Event Metadata', () => {
        beforeEach(() => {
            userActivityAnalytics.initializeUser('test-user');
        });

        it('should include metadata in events', () => {
            userActivityAnalytics.trackPageView('/test');

            const events = (userActivityAnalytics as any).events;
            const pageViewEvent = events.find((e: any) => e.eventName === 'page_view');

            expect(pageViewEvent.metadata).toBeDefined();
            expect(pageViewEvent.metadata.userAgent).toBeDefined();
            expect(pageViewEvent.metadata.viewport).toBe('1920x1080');
            expect(pageViewEvent.metadata.url).toBeDefined();
            expect(pageViewEvent.metadata.referrer).toBeDefined();
        });
    });
});
