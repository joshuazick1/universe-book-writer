/**
 * Monitoring Dashboard Component
 * 
 * Real-time dashboard for monitoring application health, performance,
 * and error tracking. Integrates with the error tracking and performance
 * monitoring services.
 */

import React, { useState } from 'react';
import { useApplicationMonitoring } from '../../hooks/monitoring.hooks.js';
import type { ErrorEvent } from '../../services/error-tracking.service.js';
import type { PerformanceMetric } from '../../services/performance-monitoring.service.js';

interface MonitoringDashboardProps {
    className?: string;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ className = '' }) => {
    const {
        metrics,
        recentErrors,
        report,
        recentMetrics,
        healthStatus,
        resolveError,
    } = useApplicationMonitoring();

    const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'performance' | 'security'>('overview');
    const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);

    const getHealthStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Health Status */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">System Health</h3>
                <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthStatus)}`}>
                        {healthStatus.toUpperCase()}
                    </div>
                    <span className="text-gray-600">
                        {healthStatus === 'healthy' && 'All systems operational'}
                        {healthStatus === 'warning' && 'Some issues detected'}
                        {healthStatus === 'critical' && 'Critical issues require attention'}
                    </span>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Errors</h4>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalErrors || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {metrics?.errorRate || 0} in last hour
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Page Load Time</h4>
                    <p className="text-2xl font-bold text-gray-900">
                        {report ? formatDuration(report.pageLoadTime) : '-'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Average load time</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">API Response</h4>
                    <p className="text-2xl font-bold text-gray-900">
                        {report?.apiResponseTimes?.[0] ? formatDuration(report.apiResponseTimes[0].avgTime) : '-'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Fastest endpoint</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Memory Usage</h4>
                    <p className="text-2xl font-bold text-gray-900">
                        {report?.memoryUsage ?
                            `${Math.round(report.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB` :
                            '-'
                        }
                    </p>
                    <p className="text-sm text-gray-600 mt-1">JavaScript heap</p>
                </div>
            </div>

            {/* Web Vitals */}
            {report?.vitals && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Web Vitals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {report.vitals.fcp && (
                            <div>
                                <p className="text-sm font-medium text-gray-500">First Contentful Paint</p>
                                <p className="text-lg font-semibold">{formatDuration(report.vitals.fcp)}</p>
                            </div>
                        )}
                        {report.vitals.lcp && (
                            <div>
                                <p className="text-sm font-medium text-gray-500">Largest Contentful Paint</p>
                                <p className="text-lg font-semibold">{formatDuration(report.vitals.lcp)}</p>
                            </div>
                        )}
                        {report.vitals.fid && (
                            <div>
                                <p className="text-sm font-medium text-gray-500">First Input Delay</p>
                                <p className="text-lg font-semibold">{formatDuration(report.vitals.fid)}</p>
                            </div>
                        )}
                        {report.vitals.ttfb && (
                            <div>
                                <p className="text-sm font-medium text-gray-500">Time to First Byte</p>
                                <p className="text-lg font-semibold">{formatDuration(report.vitals.ttfb)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderErrors = () => (
        <div className="space-y-6">
            {/* Error Categories */}
            {metrics && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Error Categories</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Object.entries(metrics.errorsByCategory).map(([category, count]) => (
                            <div key={category} className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{count}</p>
                                <p className="text-sm text-gray-600 capitalize">{category}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Errors */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
                <div className="space-y-3">
                    {recentErrors.map((error) => (
                        <div
                            key={error.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedError(error)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                        error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                            error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {error.severity}
                                    </span>
                                    <span className="text-sm font-medium text-gray-600 capitalize">
                                        {error.category}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {formatTimestamp(error.timestamp)}
                                </span>
                            </div>
                            <p className="text-sm text-gray-900 mt-2 truncate">{error.message}</p>
                            <div className="flex items-center space-x-2 mt-2">
                                {error.tags.map((tag) => (
                                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {tag}
                                    </span>
                                ))}
                                {!error.resolved && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resolveError(error.id);
                                        }}
                                        className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Errors */}
            {metrics?.topErrors && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Errors</h3>
                    <div className="space-y-3">
                        {metrics.topErrors.map((error, index) => (
                            <div key={error.message} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">#{index + 1}</span>
                                    <span className="text-sm text-gray-500">
                                        {error.count} occurrences
                                    </span>
                                </div>
                                <p className="text-sm text-gray-900 mt-2">{error.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Last seen: {formatTimestamp(error.lastSeen)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPerformance = () => (
        <div className="space-y-6">
            {/* API Performance */}
            {report?.apiResponseTimes && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">API Performance</h3>
                    <div className="space-y-3">
                        {report.apiResponseTimes.slice(0, 10).map((api) => (
                            <div key={api.endpoint} className="flex items-center justify-between border-b pb-2">
                                <span className="text-sm font-medium text-gray-900">{api.endpoint}</span>
                                <div className="text-right">
                                    <span className="text-sm font-medium">{formatDuration(api.avgTime)}</span>
                                    <span className="text-xs text-gray-500 ml-2">({api.count} calls)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Slow Queries */}
            {report?.slowQueries && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Slow Operations</h3>
                    <div className="space-y-3">
                        {report.slowQueries.map((query) => (
                            <div key={query.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 capitalize">{query.type}</span>
                                    <span className="text-sm font-medium text-red-600">
                                        {formatDuration(query.duration)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-900 mt-2">{query.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatTimestamp(query.timestamp)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Resource Performance */}
            {report?.resourceLoadTimes && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Resource Load Times</h3>
                    <div className="space-y-3">
                        {report.resourceLoadTimes.slice(0, 10).map((resource) => (
                            <div key={resource.resource} className="flex items-center justify-between border-b pb-2">
                                <span className="text-sm font-medium text-gray-900">{resource.resource}</span>
                                <div className="text-right">
                                    <span className="text-sm font-medium">{formatDuration(resource.avgTime)}</span>
                                    <span className="text-xs text-gray-500 ml-2">({resource.count} loads)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderSecurity = () => (
        <div className="space-y-6">
            {/* Security Events */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Security Events</h3>
                <div className="space-y-3">
                    {recentErrors
                        .filter(error => error.category === 'security')
                        .map((event) => (
                            <div key={event.id} className="border rounded-lg p-4 bg-red-50">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-red-900">Security Alert</span>
                                    <span className="text-sm text-red-600">
                                        {formatTimestamp(event.timestamp)}
                                    </span>
                                </div>
                                <p className="text-sm text-red-900 mt-2">{event.message}</p>
                                {event.context && (
                                    <div className="mt-2">
                                        <details className="text-xs text-red-800">
                                            <summary className="cursor-pointer hover:text-red-900">
                                                View Details
                                            </summary>
                                            <pre className="mt-2 bg-red-100 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(event.context, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                )}
                            </div>
                        ))}
                    {recentErrors.filter(error => error.category === 'security').length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-8">
                            No security events in the last hour
                        </p>
                    )}
                </div>
            </div>

            {/* Auth Events */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Authentication Events</h3>
                <div className="space-y-3">
                    {recentErrors
                        .filter(error => error.category === 'auth')
                        .map((event) => (
                            <div key={event.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">Auth Event</span>
                                    <span className="text-sm text-gray-500">
                                        {formatTimestamp(event.timestamp)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-900 mt-2">{event.message}</p>
                            </div>
                        ))}
                    {recentErrors.filter(error => error.category === 'auth').length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-8">
                            No authentication events in the last hour
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`monitoring-dashboard ${className}`}>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
                <p className="text-gray-600 mt-1">
                    Real-time monitoring of application health, performance, and security
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { key: 'overview', label: 'Overview' },
                        { key: 'errors', label: 'Errors' },
                        { key: 'performance', label: 'Performance' },
                        { key: 'security', label: 'Security' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'errors' && renderErrors()}
            {activeTab === 'performance' && renderPerformance()}
            {activeTab === 'security' && renderSecurity()}

            {/* Error Detail Modal */}
            {selectedError && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Error Details</h3>
                                <button
                                    onClick={() => setSelectedError(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Message</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedError.message}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedError.type}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedError.category}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                                        <p className="mt-1 text-sm text-gray-900 capitalize">{selectedError.severity}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                                        <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedError.timestamp)}</p>
                                    </div>
                                </div>

                                {selectedError.stack && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Stack Trace</label>
                                        <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                                            {selectedError.stack}
                                        </pre>
                                    </div>
                                )}

                                {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Context</label>
                                        <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                                            {JSON.stringify(selectedError.context, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3">
                                    {!selectedError.resolved && (
                                        <button
                                            onClick={() => {
                                                resolveError(selectedError.id);
                                                setSelectedError(null);
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                        >
                                            Mark as Resolved
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedError(null)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
