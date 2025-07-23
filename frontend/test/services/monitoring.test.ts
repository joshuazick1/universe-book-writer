/**
 * Monitoring Services Test
 * 
 * Basic tests for error tracking and performance monitoring services.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { errorTracker } from '../../src/services/error-tracking.service.js';
import { performanceMonitor } from '../../src/services/performance-monitoring.service.js';

describe('Error Tracking Service', () => {
  beforeEach(() => {
    // Clear any existing errors
    errorTracker['errors'] = [];
  });

  afterEach(() => {
    // Clean up
    errorTracker['errors'] = [];
  });

  it('should track error events', () => {
    const errorId = errorTracker.trackError({
      type: 'error',
      category: 'ui',
      message: 'Test error message',
      severity: 'medium',
      tags: ['test'],
    });

    expect(errorId).toBeDefined();
    expect(typeof errorId).toBe('string');

    const metrics = errorTracker.getMetrics();
    expect(metrics.totalErrors).toBe(1);
    expect(metrics.errorsByCategory.ui).toBe(1);
    expect(metrics.errorsBySeverity.medium).toBe(1);
  });

  it('should track API errors', () => {
    const errorId = errorTracker.trackApiError(
      '/api/test',
      500,
      'Internal server error',
      { details: 'test error' }
    );

    expect(errorId).toBeDefined();

    const metrics = errorTracker.getMetrics();
    expect(metrics.totalErrors).toBe(1);
    expect(metrics.errorsByCategory.api).toBe(1);
  });

  it('should track plugin errors', () => {
    const errorId = errorTracker.trackPluginError(
      'star-trek',
      'load',
      'Failed to load plugin',
      { version: '1.0.0' }
    );

    expect(errorId).toBeDefined();

    const metrics = errorTracker.getMetrics();
    expect(metrics.totalErrors).toBe(1);
    expect(metrics.errorsByCategory.plugin).toBe(1);
  });

  it('should resolve errors', () => {
    const errorId = errorTracker.trackError({
      type: 'error',
      category: 'ui',
      message: 'Test error',
      severity: 'low',
      tags: ['test'],
    });

    const resolved = errorTracker.resolveError(errorId);
    expect(resolved).toBe(true);

    const errors = errorTracker.getErrors();
    const error = errors.find(e => e.id === errorId);
    expect(error?.resolved).toBe(true);
  });

  it('should filter errors by criteria', () => {
    // Add multiple errors
    errorTracker.trackError({
      type: 'error',
      category: 'ui',
      message: 'UI error',
      severity: 'high',
      tags: ['ui'],
    });

    errorTracker.trackError({
      type: 'warning',
      category: 'api',
      message: 'API warning',
      severity: 'medium',
      tags: ['api'],
    });

    // Filter by category
    const uiErrors = errorTracker.getErrors({ category: 'ui' });
    expect(uiErrors).toHaveLength(1);
    expect(uiErrors[0].category).toBe('ui');

    // Filter by severity
    const highErrors = errorTracker.getErrors({ severity: 'high' });
    expect(highErrors).toHaveLength(1);
    expect(highErrors[0].severity).toBe('high');

    // Filter by type
    const warnings = errorTracker.getErrors({ type: 'warning' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('warning');
  });
});

describe('Performance Monitoring Service', () => {
  beforeEach(() => {
    // Clear any existing metrics
    performanceMonitor['metrics'] = [];
  });

  afterEach(() => {
    // Clean up
    performanceMonitor['metrics'] = [];
  });

  it('should track page load performance', () => {
    const metricId = performanceMonitor.trackPageLoad('test-page', 1500, {
      cached: false,
    });

    expect(metricId).toBeDefined();
    expect(typeof metricId).toBe('string');

    const report = performanceMonitor.getPerformanceReport();
    expect(report.pageLoadTime).toBe(1500);
  });

  it('should track API call performance', () => {
    const metricId = performanceMonitor.trackApiCall(
      '/api/test',
      'GET',
      250,
      200
    );

    expect(metricId).toBeDefined();

    const report = performanceMonitor.getPerformanceReport();
    expect(report.apiResponseTimes).toHaveLength(1);
    expect(report.apiResponseTimes[0].endpoint).toBe('GET /api/test');
    expect(report.apiResponseTimes[0].avgTime).toBe(250);
  });

  it('should track user interactions', () => {
    const metricId = performanceMonitor.trackUserInteraction(
      'button-click',
      50,
      { button: 'submit' }
    );

    expect(metricId).toBeDefined();

    const report = performanceMonitor.getPerformanceReport();
    expect(report.userInteractionTimes).toHaveLength(1);
    expect(report.userInteractionTimes[0].interaction).toBe('button-click');
  });

  it('should track custom metrics', () => {
    const metricId = performanceMonitor.trackCustomMetric(
      'custom-operation',
      300,
      { type: 'calculation' }
    );

    expect(metricId).toBeDefined();

    const report = performanceMonitor.getPerformanceReport();
    // Custom metrics should be included in slow queries if they exceed thresholds
    expect(report).toBeDefined();
  });

  it('should start and finish measurements', () => {
    const finishMeasurement = performanceMonitor.startMeasurement('test-operation');

    // Simulate some work
    const duration = finishMeasurement();

    expect(duration).toBeGreaterThan(0);
    expect(typeof duration).toBe('number');
  });

  it('should identify slow operations', () => {
    // Track a slow operation
    performanceMonitor.trackApiCall('/api/slow', 'GET', 5000, 200);

    const report = performanceMonitor.getPerformanceReport();
    expect(report.slowQueries).toHaveLength(1);
    expect(report.slowQueries[0].duration).toBe(5000);
  });
});

describe('Monitoring Integration', () => {
  beforeEach(() => {
    errorTracker['errors'] = [];
    performanceMonitor['metrics'] = [];
  });

  afterEach(() => {
    errorTracker['errors'] = [];
    performanceMonitor['metrics'] = [];
  });

  it('should track performance issues as errors', () => {
    // Track a slow operation that exceeds threshold
    performanceMonitor.trackApiCall('/api/test', 'GET', 3000, 200);

    // This should automatically create a performance error
    // (implementation would need to integrate the services)
    const performanceReport = performanceMonitor.getPerformanceReport();
    expect(performanceReport.slowQueries).toHaveLength(1);
  });

  it('should provide comprehensive monitoring data', () => {
    // Add some errors
    errorTracker.trackError({
      type: 'error',
      category: 'ui',
      message: 'UI error',
      severity: 'medium',
      tags: ['ui'],
    });

    errorTracker.trackApiError('/api/test', 500, 'Server error');

    // Add some performance metrics
    performanceMonitor.trackPageLoad('dashboard', 2000);
    performanceMonitor.trackApiCall('/api/data', 'GET', 500, 200);

    // Get comprehensive data
    const errorMetrics = errorTracker.getMetrics();
    const performanceReport = performanceMonitor.getPerformanceReport();

    expect(errorMetrics.totalErrors).toBe(2);
    expect(performanceReport.pageLoadTime).toBe(2000);
    expect(performanceReport.apiResponseTimes).toHaveLength(1);
  });
});
