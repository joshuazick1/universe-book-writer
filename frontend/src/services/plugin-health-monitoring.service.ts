/**
 * Plugin Health Monitoring Service
 * 
 * Monitors plugin loading, activation, runtime health, and performance metrics.
 * Integrates with the existing error tracking and performance monitoring systems.
 */

import { errorTracker } from './error-tracking.service.js';
import { performanceMonitor } from './performance-monitoring.service.js';
import { pluginService, type PluginInfo } from './plugin.service.js';

export interface PluginHealthMetric {
    id: string;
    timestamp: number;
    pluginName: string;
    status: 'healthy' | 'warning' | 'critical' | 'offline';
    loadTime: number;
    memoryUsage: number;
    errorCount: number;
    lastError?: string;
    lastErrorTime?: number;
    uptime: number;
    activeFeatures: string[];
    performance: {
        avgResponseTime: number;
        slowOperations: number;
        resourceUsage: number;
    };
}

export interface PluginLoadEvent {
    pluginName: string;
    startTime: number;
    endTime: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
    dependencies?: string[];
    features?: string[];
}

export interface PluginErrorEvent {
    pluginName: string;
    operation: string;
    errorMessage: string;
    timestamp: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    stackTrace?: string;
}

export interface PluginPerformanceEvent {
    pluginName: string;
    operation: string;
    duration: number;
    timestamp: number;
    resourceUsage?: {
        memory: number;
        cpu: number;
    };
    metadata?: Record<string, any>;
}

export interface PluginHealthReport {
    timestamp: number;
    totalPlugins: number;
    activePlugins: number;
    healthyPlugins: number;
    warningPlugins: number;
    criticalPlugins: number;
    offlinePlugins: number;
    totalLoadTime: number;
    avgLoadTime: number;
    totalMemoryUsage: number;
    totalErrors: number;
    slowestPlugin?: string;
    mostErrorPronePlugin?: string;
    plugins: PluginHealthMetric[];
}

class PluginHealthMonitoringService {
    private pluginMetrics = new Map<string, PluginHealthMetric>();
    private loadEvents: PluginLoadEvent[] = [];
    private errorEvents: PluginErrorEvent[] = [];
    private performanceEvents: PluginPerformanceEvent[] = [];
    private listeners = new Set<(report: PluginHealthReport) => void>();
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private isMonitoring = false;

    constructor() {
        this.startMonitoring();
    }

