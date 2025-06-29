/**
 * Performance Monitoring Service
 * 
 * Real-time performance metrics collection and monitoring system.
 * Tracks page load times, API response times, user interactions, and resource usage.
 */

// Type definitions for browser APIs that may not be available in all environments
declare global {
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }

    interface Navigator {
        connection?: {
            effectiveType: string;
            downlink: number;
            rtt: number;
        };
    }
}

// Browser-specific performance entry types
interface PerformanceNavigationTimingCompat extends PerformanceEntry {
    navigationStart?: number;
    loadEventEnd?: number;
    domContentLoadedEventEnd?: number;
    domInteractive?: number;
    domComplete?: number;
    responseStart?: number;
}

interface PerformanceEventTimingCompat extends PerformanceEntry {
    processingStart?: number;
}

export interface PerformanceMetric {
    id: string;
    timestamp: number;
    type: 'page-load' | 'api-call' | 'user-interaction' | 'resource-load' | 'custom';
    name: string;
    duration: number;
    metadata?: Record<string, any>;
    tags: string[];
    sessionId: string;
    userId?: string;
}

export interface PerformanceReport {
    pageLoadTime: number;
    apiResponseTimes: { endpoint: string; avgTime: number; count: number }[];
    slowQueries: PerformanceMetric[];
    resourceLoadTimes: { resource: string; avgTime: number; count: number }[];
    userInteractionTimes: { interaction: string; avgTime: number; count: number }[]; memoryUsage?: Performance['memory'];
    connectionInfo?: Navigator['connection'];
    vitals: WebVitals;
}

export interface WebVitals {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
}

export interface PerformanceThresholds {
    pageLoad: number;
    apiResponse: number;
    userInteraction: number;
    resourceLoad: number;
}

class PerformanceMonitoringService {
    private metrics: PerformanceMetric[] = [];
    private maxStoredMetrics = 1000;
    private sessionId: string;
    private thresholds: PerformanceThresholds;
    private observers: Map<string, PerformanceObserver> = new Map();
    private listeners: Array<(metric: PerformanceMetric) => void> = [];
    private vitals: WebVitals = {};
    constructor() {
        this.sessionId = this.generateSessionId();
        this.thresholds = {
            pageLoad: 3000, // 3 seconds
            apiResponse: 1000, // 1 second
            userInteraction: 100, // 100ms
            resourceLoad: 2000, // 2 seconds
        };

        // Only setup browser APIs if we're in a browser environment
        if (this.isBrowserEnvironment()) {
            this.setupPerformanceObservers();
            this.setupNavigationTiming();
            this.setupWebVitals();
        }
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Setup performance observers for different metrics
     */
    private setupPerformanceObservers(): void {
        // Resource timing observer
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.entryType === 'resource') {
                            this.trackResourceLoad(entry as PerformanceResourceTiming);
                        }
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.set('resource', resourceObserver);
            } catch (error) {
                console.warn('Failed to setup resource performance observer:', error);
            }

