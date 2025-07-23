/**
 * Plugin Health Monitoring Routes
 * 
 * Express routes for plugin health monitoring endpoints.
 */

import { Router } from 'express';
import { PluginHealthMonitoringController } from '../controllers/plugin-health.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { pluginHealthValidators } from '../validators/plugin-health.validators.js';

export function createPluginHealthRoutes(
    controller: PluginHealthMonitoringController
): Router {
    const router = Router();

    // Get plugin health dashboard metrics
    router.get(
        '/dashboard',
        adminMiddleware,
        controller.getDashboardMetrics
    );

    // Get plugin health report
    router.get(
        '/report',
        adminMiddleware,
        controller.getHealthReport
    );

    // Record plugin health metric
    router.post(
        '/metrics',
        pluginHealthValidators.validateHealthMetric,
        controller.recordHealthMetric
    );

    // Record plugin load event
    router.post(
        '/events/load',
        pluginHealthValidators.validateLoadEvent,
        controller.recordLoadEvent
    );

    // Record plugin error event
    router.post(
        '/events/error',
        pluginHealthValidators.validateErrorEvent,
        controller.recordErrorEvent
    );

    // Record plugin performance event
    router.post(
        '/events/performance',
        pluginHealthValidators.validatePerformanceEvent,
        controller.recordPerformanceEvent
    );

    // Get plugin load events
    router.get(
        '/events/load',
        adminMiddleware,
        controller.getLoadEvents
    );

    // Get plugin error events
    router.get(
        '/events/error',
        adminMiddleware,
        controller.getErrorEvents
    );

    // Get plugin performance events
    router.get(
        '/events/performance',
        adminMiddleware,
        controller.getPerformanceEvents
    );

    // Get plugin health trends
    router.get(
        '/trends',
        adminMiddleware,
        controller.getHealthTrends
    );

    // Get plugin performance metrics
    router.get(
        '/performance',
        adminMiddleware,
        controller.getPerformanceMetrics
    );

    // Health check endpoint
    router.get(
        '/health',
        controller.healthCheck
    );

    return router;
}
