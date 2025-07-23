/**
 * Plugin Health Monitoring Hooks
 * 
 * React hooks for integrating plugin health monitoring into components.
 */

import { useEffect, useCallback, useState } from 'react';
import {
    pluginHealthMonitor,
    type PluginHealthReport,
    type PluginHealthMetric,
    type PluginLoadEvent,
    type PluginErrorEvent,
    type PluginPerformanceEvent
} from '../services/plugin-health-monitoring.service.js';

/**
 * Hook for overall plugin health monitoring
 */
export function usePluginHealthMonitoring() {
    const [healthReport, setHealthReport] = useState<PluginHealthReport | null>(null);

    useEffect(() => {
        // Subscribe to health updates
        const unsubscribe = pluginHealthMonitor.onHealthUpdate((report) => {
            setHealthReport(report);
        });

        // Get initial report
        setHealthReport(pluginHealthMonitor.getHealthReport());

        return unsubscribe;
    }, []);

    const forceHealthCheck = useCallback(async () => {
        await pluginHealthMonitor.forceHealthCheck();
    }, []);

    const trackPluginLoad = useCallback((event: Omit<PluginLoadEvent, 'duration'>) => {
        pluginHealthMonitor.trackPluginLoad(event);
    }, []);

    const trackPluginError = useCallback((event: PluginErrorEvent) => {
        pluginHealthMonitor.trackPluginError(event);
    }, []);

    const trackPluginPerformance = useCallback((event: PluginPerformanceEvent) => {
        pluginHealthMonitor.trackPluginPerformance(event);
    }, []);

    return {
        healthReport,
        forceHealthCheck,
        trackPluginLoad,
        trackPluginError,
        trackPluginPerformance,
    };
}

/**
 * Hook for monitoring a specific plugin
 */
export function usePluginMetrics(pluginName: string) {
    const [metrics, setMetrics] = useState<PluginHealthMetric | null>(null);
    const [loadEvents, setLoadEvents] = useState<PluginLoadEvent[]>([]);
    const [errorEvents, setErrorEvents] = useState<PluginErrorEvent[]>([]);
    const [performanceEvents, setPerformanceEvents] = useState<PluginPerformanceEvent[]>([]);

    useEffect(() => {
        const updateMetrics = () => {
            setMetrics(pluginHealthMonitor.getPluginMetrics(pluginName));
            setLoadEvents(pluginHealthMonitor.getLoadEvents(pluginName));
            setErrorEvents(pluginHealthMonitor.getErrorEvents(pluginName));
            setPerformanceEvents(pluginHealthMonitor.getPerformanceEvents(pluginName));
        };

        // Subscribe to health updates
        const unsubscribe = pluginHealthMonitor.onHealthUpdate(() => {
            updateMetrics();
        });

        // Initial update
        updateMetrics();

        return unsubscribe;
    }, [pluginName]);

    const trackLoad = useCallback((event: Omit<PluginLoadEvent, 'pluginName' | 'duration'>) => {
        pluginHealthMonitor.trackPluginLoad({
            ...event,
            pluginName,
        });
    }, [pluginName]);

    const trackError = useCallback((event: Omit<PluginErrorEvent, 'pluginName'>) => {
        pluginHealthMonitor.trackPluginError({
            ...event,
            pluginName,
        });
    }, [pluginName]);

    const trackPerformance = useCallback((event: Omit<PluginPerformanceEvent, 'pluginName'>) => {
        pluginHealthMonitor.trackPluginPerformance({
            ...event,
            pluginName,
        });
    }, [pluginName]);

    return {
        metrics,
        loadEvents,
        errorEvents,
        performanceEvents,
        trackLoad,
        trackError,
        trackPerformance,
    };
}

/**
 * Hook for tracking plugin operations with automatic health monitoring
 */
export function usePluginOperationTracking(pluginName: string) {
    const { trackError, trackPerformance } = usePluginMetrics(pluginName);

    const trackOperation = useCallback(async <T>(
        operationName: string,
        operationFn: () => Promise<T>,
        options?: {
            onError?: (error: Error) => void;
            metadata?: Record<string, any>;
        }
    ): Promise<T> => {
        const startTime = performance.now();

        try {
            const result = await operationFn();
            const duration = performance.now() - startTime;

            trackPerformance({
                operation: operationName,
                duration,
                timestamp: Date.now(),
                metadata: options?.metadata,
            });

            return result;
        } catch (error: any) {
            const duration = performance.now() - startTime;

            trackError({
                operation: operationName,
                errorMessage: error.message || 'Unknown error',
                timestamp: Date.now(),
                severity: 'high',
                context: {
                    duration,
                    metadata: options?.metadata,
                },
                stackTrace: error.stack,
            });

            options?.onError?.(error);
            throw error;
        }
    }, [pluginName, trackError, trackPerformance]);

    const measureOperation = useCallback((operationName: string) => {
        const startTime = performance.now();

        return {
            finish: (metadata?: Record<string, any>) => {
                const duration = performance.now() - startTime;
                trackPerformance({
                    operation: operationName,
                    duration,
                    timestamp: Date.now(),
                    metadata,
                });
                return duration;
            },
            error: (errorMessage: string, context?: Record<string, any>) => {
                const duration = performance.now() - startTime;
                trackError({
                    operation: operationName,
                    errorMessage,
                    timestamp: Date.now(),
                    severity: 'high',
                    context: { ...context, duration },
                });
                return duration;
            }
        };
    }, [trackError, trackPerformance]);

    return {
        trackOperation,
        measureOperation,
    };
}

/**
 * Hook for plugin health status with real-time updates
 */
export function usePluginHealthStatus() {
    const [status, setStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
    const [criticalPlugins, setCriticalPlugins] = useState<string[]>([]);
    const [warningPlugins, setWarningPlugins] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribe = pluginHealthMonitor.onHealthUpdate((report) => {
            // Calculate overall status
            if (report.criticalPlugins > 0) {
                setStatus('critical');
            } else if (report.warningPlugins > 0) {
                setStatus('warning');
            } else {
                setStatus('healthy');
            }

            // Update plugin lists
            setCriticalPlugins(
                report.plugins
                    .filter(p => p.status === 'critical')
                    .map(p => p.pluginName)
            );

            setWarningPlugins(
                report.plugins
                    .filter(p => p.status === 'warning')
                    .map(p => p.pluginName)
            );
        });

        return unsubscribe;
    }, []);

    return {
        status,
        criticalPlugins,
        warningPlugins,
    };
}