    /**
     * Start plugin health monitoring
     */
    public startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Health check every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);

        // Initial health check
        this.performHealthCheck();
    }
    /**
     * Stop plugin health monitoring
     */
    public stopMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.isMonitoring = false;
    }

    /**
     * Reset all plugin health data (for testing)
     */
    public resetData(): void {
        this.pluginMetrics.clear();
        this.loadEvents = [];
        this.errorEvents = [];
        this.performanceEvents = [];
        this.listeners.clear();
    }

    /**
     * Track plugin loading event
     */
    public trackPluginLoad(event: Omit<PluginLoadEvent, 'duration'>): void {
        const fullEvent: PluginLoadEvent = {
            ...event,
            duration: event.endTime - event.startTime,
        };

        this.loadEvents.push(fullEvent);
        this.loadEvents = this.loadEvents.slice(-100); // Keep last 100 events

        // Update plugin metric
        this.updatePluginMetric(event.pluginName, (metric) => ({
            ...metric,
            loadTime: fullEvent.duration,
            status: fullEvent.success ? 'healthy' : 'critical',
        }));

        // Track with performance monitor
        performanceMonitor.trackCustomMetric(
            `plugin-load-${event.pluginName}`,
            fullEvent.duration,
            {
                pluginName: event.pluginName,
                success: fullEvent.success,
                dependencies: fullEvent.dependencies,
                features: fullEvent.features,
            }
        );

        // Track errors if load failed
        if (!fullEvent.success && fullEvent.errorMessage) {
            this.trackPluginError({
                pluginName: event.pluginName,
                operation: 'load',
                errorMessage: fullEvent.errorMessage,
                timestamp: Date.now(),
                severity: 'critical',
            });
        }

        this.notifyListeners();
    }
    /**
     * Track plugin error event
     */
    public trackPluginError(event: PluginErrorEvent): void {
        this.errorEvents.push(event);
        this.errorEvents = this.errorEvents.slice(-500); // Keep last 500 errors

        // Update plugin metric first
        this.updatePluginMetric(event.pluginName, (metric) => ({
            ...metric,
            errorCount: metric.errorCount + 1,
            lastError: event.errorMessage,
            lastErrorTime: event.timestamp,
        }));

        // Then calculate and update status
        this.updatePluginMetric(event.pluginName, (metric) => ({
            ...metric,
            status: this.calculatePluginStatus(event.pluginName),
        }));

        // Track with error tracker
        errorTracker.trackPluginError(
            event.pluginName,
            event.operation,
            event.errorMessage,
            {
                severity: event.severity,
                context: event.context,
                stackTrace: event.stackTrace,
            }
        );

        this.notifyListeners();
    }

    /**
     * Track plugin performance event
     */
    public trackPluginPerformance(event: PluginPerformanceEvent): void {
        this.performanceEvents.push(event);
        this.performanceEvents = this.performanceEvents.slice(-1000); // Keep last 1000 events

        // Update plugin metric
        this.updatePluginMetric(event.pluginName, (metric) => {
            const recentEvents = this.performanceEvents
                .filter(e => e.pluginName === event.pluginName)
                .slice(-10);

            const avgResponseTime = recentEvents.reduce((sum, e) => sum + e.duration, 0) / recentEvents.length;
            const slowOperations = recentEvents.filter(e => e.duration > 1000).length;

            return {
                ...metric,
                performance: {
                    avgResponseTime,
                    slowOperations,
                    resourceUsage: event.resourceUsage?.memory || 0,
                },
                status: this.calculatePluginStatus(event.pluginName),
            };
        });

        // Track with performance monitor
        performanceMonitor.trackCustomMetric(
            `plugin-${event.pluginName}-${event.operation}`,
            event.duration,
            {
                pluginName: event.pluginName,
                operation: event.operation,
                resourceUsage: event.resourceUsage,
                metadata: event.metadata,
            }
        );

        this.notifyListeners();
    }

    /**
     * Get current plugin health report
     */
    public getHealthReport(): PluginHealthReport {
        const plugins = Array.from(this.pluginMetrics.values());
        const totalPlugins = plugins.length;
        const activePlugins = plugins.filter(p => p.status !== 'offline').length;
        const healthyPlugins = plugins.filter(p => p.status === 'healthy').length;
        const warningPlugins = plugins.filter(p => p.status === 'warning').length;
        const criticalPlugins = plugins.filter(p => p.status === 'critical').length;
        const offlinePlugins = plugins.filter(p => p.status === 'offline').length;

        const totalLoadTime = plugins.reduce((sum, p) => sum + p.loadTime, 0);
        const avgLoadTime = totalPlugins > 0 ? totalLoadTime / totalPlugins : 0;
        const totalMemoryUsage = plugins.reduce((sum, p) => sum + p.memoryUsage, 0);
        const totalErrors = plugins.reduce((sum, p) => sum + p.errorCount, 0);

        const slowestPlugin = plugins.reduce((slowest, current) =>
            current.loadTime > (slowest?.loadTime || 0) ? current : slowest,
            plugins[0]
        )?.pluginName;

        const mostErrorPronePlugin = plugins.reduce((mostErrors, current) =>
            current.errorCount > (mostErrors?.errorCount || 0) ? current : mostErrors,
            plugins[0]
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
            plugins,
        };
    }

    /**
     * Subscribe to health report updates
     */
    public onHealthUpdate(listener: (report: PluginHealthReport) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Get plugin-specific metrics
     */
    public getPluginMetrics(pluginName: string): PluginHealthMetric | null {
        return this.pluginMetrics.get(pluginName) || null;
    }

    /**
     * Get plugin load events
     */
    public getLoadEvents(pluginName?: string): PluginLoadEvent[] {
        if (pluginName) {
            return this.loadEvents.filter(e => e.pluginName === pluginName);
        }
        return [...this.loadEvents];
    }

    /**
     * Get plugin error events
     */
    public getErrorEvents(pluginName?: string): PluginErrorEvent[] {
        if (pluginName) {
            return this.errorEvents.filter(e => e.pluginName === pluginName);
        }
        return [...this.errorEvents];
    }

    /**
     * Get plugin performance events
     */
    public getPerformanceEvents(pluginName?: string): PluginPerformanceEvent[] {
        if (pluginName) {
            return this.performanceEvents.filter(e => e.pluginName === pluginName);
        }
        return [...this.performanceEvents];
    }

    /**
     * Force health check for all plugins
     */
    public async forceHealthCheck(): Promise<void> {
        await this.performHealthCheck();
    }

    /**
     * Perform health check for all plugins
     */
    private async performHealthCheck(): Promise<void> {
        try {
            const response = await pluginService.getPlugins();

            if (response.success && response.data) {
                const currentTime = Date.now();

                // Update metrics for all plugins
                for (const plugin of response.data) {
                    this.updatePluginFromApiResponse(plugin, currentTime);
                }

                // Mark missing plugins as offline
                const activePluginNames = new Set(response.data.map(p => p.name));
                for (const [pluginName, metric] of this.pluginMetrics.entries()) {
                    if (!activePluginNames.has(pluginName)) {
                        this.updatePluginMetric(pluginName, (m) => ({
                            ...m,
                            status: 'offline',
                        }));
                    }
                }

                this.notifyListeners();
            }
        } catch (error) {
            console.error('Plugin health check failed:', error);

            // Track the health check failure
            errorTracker.trackError({
                message: 'Plugin health check failed',
                severity: 'medium',
                context: { error: error instanceof Error ? error.message : 'Unknown error' },
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Update plugin metric from API response
     */
    private updatePluginFromApiResponse(plugin: PluginInfo, timestamp: number): void {
        const existingMetric = this.pluginMetrics.get(plugin.name);

        const metric: PluginHealthMetric = {
            id: `plugin-${plugin.name}-${timestamp}`,
            timestamp,
            pluginName: plugin.name,
            status: plugin.state === 'active' ? 'healthy' : 'offline',
            loadTime: existingMetric?.loadTime || 0,
            memoryUsage: existingMetric?.memoryUsage || 0,
            errorCount: existingMetric?.errorCount || 0,
            lastError: existingMetric?.lastError,
            lastErrorTime: existingMetric?.lastErrorTime,
            uptime: existingMetric?.uptime || 0,
            activeFeatures: existingMetric?.activeFeatures || [],
            performance: existingMetric?.performance || {
                avgResponseTime: 0,
                slowOperations: 0,
                resourceUsage: 0,
            },
        };

        this.pluginMetrics.set(plugin.name, metric);
    }

    /**
     * Update plugin metric with a function
     */
    private updatePluginMetric(
        pluginName: string,
        updater: (metric: PluginHealthMetric) => PluginHealthMetric
    ): void {
        const existing = this.pluginMetrics.get(pluginName) || this.createDefaultMetric(pluginName);
        const updated = updater(existing);
        this.pluginMetrics.set(pluginName, updated);
    }

    /**
     * Create default metric for a plugin
     */
    private createDefaultMetric(pluginName: string): PluginHealthMetric {
        return {
            id: `plugin-${pluginName}-${Date.now()}`,
            timestamp: Date.now(),
            pluginName,
            status: 'offline',
            loadTime: 0,
            memoryUsage: 0,
            errorCount: 0,
            uptime: 0,
            activeFeatures: [],
            performance: {
                avgResponseTime: 0,
                slowOperations: 0,
                resourceUsage: 0,
            },
        };
    }
    /**
     * Calculate plugin status based on recent activity
     */
    private calculatePluginStatus(pluginName: string): 'healthy' | 'warning' | 'critical' | 'offline' {
        const metric = this.pluginMetrics.get(pluginName);
        if (!metric) return 'offline';

        const recentErrors = this.errorEvents
            .filter(e => e.pluginName === pluginName)
            .filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes

        const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
        const highErrors = recentErrors.filter(e => e.severity === 'high').length;
        const mediumErrors = recentErrors.filter(e => e.severity === 'medium').length;
        const totalErrors = recentErrors.length;

        // Critical if recent critical errors or many recent errors
        if (criticalErrors > 0 || totalErrors > 10) {
            return 'critical';
        }

        // Warning if medium/high errors, some recent errors, or slow performance
        if (highErrors > 0 || mediumErrors > 0 || totalErrors > 3 || metric.performance.avgResponseTime > 2000) {
            return 'warning';
        }

        return 'healthy';
    }

    /**
     * Notify all listeners of health report update
     */
    private notifyListeners(): void {
        if (this.listeners.size === 0) return;

        const report = this.getHealthReport();
        this.listeners.forEach(listener => {
            try {
                listener(report);
            } catch (error) {
                console.error('Plugin health listener error:', error);
            }
        });
    }
}

// Export singleton instance
export const pluginHealthMonitor = new PluginHealthMonitoringService();
