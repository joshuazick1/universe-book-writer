/**
 * User Activity Analytics Controller
 * 
 * API endpoints for user activity tracking and analytics reporting.
 */

import { Request, Response } from 'express';
import { UserActivityAnalyticsRepository } from '../../infrastructure/persistence/mongo-user-activity-analytics.repository.js';
import {
    UserActivityEvent,
    AnalyticsQuery,
    AnalyticsAggregation
} from '../../types/user-activity-analytics.types.js';

export class UserActivityAnalyticsController {
    constructor(
        private analyticsRepository: UserActivityAnalyticsRepository
    ) { }

    /**
     * Store user activity events (batch endpoint)
     */
    public storeEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { events } = req.body;

            if (!Array.isArray(events)) {
                res.status(400).json({
                    success: false,
                    error: 'Events must be an array',
                });
                return;
            }

            // Validate events
            const validEvents: UserActivityEvent[] = events.filter(event =>
                event.id &&
                event.timestamp &&
                event.userId &&
                event.sessionId &&
                event.eventType &&
                event.eventName
            );

            if (validEvents.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'No valid events to store',
                });
                return;
            }

            await this.analyticsRepository.storeEvents(validEvents);

            res.json({
                success: true,
                data: {
                    stored: validEvents.length,
                    skipped: events.length - validEvents.length,
                },
            });
        } catch (error) {
            console.error('Failed to store analytics events:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Store single user activity event
     */
    public storeEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const event: UserActivityEvent = req.body;

            // Validate required fields
            if (!event.id || !event.timestamp || !event.userId || !event.sessionId ||
                !event.eventType || !event.eventName) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required event fields',
                });
                return;
            }

            await this.analyticsRepository.storeEvent(event);

            res.json({
                success: true,
                data: { stored: true },
            });
        } catch (error) {
            console.error('Failed to store analytics event:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Query user activity events
     */
    public queryEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const query: AnalyticsQuery = {
                timeRange: req.query.timeRange as any,
                userId: req.query.userId as string,
                eventType: req.query.eventType as any,
                featureName: req.query.featureName as string,
                page: req.query.page as string,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
            };

            // Clean up undefined values
            Object.keys(query).forEach(key => {
                if (query[key as keyof AnalyticsQuery] === undefined) {
                    delete query[key as keyof AnalyticsQuery];
                }
            });

            const events = await this.analyticsRepository.queryEvents(query);

            res.json({
                success: true,
                data: {
                    events,
                    count: events.length,
                    query,
                },
            });
        } catch (error) {
            console.error('Failed to query analytics events:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get feature usage metrics
     */
    public getFeatureUsageMetrics = async (req: Request, res: Response): Promise<void> => {
        try {
            const { timeRange = '30d' } = req.query;

            const metrics = await this.analyticsRepository.getFeatureUsageMetrics(timeRange as string);

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Failed to get feature usage metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get user behavior pattern
     */
    public getUserBehaviorPattern = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
                return;
            }

            const pattern = await this.analyticsRepository.getUserBehaviorPattern(userId);

            if (!pattern) {
                res.status(404).json({
                    success: false,
                    error: 'No data found for user',
                });
                return;
            }

            res.json({
                success: true,
                data: pattern,
            });
        } catch (error) {
            console.error('Failed to get user behavior pattern:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get analytics dashboard data (admin only)
     */
    public getAnalyticsDashboard = async (req: Request, res: Response): Promise<void> => {
        try {
            const { timeRange = '30d' } = req.query;

            const dashboard = await this.analyticsRepository.getAnalyticsDashboard(timeRange as string);

            res.json({
                success: true,
                data: dashboard,
            });
        } catch (error) {
            console.error('Failed to get analytics dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Export user data (GDPR compliance)
     */
    public exportUserData = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
                return;
            }

            const exportData = await this.analyticsRepository.exportUserData(userId);

            res.json({
                success: true,
                data: exportData,
            });
        } catch (error) {
            console.error('Failed to export user data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Delete user data (GDPR compliance)
     */
    public deleteUserData = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
                return;
            }

            const deletedCount = await this.analyticsRepository.deleteUserData(userId);

            res.json({
                success: true,
                data: {
                    deletedCount,
                    userId,
                },
            });
        } catch (error) {
            console.error('Failed to delete user data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Aggregate analytics data
     */
    public aggregateData = async (req: Request, res: Response): Promise<void> => {
        try {
            const aggregation: AnalyticsAggregation = req.body;

            if (!aggregation.groupBy || !aggregation.metrics) {
                res.status(400).json({
                    success: false,
                    error: 'groupBy and metrics are required',
                });
                return;
            }

            const results = await this.analyticsRepository.aggregateData(aggregation);

            res.json({
                success: true,
                data: {
                    results,
                    aggregation,
                },
            });
        } catch (error) {
            console.error('Failed to aggregate analytics data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    /**
     * Get analytics health check
     */
    public getAnalyticsHealth = async (req: Request, res: Response): Promise<void> => {
        try {
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            // Check recent activity
            const recentEvents = await this.analyticsRepository.queryEvents({
                timeRange: '24h',
                limit: 1,
            });

            const isHealthy = recentEvents.length > 0;

            res.json({
                success: true,
                data: {
                    status: isHealthy ? 'healthy' : 'warning',
                    lastEventTime: recentEvents[0]?.timestamp || 0,
                    checkTime: now,
                },
            });
        } catch (error) {
            console.error('Failed to check analytics health:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };
}
