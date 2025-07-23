/**
 * User Activity Analytics Routes
 * 
 * Express routes for user activity tracking and analytics endpoints.
 */

import { Router } from 'express';
import { UserActivityAnalyticsController } from '../controllers/user-activity-analytics.controller.js';
import { AuthMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

export function createUserActivityAnalyticsRoutes(
    analyticsController: UserActivityAnalyticsController,
    authMiddleware: AuthMiddleware
): Router {
    const router = Router();

    // Public endpoints (for frontend telemetry)

    /**
     * @route POST /api/analytics/events
     * @desc Store multiple user activity events
     * @access Public (with rate limiting)
     */
    router.post('/events', async (req, res) => {
        await analyticsController.storeEvents(req, res);
    });

    /**
     * @route POST /api/analytics/event
     * @desc Store single user activity event
     * @access Public (with rate limiting)
     */
    router.post('/event', async (req, res) => {
        await analyticsController.storeEvent(req, res);
    });

    /**
     * @route GET /api/analytics/health
     * @desc Get analytics system health status
     * @access Public
     */
    router.get('/health', async (req, res) => {
        await analyticsController.getAnalyticsHealth(req, res);
    });

    // Authenticated endpoints

    /**
     * @route GET /api/analytics/events
     * @desc Query user activity events
     * @access Authenticated
     */
    router.get('/events', authMiddleware.authenticate, async (req, res) => {
        await analyticsController.queryEvents(req, res);
    });
    /**
     * @route GET /api/analytics/user/:userId/behavior
     * @desc Get user behavior pattern
     * @access Authenticated (own data) / Admin (any user)
     */
    router.get('/user/:userId/behavior', authMiddleware.authenticate, async (req: AuthRequest, res) => {
        // Users can only access their own data unless they're admin
        if (req.params.userId !== req.user?.id && req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }
        await analyticsController.getUserBehaviorPattern(req, res);
    });
    /**
     * @route GET /api/analytics/user/:userId/export
     * @desc Export user data (GDPR compliance)
     * @access Authenticated (own data) / Admin (any user)
     */
    router.get('/user/:userId/export', authMiddleware.authenticate, async (req: AuthRequest, res) => {
        // Users can only export their own data unless they're admin
        if (req.params.userId !== req.user?.id && req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }
        await analyticsController.exportUserData(req, res);
    });

    /**
     * @route DELETE /api/analytics/user/:userId
     * @desc Delete user data (GDPR compliance)
     * @access Authenticated (own data) / Admin (any user)
     */
    router.delete('/user/:userId', authMiddleware.authenticate, async (req: AuthRequest, res) => {
        // Users can only delete their own data unless they're admin
        if (req.params.userId !== req.user?.id && req.user?.role !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }
        await analyticsController.deleteUserData(req, res);
    });

    // Admin-only endpoints

    /**
     * @route GET /api/analytics/dashboard
     * @desc Get analytics dashboard data
     * @access Admin only
     */
    router.get('/dashboard', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await analyticsController.getAnalyticsDashboard(req, res);
    });

    /**
     * @route GET /api/analytics/features
     * @desc Get feature usage metrics
     * @access Admin only
     */
    router.get('/features', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await analyticsController.getFeatureUsageMetrics(req, res);
    });

    /**
     * @route POST /api/analytics/aggregate
     * @desc Aggregate analytics data with custom grouping
     * @access Admin only
     */
    router.post('/aggregate', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await analyticsController.aggregateData(req, res);
    });

    return router;
}
