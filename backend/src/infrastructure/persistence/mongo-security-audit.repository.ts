/**
 * MongoDB Security Audit Repository
 * Implements security audit logging with MongoDB persistence
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import type {
    SecurityEvent,
    SecurityAuditQuery,
    SecurityAuditSummary,
    SecurityAuditRepository,
    SecurityAlertRule,
    SecurityAlert,
    SecurityEventType,
    SecurityEventCategory,
    SecurityEventSeverity,
    SecurityEventOutcome,
} from '../../types/security-audit.types.js';

export class MongoSecurityAuditRepository implements SecurityAuditRepository {
    private db: Db;
    private eventsCollection: Collection<SecurityEvent>;
    private alertRulesCollection: Collection<SecurityAlertRule>;
    private alertsCollection: Collection<SecurityAlert>;

    constructor(
        private readonly mongoClient: MongoClient,
        private readonly databaseName: string
    ) {
        this.db = this.mongoClient.db(this.databaseName);
        this.eventsCollection = this.db.collection<SecurityEvent>('security_events');
        this.alertRulesCollection = this.db.collection<SecurityAlertRule>('security_alert_rules');
        this.alertsCollection = this.db.collection<SecurityAlert>('security_alerts');
    }

    async initialize(): Promise<void> {
        // Create indexes for optimal query performance
        await this.eventsCollection.createIndex({ userId: 1 });
        await this.eventsCollection.createIndex({ eventType: 1 });
        await this.eventsCollection.createIndex({ eventCategory: 1 });
        await this.eventsCollection.createIndex({ severity: 1 });
        await this.eventsCollection.createIndex({ timestamp: -1 });
        await this.eventsCollection.createIndex({ ipAddress: 1 });
        await this.eventsCollection.createIndex({ outcome: 1 });
        await this.eventsCollection.createIndex({ riskScore: -1 });

        // Compound indexes for common queries
        await this.eventsCollection.createIndex({ userId: 1, timestamp: -1 });
        await this.eventsCollection.createIndex({ eventType: 1, timestamp: -1 });
        await this.eventsCollection.createIndex({ severity: 1, timestamp: -1 });

        // TTL index for automatic cleanup (optional, configurable)
        await this.eventsCollection.createIndex(
            { timestamp: 1 },
            { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year
        );

        // Alert rules indexes
        await this.alertRulesCollection.createIndex({ enabled: 1 });
        await this.alertRulesCollection.createIndex({ eventTypes: 1 });

        // Alerts indexes
        await this.alertsCollection.createIndex({ status: 1 });
        await this.alertsCollection.createIndex({ triggeredAt: -1 });
        await this.alertsCollection.createIndex({ ruleId: 1 });
    }

    async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent> {
        const securityEvent: SecurityEvent = {
            ...event,
            id: uuidv4(),
            timestamp: new Date(),
        };

        await this.eventsCollection.insertOne(securityEvent);
        return securityEvent;
    }

    async getEvents(query: SecurityAuditQuery): Promise<SecurityEvent[]> {
        const filter: any = {};

        if (query.userId) {
            filter.userId = query.userId;
        }

        if (query.eventTypes && query.eventTypes.length > 0) {
            filter.eventType = { $in: query.eventTypes };
        }

        if (query.eventCategories && query.eventCategories.length > 0) {
            filter.eventCategory = { $in: query.eventCategories };
        }

        if (query.severities && query.severities.length > 0) {
            filter.severity = { $in: query.severities };
        }

        if (query.startDate || query.endDate) {
            filter.timestamp = {};
            if (query.startDate) {
                filter.timestamp.$gte = query.startDate;
            }
            if (query.endDate) {
                filter.timestamp.$lte = query.endDate;
            }
        }

        if (query.ipAddress) {
            filter.ipAddress = query.ipAddress;
        }

        if (query.outcome) {
            filter.outcome = query.outcome;
        }

        if (query.riskScoreMin !== undefined || query.riskScoreMax !== undefined) {
            filter.riskScore = {};
            if (query.riskScoreMin !== undefined) {
                filter.riskScore.$gte = query.riskScoreMin;
            }
            if (query.riskScoreMax !== undefined) {
                filter.riskScore.$lte = query.riskScoreMax;
            }
        } const sortField = query.sortBy || 'timestamp';
        const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
        const sort: { [key: string]: 1 | -1 } = { [sortField]: sortOrder };

        const limit = query.limit || 100;
        const skip = query.offset || 0;

        const events = await this.eventsCollection
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();

        return events;
    }

    async getEventById(id: string): Promise<SecurityEvent | null> {
        return await this.eventsCollection.findOne({ id });
    }

    async getSummary(startDate: Date, endDate: Date): Promise<SecurityAuditSummary> {
        const matchStage = {
            $match: {
                timestamp: {
                    $gte: startDate,
                    $lte: endDate,
                },
            },
        };

        // Get total events
        const totalEvents = await this.eventsCollection.countDocuments(matchStage.$match);

        // Get events by type
        const eventsByType = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$eventType',
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        // Get events by category
        const eventsByCategory = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$eventCategory',
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        // Get events by severity
        const eventsBySeverity = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        // Get events by outcome
        const eventsByOutcome = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $group: {
                        _id: '$outcome',
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        // Get top users
        const topUsers = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $match: {
                        userId: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: '$userId',
                        eventCount: { $sum: 1 },
                    },
                },
                {
                    $sort: { eventCount: -1 },
                },
                {
                    $limit: 10,
                },
                {
                    $project: {
                        userId: '$_id',
                        eventCount: 1,
                        _id: 0,
                    },
                },
            ])
            .toArray();

        // Get top IP addresses
        const topIpAddresses = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $match: {
                        ipAddress: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: '$ipAddress',
                        eventCount: { $sum: 1 },
                    },
                },
                {
                    $sort: { eventCount: -1 },
                },
                {
                    $limit: 10,
                },
                {
                    $project: {
                        ipAddress: '$_id',
                        eventCount: 1,
                        _id: 0,
                    },
                },
            ])
            .toArray();

        // Get risk trends (daily aggregation)
        const riskTrends = await this.eventsCollection
            .aggregate([
                matchStage,
                {
                    $match: {
                        riskScore: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$timestamp',
                            },
                        },
                        averageRiskScore: { $avg: '$riskScore' },
                        eventCount: { $sum: 1 },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
                {
                    $project: {
                        date: '$_id',
                        averageRiskScore: { $round: ['$averageRiskScore', 2] },
                        eventCount: 1,
                        _id: 0,
                    },
                },
            ])
            .toArray();

        // Convert aggregation results to typed objects
        const eventsByTypeMap: Record<SecurityEventType, number> = {} as any;
        eventsByType.forEach((item) => {
            eventsByTypeMap[item._id as SecurityEventType] = item.count;
        });

        const eventsByCategoryMap: Record<SecurityEventCategory, number> = {} as any;
        eventsByCategory.forEach((item) => {
            eventsByCategoryMap[item._id as SecurityEventCategory] = item.count;
        });

        const eventsBySeverityMap: Record<SecurityEventSeverity, number> = {} as any;
        eventsBySeverity.forEach((item) => {
            eventsBySeverityMap[item._id as SecurityEventSeverity] = item.count;
        });

        const eventsByOutcomeMap: Record<SecurityEventOutcome, number> = {} as any;
        eventsByOutcome.forEach((item) => {
            eventsByOutcomeMap[item._id as SecurityEventOutcome] = item.count;
        });

        return {
            totalEvents,
            eventsByType: eventsByTypeMap,
            eventsByCategory: eventsByCategoryMap,
            eventsBySeverity: eventsBySeverityMap,
            eventsByOutcome: eventsByOutcomeMap,
            topUsers: topUsers as Array<{ userId: string; eventCount: number }>,
            topIpAddresses: topIpAddresses as Array<{ ipAddress: string; eventCount: number }>,
            riskTrends: riskTrends as Array<{ date: string; averageRiskScore: number; eventCount: number }>,
            timeRange: {
                start: startDate,
                end: endDate,
            },
        };
    }

    async deleteOldEvents(olderThan: Date): Promise<number> {
        const result = await this.eventsCollection.deleteMany({
            timestamp: { $lt: olderThan },
        });
        return result.deletedCount;
    }

    // Alert rules management
    async createAlertRule(rule: Omit<SecurityAlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityAlertRule> {
        const alertRule: SecurityAlertRule = {
            ...rule,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.alertRulesCollection.insertOne(alertRule);
        return alertRule;
    }
    async updateAlertRule(id: string, updates: Partial<SecurityAlertRule>): Promise<SecurityAlertRule> {
        const updateData = {
            ...updates,
            updatedAt: new Date(),
        };

        const result = await this.alertRulesCollection.findOneAndUpdate(
            { id },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!result) {
            throw new Error(`Alert rule with id ${id} not found`);
        }

        return result;
    }

    async deleteAlertRule(id: string): Promise<boolean> {
        const result = await this.alertRulesCollection.deleteOne({ id });
        return result.deletedCount > 0;
    }

    async getAlertRules(): Promise<SecurityAlertRule[]> {
        return await this.alertRulesCollection.find({}).toArray();
    }

    // Alerts management
    async createAlert(alert: Omit<SecurityAlert, 'id' | 'triggeredAt'>): Promise<SecurityAlert> {
        const securityAlert: SecurityAlert = {
            ...alert,
            id: uuidv4(),
            triggeredAt: new Date(),
        };

        await this.alertsCollection.insertOne(securityAlert);
        return securityAlert;
    }

    async getAlerts(status?: SecurityAlert['status']): Promise<SecurityAlert[]> {
        const filter = status ? { status } : {};
        return await this.alertsCollection
            .find(filter)
            .sort({ triggeredAt: -1 })
            .toArray();
    }
    async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<SecurityAlert> {
        const result = await this.alertsCollection.findOneAndUpdate(
            { id },
            {
                $set: {
                    status: 'acknowledged',
                    acknowledgedAt: new Date(),
                    acknowledgedBy,
                },
            },
            { returnDocument: 'after' }
        );

        if (!result) {
            throw new Error(`Alert with id ${id} not found`);
        }

        return result;
    }
    async resolveAlert(id: string, resolvedBy: string): Promise<SecurityAlert> {
        const result = await this.alertsCollection.findOneAndUpdate(
            { id },
            {
                $set: {
                    status: 'resolved',
                    resolvedAt: new Date(),
                    resolvedBy,
                },
            },
            { returnDocument: 'after' }
        );

        if (!result) {
            throw new Error(`Alert with id ${id} not found`);
        }

        return result;
    }
}
