/**
 * @fileoverview Shared Express error handler middleware for consistent error responses.
 * @module shared/express/errorHandler
 *
 * Provides errorHandler middleware for Express apps.
 *
 * @example
 * import { errorHandler } from 'shared/express/errorHandler';
 * app.use(errorHandler);
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    let details: string | undefined = undefined;
    let stack: string | undefined = undefined;
    if (typeof err === 'string') {
        details = err;
    } else if (err instanceof Error) {
        details = err.message;
        stack = err.stack;
    } else if (err && typeof err === 'object') {
        if ('message' in err && typeof (err as any).message === 'string' && (err as any).message) {
            details = String((err as any).message);
            stack = (err as any).stack;
        } else {
            details = undefined;
        }
    } else {
        details = undefined;
    }
    logger.error(`[ERROR HANDLER] Unhandled error: ${details}`);
    if (stack) logger.error(`[ERROR HANDLER] Stack: ${stack}`);
    const response: { error: string; details?: string } = { error: 'Internal server error' };
    if (details !== undefined) response.details = details;
    res.status(500).json(response);
}
