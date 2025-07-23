/**
 * Plugin Health Monitoring Types
 * 
 * Type definitions for plugin health monitoring system.
 */

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

export interface PluginHealthDashboardMetrics {
    timestamp: number;
    overview: {
        totalPlugins: number;
        activePlugins: number;
        healthyPlugins: number;
        warningPlugins: number;
        criticalPlugins: number;
        offlinePlugins: number;
    };
    performance: {
        avgLoadTime: number;
        totalLoadTime: number;
        avgResponseTime: number;
        slowOperations: number;
        totalMemoryUsage: number;
    };
    errors: {
        totalErrors: number;
        criticalErrors: number;
        recentErrors: number;
        errorRate: number;
    };
    trends: {
        loadTimeHistory: { timestamp: number; value: number }[];
        errorHistory: { timestamp: number; value: number }[];
        performanceHistory: { timestamp: number; value: number }[];
    };
    topIssues: {
        slowestPlugins: { name: string; loadTime: number }[];
        mostErrorPronePlugins: { name: string; errorCount: number }[];
        recentCriticalEvents: PluginErrorEvent[];
    };
}

export interface PluginHealthTrend {
    timestamp: number;
    pluginName?: string;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
    offlineCount: number;
    avgLoadTime: number;
    totalErrors: number;
    avgResponseTime: number;
}

export interface PluginPerformanceMetrics {
    pluginName?: string;
    timeRange: string;
    overview: {
        totalOperations: number;
        avgDuration: number;
        slowOperations: number;
        fastestOperation: number;
        slowestOperation: number;
    };
    operations: {
        [operationName: string]: {
            count: number;
            avgDuration: number;
            minDuration: number;
            maxDuration: number;
            p50Duration: number;
            p95Duration: number;
            p99Duration: number;
        };
    };
    trends: {
        timestamp: number;
        avgDuration: number;
        operationCount: number;
    }[];
}
