/**
 * Monitoring API Controller
 * 
 * Backend API endpoints for error tracking and performance monitoring.
 * Handles incoming telemetry data and provides monitoring dashboard APIs.
 */

import { Request, Response } from 'express';
import { MongoMonitoringRepository } from '../../infrastructure/persistence/mongo-monitoring.repository.js';
import { validateErrorEvent, validatePerformanceMetric } from '../validators/monitoring.validators.js';

export class MonitoringController {
    constructor(private monitoringRepository: MongoMonitoringRepository) { }

    /**
     * Store error event from frontend
     */
    public async storeError(req: Request, res: Response): Promise<void> {
        try {
            const errorData = req.body;

            // Validate error data
            const validation = validateErrorEvent(errorData);
            if (!validation.isValid) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid error data',
                    errors: validation.errors,
                });
                return;
            }

            // Add server-side metadata
            const enrichedError = {
                ...errorData,
                serverTimestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                referer: req.get('Referer'),
            };

            // Store in database
            const storedError = await this.monitoringRepository.storeError(enrichedError);

            res.status(201).json({
                success: true,
                data: { id: storedError.id },
            });
        } catch (error) {
            console.error('Error storing error event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to store error event',
            });
        }
    }

    /**
     * Store performance metric from frontend
     */
    public async storePerformanceMetric(req: Request, res: Response): Promise<void> {
        try {
            const metricData = req.body;

            // Validate metric data
            const validation = validatePerformanceMetric(metricData);
            if (!validation.isValid) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid performance metric data',
                    errors: validation.errors,
                });
                return;
            }

            // Add server-side metadata
            const enrichedMetric = {
                ...metricData,
                serverTimestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
            };

            // Store in database
            const storedMetric = await this.monitoringRepository.storePerformanceMetric(enrichedMetric);

            res.status(201).json({
                success: true,
                data: { id: storedMetric.id },
            });
        } catch (error) {
            console.error('Error storing performance metric:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to store performance metric',
            });
        }
    }

    /**
     * Get error metrics for dashboard
     */
    public async getErrorMetrics(req: Request, res: Response): Promise<void> {
        try {
            const {
                timeRange = '1h',
                category,
                severity,
                userId,
                limit = 100
            } = req.query;

            const timeRangeMs = this.parseTimeRange(timeRange as string);
            const startTime = new Date(Date.now() - timeRangeMs);

            const metrics = await this.monitoringRepository.getErrorMetrics({
                startTime,
                category: category as string,
                severity: severity as string,
                userId: userId as string,
                limit: parseInt(limit as string, 10),
            });

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Error getting error metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get error metrics',
            });
        }
    }

    /**
     * Get performance metrics for dashboard
     */
    public async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
        try {
            const {
                timeRange = '1h',
                type,
                userId,
                limit = 100
            } = req.query;

            const timeRangeMs = this.parseTimeRange(timeRange as string);
            const startTime = new Date(Date.now() - timeRangeMs);

            const metrics = await this.monitoringRepository.getPerformanceMetrics({
                startTime,
                type: type as string,
                userId: userId as string,
                limit: parseInt(limit as string, 10),
            });

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Error getting performance metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get performance metrics',
            });
        }
    }

    /**
     * Get system health status
     */
    public async getSystemHealth(req: Request, res: Response): Promise<void> {
        try {
            const health = await this.monitoringRepository.getSystemHealth();

            res.json({
                success: true,
                data: health,
            });
        } catch (error) {
            console.error('Error getting system health:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get system health',
            });
        }
    }

    /**
     * Get error details by ID
     */
    public async getErrorDetails(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const error = await this.monitoringRepository.getErrorById(id);
            if (!error) {
                res.status(404).json({
                    success: false,
                    message: 'Error not found',
                });
                return;
            }

            res.json({
                success: true,
                data: error,
            });
        } catch (error) {
            console.error('Error getting error details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get error details',
            });
        }
    }

    /**
     * Mark error as resolved
     */
    public async resolveError(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { resolvedBy } = req.body;

            const updated = await this.monitoringRepository.resolveError(id, resolvedBy);
            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: 'Error not found',
                });
                return;
            }

            res.json({
                success: true,
                data: { resolved: true },
            });
        } catch (error) {
            console.error('Error resolving error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resolve error',
            });
        }
    }

    /**
     * Get application insights (aggregated data)
     */
    public async getApplicationInsights(req: Request, res: Response): Promise<void> {
        try {
            const { timeRange = '24h' } = req.query;
            const timeRangeMs = this.parseTimeRange(timeRange as string);
            const startTime = new Date(Date.now() - timeRangeMs);

            const insights = await this.monitoringRepository.getApplicationInsights(startTime);

            res.json({
                success: true,
                data: insights,
            });
        } catch (error) {
            console.error('Error getting application insights:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get application insights',
            });
        }
    }

    /**
     * Get real-time metrics (for live dashboard updates)
     */
    public async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
        try {
            const { since } = req.query;
            const sinceTimestamp = since ? new Date(since as string) : new Date(Date.now() - 60000); // Last minute

            const metrics = await this.monitoringRepository.getRealTimeMetrics(sinceTimestamp);

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Error getting real-time metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get real-time metrics',
            });
        }
    }

    /**
     * Clean up old monitoring data
     */
    public async cleanupOldData(req: Request, res: Response): Promise<void> {
        try {
            const { olderThanDays = 30 } = req.body;
            const cutoffDate = new Date(Date.now() - (parseInt(olderThanDays, 10) * 24 * 60 * 60 * 1000));

            const result = await this.monitoringRepository.cleanupOldData(cutoffDate);

            res.json({
                success: true,
                data: {
                    deletedErrorsCount: result.deletedErrorsCount,
                    deletedMetricsCount: result.deletedMetricsCount,
                },
            });
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup old data',
            });
        }
    }

    /**
     * Parse time range string to milliseconds
     */
    private parseTimeRange(timeRange: string): number {
        const match = timeRange.match(/^(\d+)([mhd])$/);
        if (!match) {
            return 60 * 60 * 1000; // Default to 1 hour
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 'm': return value * 60 * 1000; // minutes
            case 'h': return value * 60 * 60 * 1000; // hours
            case 'd': return value * 24 * 60 * 60 * 1000; // days
            default: return 60 * 60 * 1000; // Default to 1 hour
        }
    }
}
