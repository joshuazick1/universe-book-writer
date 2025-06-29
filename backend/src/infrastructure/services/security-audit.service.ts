/**
 * Security audit logging service implementation
 * Provides comprehensive security event tracking and audit functionality
 */

import {
    SecurityEvent,
    SecurityAuditQuery,
    SecurityAuditSummary,
    SecurityAuditService,
    SecurityAuditRepository,
    SecurityAlertRule,
    SecurityAlert,
    SecurityEventType,
    SecurityEventSeverity,
} from '../../types/security-audit.types.js';

export class SecurityAuditServiceImpl implements SecurityAuditService {
    constructor(private readonly auditRepository: SecurityAuditRepository) { }

    async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
        try {
            const loggedEvent = await this.auditRepository.logEvent(event);

            // Check alert rules for this event
            await this.checkAlertRules(loggedEvent);
        } catch (error) {
            console.error('Failed to log security event:', error);
            // Don't throw here to prevent audit logging from breaking the main application
        }
    }

    async getAuditTrail(query: SecurityAuditQuery): Promise<SecurityEvent[]> {
        return await this.auditRepository.getEvents(query);
    }

    async generateSummary(startDate: Date, endDate: Date): Promise<SecurityAuditSummary> {
        return await this.auditRepository.getSummary(startDate, endDate);
    }

    async checkAlertRules(event: SecurityEvent): Promise<void> {
        try {
            const alertRules = await this.auditRepository.getAlertRules();
            const enabledRules = alertRules.filter(rule => rule.enabled);

            for (const rule of enabledRules) {
                if (await this.shouldTriggerAlert(rule, event)) {
                    await this.triggerAlert(rule, [event]);
                }
            }
        } catch (error) {
            console.error('Failed to check alert rules:', error);
        }
    }

    async cleanupOldEvents(retentionDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        return await this.auditRepository.deleteOldEvents(cutoffDate);
    }

    private async shouldTriggerAlert(rule: SecurityAlertRule, event: SecurityEvent): Promise<boolean> {
        // Check if event type matches
        if (!rule.eventTypes.includes(event.eventType)) {
            return false;
        }

        // Check conditions
        for (const condition of rule.conditions) {
            if (!this.evaluateCondition(condition, event)) {
                return false;
            }
        }

        // Check thresholds if specified
        if (rule.thresholds.count || rule.thresholds.timeWindow) {
            return await this.checkThresholds(rule, event);
        }

        // Check risk score threshold
        if (rule.thresholds.riskScore && event.riskScore !== undefined) {
            return event.riskScore >= rule.thresholds.riskScore;
        }

        return true;
    }

    private evaluateCondition(condition: any, event: SecurityEvent): boolean {
        const fieldValue = this.getFieldValue(event, condition.field);

        switch (condition.operator) {
            case 'eq':
                return fieldValue === condition.value;
            case 'ne':
                return fieldValue !== condition.value;
            case 'gt':
                return Number(fieldValue) > Number(condition.value);
            case 'lt':
                return Number(fieldValue) < Number(condition.value);
            case 'gte':
                return Number(fieldValue) >= Number(condition.value);
            case 'lte':
                return Number(fieldValue) <= Number(condition.value);
            case 'in':
                return Array.isArray(condition.value) && condition.value.includes(fieldValue);
            case 'nin':
                return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
            default:
                return false;
        }
    }

    private getFieldValue(event: SecurityEvent, field: string): unknown {
        const fields = field.split('.');
        let value: any = event;

        for (const f of fields) {
            value = value?.[f];
        }

        return value;
    }

    private async checkThresholds(rule: SecurityAlertRule, event: SecurityEvent): Promise<boolean> {
        if (!rule.thresholds.count || !rule.thresholds.timeWindow) {
            return true;
        }

        const timeWindowStart = new Date();
        timeWindowStart.setMinutes(timeWindowStart.getMinutes() - rule.thresholds.timeWindow);

        const query: SecurityAuditQuery = {
            eventTypes: rule.eventTypes,
            startDate: timeWindowStart,
            endDate: new Date(),
        };

        // Apply same conditions to the query
        for (const condition of rule.conditions) {
            this.applyConditionToQuery(query, condition);
        }

        const recentEvents = await this.auditRepository.getEvents(query);
        return recentEvents.length >= rule.thresholds.count;
    }

    private applyConditionToQuery(query: SecurityAuditQuery, condition: any): void {
        // Simple implementation - could be expanded for more complex conditions
        switch (condition.field) {
            case 'userId':
                if (condition.operator === 'eq') {
                    query.userId = condition.value as string;
                }
                break;
            case 'ipAddress':
                if (condition.operator === 'eq') {
                    query.ipAddress = condition.value as string;
                }
                break;
            case 'severity':
                if (condition.operator === 'eq') {
                    query.severities = [condition.value as SecurityEventSeverity];
                }
                break;
            // Add more field mappings as needed
        }
    }

    private async triggerAlert(rule: SecurityAlertRule, events: SecurityEvent[]): Promise<void> {
        try {
            const alert: Omit<SecurityAlert, 'id' | 'triggeredAt'> = {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: this.calculateAlertSeverity(events),
                message: this.generateAlertMessage(rule, events),
                events,
                status: 'open',
            };

            const createdAlert = await this.auditRepository.createAlert(alert);

            // Execute alert actions
            await this.executeAlertActions(rule, createdAlert);
        } catch (error) {
            console.error('Failed to trigger alert:', error);
        }
    }

    private calculateAlertSeverity(events: SecurityEvent[]): SecurityEventSeverity {
        const severities = events.map(e => e.severity);

        if (severities.includes(SecurityEventSeverity.CRITICAL)) {
            return SecurityEventSeverity.CRITICAL;
        }
        if (severities.includes(SecurityEventSeverity.HIGH)) {
            return SecurityEventSeverity.HIGH;
        }
        if (severities.includes(SecurityEventSeverity.MEDIUM)) {
            return SecurityEventSeverity.MEDIUM;
        }

        return SecurityEventSeverity.LOW;
    }

    private generateAlertMessage(rule: SecurityAlertRule, events: SecurityEvent[]): string {
        const eventCount = events.length;
        const eventType = events[0]?.eventType || 'Unknown';

        if (eventCount === 1) {
            return `Security alert: ${rule.name} - ${eventType} detected`;
        } else {
            return `Security alert: ${rule.name} - ${eventCount} ${eventType} events detected`;
        }
    }

    private async executeAlertActions(rule: SecurityAlertRule, alert: SecurityAlert): Promise<void> {
        for (const action of rule.actions) {
            try {
                switch (action.type) {
                    case 'log':
                        console.warn(`SECURITY ALERT: ${alert.message}`, {
                            alertId: alert.id,
                            ruleId: rule.id,
                            severity: alert.severity,
                            eventCount: alert.events.length,
                        });
                        break;
                    case 'email':
                        // TODO: Implement email notification
                        console.log('Email alert action not yet implemented:', action.configuration);
                        break;
                    case 'webhook':
                        // TODO: Implement webhook action
                        console.log('Webhook alert action not yet implemented:', action.configuration);
                        break;
                    case 'block':
                        // TODO: Implement blocking action (could integrate with rate limiter)
                        console.log('Block alert action not yet implemented:', action.configuration);
                        break;
                    default:
                        console.warn('Unknown alert action type:', action.type);
                }
            } catch (error) {
                console.error(`Failed to execute alert action ${action.type}:`, error);
            }
        }
    }
}
