/**
 * Monitoring Routes
 * 
 * Express routes for monitoring endpoints including error tracking,
 * performance metrics, and system health monitoring.
 */

import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

export function createMonitoringRoutes(
    monitoringController: MonitoringController,
    authMiddleware: AuthMiddleware
): Router {
    const router = Router();

    // Public endpoints (for frontend telemetry)

    /**
     * @route POST /api/monitoring/errors
     * @desc Store error event from frontend
     * @access Public (with rate limiting)
     */
    router.post('/errors', async (req, res) => {
        await monitoringController.storeError(req, res);
    });

    /**
     * @route POST /api/monitoring/performance
     * @desc Store performance metric from frontend
     * @access Public (with rate limiting)
     */
    router.post('/performance', async (req, res) => {
        await monitoringController.storePerformanceMetric(req, res);
    });

    // Protected endpoints (require authentication)
    /**
     * @route GET /api/monitoring/health
     * @desc Get system health status
     * @access Protected
     */
    router.get('/health', authMiddleware.authenticate, async (req, res) => {
        await monitoringController.getSystemHealth(req, res);
    });

    /**
     * @route GET /api/monitoring/errors/:id
     * @desc Get error details by ID
     * @access Protected
     */
    router.get('/errors/:id', authMiddleware.authenticate, async (req, res) => {
        await monitoringController.getErrorDetails(req, res);
    });

    /**
     * @route PATCH /api/monitoring/errors/:id/resolve
     * @desc Mark error as resolved
     * @access Protected
     */
    router.patch('/errors/:id/resolve', authMiddleware.authenticate, async (req, res) => {
        await monitoringController.resolveError(req, res);
    });

    // Admin-only endpoints

    /**
     * @route GET /api/monitoring/dashboard/errors
     * @desc Get error metrics for dashboard
     * @access Admin
     * @query timeRange - Time range (1h, 24h, 7d, 30d)
     * @query category - Filter by error category
     * @query severity - Filter by error severity
     * @query userId - Filter by user ID
     * @query limit - Limit number of results
     */
    router.get('/dashboard/errors', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await monitoringController.getErrorMetrics(req, res);
    });

    /**
     * @route GET /api/monitoring/dashboard/performance
     * @desc Get performance metrics for dashboard
     * @access Admin
     * @query timeRange - Time range (1h, 24h, 7d, 30d)
     * @query type - Filter by metric type
     * @query userId - Filter by user ID
     * @query limit - Limit number of results
     */
    router.get('/dashboard/performance', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await monitoringController.getPerformanceMetrics(req, res);
    });

    /**
     * @route GET /api/monitoring/dashboard/insights
     * @desc Get application insights (aggregated dashboard data)
     * @access Admin
     * @query timeRange - Time range for insights (24h, 7d, 30d)
     */
    router.get('/dashboard/insights', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await monitoringController.getApplicationInsights(req, res);
    });

    /**
     * @route GET /api/monitoring/realtime
     * @desc Get real-time metrics for live dashboard updates
     * @access Admin
     * @query since - ISO timestamp for metrics since this time
     */
    router.get('/realtime', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await monitoringController.getRealTimeMetrics(req, res);
    });

    /**
     * @route POST /api/monitoring/cleanup
     * @desc Clean up old monitoring data
     * @access Admin
     * @body olderThanDays - Delete data older than this many days
     */
    router.post('/cleanup', authMiddleware.authenticate, adminMiddleware, async (req, res) => {
        await monitoringController.cleanupOldData(req, res);
    });

    return router;
}

/**
 * Rate limiting configuration for monitoring endpoints
 */
export const monitoringRateLimits = {
    // More permissive for telemetry endpoints
    telemetry: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute per IP
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many telemetry requests, please slow down',
        },
    },

    // Standard rate limiting for dashboard endpoints
    dashboard: {
        windowMs: 60 * 1000, // 1 minute  
        max: 60, // 60 requests per minute per user
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many dashboard requests, please slow down',
        },
    },

    // Stricter rate limiting for admin operations
    admin: {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 requests per minute per admin
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many admin monitoring requests, please slow down',
        },
    },
};
