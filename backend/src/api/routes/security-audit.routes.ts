/**
 * Security Audit Routes
 * Defines HTTP routes for security audit logging and monitoring
 */

import { Router } from 'express';
import type { SecurityAuditController } from '../controllers/security-audit.controller.js';
import type { AuthMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

export function createSecurityAuditRoutes(
    controller: SecurityAuditController,
    authMiddleware: AuthMiddleware
): Router {
    const router = Router();

    // All routes require authentication
    router.use(authMiddleware.authenticate);

    /**
     * GET /api/security-audit/events
     * Get security audit events with filtering and pagination
     * Requires admin role
     */
    router.get('/events', adminMiddleware, (req, res) => {
        controller.getAuditEvents(req as any, res);
    });

    /**
     * GET /api/security-audit/summary
     * Get security audit summary with aggregated statistics
     * Requires admin role
     */
    router.get('/summary', adminMiddleware, (req, res) => {
        controller.getAuditSummary(req as any, res);
    });

    /**
     * POST /api/security-audit/events
     * Manually log a security event
     * Requires admin role
     */
    router.post('/events', adminMiddleware, (req, res) => {
        controller.logEvent(req as any, res);
    });

    /**
     * POST /api/security-audit/cleanup
     * Clean up old audit events
     * Requires admin role
     */
    router.post('/cleanup', adminMiddleware, (req, res) => {
        controller.cleanupEvents(req as any, res);
    });

    /**
     * GET /api/security-audit/metadata
     * Get available event types, categories, severities, and outcomes
     * Requires admin role
     */
    router.get('/metadata', adminMiddleware, (req, res) => {
        controller.getEventMetadata(req as any, res);
    });

    return router;
}
