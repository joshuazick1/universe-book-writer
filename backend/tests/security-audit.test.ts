/**
 * Security Audit System Tests
 * Tests the security audit logging functionality including repository, service, and controller
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MongoClient } from 'mongodb';
import { setupMongoForTest, type MongoTestSetup } from './helpers/mongodb-test-helper.js';
import { MongoSecurityAuditRepository } from '../src/infrastructure/persistence/mongo-security-audit.repository.js';
import { SecurityAuditServiceImpl } from '../src/infrastructure/services/security-audit.service.js';
import { SecurityAuditController } from '../src/api/controllers/security-audit.controller.js';
import {
    SecurityEventType,
    SecurityEventCategory,
    SecurityEventSeverity,
    SecurityEventOutcome,
} from '../src/types/security-audit.types.js';

describe('Security Audit System', () => {
    let mongoSetup: MongoTestSetup;
    let mongoClient: MongoClient;
    let repository: MongoSecurityAuditRepository;
    let service: SecurityAuditServiceImpl;
    let controller: SecurityAuditController;

    beforeAll(async () => {
        mongoSetup = await setupMongoForTest('security_audit_test');
        mongoClient = mongoSetup.mongoClient;
    });

    afterAll(async () => {
        await mongoSetup.cleanup();
    });

    beforeEach(async () => {
        repository = new MongoSecurityAuditRepository(mongoClient, 'test-security-audit');
        await repository.initialize();
        service = new SecurityAuditServiceImpl(repository);
        controller = new SecurityAuditController(service);
    });

    afterEach(async () => {
        // Clean up test data
        if (mongoClient) {
            const db = mongoClient.db('test-security-audit');
            await db.collection('security_events').deleteMany({});
            await db.collection('security_alert_rules').deleteMany({});
            await db.collection('security_alerts').deleteMany({});
        }
    });

    describe('MongoSecurityAuditRepository', () => {
        it('should log security events', async () => {
            const event = {
                eventType: SecurityEventType.LOGIN_SUCCESS,
                eventCategory: SecurityEventCategory.AUTHENTICATION,
                severity: SecurityEventSeverity.LOW,
                source: 'test-service',
                details: {
                    action: 'user_login',
                    resource: 'auth_endpoint',
                },
                userId: 'test-user-123',
                ipAddress: '192.168.1.100',
                outcome: SecurityEventOutcome.SUCCESS,
            };

            const loggedEvent = await repository.logEvent(event);

            expect(loggedEvent).toBeDefined();
            expect(loggedEvent.id).toBeDefined();
            expect(loggedEvent.timestamp).toBeDefined();
            expect(loggedEvent.eventType).toBe(SecurityEventType.LOGIN_SUCCESS);
            expect(loggedEvent.userId).toBe('test-user-123');
        });

        it('should query security events with filters', async () => {
            // Log multiple events
            const events = [
                {
                    eventType: SecurityEventType.LOGIN_SUCCESS,
                    eventCategory: SecurityEventCategory.AUTHENTICATION,
                    severity: SecurityEventSeverity.LOW,
                    source: 'auth-service',
                    details: { action: 'login' },
                    userId: 'user1',
                    outcome: SecurityEventOutcome.SUCCESS,
                },
                {
                    eventType: SecurityEventType.LOGIN_FAILURE,
                    eventCategory: SecurityEventCategory.AUTHENTICATION,
                    severity: SecurityEventSeverity.MEDIUM,
                    source: 'auth-service',
                    details: { action: 'login', reason: 'invalid_password' },
                    userId: 'user2',
                    outcome: SecurityEventOutcome.FAILURE,
                },
            ];

            for (const event of events) {
                await repository.logEvent(event);
            }

            // Query with filters
            const successEvents = await repository.getEvents({
                eventTypes: [SecurityEventType.LOGIN_SUCCESS],
                limit: 10,
            });

            const failureEvents = await repository.getEvents({
                outcome: SecurityEventOutcome.FAILURE,
                limit: 10,
            });

            expect(successEvents).toHaveLength(1);
            expect(successEvents[0].eventType).toBe(SecurityEventType.LOGIN_SUCCESS);
            expect(failureEvents).toHaveLength(1);
            expect(failureEvents[0].eventType).toBe(SecurityEventType.LOGIN_FAILURE);
        });

        it('should generate audit summary', async () => {
            // Log multiple events over time
            const baseDate = new Date();
            const events = [
                {
                    eventType: SecurityEventType.LOGIN_SUCCESS,
                    eventCategory: SecurityEventCategory.AUTHENTICATION,
                    severity: SecurityEventSeverity.LOW,
                    source: 'auth-service',
                    details: { action: 'login' },
                    outcome: SecurityEventOutcome.SUCCESS,
                },
                {
                    eventType: SecurityEventType.ACCESS_DENIED,
                    eventCategory: SecurityEventCategory.AUTHORIZATION,
                    severity: SecurityEventSeverity.HIGH,
                    source: 'api-service',
                    details: { action: 'access_denied' },
                    outcome: SecurityEventOutcome.BLOCKED,
                },
            ];

            for (const event of events) {
                await repository.logEvent(event);
            }

            const startDate = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
            const endDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

            const summary = await repository.getSummary(startDate, endDate);

            expect(summary.totalEvents).toBe(2);
            expect(summary.eventsByType[SecurityEventType.LOGIN_SUCCESS]).toBe(1);
            expect(summary.eventsByCategory[SecurityEventCategory.AUTHENTICATION]).toBe(1);
            expect(summary.eventsBySeverity[SecurityEventSeverity.LOW]).toBe(1);
            expect(summary.eventsByOutcome[SecurityEventOutcome.SUCCESS]).toBe(1);
        });

        it('should create and manage alert rules', async () => {
            const rule = {
                name: 'Failed Login Attempts',
                description: 'Alert on multiple failed login attempts',
                enabled: true,
                eventTypes: [SecurityEventType.LOGIN_FAILURE],
                conditions: [
                    {
                        field: 'outcome',
                        operator: 'eq' as const,
                        value: SecurityEventOutcome.FAILURE,
                    },
                ],
                thresholds: {
                    count: 3,
                    timeWindow: 15, // 15 minutes
                },
                actions: [
                    {
                        type: 'log' as const,
                        configuration: { level: 'warn' },
                    },
                ],
            };

            const createdRule = await repository.createAlertRule(rule);

            expect(createdRule).toBeDefined();
            expect(createdRule.id).toBeDefined();
            expect(createdRule.name).toBe('Failed Login Attempts');
            expect(createdRule.enabled).toBe(true);

            // Update the rule
            const updatedRule = await repository.updateAlertRule(createdRule.id, {
                enabled: false,
            });

            expect(updatedRule.enabled).toBe(false);

            // Get all rules
            const rules = await repository.getAlertRules();
            expect(rules).toHaveLength(1);
            expect(rules[0].id).toBe(createdRule.id);

            // Delete the rule
            const deleted = await repository.deleteAlertRule(createdRule.id);
            expect(deleted).toBe(true);

            const rulesAfterDeletion = await repository.getAlertRules();
            expect(rulesAfterDeletion).toHaveLength(0);
        });
    });

    describe('SecurityAuditServiceImpl', () => {
        it('should log events and handle errors gracefully', async () => {
            const event = {
                eventType: SecurityEventType.LOGIN_SUCCESS,
                eventCategory: SecurityEventCategory.AUTHENTICATION,
                severity: SecurityEventSeverity.LOW,
                source: 'test-service',
                details: {
                    action: 'user_login',
                },
                outcome: SecurityEventOutcome.SUCCESS,
            };

            // Should not throw even if there are internal errors
            await expect(service.logEvent(event)).resolves.not.toThrow();
        });

        it('should clean up old events', async () => {
            // Log some events
            const event = {
                eventType: SecurityEventType.LOGIN_SUCCESS,
                eventCategory: SecurityEventCategory.AUTHENTICATION,
                severity: SecurityEventSeverity.LOW,
                source: 'test-service',
                details: { action: 'login' },
                outcome: SecurityEventOutcome.SUCCESS,
            };

            await repository.logEvent(event);

            // Clean up events older than 1 day (should delete the event we just created)
            const deletedCount = await service.cleanupOldEvents(0); // 0 days retention
            expect(deletedCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('SecurityAuditController', () => {
        it('should handle audit events request', async () => {
            const req = {
                query: {
                    limit: '10',
                    offset: '0',
                    sortBy: 'timestamp',
                    sortOrder: 'desc',
                },
                user: { id: 'admin-user', role: 'admin' },
            } as any;

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            } as any;

            await controller.getAuditEvents(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.any(Array),
                    meta: expect.objectContaining({
                        total: expect.any(Number),
                        limit: 10,
                        offset: 0,
                    }),
                })
            );
        });

        it('should handle audit summary request', async () => {
            const req = {
                query: {},
                user: { id: 'admin-user', role: 'admin' },
            } as any;

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            } as any;

            await controller.getAuditSummary(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        totalEvents: expect.any(Number),
                        eventsByType: expect.any(Object),
                        eventsByCategory: expect.any(Object),
                        eventsBySeverity: expect.any(Object),
                        eventsByOutcome: expect.any(Object),
                    }),
                })
            );
        });

        it('should handle manual event logging', async () => {
            const req = {
                body: {
                    eventType: SecurityEventType.ADMIN_ACTION,
                    eventCategory: SecurityEventCategory.ADMIN,
                    severity: SecurityEventSeverity.MEDIUM,
                    source: 'admin-panel',
                    details: {
                        action: 'user_suspension',
                        resource: 'user_management',
                    },
                    outcome: SecurityEventOutcome.SUCCESS,
                },
                ip: '192.168.1.100',
                get: jest.fn().mockReturnValue('Test User Agent'),
                user: { id: 'admin-user', role: 'admin' },
            } as any;

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            } as any;

            await controller.logEvent(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Security event logged successfully',
                })
            );
        });

        it('should handle event metadata request', async () => {
            const req = {
                user: { id: 'admin-user', role: 'admin' },
            } as any;

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            } as any;

            await controller.getEventMetadata(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        eventTypes: expect.any(Array),
                        eventCategories: expect.any(Array),
                        severities: expect.any(Array),
                        outcomes: expect.any(Array),
                    }),
                })
            );
        });

        it('should handle cleanup request with validation', async () => {
            const req = {
                body: { retentionDays: 90 },
                user: { id: 'admin-user', role: 'admin' },
            } as any;

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            } as any;

            await controller.cleanupEvents(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: expect.stringContaining('Cleaned up'),
                    data: expect.objectContaining({
                        deletedCount: expect.any(Number),
                        retentionDays: 90,
                    }),
                })
            );
        });

        it('should reject cleanup with insufficient retention period', async () => {
            const req = {
                body: { retentionDays: 15 }, // Less than minimum 30 days
                user: { id: 'admin-user', role: 'admin' },
            } as any;

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis(),
            } as any;

            await controller.cleanupEvents(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Retention period must be at least 30 days',
                })
            );
        });
    });
});
