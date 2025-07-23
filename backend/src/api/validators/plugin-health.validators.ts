/**
 * Plugin Health Monitoring Validators
 * 
 * Request validation middleware for plugin health monitoring endpoints.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate health metric payload
 */
const validateHealthMetric: RequestHandler = (req, res, next) => {
    const errors: ValidationError[] = [];
    const data = req.body;

    // Required fields
    if (!data.id || typeof data.id !== 'string') {
        errors.push({ field: 'id', message: 'id is required and must be a string' });
    }

    if (!data.timestamp || typeof data.timestamp !== 'number' || data.timestamp <= 0) {
        errors.push({ field: 'timestamp', message: 'timestamp is required and must be a positive number' });
    }

    if (!data.pluginName || typeof data.pluginName !== 'string' || data.pluginName.length < 1 || data.pluginName.length > 100) {
        errors.push({ field: 'pluginName', message: 'pluginName is required and must be 1-100 characters' });
    }

    if (!data.status || !['healthy', 'warning', 'critical', 'offline'].includes(data.status)) {
        errors.push({ field: 'status', message: 'status must be one of: healthy, warning, critical, offline' });
    }

    if (typeof data.loadTime !== 'number' || data.loadTime < 0) {
        errors.push({ field: 'loadTime', message: 'loadTime is required and must be a non-negative number' });
    }

    if (typeof data.memoryUsage !== 'number' || data.memoryUsage < 0) {
        errors.push({ field: 'memoryUsage', message: 'memoryUsage is required and must be a non-negative number' });
    }

    if (typeof data.errorCount !== 'number' || data.errorCount < 0) {
        errors.push({ field: 'errorCount', message: 'errorCount is required and must be a non-negative number' });
    }

    if (typeof data.uptime !== 'number' || data.uptime < 0) {
        errors.push({ field: 'uptime', message: 'uptime is required and must be a non-negative number' });
    }

    if (!Array.isArray(data.activeFeatures)) {
        errors.push({ field: 'activeFeatures', message: 'activeFeatures is required and must be an array' });
    }

    if (!data.performance || typeof data.performance !== 'object') {
        errors.push({ field: 'performance', message: 'performance is required and must be an object' });
    } else {
        const perf = data.performance;
        if (typeof perf.avgResponseTime !== 'number' || perf.avgResponseTime < 0) {
            errors.push({ field: 'performance.avgResponseTime', message: 'performance.avgResponseTime must be a non-negative number' });
        }
        if (typeof perf.slowOperations !== 'number' || perf.slowOperations < 0) {
            errors.push({ field: 'performance.slowOperations', message: 'performance.slowOperations must be a non-negative number' });
        }
        if (typeof perf.resourceUsage !== 'number' || perf.resourceUsage < 0) {
            errors.push({ field: 'performance.resourceUsage', message: 'performance.resourceUsage must be a non-negative number' });
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
        return;
    }

    next();
}

/**
 * Validate load event payload
 */
const validateLoadEvent: RequestHandler = (req, res, next) => {
    const errors: ValidationError[] = [];
    const data = req.body;

    if (!data.pluginName || typeof data.pluginName !== 'string' || data.pluginName.length < 1 || data.pluginName.length > 100) {
        errors.push({ field: 'pluginName', message: 'pluginName is required and must be 1-100 characters' });
    }

    if (!data.startTime || typeof data.startTime !== 'number' || data.startTime <= 0) {
        errors.push({ field: 'startTime', message: 'startTime is required and must be a positive number' });
    }

    if (!data.endTime || typeof data.endTime !== 'number' || data.endTime <= 0) {
        errors.push({ field: 'endTime', message: 'endTime is required and must be a positive number' });
    }

    if (typeof data.duration !== 'number' || data.duration < 0) {
        errors.push({ field: 'duration', message: 'duration is required and must be a non-negative number' });
    }

    if (typeof data.success !== 'boolean') {
        errors.push({ field: 'success', message: 'success is required and must be a boolean' });
    }

    // Validate duration matches time difference
    if (data.startTime && data.endTime && data.duration !== undefined) {
        if (data.endTime <= data.startTime) {
            errors.push({ field: 'endTime', message: 'endTime must be greater than startTime' });
        } else {
            const calculatedDuration = data.endTime - data.startTime;
            if (Math.abs(data.duration - calculatedDuration) > 1) {
                errors.push({ field: 'duration', message: 'duration must match endTime - startTime' });
            }
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
        return;
    }

    next();
}

/**
 * Validate error event payload
 */
const validateErrorEvent: RequestHandler = (req, res, next) => {
    const errors: ValidationError[] = [];
    const data = req.body;

    if (!data.pluginName || typeof data.pluginName !== 'string' || data.pluginName.length < 1 || data.pluginName.length > 100) {
        errors.push({ field: 'pluginName', message: 'pluginName is required and must be 1-100 characters' });
    }

    if (!data.operation || typeof data.operation !== 'string' || data.operation.length < 1 || data.operation.length > 100) {
        errors.push({ field: 'operation', message: 'operation is required and must be 1-100 characters' });
    }

    if (!data.errorMessage || typeof data.errorMessage !== 'string' || data.errorMessage.length < 1 || data.errorMessage.length > 1000) {
        errors.push({ field: 'errorMessage', message: 'errorMessage is required and must be 1-1000 characters' });
    }

    if (!data.timestamp || typeof data.timestamp !== 'number' || data.timestamp <= 0) {
        errors.push({ field: 'timestamp', message: 'timestamp is required and must be a positive number' });
    }

    if (!data.severity || !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
        errors.push({ field: 'severity', message: 'severity must be one of: low, medium, high, critical' });
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
        return;
    }

    next();
}

/**
 * Validate performance event payload
 */
const validatePerformanceEvent: RequestHandler = (req, res, next) => {
    const errors: ValidationError[] = [];
    const data = req.body;

    if (!data.pluginName || typeof data.pluginName !== 'string' || data.pluginName.length < 1 || data.pluginName.length > 100) {
        errors.push({ field: 'pluginName', message: 'pluginName is required and must be 1-100 characters' });
    }

    if (!data.operation || typeof data.operation !== 'string' || data.operation.length < 1 || data.operation.length > 100) {
        errors.push({ field: 'operation', message: 'operation is required and must be 1-100 characters' });
    }

    if (typeof data.duration !== 'number' || data.duration < 0) {
        errors.push({ field: 'duration', message: 'duration is required and must be a non-negative number' });
    }

    if (!data.timestamp || typeof data.timestamp !== 'number' || data.timestamp <= 0) {
        errors.push({ field: 'timestamp', message: 'timestamp is required and must be a positive number' });
    }

    // Optional resourceUsage validation
    if (data.resourceUsage && typeof data.resourceUsage === 'object') {
        const res = data.resourceUsage;
        if (typeof res.memory !== 'number' || res.memory < 0) {
            errors.push({ field: 'resourceUsage.memory', message: 'resourceUsage.memory must be a non-negative number' });
        }
        if (typeof res.cpu !== 'number' || res.cpu < 0 || res.cpu > 100) {
            errors.push({ field: 'resourceUsage.cpu', message: 'resourceUsage.cpu must be a number between 0 and 100' });
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
        return;
    }

    next();
}

export const pluginHealthValidators = {
    validateHealthMetric,
    validateLoadEvent,
    validateErrorEvent,
    validatePerformanceEvent,
};
