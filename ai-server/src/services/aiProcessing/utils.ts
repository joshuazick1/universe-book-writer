/**
 * Universal AI Processing Framework - Utility Functions
 * 
 * Common utility functions used throughout the framework for validation,
 * formatting, timing, and other helper operations.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

import { AIRequest, ProcessingContext, PassResult, ProcessingMetrics } from './types.js';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate an AI request object
 */
export function validateAIRequest(request: AIRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.id) {
        errors.push('Request ID is required');
    }

    if (!request.type) {
        errors.push('Request type is required');
    }

    if (!request.content || request.content.trim().length === 0) {
        errors.push('Request content cannot be empty');
    }

    if (!['trivial', 'simple', 'moderate', 'complex', 'expert'].includes(request.complexity)) {
        errors.push('Invalid complexity level');
    }

    if (!['atomic', 'chapter', 'multi-chapter', 'book', 'series'].includes(request.scope)) {
        errors.push('Invalid scope');
    }

    if (!['draft', 'standard', 'publication', 'professional'].includes(request.qualityRequirement)) {
        errors.push('Invalid quality requirement');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Calculate estimated processing time based on request characteristics
 */
export function estimateProcessingTime(request: AIRequest, passCount: number): number {
    const baseTimePerPass = 30000; // 30 seconds
    const complexityMultiplier = {
        'trivial': 0.5,
        'simple': 0.7,
        'moderate': 1.0,
        'complex': 1.5,
        'expert': 2.0
    };

    const scopeMultiplier = {
        'atomic': 0.8,
        'chapter': 1.0,
        'multi-chapter': 1.3,
        'book': 1.6,
        'series': 2.0
    };

    const qualityMultiplier = {
        'draft': 0.8,
        'standard': 1.0,
        'publication': 1.2,
        'professional': 1.4
    };

    const contentLengthMultiplier = Math.min(2.0, Math.max(0.5, request.content.length / 2000));

    return Math.round(
        baseTimePerPass *
        passCount *
        complexityMultiplier[request.complexity] *
        scopeMultiplier[request.scope] *
        qualityMultiplier[request.qualityRequirement] *
        contentLengthMultiplier
    );
}

/**
 * Calculate confidence score based on pass results
 */
export function calculateOverallConfidence(passResults: PassResult[]): number {
    if (passResults.length === 0) return 0;

    const confidenceScores = passResults
        .map(result => result.confidence || 0)
        .filter(score => score > 0);

    if (confidenceScores.length === 0) return 0;

    // Use weighted average with later passes having more weight
    let totalWeight = 0;
    let weightedSum = 0;

    confidenceScores.forEach((score, index) => {
        const weight = index + 1; // Later passes have higher weight
        weightedSum += score * weight;
        totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Merge processing metrics from multiple passes
 */
export function mergeProcessingMetrics(passResults: PassResult[]): ProcessingMetrics {
    const totalExecutionTime = passResults.reduce((sum, result) =>
        sum + (result.processingTime || 0), 0);

    const passesExecuted = passResults.length;

    const totalTokens = passResults.reduce((sum, result) =>
        sum + (result.tokensUsed || 0), 0);

    const averageConfidence = calculateOverallConfidence(passResults);

    const memoryUsage = Math.max(...passResults.map(result => {
        const metadata = result.metadata as any;
        return metadata?.memoryUsage || 0;
    }), 0);

    return {
        totalExecutionTime,
        passesExecuted,
        totalTokens,
        averageConfidence,
        memoryUsage
    };
}

/**
 * Format time duration for human reading
 */
export function formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
        return `${Math.round(milliseconds)}ms`;
    }

    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Sanitize content for logging (remove sensitive information)
 */
export function sanitizeForLogging(content: string, maxLength: number = 200): string {
    // Remove potential API keys, tokens, passwords
    const sanitized = content
        .replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED]') // Potential API keys
        .replace(/password[:\s=]+\S+/gi, 'password: [REDACTED]')
        .replace(/token[:\s=]+\S+/gi, 'token: [REDACTED]')
        .replace(/key[:\s=]+\S+/gi, 'key: [REDACTED]');

    // Truncate if too long
    if (sanitized.length > maxLength) {
        return sanitized.substring(0, maxLength - 3) + '...';
    }

    return sanitized;
}

/**
 * Deep clone an object (for context isolation)
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as unknown as T;
    }

    if (obj instanceof Map) {
        const clonedMap = new Map();
        obj.forEach((value, key) => {
            clonedMap.set(key, deepClone(value));
        });
        return clonedMap as unknown as T;
    }

    if (typeof obj === 'object') {
        const clonedObj: any = {};
        Object.keys(obj).forEach(key => {
            clonedObj[key] = deepClone((obj as any)[key]);
        });
        return clonedObj;
    }

    return obj;
}

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
export function createTimeout(milliseconds: number, message?: string): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(message || `Operation timed out after ${milliseconds}ms`));
        }, milliseconds);
    });
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                break;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Check if an object has all required properties
 */
export function hasRequiredProperties<T extends Record<string, any>>(
    obj: any,
    requiredProps: (keyof T)[]
): obj is T {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    return requiredProps.every(prop => obj.hasOwnProperty(prop));
}

/**
 * Calculate a simple hash of a string (for caching keys)
 */
export function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Normalize content for consistent processing
 */
export function normalizeContent(content: string): string {
    return content
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
}

/**
 * Extract metadata from content (simple implementation)
 */
export function extractContentMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        paragraphCount: content.split(/\n\s*\n/).length,
        hasDialogue: /["'].*?["']/.test(content),
        hasQuestions: /\?/.test(content),
        hasExclamations: /!/.test(content),
        estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 250) // 250 WPM average
    };

    return metadata;
}
