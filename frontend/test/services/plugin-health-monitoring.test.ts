/**
 * Plugin Health Monitoring Tests
 * 
 * Tests for the plugin health monitoring system.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { pluginHealthMonitor } from '../../src/services/plugin-health-monitoring.service.js';

// Mock performance for Node.js environment
Object.defineProperty(global, 'performance', {
    writable: true,
    value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
    }
});

describe('Plugin Health Monitoring Service', () => {
    beforeEach(() => {
        // Reset the service state
        pluginHealthMonitor.stopMonitoring();
        pluginHealthMonitor.resetData();
        jest.clearAllMocks();
    });

    afterEach(() => {
        pluginHealthMonitor.stopMonitoring();
        pluginHealthMonitor.resetData();
    });

    describe('Plugin Load Tracking', () => {
        it('should track successful plugin load', () => {
            const loadEvent = {
                pluginName: 'test-plugin',
                startTime: 1000,
                endTime: 1500,
                success: true,
                dependencies: ['dep1', 'dep2'],
                features: ['feature1'],
            };

            pluginHealthMonitor.trackPluginLoad(loadEvent);

            const metrics = pluginHealthMonitor.getPluginMetrics('test-plugin');
            expect(metrics).toBeTruthy();
            expect(metrics?.pluginName).toBe('test-plugin');
            expect(metrics?.loadTime).toBe(500);
            expect(metrics?.status).toBe('healthy');

            const loadEvents = pluginHealthMonitor.getLoadEvents('test-plugin');
            expect(loadEvents).toHaveLength(1);
            expect(loadEvents[0].duration).toBe(500);
            expect(loadEvents[0].success).toBe(true);
        });

        it('should track failed plugin load', () => {
            const loadEvent = {
                pluginName: 'test-plugin',
                startTime: 1000,
                endTime: 1200,
                success: false,
                errorMessage: 'Failed to load dependencies',
            };

            pluginHealthMonitor.trackPluginLoad(loadEvent);

            const metrics = pluginHealthMonitor.getPluginMetrics('test-plugin');
            expect(metrics?.status).toBe('critical');
            expect(metrics?.loadTime).toBe(200);

            const errorEvents = pluginHealthMonitor.getErrorEvents('test-plugin');
            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0].severity).toBe('critical');
            expect(errorEvents[0].operation).toBe('load');
        });
    });

    describe('Plugin Error Tracking', () => {
        it('should track plugin errors', () => {
            const errorEvent = {
                pluginName: 'error-track-plugin', // Unique plugin name
                operation: 'initialize',
                errorMessage: 'Initialization failed',
                timestamp: Date.now(),
                severity: 'high' as const,
                context: { step: 'validation' },
            };

            pluginHealthMonitor.trackPluginError(errorEvent);

            const metrics = pluginHealthMonitor.getPluginMetrics('error-track-plugin');
            expect(metrics?.errorCount).toBe(1);
            expect(metrics?.lastError).toBe('Initialization failed');

            const errorEvents = pluginHealthMonitor.getErrorEvents('error-track-plugin');
            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0].operation).toBe('initialize');
            expect(errorEvents[0].severity).toBe('high');
        });

        it('should update plugin status based on error severity', () => {
            // Track a critical error
            const criticalError = {
                pluginName: 'test-plugin',
                operation: 'critical-operation',
                errorMessage: 'Critical failure',
                timestamp: Date.now(),
                severity: 'critical' as const,
            };

            pluginHealthMonitor.trackPluginError(criticalError);

            const metrics = pluginHealthMonitor.getPluginMetrics('test-plugin');
            expect(metrics?.status).toBe('critical');
        });
    });

    describe('Plugin Performance Tracking', () => {
        it('should track plugin performance', () => {
            const performanceEvent = {
                pluginName: 'test-plugin',
                operation: 'render',
                duration: 150,
                timestamp: Date.now(),
                resourceUsage: {
                    memory: 1024,
                    cpu: 15,
                },
                metadata: { componentCount: 5 },
            };

            pluginHealthMonitor.trackPluginPerformance(performanceEvent);

            const metrics = pluginHealthMonitor.getPluginMetrics('test-plugin');
            expect(metrics?.performance.avgResponseTime).toBe(150);

            const performanceEvents = pluginHealthMonitor.getPerformanceEvents('test-plugin');
            expect(performanceEvents).toHaveLength(1);
            expect(performanceEvents[0].operation).toBe('render');
            expect(performanceEvents[0].duration).toBe(150);
        }); it('should calculate average response time', () => {
            const plugin = 'calc-avg-plugin'; // Unique plugin name

            // Track multiple performance events
            [100, 200, 300].forEach((duration, index) => {
                pluginHealthMonitor.trackPluginPerformance({
                    pluginName: plugin,
                    operation: 'operation',
                    duration,
                    timestamp: Date.now() + index,
                });
            });

            const metrics = pluginHealthMonitor.getPluginMetrics(plugin);
            expect(metrics?.performance.avgResponseTime).toBe(200); // (100 + 200 + 300) / 3
        }); it('should identify slow operations', () => {
            const plugin = 'slow-ops-plugin'; // Unique plugin name

            // Track slow operations (> 1000ms)
            [500, 1500, 2000].forEach((duration, index) => {
                pluginHealthMonitor.trackPluginPerformance({
                    pluginName: plugin,
                    operation: 'operation',
                    duration,
                    timestamp: Date.now() + index,
                });
            });

            const metrics = pluginHealthMonitor.getPluginMetrics(plugin);
            expect(metrics?.performance.slowOperations).toBe(2); // 1500ms and 2000ms
        });
    });

    describe('Health Report', () => {
        it('should generate health report', () => {
            // Create multiple plugins with different statuses
            pluginHealthMonitor.trackPluginLoad({
                pluginName: 'report-healthy-plugin',
                startTime: 1000,
                endTime: 1100,
                success: true,
            });

            pluginHealthMonitor.trackPluginError({
                pluginName: 'report-warning-plugin',
                operation: 'test',
                errorMessage: 'Minor error',
                timestamp: Date.now(),
                severity: 'medium',
            });

            pluginHealthMonitor.trackPluginError({
                pluginName: 'report-critical-plugin',
                operation: 'test',
                errorMessage: 'Critical error',
                timestamp: Date.now(),
                severity: 'critical',
            });

            const report = pluginHealthMonitor.getHealthReport();

            expect(report.totalPlugins).toBe(3);
            expect(report.healthyPlugins).toBe(1);
            expect(report.warningPlugins).toBe(1);
            expect(report.criticalPlugins).toBe(1);
            expect(report.plugins).toHaveLength(3);
        });

        it('should identify slowest and most error-prone plugins', () => {
            // Plugin with slow load time
            pluginHealthMonitor.trackPluginLoad({
                pluginName: 'slow-plugin',
                startTime: 1000,
                endTime: 3000, // 2 second load
                success: true,
            });

            // Plugin with fast load time
            pluginHealthMonitor.trackPluginLoad({
                pluginName: 'fast-plugin',
                startTime: 1000,
                endTime: 1100, // 100ms load
                success: true,
            });

            // Plugin with many errors
            for (let i = 0; i < 5; i++) {
                pluginHealthMonitor.trackPluginError({
                    pluginName: 'error-prone-plugin',
                    operation: 'test',
                    errorMessage: `Error ${i}`,
                    timestamp: Date.now() + i,
                    severity: 'medium',
                });
            }

            const report = pluginHealthMonitor.getHealthReport();

            expect(report.slowestPlugin).toBe('slow-plugin');
            expect(report.mostErrorPronePlugin).toBe('error-prone-plugin');
        });
    });

    describe('Health Status Updates', () => {
        it('should notify listeners of health updates', (done) => {
            let updateCount = 0;

            const unsubscribe = pluginHealthMonitor.onHealthUpdate((report) => {
                updateCount++;
                expect(report.totalPlugins).toBeGreaterThan(0);

                if (updateCount === 2) {
                    unsubscribe();
                    done();
                }
            });

            // Trigger two updates
            pluginHealthMonitor.trackPluginLoad({
                pluginName: 'plugin1',
                startTime: 1000,
                endTime: 1100,
                success: true,
            });

            pluginHealthMonitor.trackPluginLoad({
                pluginName: 'plugin2',
                startTime: 1000,
                endTime: 1200,
                success: true,
            });
        });
    });

    describe('Data Retention', () => {
        it('should limit number of stored events', () => {
            const plugin = 'test-plugin';

            // Add more than the limit of load events (100)
            for (let i = 0; i < 150; i++) {
                pluginHealthMonitor.trackPluginLoad({
                    pluginName: plugin,
                    startTime: 1000 + i,
                    endTime: 1100 + i,
                    success: true,
                });
            }

            const loadEvents = pluginHealthMonitor.getLoadEvents(plugin);
            expect(loadEvents.length).toBeLessThanOrEqual(100);
        });

        it('should limit number of stored error events', () => {
            const plugin = 'test-plugin';

            // Add more than the limit of error events (500)
            for (let i = 0; i < 600; i++) {
                pluginHealthMonitor.trackPluginError({
                    pluginName: plugin,
                    operation: 'test',
                    errorMessage: `Error ${i}`,
                    timestamp: Date.now() + i,
                    severity: 'low',
                });
            }

            const errorEvents = pluginHealthMonitor.getErrorEvents(plugin);
            expect(errorEvents.length).toBeLessThanOrEqual(500);
        });

        it('should limit number of stored performance events', () => {
            const plugin = 'test-plugin';

            // Add more than the limit of performance events (1000)
            for (let i = 0; i < 1200; i++) {
                pluginHealthMonitor.trackPluginPerformance({
                    pluginName: plugin,
                    operation: 'test',
                    duration: 100 + i,
                    timestamp: Date.now() + i,
                });
            }

            const performanceEvents = pluginHealthMonitor.getPerformanceEvents(plugin);
            expect(performanceEvents.length).toBeLessThanOrEqual(1000);
        });
    });
});
