/**
 * User Activity Analytics Hooks
 * 
 * React hooks for tracking user behavior and accessing analytics data.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { userActivityAnalytics, type UserAnalyticsDashboard, type FeatureUsageMetrics, type UserBehaviorPattern } from '../services/user-activity-analytics.service.js';

// Mock auth hook for now - will be replaced with actual auth hook
const useAuth = () => ({ user: { id: 'test-user' } });

/**
 * Hook to initialize user activity tracking
 */
export function useActivityTracking() {
    const { user } = useAuth();
    const initialized = useRef(false);

    useEffect(() => {
        if (user?.id && !initialized.current) {
            userActivityAnalytics.initializeUser(user.id);
            initialized.current = true;
        }
    }, [user?.id]);

    const trackPageView = useCallback((page: string, title?: string) => {
        userActivityAnalytics.trackPageView(page, title);
    }, []);

    const trackFeatureUsage = useCallback((
        featureName: string,
        action: string,
        properties: Record<string, any> = {},
        duration?: number
    ) => {
        userActivityAnalytics.trackFeatureUsage(featureName, action, properties, duration);
    }, []);

    const trackInteraction = useCallback((
        element: string,
        interactionType: 'click' | 'hover' | 'scroll' | 'input' | 'drag',
        properties: Record<string, any> = {}
    ) => {
        userActivityAnalytics.trackInteraction(element, interactionType, properties);
    }, []);

    const trackConversion = useCallback((
        goal: string,
        value?: number,
        properties: Record<string, any> = {}
    ) => {
        userActivityAnalytics.trackConversion(goal, value, properties);
    }, []);

    const trackError = useCallback((
        error: Error | string,
        context: Record<string, any> = {}
    ) => {
        userActivityAnalytics.trackError(error, context);
    }, []);

    const trackPerformance = useCallback((
        metric: string,
        value: number,
        properties: Record<string, any> = {}
    ) => {
        userActivityAnalytics.trackPerformance(metric, value, properties);
    }, []);

    return {
        trackPageView,
        trackFeatureUsage,
        trackInteraction,
        trackConversion,
        trackError,
        trackPerformance,
    };
}

/**
 * Hook to automatically track page views
 */
export function usePageTracking(page: string, title?: string) {
    const { trackPageView } = useActivityTracking();

    useEffect(() => {
        trackPageView(page, title);
    }, [page, title, trackPageView]);
}

/**
 * Hook to track feature usage with timing
 */
export function useFeatureTracking(featureName: string) {
    const { trackFeatureUsage } = useActivityTracking();
    const startTime = useRef<number | null>(null);

    const startTracking = useCallback((action: string, properties: Record<string, any> = {}) => {
        startTime.current = Date.now();
        trackFeatureUsage(featureName, `${action}_start`, properties);
    }, [featureName, trackFeatureUsage]);

    const endTracking = useCallback((action: string, properties: Record<string, any> = {}) => {
        const duration = startTime.current ? Date.now() - startTime.current : undefined;
        trackFeatureUsage(featureName, `${action}_end`, properties, duration);
        startTime.current = null;
    }, [featureName, trackFeatureUsage]);

    const trackUsage = useCallback((action: string, properties: Record<string, any> = {}) => {
        trackFeatureUsage(featureName, action, properties);
    }, [featureName, trackFeatureUsage]);

    return {
        startTracking,
        endTracking,
        trackUsage,
    };
}

/**
 * Hook to track user interactions with automatic event handling
 */
export function useInteractionTracking(elementName: string) {
    const { trackInteraction } = useActivityTracking();

    const trackClick = useCallback((properties: Record<string, any> = {}) => {
        trackInteraction(elementName, 'click', properties);
    }, [elementName, trackInteraction]);

    const trackHover = useCallback((properties: Record<string, any> = {}) => {
        trackInteraction(elementName, 'hover', properties);
    }, [elementName, trackInteraction]);

    const trackInput = useCallback((value: any, properties: Record<string, any> = {}) => {
        trackInteraction(elementName, 'input', { value, ...properties });
    }, [elementName, trackInteraction]);

    const trackScroll = useCallback((scrollPosition: number, properties: Record<string, any> = {}) => {
        trackInteraction(elementName, 'scroll', { scrollPosition, ...properties });
    }, [elementName, trackInteraction]);

    const trackDrag = useCallback((dragData: any, properties: Record<string, any> = {}) => {
        trackInteraction(elementName, 'drag', { dragData, ...properties });
    }, [elementName, trackInteraction]);

    // Return event handlers for easy binding
    const handlers = {
        onClick: () => trackClick(),
        onMouseEnter: () => trackHover(),
        onInput: (e: any) => trackInput(e.target.value),
        onScroll: (e: any) => trackScroll(e.target.scrollTop),
        onDragStart: (e: any) => trackDrag({ type: 'start', dataTransfer: e.dataTransfer }),
        onDragEnd: (e: any) => trackDrag({ type: 'end' }),
    };

    return {
        trackClick,
        trackHover,
        trackInput,
        trackScroll,
        trackDrag,
        handlers,
    };
}

/**
 * Hook to track conversion funnels
 */
