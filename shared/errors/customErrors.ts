/**
 * Shared Custom Error Classes
 *
 * Provides common error types for backend, ai-server, and plugins.
 *
 * Usage:
 *   import { NotFoundError, ValidationError } from 'shared/errors';
 *   throw new NotFoundError('Node not found');
 *
 * Edge Cases:
 *   - All errors extend Error and include a name and optional details.
 *   - Safe for serialization and logging.
 */

export class NotFoundError extends Error {
    readonly details?: unknown;
    constructor(message: string, details?: unknown) {
        super(message);
        this.name = 'NotFoundError';
        this.details = details;
        Error.captureStackTrace?.(this, NotFoundError);
    }
}

export class ValidationError extends Error {
    readonly details?: unknown;
    constructor(message: string, details?: unknown) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
        Error.captureStackTrace?.(this, ValidationError);
    }
}

export class UnauthorizedError extends Error {
    readonly details?: unknown;
    constructor(message: string, details?: unknown) {
        super(message);
        this.name = 'UnauthorizedError';
        this.details = details;
        Error.captureStackTrace?.(this, UnauthorizedError);
    }
}

export class ConflictError extends Error {
    readonly details?: unknown;
    constructor(message: string, details?: unknown) {
        super(message);
        this.name = 'ConflictError';
        this.details = details;
        Error.captureStackTrace?.(this, ConflictError);
    }
}

export class InternalServerError extends Error {
    readonly details?: unknown;
    constructor(message: string, details?: unknown) {
        super(message);
        this.name = 'InternalServerError';
        this.details = details;
        Error.captureStackTrace?.(this, InternalServerError);
    }
}
