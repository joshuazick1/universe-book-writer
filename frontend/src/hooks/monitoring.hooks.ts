/**
 * Monitoring Hooks
 * 
 * React hooks for integrating error tracking and performance monitoring
 * into React components and applications.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { errorTracker, ErrorEvent, ErrorMetrics } from '../services/error-tracking.service.js';
import { performanceMonitor, PerformanceMetric, PerformanceReport } from '../services/performance-monitoring.service.js';

/**
 * Hook for error tracking integration
 */
export function useErrorTracking() {
    const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
    const [recentErrors, setRecentErrors] = useState<ErrorEvent[]>([]);

    useEffect(() => {
        // Subscribe to error events
        const unsubscribeErrors = errorTracker.onError((error) => {
            setRecentErrors(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors
        });

        // Subscribe to metrics updates
        const unsubscribeMetrics = errorTracker.onMetricsUpdate((newMetrics) => {
            setMetrics(newMetrics);
        });

        // Initial metrics load
        setMetrics(errorTracker.getMetrics());

        return () => {
            unsubscribeErrors();
            unsubscribeMetrics();
        };
    }, []);

    const trackError = useCallback((errorData: Partial<ErrorEvent>) => {
        return errorTracker.trackError(errorData);
    }, []);

    const trackApiError = useCallback((endpoint: string, status: number, message: string, response?: any) => {
        return errorTracker.trackApiError(endpoint, status, message, response);
    }, []);

    const trackPluginError = useCallback((pluginName: string, operation: string, message: string, context?: Record<string, any>) => {
        return errorTracker.trackPluginError(pluginName, operation, message, context);
    }, []);

    const trackAuthError = useCallback((operation: string, message: string, context?: Record<string, any>) => {
        return errorTracker.trackAuthError(operation, message, context);
    }, []);

    const trackSecurityEvent = useCallback((eventType: string, message: string, context?: Record<string, any>) => {
        return errorTracker.trackSecurityEvent(eventType, message, context);
    }, []);

    const resolveError = useCallback((errorId: string) => {
        return errorTracker.resolveError(errorId);
    }, []);

    return {
        metrics,
        recentErrors,
        trackError,
        trackApiError,
        trackPluginError,
        trackAuthError,
        trackSecurityEvent,
        resolveError,
    };
}

/**
 * Hook for performance monitoring integration
 */
export function usePerformanceMonitoring() {
    const [report, setReport] = useState<PerformanceReport | null>(null);
    const [recentMetrics, setRecentMetrics] = useState<PerformanceMetric[]>([]);

    useEffect(() => {
        // Subscribe to performance metrics
        const unsubscribe = performanceMonitor.onMetric((metric) => {
            setRecentMetrics(prev => [metric, ...prev.slice(0, 19)]); // Keep last 20 metrics
        });

        // Generate initial report
        setReport(performanceMonitor.getPerformanceReport());

        // Update report every 30 seconds
        const interval = setInterval(() => {
            setReport(performanceMonitor.getPerformanceReport());
        }, 30000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const trackPageLoad = useCallback((pageName: string, duration: number, metadata?: Record<string, any>) => {
        return performanceMonitor.trackPageLoad(pageName, duration, metadata);
    }, []);

    const trackApiCall = useCallback((endpoint: string, method: string, duration: number, status?: number) => {
        return performanceMonitor.trackApiCall(endpoint, method, duration, status);
    }, []);

    const trackUserInteraction = useCallback((interactionType: string, duration: number, metadata?: Record<string, any>) => {
        return performanceMonitor.trackUserInteraction(interactionType, duration, metadata);
    }, []);

    const trackCustomMetric = useCallback((name: string, duration: number, metadata?: Record<string, any>) => {
        return performanceMonitor.trackCustomMetric(name, duration, metadata);
    }, []);

    const startMeasurement = useCallback((name: string) => {
        return performanceMonitor.startMeasurement(name);
    }, []);

    return {
        report,
        recentMetrics,
        trackPageLoad,
        trackApiCall,
        trackUserInteraction,
        trackCustomMetric,
        startMeasurement,
    };
}

/**
 * Hook for tracking API calls with automatic performance and error monitoring
 */
export function useApiTracking() {
    const { trackApiError } = useErrorTracking();
    const { trackApiCall } = usePerformanceMonitoring();

    const trackApiRequest = useCallback(async <T>(
        endpoint: string,
        method: string,
        requestFn: () => Promise<T>
    ): Promise<T> => {
        const startTime = performance.now();

        try {
            const result = await requestFn();
            const duration = performance.now() - startTime;
            trackApiCall(endpoint, method, duration, 200);
            return result;
        } catch (error: any) {
            const duration = performance.now() - startTime;
            const status = error.status || 500;
            trackApiCall(endpoint, method, duration, status);
            trackApiError(endpoint, status, error.message || 'Unknown API error', error);
            throw error;
        }
    }, [trackApiError, trackApiCall]);

    return { trackApiRequest };
}

/**
 * Hook for tracking component performance
 */
export function useComponentPerformance(componentName: string) {
    const { trackCustomMetric } = usePerformanceMonitoring();
    const renderStartTime = useRef(performance.now());
    const mountTime = useRef<number | null>(null);

    useEffect(() => {
        // Track mount time
        mountTime.current = performance.now() - renderStartTime.current;
        trackCustomMetric(`${componentName}-mount`, mountTime.current, {
            componentName,
            type: 'mount',
        });

        return () => {
            // Track total component lifetime
            const lifetime = performance.now() - renderStartTime.current;
            trackCustomMetric(`${componentName}-lifetime`, lifetime, {
                componentName,
                type: 'lifetime',
            });
        };
    }, [componentName, trackCustomMetric]);

    const trackRender = useCallback((renderType: 'initial' | 'update' = 'update') => {
        const renderTime = performance.now() - renderStartTime.current;
        trackCustomMetric(`${componentName}-render`, renderTime, {
            componentName,
            type: 'render',
            renderType,
        });
        renderStartTime.current = performance.now();
    }, [componentName, trackCustomMetric]);

    const trackInteraction = useCallback((interactionName: string, duration: number) => {
        trackCustomMetric(`${componentName}-${interactionName}`, duration, {
            componentName,
            type: 'interaction',
            interaction: interactionName,
        });
    }, [componentName, trackCustomMetric]);

    return {
        trackRender,
        trackInteraction,
        mountTime: mountTime.current,
    };
}

/**
 * Hook for tracking user interactions with performance monitoring
 */
export function useInteractionTracking() {
    const { trackUserInteraction } = usePerformanceMonitoring();

    const trackClick = useCallback((elementName: string, metadata?: Record<string, any>) => {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            trackUserInteraction(`click-${elementName}`, duration, {
                ...metadata,
                type: 'click',
                element: elementName,
            });
        };
    }, [trackUserInteraction]);

    const trackFormSubmit = useCallback((formName: string, metadata?: Record<string, any>) => {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            trackUserInteraction(`form-submit-${formName}`, duration, {
                ...metadata,
                type: 'form-submit',
                form: formName,
            });
        };
    }, [trackUserInteraction]);

    const trackPageNavigation = useCallback((fromPage: string, toPage: string) => {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            trackUserInteraction(`navigation-${fromPage}-to-${toPage}`, duration, {
                type: 'navigation',
                fromPage,
                toPage,
            });
        };
    }, [trackUserInteraction]);

    return {
        trackClick,
        trackFormSubmit,
        trackPageNavigation,
    };
}

/**
 * Hook for plugin performance monitoring
 */
export function usePluginMonitoring(pluginName: string) {
    const { trackPluginError } = useErrorTracking();
    const { trackCustomMetric } = usePerformanceMonitoring();

    const trackPluginLoad = useCallback((duration: number, metadata?: Record<string, any>) => {
        trackCustomMetric(`plugin-load-${pluginName}`, duration, {
            ...metadata,
            pluginName,
            type: 'plugin-load',
        });
    }, [pluginName, trackCustomMetric]);

    const trackPluginOperation = useCallback((operation: string, duration: number, metadata?: Record<string, any>) => {
        trackCustomMetric(`plugin-${pluginName}-${operation}`, duration, {
            ...metadata,
            pluginName,
            operation,
            type: 'plugin-operation',
        });
    }, [pluginName, trackCustomMetric]);
    const trackError = useCallback((operation: string, message: string, context?: Record<string, any>) => {
        return trackPluginError(pluginName, operation, message, context);
    }, [pluginName, trackPluginError]);

    const measurePluginOperation = useCallback((operationName: string) => {
        const startTime = performance.now();

        return {
            finish: (metadata?: Record<string, any>) => {
                const duration = performance.now() - startTime;
                trackPluginOperation(operationName, duration, metadata);
                return duration;
            },
            error: (message: string, context?: Record<string, any>) => {
                const duration = performance.now() - startTime;
                trackError(operationName, message, { ...context, duration });
                return duration;
            }
        };
    }, [trackPluginOperation, trackError]);

    return {
        trackPluginLoad,
        trackPluginOperation,
        trackError,
        measurePluginOperation,
    };
}

/**
 * Hook for monitoring the entire application
 */
export function useApplicationMonitoring() {
    const errorTracking = useErrorTracking();
    const performanceMonitoring = usePerformanceMonitoring();

    // Overall health status
    const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');

    useEffect(() => {
        const checkHealth = () => {
            const { metrics } = errorTracking;
            const { report } = performanceMonitoring;

            if (!metrics || !report) {
                setHealthStatus('healthy');
                return;
            }

            // Check for critical errors
            const criticalErrors = metrics.errorsBySeverity.critical || 0;
            const highErrors = metrics.errorsBySeverity.high || 0;

            // Check performance issues
            const avgPageLoad = report.pageLoadTime;
            const slowQueries = report.slowQueries.length;

            if (criticalErrors > 0 || avgPageLoad > 5000 || slowQueries > 10) {
                setHealthStatus('critical');
            } else if (highErrors > 5 || avgPageLoad > 3000 || slowQueries > 5) {
                setHealthStatus('warning');
            } else {
                setHealthStatus('healthy');
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [errorTracking.metrics, performanceMonitoring.report]);

    return {
        ...errorTracking,
        ...performanceMonitoring,
        healthStatus,
    };
}