export function useConversionTracking() {
    const { trackConversion } = useActivityTracking();

    const trackSignup = useCallback((properties: Record<string, any> = {}) => {
        trackConversion('user_signup', 1, properties);
    }, [trackConversion]);

    const trackUniverseCreation = useCallback((universeType: string, properties: Record<string, any> = {}) => {
        trackConversion('universe_creation', 1, { universeType, ...properties });
    }, [trackConversion]);

    const trackStoryCreation = useCallback((storyType: string, properties: Record<string, any> = {}) => {
        trackConversion('story_creation', 1, { storyType, ...properties });
    }, [trackConversion]);

    const trackPluginActivation = useCallback((pluginName: string, properties: Record<string, any> = {}) => {
        trackConversion('plugin_activation', 1, { pluginName, ...properties });
    }, [trackConversion]);

    const trackFeatureAdoption = useCallback((featureName: string, properties: Record<string, any> = {}) => {
        trackConversion('feature_adoption', 1, { featureName, ...properties });
    }, [trackConversion]);

    return {
        trackSignup,
        trackUniverseCreation,
        trackStoryCreation,
        trackPluginActivation,
        trackFeatureAdoption,
    };
}

/**
 * Hook to access analytics dashboard data (admin only)
 */
export function useAnalyticsDashboard() {
    const getDashboardData = useCallback((): UserAnalyticsDashboard => {
        return userActivityAnalytics.getAnalyticsDashboard();
    }, []);

    const getFeatureMetrics = useCallback((): FeatureUsageMetrics[] => {
        return userActivityAnalytics.getFeatureUsageMetrics();
    }, []);

    const getUserBehaviorPattern = useCallback((userId: string): UserBehaviorPattern | null => {
        return userActivityAnalytics.getUserBehaviorPattern(userId);
    }, []);

    const clearUserData = useCallback((userId: string): void => {
        userActivityAnalytics.clearUserData(userId);
    }, []);

    const exportUserData = useCallback((userId: string) => {
        return userActivityAnalytics.exportUserData(userId);
    }, []);

    return {
        getDashboardData,
        getFeatureMetrics,
        getUserBehaviorPattern,
        clearUserData,
        exportUserData,
    };
}

/**
 * Hook to track performance metrics
 */
export function usePerformanceTracking() {
    const { trackPerformance } = useActivityTracking();

    const trackPageLoad = useCallback((loadTime: number, properties: Record<string, any> = {}) => {
        trackPerformance('page_load_time', loadTime, properties);
    }, [trackPerformance]);

    const trackApiCall = useCallback((endpoint: string, duration: number, status: number) => {
        trackPerformance('api_call_time', duration, { endpoint, status });
    }, [trackPerformance]);

    const trackRenderTime = useCallback((component: string, renderTime: number) => {
        trackPerformance('render_time', renderTime, { component });
    }, [trackPerformance]);

    const trackBundleSize = useCallback((bundleName: string, size: number) => {
        trackPerformance('bundle_size', size, { bundleName });
    }, [trackPerformance]);

    const trackMemoryUsage = useCallback((usage: number, properties: Record<string, any> = {}) => {
        trackPerformance('memory_usage', usage, properties);
    }, [trackPerformance]);

    return {
        trackPageLoad,
        trackApiCall,
        trackRenderTime,
        trackBundleSize,
        trackMemoryUsage,
    };
}

/**
 * Hook to track errors with context
 */
export function useErrorTracking() {
    const { trackError } = useActivityTracking();

    const trackComponentError = useCallback((
        error: Error,
        component: string,
        props?: Record<string, any>
    ) => {
        trackError(error, {
            type: 'component_error',
            component,
            props,
            timestamp: Date.now(),
        });
    }, [trackError]);

    const trackApiError = useCallback((
        error: Error | string,
        endpoint: string,
        status?: number,
        response?: any
    ) => {
        trackError(error, {
            type: 'api_error',
            endpoint,
            status,
            response,
            timestamp: Date.now(),
        });
    }, [trackError]);

    const trackValidationError = useCallback((
        field: string,
        value: any,
        validationRule: string,
        message: string
    ) => {
        trackError(message, {
            type: 'validation_error',
            field,
            value,
            validationRule,
            timestamp: Date.now(),
        });
    }, [trackError]);

    const trackUserError = useCallback((
        action: string,
        error: string,
        context: Record<string, any> = {}
    ) => {
        trackError(error, {
            type: 'user_error',
            action,
            ...context,
            timestamp: Date.now(),
        });
    }, [trackError]);

    return {
        trackComponentError,
        trackApiError,
        trackValidationError,
        trackUserError,
    };
}

/**
 * HOC to automatically track component mounting and usage
 */
export function withActivityTracking<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName: string
) {
    return function TrackedComponent(props: P) {
        const { trackFeatureUsage } = useActivityTracking();

        useEffect(() => {
            trackFeatureUsage(componentName, 'mount');

            return () => {
                trackFeatureUsage(componentName, 'unmount');
            };
        }, [trackFeatureUsage]);

        return React.createElement(WrappedComponent, props);
    };
}
