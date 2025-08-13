/**
 * @fileoverview Utilities for handling time-series data.
 * @module shared/utils/timeSeries
 *
 * Provides functions for time-series data validation, aggregation, and retention.
 *
 * @example
 * import { aggregateTimeSeries } from 'shared/utils/timeSeries';
 *
 * @edgecase
 * Handles missing data points and irregular intervals.
 */

export interface TimeSeriesPoint {
    timestamp: string;
    value: number;
}

export interface AggregatedTimeSeries {
    interval: string;
    points: TimeSeriesPoint[];
}

/**
 * Validates a time-series data structure.
 * @param points - Array of time-series points
 * @returns True if valid, otherwise false
 */
export function validateTimeSeries(points: TimeSeriesPoint[]): boolean {
    return points.every(point => typeof point.timestamp === 'string' && typeof point.value === 'number');
}

/**
 * Aggregates time-series data into specified intervals.
 * @param points - Array of time-series points
 * @param interval - Aggregation interval (e.g., 'hourly', 'daily')
 * @returns Aggregated time-series data
 */
export function aggregateTimeSeries(points: TimeSeriesPoint[], interval: 'hourly' | 'daily' | 'weekly'): AggregatedTimeSeries {
    // Example implementation for daily aggregation
    const aggregated: Record<string, number[]> = {};

    points.forEach(point => {
        const dateKey = new Date(point.timestamp).toISOString().split('T')[0];
        if (!aggregated[dateKey]) {
            aggregated[dateKey] = [];
        }
        aggregated[dateKey].push(point.value);
    });

    const result: TimeSeriesPoint[] = Object.entries(aggregated).map(([date, values]) => ({
        timestamp: date,
        value: values.reduce((sum, val) => sum + val, 0) / values.length // Average value
    }));

    return { interval, points: result };
}

/**
 * Retains only the most recent data points within a specified retention period.
 * @param points - Array of time-series points
 * @param retentionPeriodDays - Number of days to retain
 * @returns Filtered time-series data
 */
export function retainRecentData(points: TimeSeriesPoint[], retentionPeriodDays: number): TimeSeriesPoint[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays);

    return points.filter(point => new Date(point.timestamp) >= cutoffDate);
}
