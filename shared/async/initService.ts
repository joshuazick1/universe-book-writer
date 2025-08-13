/**
 * @fileoverview Shared async service for generic initialization patterns.
 * @module shared/async/initService
 *
 * Provides initService for repeated async initialization logic.
 *
 * @example
 * import { initService } from 'shared/async/initService';
 * await initService('RAG', async () => { ... });
 */

import { logger } from '../logging/logger.js';

export async function initService(name: string, initFn: () => Promise<void>): Promise<void> {
    try {
        logger.info(`Initializing service: ${name}`);
        await initFn();
        logger.info(`Service initialized: ${name}`);
    } catch (error) {
        logger.error(`Failed to initialize service: ${name}`, { error });
        throw error;
    }
}