            // User timing observer
            try {
                const userTimingObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.entryType === 'measure') {
                            this.trackCustomMetric(entry.name, entry.duration, {
                                startTime: entry.startTime,
                                detail: (entry as any).detail,
                            });
                        }
                    });
                });
                userTimingObserver.observe({ entryTypes: ['measure'] });
                this.observers.set('measure', userTimingObserver);
            } catch (error) {
                console.warn('Failed to setup user timing observer:', error);
            }
        }
    }

    /**
     * Setup navigation timing metrics
     */
    private setupNavigationTiming(): void {
        // Wait for page to load
        if (document.readyState === 'complete') {
            this.captureNavigationMetrics();
        } else {
            window.addEventListener('load', () => {
                this.captureNavigationMetrics();
            });
        }
    }

    /**
     * Setup Web Vitals tracking
     */
    private setupWebVitals(): void {
        // This would typically use the web-vitals library
        // For now, we'll implement basic vitals tracking

        // First Contentful Paint
        if ('PerformanceObserver' in window) {
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.name === 'first-contentful-paint') {
                            this.vitals.fcp = entry.startTime;
                        }
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });
                this.observers.set('paint', paintObserver);
            } catch (error) {
                console.warn('Failed to setup paint observer:', error);
            }
        }

        // First Input Delay
        if ('PerformanceEventTiming' in window) {
            try {
                const inputObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        const eventEntry = entry as PerformanceEventTimingCompat;
                        if (eventEntry.processingStart && eventEntry.startTime) {
                            const fid = eventEntry.processingStart - eventEntry.startTime;
                            if (!this.vitals.fid || fid > this.vitals.fid) {
                                this.vitals.fid = fid;
                            }
                        }
                    });
                });
                inputObserver.observe({ entryTypes: ['first-input'] });
                this.observers.set('first-input', inputObserver);
            } catch (error) {
                console.warn('Failed to setup input observer:', error);
            }
        }
    }

  /**
   * Capture navigation timing metrics
   */  private captureNavigationMetrics(): void {
        if (!this.isBrowserEnvironment()) return;

        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTimingCompat;
        if (navigation && navigation.navigationStart && navigation.loadEventEnd) {
            // Page load time
            const pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
            this.trackPageLoad('page-load', pageLoadTime, {
                domContentLoaded: navigation.domContentLoadedEventEnd && navigation.navigationStart ?
                    navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
                domInteractive: navigation.domInteractive && navigation.navigationStart ?
                    navigation.domInteractive - navigation.navigationStart : 0,
                domComplete: navigation.domComplete && navigation.navigationStart ?
                    navigation.domComplete - navigation.navigationStart : 0,
                ttfb: navigation.responseStart && navigation.navigationStart ?
                    navigation.responseStart - navigation.navigationStart : 0,
            });

            // Time to First Byte
            if (navigation.responseStart && navigation.navigationStart) {
                this.vitals.ttfb = navigation.responseStart - navigation.navigationStart;
            }
        }
    }

    /**
     * Track page load performance
     */
    public trackPageLoad(pageName: string, duration: number, metadata?: Record<string, any>): string {
        const metric = this.createMetric({
            type: 'page-load',
            name: pageName,
            duration,
            metadata,
            tags: ['page-load'],
        });

        // Check if it exceeds threshold
        if (duration > this.thresholds.pageLoad) {
            this.reportSlowOperation('page-load', pageName, duration, this.thresholds.pageLoad);
        }

        return metric.id;
    }

    /**
     * Track API call performance
     */
    public trackApiCall(endpoint: string, method: string, duration: number, status?: number): string {
        const metric = this.createMetric({
            type: 'api-call',
            name: `${method} ${endpoint}`,
            duration,
            metadata: {
                endpoint,
                method,
                status,
            },
            tags: ['api', method.toLowerCase(), status ? `status-${status}` : ''],
        });

        // Check if it exceeds threshold
        if (duration > this.thresholds.apiResponse) {
            this.reportSlowOperation('api-call', `${method} ${endpoint}`, duration, this.thresholds.apiResponse);
        }

        return metric.id;
    }

    /**
     * Track user interaction performance
     */
    public trackUserInteraction(interactionType: string, duration: number, metadata?: Record<string, any>): string {
        const metric = this.createMetric({
            type: 'user-interaction',
            name: interactionType,
            duration,
            metadata,
            tags: ['interaction', interactionType.toLowerCase()],
        });

        // Check if it exceeds threshold
        if (duration > this.thresholds.userInteraction) {
            this.reportSlowOperation('user-interaction', interactionType, duration, this.thresholds.userInteraction);
        }

        return metric.id;
    }

    /**
     * Track resource loading performance
     */
    private trackResourceLoad(entry: PerformanceResourceTiming): void {
        const duration = entry.responseEnd - entry.startTime;
        const resourceName = entry.name.split('/').pop() || entry.name;

        this.createMetric({
            type: 'resource-load',
            name: resourceName,
            duration,
            metadata: {
                url: entry.name,
                transferSize: entry.transferSize,
                encodedBodySize: entry.encodedBodySize,
                decodedBodySize: entry.decodedBodySize,
                type: this.getResourceType(entry.name),
            },
            tags: ['resource', this.getResourceType(entry.name)],
        });

        // Check if it exceeds threshold
        if (duration > this.thresholds.resourceLoad) {
            this.reportSlowOperation('resource-load', resourceName, duration, this.thresholds.resourceLoad);
        }
    }

    /**
     * Track custom performance metric
     */
    public trackCustomMetric(name: string, duration: number, metadata?: Record<string, any>): string {
        return this.createMetric({
            type: 'custom',
            name,
            duration,
            metadata,
            tags: ['custom'],
        }).id;
    }
    /**
     * Start a performance measurement
     */
    public startMeasurement(name: string): () => number {
        const startTime = performance.now();
        const markName = `${name}-start`;

        // Only use performance.mark if available (browser environment)
        if (this.isBrowserEnvironment() && typeof performance.mark === 'function') {
            performance.mark(markName);
        }

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            const endMarkName = `${name}-end`;

            // Only use performance.mark/measure if available (browser environment)
            if (this.isBrowserEnvironment() && typeof performance.mark === 'function' && typeof performance.measure === 'function') {
                performance.mark(endMarkName);
                performance.measure(name, markName, endMarkName);
            }

            return duration;
        };
    }

    /**
     * Get performance report
     */
    public getPerformanceReport(): PerformanceReport {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const recentMetrics = this.metrics.filter(metric => now - metric.timestamp < oneHour);

        // Group API calls by endpoint
        const apiMetrics = recentMetrics.filter(m => m.type === 'api-call');
        const apiGroups = this.groupMetricsByName(apiMetrics);
        const apiResponseTimes = Object.entries(apiGroups).map(([endpoint, metrics]) => ({
            endpoint,
            avgTime: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
            count: metrics.length,
        }));

        // Group resources by type
        const resourceMetrics = recentMetrics.filter(m => m.type === 'resource-load');
        const resourceGroups = this.groupMetricsByName(resourceMetrics);
        const resourceLoadTimes = Object.entries(resourceGroups).map(([resource, metrics]) => ({
            resource,
            avgTime: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
            count: metrics.length,
        }));

        // Group interactions
        const interactionMetrics = recentMetrics.filter(m => m.type === 'user-interaction');
        const interactionGroups = this.groupMetricsByName(interactionMetrics);
        const userInteractionTimes = Object.entries(interactionGroups).map(([interaction, metrics]) => ({
            interaction,
            avgTime: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
            count: metrics.length,
        }));

        // Find slow queries
        const slowQueries = recentMetrics
            .filter(m => m.duration > this.getThresholdForType(m.type))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);

        // Get page load time
        const pageLoadMetrics = recentMetrics.filter(m => m.type === 'page-load');
        const pageLoadTime = pageLoadMetrics.length > 0
            ? pageLoadMetrics.reduce((sum, m) => sum + m.duration, 0) / pageLoadMetrics.length
            : 0;

        return {
            pageLoadTime,
            apiResponseTimes,
            slowQueries,
            resourceLoadTimes,
            userInteractionTimes,
            memoryUsage: this.getMemoryUsage(),
            connectionInfo: this.getConnectionInfo(),
            vitals: this.vitals,
        };
    }

    /**
     * Get memory usage information
     */
    private getMemoryUsage(): Performance['memory'] | undefined {
        return (performance as any).memory;
    }

    /**
     * Get connection information
     */
    private getConnectionInfo(): Navigator['connection'] | undefined {
        return (navigator as any).connection;
    }

    /**
     * Create performance metric
     */
    private createMetric(data: Partial<PerformanceMetric>): PerformanceMetric {
        const metric: PerformanceMetric = {
            id: this.generateMetricId(),
            timestamp: Date.now(),
            type: data.type || 'custom',
            name: data.name || 'unknown',
            duration: data.duration || 0,
            metadata: data.metadata || {},
            tags: data.tags || [],
            sessionId: this.sessionId,
            userId: this.getCurrentUserId(),
        };

        // Store metric
        this.metrics.unshift(metric);

        // Maintain storage limit
        if (this.metrics.length > this.maxStoredMetrics) {
            this.metrics = this.metrics.slice(0, this.maxStoredMetrics);
        }

        // Notify listeners
        this.notifyListeners(metric);

        // Send to monitoring service
        this.sendToMonitoringService(metric);

        return metric;
    }

    /**
     * Report slow operation
     */
    private reportSlowOperation(type: string, name: string, duration: number, threshold: number): void {
        // This could integrate with error tracking service
        console.warn(`Slow ${type}: ${name} took ${duration}ms (threshold: ${threshold}ms)`);
    }

    /**
     * Get resource type from URL
     */
    private getResourceType(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        if (!extension) return 'other';

        if (['js', 'mjs', 'ts'].includes(extension)) return 'script';
        if (['css'].includes(extension)) return 'stylesheet';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
        if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) return 'font';
        if (['json', 'xml'].includes(extension)) return 'data';

        return 'other';
    }

    /**
     * Group metrics by name
     */
    private groupMetricsByName(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
        return metrics.reduce((groups, metric) => {
            if (!groups[metric.name]) {
                groups[metric.name] = [];
            }
            groups[metric.name].push(metric);
            return groups;
        }, {} as Record<string, PerformanceMetric[]>);
    }

    /**
     * Get threshold for metric type
     */
    private getThresholdForType(type: string): number {
        switch (type) {
            case 'page-load': return this.thresholds.pageLoad;
            case 'api-call': return this.thresholds.apiResponse;
            case 'user-interaction': return this.thresholds.userInteraction;
            case 'resource-load': return this.thresholds.resourceLoad;
            default: return 1000;
        }
    }

    /**
     * Generate unique metric ID
     */
    private generateMetricId(): string {
        return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current user ID
     */
    private getCurrentUserId(): string | undefined {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id;
        } catch {
            return undefined;
        }
    }

    /**
     * Notify performance listeners
     */
    private notifyListeners(metric: PerformanceMetric): void {
        this.listeners.forEach(listener => {
            try {
                listener(metric);
            } catch (error) {
                console.error('Error in performance listener:', error);
            }
        });
    }

    /**
     * Send metric to monitoring service
     */
    private async sendToMonitoringService(metric: PerformanceMetric): Promise<void> {
        if (process.env.NODE_ENV !== 'production' && !process.env.VITE_ENABLE_PERFORMANCE_TRACKING) {
            return;
        }

        try {
            await fetch('/api/performance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metric),
            });
        } catch (error) {
            console.warn('Failed to send performance metric:', error);
        }
    }

    /**
     * Subscribe to performance metrics
     */
    public onMetric(listener: (metric: PerformanceMetric) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Update performance thresholds
     */
    public updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }

    /**
     * Clear old metrics
     */
    public clearOldMetrics(olderThanMs = 24 * 60 * 60 * 1000): number {
        const cutoff = Date.now() - olderThanMs;
        const initialCount = this.metrics.length;
        this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
        return initialCount - this.metrics.length;
    }

    /**
     * Disconnect all observers
     */
    public disconnect(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }

    /**
     * Check if we're running in a browser environment
     */
    private isBrowserEnvironment(): boolean {
        return typeof window !== 'undefined' &&
            typeof performance !== 'undefined' &&
            typeof performance.getEntriesByType === 'function';
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitoringService();

// Export for use in other modules
export default performanceMonitor;
