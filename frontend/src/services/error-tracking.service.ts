/**
 * Error Tracking Service
 * 
 * Comprehensive error logging and monitoring system for production-ready error tracking.
 * Provides centralized error collection, categorization, and reporting.
 */

export interface ErrorEvent {
    id: string;
    timestamp: number;
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
    resolved: boolean;
    tags: string[];
}

export interface ErrorMetrics {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorEvent[];
    errorRate: number;
    topErrors: Array<{ message: string; count: number; lastSeen: number }>;
}

class ErrorTrackingService {
    private errors: ErrorEvent[] = [];
    private maxStoredErrors = 1000;
    private sessionId: string;
    private errorListeners: Array<(event: ErrorEvent) => void> = [];
    private metricsListeners: Array<(metrics: ErrorMetrics) => void> = [];

    constructor() {
        this.sessionId = this.generateSessionId();
        this.setupGlobalErrorHandlers();
        this.setupUnhandledRejectionHandler();
    }

    /**
     * Generate unique session ID for tracking user sessions
     */
    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Setup global error handlers to catch unhandled errors
     */
    private setupGlobalErrorHandlers(): void {
        // Catch JavaScript errors
        window.addEventListener('error', (event) => {
            this.trackError({
                type: 'error',
                category: 'ui',
                message: event.message,
                stack: event.error?.stack,
                context: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                },
                severity: 'high',
                tags: ['unhandled', 'javascript'],
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                type: 'error',
                category: 'api',
                message: `Unhandled Promise Rejection: ${event.reason}`,
                stack: event.reason?.stack,
                context: {
                    reason: event.reason,
                },
                severity: 'high',
                tags: ['unhandled', 'promise'],
            });
        });
    }

    /**
     * Setup unhandled rejection handler
     */
    private setupUnhandledRejectionHandler(): void {
        // Already handled in setupGlobalErrorHandlers
    }

    /**
     * Track a new error event
     */
    public trackError(errorData: Partial<ErrorEvent>): string {
        const error: ErrorEvent = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            type: errorData.type || 'error',
            category: errorData.category || 'ui',
            message: errorData.message || 'Unknown error',
            stack: errorData.stack,
            context: errorData.context || {},
            userId: this.getCurrentUserId(),
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            severity: errorData.severity || 'medium',
            resolved: false,
            tags: errorData.tags || [],
        };

        // Store error
        this.errors.unshift(error);

        // Maintain storage limit
        if (this.errors.length > this.maxStoredErrors) {
            this.errors = this.errors.slice(0, this.maxStoredErrors);
        }

        // Notify listeners
        this.notifyErrorListeners(error);
        this.notifyMetricsListeners();

        // Send to external monitoring service in production
        this.sendToExternalService(error);

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(`[ErrorTracker] ${error.category}:${error.severity}`, error);
        }

        return error.id;
    }

    /**
     * Track API errors specifically
     */
    public trackApiError(
        endpoint: string,
        status: number,
        message: string,
        response?: any
    ): string {
        return this.trackError({
            type: 'error',
            category: 'api',
            message: `API Error: ${endpoint} (${status}) - ${message}`,
            context: {
                endpoint,
                status,
                response,
                method: 'unknown',
            },
            severity: status >= 500 ? 'high' : 'medium',
            tags: ['api', `status-${status}`],
        });
    }

    /**
     * Track plugin errors
     */
    public trackPluginError(
        pluginName: string,
        operation: string,
        message: string,
        context?: Record<string, any>
    ): string {
        return this.trackError({
            type: 'error',
            category: 'plugin',
            message: `Plugin Error: ${pluginName} - ${operation} - ${message}`,
            context: {
                pluginName,
                operation,
                ...context,
            },
            severity: 'medium',
            tags: ['plugin', pluginName.toLowerCase()],
        });
    }

    /**
     * Track authentication errors
     */
    public trackAuthError(operation: string, message: string, context?: Record<string, any>): string {
        return this.trackError({
            type: 'error',
            category: 'auth',
            message: `Auth Error: ${operation} - ${message}`,
            context: {
                operation,
                ...context,
            },
            severity: 'high',
            tags: ['auth', operation.toLowerCase()],
        });
    }

    /**
     * Track performance issues
     */
    public trackPerformanceIssue(
        operation: string,
        duration: number,
        threshold: number,
        context?: Record<string, any>
    ): string {
        return this.trackError({
            type: 'warning',
            category: 'performance',
            message: `Performance Issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
            context: {
                operation,
                duration,
                threshold,
                ...context,
            },
            severity: duration > threshold * 2 ? 'high' : 'medium',
            tags: ['performance', 'slow'],
        });
    }

    /**
     * Track security events
     */
    public trackSecurityEvent(
        eventType: string,
        message: string,
        context?: Record<string, any>
    ): string {
        return this.trackError({
            type: 'warning',
            category: 'security',
            message: `Security Event: ${eventType} - ${message}`,
            context: {
                eventType,
                ...context,
            },
            severity: 'critical',
            tags: ['security', eventType.toLowerCase()],
        });
    }

    /**
     * Get error metrics for monitoring dashboard
     */
    public getMetrics(): ErrorMetrics {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const recentErrors = this.errors.filter(error => now - error.timestamp < oneHour);

        // Count errors by category
        const errorsByCategory: Record<string, number> = {};
        this.errors.forEach(error => {
            errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
        });

        // Count errors by severity
        const errorsBySeverity: Record<string, number> = {};
        this.errors.forEach(error => {
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
        });

        // Calculate error rate (errors per hour)
        const errorRate = recentErrors.length;

        // Get top errors
        const errorCounts: Record<string, { count: number; lastSeen: number }> = {};
        this.errors.forEach(error => {
            if (!errorCounts[error.message]) {
                errorCounts[error.message] = { count: 0, lastSeen: 0 };
            }
            errorCounts[error.message].count++;
            errorCounts[error.message].lastSeen = Math.max(
                errorCounts[error.message].lastSeen,
                error.timestamp
            );
        });

        const topErrors = Object.entries(errorCounts)
            .map(([message, data]) => ({ message, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalErrors: this.errors.length,
            errorsByCategory,
            errorsBySeverity,
            recentErrors: recentErrors.slice(0, 50),
            errorRate,
            topErrors,
        };
    }

    /**
     * Get errors by filter criteria
     */
    public getErrors(filter?: {
        category?: string;
        severity?: string;
        type?: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): ErrorEvent[] {
        let filteredErrors = [...this.errors];

        if (filter) {
            if (filter.category) {
                filteredErrors = filteredErrors.filter(error => error.category === filter.category);
            }
            if (filter.severity) {
                filteredErrors = filteredErrors.filter(error => error.severity === filter.severity);
            }
            if (filter.type) {
                filteredErrors = filteredErrors.filter(error => error.type === filter.type);
            }
            if (filter.startTime) {
                filteredErrors = filteredErrors.filter(error => error.timestamp >= filter.startTime!);
            }
            if (filter.endTime) {
                filteredErrors = filteredErrors.filter(error => error.timestamp <= filter.endTime!);
            }
            if (filter.limit) {
                filteredErrors = filteredErrors.slice(0, filter.limit);
            }
        }

        return filteredErrors;
    }

    /**
     * Mark error as resolved
     */
    public resolveError(errorId: string): boolean {
        const error = this.errors.find(e => e.id === errorId);
        if (error) {
            error.resolved = true;
            this.notifyMetricsListeners();
            return true;
        }
        return false;
    }

    /**
     * Clear old errors
     */
    public clearOldErrors(olderThanMs = 24 * 60 * 60 * 1000): number {
        const cutoff = Date.now() - olderThanMs;
        const initialCount = this.errors.length;
        this.errors = this.errors.filter(error => error.timestamp > cutoff);
        const clearedCount = initialCount - this.errors.length;

        if (clearedCount > 0) {
            this.notifyMetricsListeners();
        }

        return clearedCount;
    }

    /**
     * Subscribe to error events
     */
    public onError(listener: (event: ErrorEvent) => void): () => void {
        this.errorListeners.push(listener);
        return () => {
            const index = this.errorListeners.indexOf(listener);
            if (index > -1) {
                this.errorListeners.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to metrics updates
     */
    public onMetricsUpdate(listener: (metrics: ErrorMetrics) => void): () => void {
        this.metricsListeners.push(listener);
        return () => {
            const index = this.metricsListeners.indexOf(listener);
            if (index > -1) {
                this.metricsListeners.splice(index, 1);
            }
        };
    }

    /**
     * Generate unique error ID
     */
    private generateErrorId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current user ID from auth system
     */
    private getCurrentUserId(): string | undefined {
        // This would integrate with your auth system
        // For now, return undefined or get from localStorage/sessionStorage
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id;
        } catch {
            return undefined;
        }
    }

    /**
     * Notify error listeners
     */
    private notifyErrorListeners(error: ErrorEvent): void {
        this.errorListeners.forEach(listener => {
            try {
                listener(error);
            } catch (err) {
                console.error('Error in error listener:', err);
            }
        });
    }

    /**
     * Notify metrics listeners
     */
    private notifyMetricsListeners(): void {
        const metrics = this.getMetrics();
        this.metricsListeners.forEach(listener => {
            try {
                listener(metrics);
            } catch (err) {
                console.error('Error in metrics listener:', err);
            }
        });
    }

    /**
     * Send error to external monitoring service
     */
    private async sendToExternalService(error: ErrorEvent): Promise<void> {
        // Only send in production or if explicitly enabled
        if (process.env.NODE_ENV !== 'production' && !process.env.VITE_ENABLE_ERROR_TRACKING) {
            return;
        }

        try {
            // This would integrate with external services like Sentry, LogRocket, etc.
            // For now, we'll just send to our backend API
            await fetch('/api/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(error),
            });
        } catch (err) {
            // Don't let error tracking cause more errors
            console.warn('Failed to send error to external service:', err);
        }
    }
}

// Create singleton instance
export const errorTracker = new ErrorTrackingService();

// Export for use in other modules
export default errorTracker;
