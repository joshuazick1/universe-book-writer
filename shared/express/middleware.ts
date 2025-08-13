/**
 * @fileoverview Shared Express middleware utilities.
 * @module shared/express/middleware
 *
 * Provides common middleware for JSON parsing, CORS, and request logging.
 *
 * @example
 * import { jsonParser, corsMiddleware, requestLogger } from 'shared/express/middleware';
 * app.use(jsonParser);
 */

import express from 'express';
import cors from 'cors';
import { logger } from '../logging/logger.js';

export const jsonParser = express.json({ limit: '10mb' });
export const corsMiddleware = cors();

export function requestLogger(req: express.Request, _res: express.Response, next: express.NextFunction): void {
    logger.info(`Request: ${req.method} ${req.originalUrl}`);
    next();
}
