/**
 * Monitoring Validators
 * 
 * Validation functions for monitoring data structures including
 * error events and performance metrics.
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface ErrorEventData {
    id?: string;
    timestamp?: number;
    type: 'error' | 'warning' | 'info';
    category: 'ui' | 'api' | 'plugin' | 'auth' | 'performance' | 'security';
    message: string;
    stack?: string;
    context?: Record<string, any>;
    userId?: string;
    sessionId: string;
    userAgent: string;
    url: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved?: boolean;
    tags: string[];
}

export interface PerformanceMetricData {
    id?: string;
    timestamp?: number;
    type: 'page-load' | 'api-call' | 'user-interaction' | 'resource-load' | 'custom';
    name: string;
    duration: number;
    metadata?: Record<string, any>;
    tags: string[];
    sessionId: string;
    userId?: string;
}

/**
 * Validate error event data
 */
export function validateErrorEvent(data: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!data.type || !['error', 'warning', 'info'].includes(data.type)) {
        errors.push('type must be one of: error, warning, info');
    }

    if (!data.category || !['ui', 'api', 'plugin', 'auth', 'performance', 'security'].includes(data.category)) {
        errors.push('category must be one of: ui, api, plugin, auth, performance, security');
    }

    if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
        errors.push('message is required and must be a non-empty string');
    }

    if (!data.sessionId || typeof data.sessionId !== 'string' || data.sessionId.trim().length === 0) {
        errors.push('sessionId is required and must be a non-empty string');
    }

    if (!data.userAgent || typeof data.userAgent !== 'string') {
        errors.push('userAgent is required and must be a string');
    }

    if (!data.url || typeof data.url !== 'string') {
        errors.push('url is required and must be a string');
    }

    if (!data.severity || !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
        errors.push('severity must be one of: low, medium, high, critical');
    }

    if (!data.tags || !Array.isArray(data.tags)) {
        errors.push('tags must be an array');
    } else {
        // Validate tags array
        if (data.tags.some((tag: any) => typeof tag !== 'string')) {
            errors.push('all tags must be strings');
        }
    }

    // Optional fields validation
    if (data.timestamp !== undefined && (typeof data.timestamp !== 'number' || data.timestamp <= 0)) {
        errors.push('timestamp must be a positive number');
    }

    if (data.stack !== undefined && typeof data.stack !== 'string') {
        errors.push('stack must be a string');
    }

    if (data.context !== undefined && (typeof data.context !== 'object' || data.context === null)) {
        errors.push('context must be an object');
    }

    if (data.userId !== undefined && (typeof data.userId !== 'string' || data.userId.trim().length === 0)) {
        errors.push('userId must be a non-empty string');
    }

    if (data.resolved !== undefined && typeof data.resolved !== 'boolean') {
        errors.push('resolved must be a boolean');
    }

    // Validate message length
    if (data.message && data.message.length > 1000) {
        errors.push('message must be less than 1000 characters');
    }

    // Validate tags count
    if (data.tags && data.tags.length > 20) {
        errors.push('maximum 20 tags allowed');
    }

    // Validate context size (prevent overly large objects)
    if (data.context) {
        try {
            const contextStr = JSON.stringify(data.context);
            if (contextStr.length > 10000) {
                errors.push('context object is too large (max 10KB when serialized)');
            }
        } catch {
            errors.push('context must be JSON serializable');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate performance metric data
 */
export function validatePerformanceMetric(data: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!data.type || !['page-load', 'api-call', 'user-interaction', 'resource-load', 'custom'].includes(data.type)) {
        errors.push('type must be one of: page-load, api-call, user-interaction, resource-load, custom');
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('name is required and must be a non-empty string');
    }

    if (data.duration === undefined || typeof data.duration !== 'number' || data.duration < 0) {
        errors.push('duration is required and must be a non-negative number');
    }

    if (!data.sessionId || typeof data.sessionId !== 'string' || data.sessionId.trim().length === 0) {
        errors.push('sessionId is required and must be a non-empty string');
    }

    if (!data.tags || !Array.isArray(data.tags)) {
        errors.push('tags must be an array');
    } else {
        // Validate tags array
        if (data.tags.some((tag: any) => typeof tag !== 'string')) {
            errors.push('all tags must be strings');
        }
    }

    // Optional fields validation
    if (data.timestamp !== undefined && (typeof data.timestamp !== 'number' || data.timestamp <= 0)) {
        errors.push('timestamp must be a positive number');
    }

    if (data.metadata !== undefined && (typeof data.metadata !== 'object' || data.metadata === null)) {
        errors.push('metadata must be an object');
    }

    if (data.userId !== undefined && (typeof data.userId !== 'string' || data.userId.trim().length === 0)) {
        errors.push('userId must be a non-empty string');
    }

    // Validate name length
    if (data.name && data.name.length > 200) {
        errors.push('name must be less than 200 characters');
    }

    // Validate duration range (prevent unrealistic values)
    if (data.duration !== undefined && data.duration > 300000) { // 5 minutes
        errors.push('duration cannot exceed 300000ms (5 minutes)');
    }

    // Validate tags count
    if (data.tags && data.tags.length > 20) {
        errors.push('maximum 20 tags allowed');
    }

    // Validate metadata size
    if (data.metadata) {
        try {
            const metadataStr = JSON.stringify(data.metadata);
            if (metadataStr.length > 5000) {
                errors.push('metadata object is too large (max 5KB when serialized)');
            }
        } catch {
            errors.push('metadata must be JSON serializable');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Sanitize error event data
 */
export function sanitizeErrorEvent(data: ErrorEventData): ErrorEventData {
    return {
        ...data,
        message: data.message.trim().substring(0, 1000),
        stack: data.stack?.substring(0, 5000),
        tags: data.tags.slice(0, 20).map(tag => tag.trim()),
        context: data.context ? sanitizeObject(data.context, 10000) : undefined,
    };
}

/**
 * Sanitize performance metric data
 */
export function sanitizePerformanceMetric(data: PerformanceMetricData): PerformanceMetricData {
    return {
        ...data,
        name: data.name.trim().substring(0, 200),
        duration: Math.max(0, Math.min(data.duration, 300000)),
        tags: data.tags.slice(0, 20).map(tag => tag.trim()),
        metadata: data.metadata ? sanitizeObject(data.metadata, 5000) : undefined,
    };
}

/**
 * Sanitize object to ensure it doesn't exceed size limit
 */
function sanitizeObject(obj: any, maxSize: number): any {
    try {
        const serialized = JSON.stringify(obj);
        if (serialized.length <= maxSize) {
            return obj;
        }

        // If too large, return a truncated version
        return {
            ...obj,
            _truncated: true,
            _originalSize: serialized.length,
        };
    } catch {
        // If not serializable, return a safe representation
        return {
            _error: 'Object not serializable',
            _type: typeof obj,
        };
    }
}
