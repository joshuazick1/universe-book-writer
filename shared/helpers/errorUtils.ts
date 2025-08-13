/**
 * @fileoverview Shared error utilities for error normalization and reporting.
 * @module shared/helpers/errorUtils
 *
 * Provides normalizeError and getErrorMessage helpers for error handling.
 *
 * @example
 * import { normalizeError, getErrorMessage } from 'shared/helpers/errorUtils';
 */

export function normalizeError(err: unknown): Error {
    if (err instanceof Error) return err;
    if (typeof err === 'string') return new Error(err);
    return new Error(JSON.stringify(err));
}

export function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return JSON.stringify(err);
}
