/**
 * Plugin Health Monitoring Controller
 * 
 * API endpoints for plugin health monitoring, metrics, and reporting.
 */

import { Request, Response } from 'express';
import { PluginHealthMonitoringRepository } from '../../infrastructure/persistence/mongo-plugin-health.repository.js';
import {
    PluginHealthMetric,
    PluginLoadEvent,
    PluginErrorEvent,
    PluginPerformanceEvent
} from '../../types/plugin-health.types.js';

export class PluginHealthMonitoringController {
    constructor(
        private pluginHealthRepository: PluginHealthMonitoringRepository
    ) { }

    /**
     * Get plugin health dashboard metrics
     */
    public getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
        try {
            const { timeRange = '1h', pluginName } = req.query;

            const metrics = await this.pluginHealthRepository.getDashboardMetrics({
                timeRange: timeRange as string,
                pluginName: pluginName as string | undefined,
            });

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Failed to get plugin health dashboard metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get plugin health report
     */
    public getHealthReport = async (req: Request, res: Response): Promise<void> => {
        try {
            const { pluginName, includeHistory = false } = req.query;

            const report = await this.pluginHealthRepository.getHealthReport({
                pluginName: pluginName as string | undefined,
                includeHistory: includeHistory === 'true',
            });

            res.json({
                success: true,
                data: report,
            });
        } catch (error) {
            console.error('Failed to get plugin health report:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Record plugin health metric
     */
    public recordHealthMetric = async (req: Request, res: Response): Promise<void> => {
        try {
            const metric: PluginHealthMetric = req.body;

            await this.pluginHealthRepository.recordHealthMetric(metric);

            res.json({
                success: true,
                message: 'Plugin health metric recorded',
            });
        } catch (error) {
            console.error('Failed to record plugin health metric:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Record plugin load event
     */
    public recordLoadEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const event: PluginLoadEvent = req.body;

            await this.pluginHealthRepository.recordLoadEvent(event);

            res.json({
                success: true,
                message: 'Plugin load event recorded',
            });
        } catch (error) {
            console.error('Failed to record plugin load event:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Record plugin error event
     */
    public recordErrorEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const event: PluginErrorEvent = req.body;

            await this.pluginHealthRepository.recordErrorEvent(event);

            res.json({
                success: true,
                message: 'Plugin error event recorded',
            });
        } catch (error) {
            console.error('Failed to record plugin error event:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Record plugin performance event
     */
    public recordPerformanceEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const event: PluginPerformanceEvent = req.body;

            await this.pluginHealthRepository.recordPerformanceEvent(event);

            res.json({
                success: true,
                message: 'Plugin performance event recorded',
            });
        } catch (error) {
            console.error('Failed to record plugin performance event:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get plugin load events
     */
    public getLoadEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { pluginName, limit = 50, offset = 0 } = req.query;

            const events = await this.pluginHealthRepository.getLoadEvents({
                pluginName: pluginName as string | undefined,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            });

            res.json({
                success: true,
                data: events,
            });
        } catch (error) {
            console.error('Failed to get plugin load events:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get plugin error events
     */
    public getErrorEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { pluginName, severity, limit = 50, offset = 0 } = req.query;

            const events = await this.pluginHealthRepository.getErrorEvents({
                pluginName: pluginName as string | undefined,
                severity: severity as string | undefined,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            });

            res.json({
                success: true,
                data: events,
            });
        } catch (error) {
            console.error('Failed to get plugin error events:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get plugin performance events
     */
    public getPerformanceEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { pluginName, operation, limit = 50, offset = 0 } = req.query;

            const events = await this.pluginHealthRepository.getPerformanceEvents({
                pluginName: pluginName as string | undefined,
                operation: operation as string | undefined,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            });

            res.json({
                success: true,
                data: events,
            });
        } catch (error) {
            console.error('Failed to get plugin performance events:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get plugin health trends
     */
    public getHealthTrends = async (req: Request, res: Response): Promise<void> => {
        try {
            const { pluginName, timeRange = '24h', granularity = '1h' } = req.query;

            const trends = await this.pluginHealthRepository.getHealthTrends({
                pluginName: pluginName as string | undefined,
                timeRange: timeRange as string,
                granularity: granularity as string,
            });

            res.json({
                success: true,
                data: trends,
            });
        } catch (error) {
            console.error('Failed to get plugin health trends:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get plugin performance metrics
     */
    public getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
        try {
            const { pluginName, timeRange = '1h' } = req.query;

            const metrics = await this.pluginHealthRepository.getPerformanceMetrics({
                pluginName: pluginName as string | undefined,
                timeRange: timeRange as string,
            });

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Failed to get plugin performance metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Health check endpoint for plugin monitoring system
     */
    public healthCheck = async (req: Request, res: Response): Promise<void> => {
        try {
            const isHealthy = await this.pluginHealthRepository.healthCheck();

            res.status(isHealthy ? 200 : 503).json({
                success: isHealthy,
                status: isHealthy ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Plugin health monitoring health check failed:', error);
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            });
        }
    };
}
