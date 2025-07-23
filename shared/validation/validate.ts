/**
 * Shared Validation Utilities
 *
 * Provides common validation functions for backend, ai-server, and plugins.
 *
 * Usage:
 *   import { validateRequired, validateString, validateNumber } from 'shared/validation';
 *   validateRequired('title', value);
 *
 * Edge Cases:
 *   - Throws ValidationError on failure.
 *   - All functions are strictly typed.
 */

import { ValidationError } from '../errors/customErrors.js';

/** Throws if value is null, undefined, or empty string. */
export function validateRequired(field: string, value: unknown): void {
    if (value === null || value === undefined || value === '') {
        throw new ValidationError(`${field} is required`, { field, value });
    }
}

/** Throws if value is not a string. */
export function validateString(field: string, value: unknown): void {
    if (typeof value !== 'string') {
        throw new ValidationError(`${field} must be a string`, { field, value });
    }
}

/** Throws if value is not a number. */
export function validateNumber(field: string, value: unknown): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ValidationError(`${field} must be a number`, { field, value });
    }
}

export default {
    validateRequired,
    validateString,
    validateNumber,
};
