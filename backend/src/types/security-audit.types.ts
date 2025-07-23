/**
 * Security audit logging types and interfaces
 * Provides comprehensive security event tracking and audit trail functionality
 */

export interface SecurityEvent {
    id: string;
    userId?: string;
    sessionId?: string;
    eventType: SecurityEventType;
    eventCategory: SecurityEventCategory;
    severity: SecurityEventSeverity;
    source: string;
    details: SecurityEventDetails;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: SecurityEventLocation;
    outcome: SecurityEventOutcome;
    riskScore?: number;
    metadata?: Record<string, unknown>;
}

export enum SecurityEventType {
    // Authentication events
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
    MFA_ENABLED = 'MFA_ENABLED',
    MFA_DISABLED = 'MFA_DISABLED',

    // Authorization events
    ACCESS_GRANTED = 'ACCESS_GRANTED',
    ACCESS_DENIED = 'ACCESS_DENIED',
    PERMISSION_ESCALATION = 'PERMISSION_ESCALATION',
    ROLE_CHANGE = 'ROLE_CHANGE',

    // Data access events
    DATA_ACCESS = 'DATA_ACCESS',
    DATA_EXPORT = 'DATA_EXPORT',
    DATA_IMPORT = 'DATA_IMPORT',
    DATA_MODIFICATION = 'DATA_MODIFICATION',
    DATA_DELETION = 'DATA_DELETION',

    // System events
    CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
    SYSTEM_STARTUP = 'SYSTEM_STARTUP',
    SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
    DATABASE_CONNECTION = 'DATABASE_CONNECTION',
    DATABASE_ERROR = 'DATABASE_ERROR',

    // Security events
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    INJECTION_ATTEMPT = 'INJECTION_ATTEMPT',
    XSS_ATTEMPT = 'XSS_ATTEMPT',
    CSRF_ATTEMPT = 'CSRF_ATTEMPT',

    // Plugin events
    PLUGIN_LOADED = 'PLUGIN_LOADED',
    PLUGIN_UNLOADED = 'PLUGIN_UNLOADED',
    PLUGIN_ERROR = 'PLUGIN_ERROR',
    PLUGIN_SECURITY_VIOLATION = 'PLUGIN_SECURITY_VIOLATION',

    // Admin events
    ADMIN_ACTION = 'ADMIN_ACTION',
    USER_CREATED = 'USER_CREATED',
    USER_DELETED = 'USER_DELETED',
    USER_SUSPENDED = 'USER_SUSPENDED',
    USER_ACTIVATED = 'USER_ACTIVATED',
}

export enum SecurityEventCategory {
    AUTHENTICATION = 'AUTHENTICATION',
    AUTHORIZATION = 'AUTHORIZATION',
    DATA_ACCESS = 'DATA_ACCESS',
    SYSTEM = 'SYSTEM',
    SECURITY = 'SECURITY',
    PLUGIN = 'PLUGIN',
    ADMIN = 'ADMIN',
}

export enum SecurityEventSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export enum SecurityEventOutcome {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    BLOCKED = 'BLOCKED',
    WARNING = 'WARNING',
}

export interface SecurityEventDetails {
    action: string;
    resource?: string;
    resourceId?: string;
    reason?: string;
    errorMessage?: string;
    additionalData?: Record<string, unknown>;
}

export interface SecurityEventLocation {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}

export interface SecurityAuditQuery {
    userId?: string;
    eventTypes?: SecurityEventType[];
    eventCategories?: SecurityEventCategory[];
    severities?: SecurityEventSeverity[];
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    outcome?: SecurityEventOutcome;
    riskScoreMin?: number;
    riskScoreMax?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp' | 'severity' | 'riskScore';
    sortOrder?: 'asc' | 'desc';
}

export interface SecurityAuditSummary {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsByCategory: Record<SecurityEventCategory, number>;
    eventsBySeverity: Record<SecurityEventSeverity, number>;
    eventsByOutcome: Record<SecurityEventOutcome, number>;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topIpAddresses: Array<{ ipAddress: string; eventCount: number }>;
    riskTrends: Array<{ date: string; averageRiskScore: number; eventCount: number }>;
    timeRange: {
        start: Date;
        end: Date;
    };
}

export interface SecurityAlertRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    eventTypes: SecurityEventType[];
    conditions: SecurityAlertCondition[];
    thresholds: SecurityAlertThreshold;
    actions: SecurityAlertAction[];
    createdAt: Date;
    updatedAt: Date;
}

export interface SecurityAlertCondition {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains';
    value: unknown;
}

export interface SecurityAlertThreshold {
    count?: number;
    timeWindow?: number; // in minutes
    riskScore?: number;
}

export interface SecurityAlertAction {
    type: 'email' | 'webhook' | 'log' | 'block';
    configuration: Record<string, unknown>;
}

export interface SecurityAlert {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: SecurityEventSeverity;
    message: string;
    events: SecurityEvent[];
    triggeredAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    status: 'open' | 'acknowledged' | 'resolved';
}

/**
 * Security audit logging repository interface
 */
export interface SecurityAuditRepository {
    logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent>;
    getEvents(query: SecurityAuditQuery): Promise<SecurityEvent[]>;
    getEventById(id: string): Promise<SecurityEvent | null>;
    getSummary(startDate: Date, endDate: Date): Promise<SecurityAuditSummary>;
    deleteOldEvents(olderThan: Date): Promise<number>;

    // Alert rules management
    createAlertRule(rule: Omit<SecurityAlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityAlertRule>;
    updateAlertRule(id: string, updates: Partial<SecurityAlertRule>): Promise<SecurityAlertRule>;
    deleteAlertRule(id: string): Promise<boolean>;
    getAlertRules(): Promise<SecurityAlertRule[]>;

    // Alerts management
    createAlert(alert: Omit<SecurityAlert, 'id' | 'triggeredAt'>): Promise<SecurityAlert>;
    getAlerts(status?: SecurityAlert['status']): Promise<SecurityAlert[]>;
    acknowledgeAlert(id: string, acknowledgedBy: string): Promise<SecurityAlert>;
    resolveAlert(id: string, resolvedBy: string): Promise<SecurityAlert>;
}

/**
 * Security audit logging service interface
 */
export interface SecurityAuditService {
    logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>;
    getAuditTrail(query: SecurityAuditQuery): Promise<SecurityEvent[]>;
    generateSummary(startDate: Date, endDate: Date): Promise<SecurityAuditSummary>;
    checkAlertRules(event: SecurityEvent): Promise<void>;
    cleanupOldEvents(retentionDays: number): Promise<number>;
}
