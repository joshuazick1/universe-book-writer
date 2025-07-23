/**
 * Security Audit Controller
 * Handles HTTP requests for security audit logging and monitoring
 */

import type { Request, Response } from 'express';
import {
    SecurityEvent,
    SecurityAuditQuery,
    SecurityAuditService,
    SecurityEventType,
    SecurityEventCategory,
    SecurityEventSeverity,
    SecurityEventOutcome,
} from '../../types/security-audit.types.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export class SecurityAuditController {
    constructor(private readonly auditService: SecurityAuditService) { }

    /**
     * Get security audit events
     */
    async getAuditEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query: SecurityAuditQuery = {
                userId: req.query.userId as string,
                eventTypes: req.query.eventTypes
                    ? (req.query.eventTypes as string).split(',') as SecurityEventType[]
                    : undefined,
                eventCategories: req.query.eventCategories
                    ? (req.query.eventCategories as string).split(',') as SecurityEventCategory[]
                    : undefined,
                severities: req.query.severities
                    ? (req.query.severities as string).split(',') as SecurityEventSeverity[]
                    : undefined,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                ipAddress: req.query.ipAddress as string,
                outcome: req.query.outcome as SecurityEventOutcome,
                riskScoreMin: req.query.riskScoreMin ? Number(req.query.riskScoreMin) : undefined,
                riskScoreMax: req.query.riskScoreMax ? Number(req.query.riskScoreMax) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : 100,
                offset: req.query.offset ? Number(req.query.offset) : 0,
                sortBy: req.query.sortBy as 'timestamp' | 'severity' | 'riskScore' || 'timestamp',
                sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
            };

            const events = await this.auditService.getAuditTrail(query);

            res.json({
                success: true,
                data: events,
                meta: {
                    total: events.length,
                    limit: query.limit,
                    offset: query.offset,
                },
            });
        } catch (error) {
            console.error('Failed to get audit events:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit events',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get security audit summary
     */
    async getAuditSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const startDate = req.query.startDate
                ? new Date(req.query.startDate as string)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

            const endDate = req.query.endDate
                ? new Date(req.query.endDate as string)
                : new Date(); // Default: now

            const summary = await this.auditService.generateSummary(startDate, endDate);

            res.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            console.error('Failed to get audit summary:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit summary',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Manually log a security event (admin only)
     */
    async logEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {
                eventType,
                eventCategory,
                severity,
                source,
                details,
                userId,
                sessionId,
                ipAddress,
                userAgent,
                location,
                outcome,
                riskScore,
                metadata,
            } = req.body;

            const event: Omit<SecurityEvent, 'id' | 'timestamp'> = {
                eventType,
                eventCategory,
                severity,
                source,
                details,
                userId,
                sessionId,
                ipAddress: ipAddress || req.ip,
                userAgent: userAgent || req.get('User-Agent'),
                location,
                outcome,
                riskScore,
                metadata,
            };

            await this.auditService.logEvent(event);

            res.json({
                success: true,
                message: 'Security event logged successfully',
            });
        } catch (error) {
            console.error('Failed to log security event:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to log security event',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Clean up old audit events (admin only)
     */
    async cleanupEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const retentionDays = Number(req.body.retentionDays) || 365; // Default: 1 year

            if (retentionDays < 30) {
                res.status(400).json({
                    success: false,
                    error: 'Retention period must be at least 30 days',
                });
                return;
            }

            const deletedCount = await this.auditService.cleanupOldEvents(retentionDays);

            res.json({
                success: true,
                message: `Cleaned up ${deletedCount} old audit events`,
                data: {
                    deletedCount,
                    retentionDays,
                },
            });
        } catch (error) {
            console.error('Failed to cleanup audit events:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to cleanup audit events',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get available event types and categories
     */
    async getEventMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            res.json({
                success: true,
                data: {
                    eventTypes: Object.values(SecurityEventType),
                    eventCategories: Object.values(SecurityEventCategory),
                    severities: Object.values(SecurityEventSeverity),
                    outcomes: Object.values(SecurityEventOutcome),
                },
            });
        } catch (error) {
            console.error('Failed to get event metadata:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve event metadata',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
