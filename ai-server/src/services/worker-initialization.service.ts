/**
 * Worker Initialization Service - Sets up and starts the universal worker system
 */

import { universalWorkerService } from './universal-worker.service.js';
import { universalQueueService } from './universal-queue.service.js';
import { BenchmarkJobExecutor } from './executors/benchmark-job-executor.js';
import { OllamaJobExecutor } from './executors/ollama-job-executor.js';
import { logger } from '../../../shared/logging/logger.js';

export class WorkerInitializationService {
    private static isInitialized = false;

    /**
     * Initialize and start the worker system
     */
    public static initialize(): void {
        if (this.isInitialized) {
            logger.warn('[WorkerInit] Worker system already initialized');
            return;
        }

        logger.info('[WorkerInit] Initializing universal worker system...');

        try {
            // Initialize worker with queue service
            universalWorkerService.initialize(universalQueueService);

            // Register job executors
            const benchmarkExecutor = new BenchmarkJobExecutor();
            const ollamaExecutor = new OllamaJobExecutor();

            universalWorkerService.registerExecutor(benchmarkExecutor);
            universalWorkerService.registerExecutor(ollamaExecutor);

            // Start the worker
            universalWorkerService.start();

            this.isInitialized = true;
            logger.info('[WorkerInit] Universal worker system initialized and started');

            // Log worker status
            const status = universalWorkerService.getStatus();
            logger.info(`[WorkerInit] Worker status:`, status);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            logger.error(`[WorkerInit] Failed to initialize worker system: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Shutdown the worker system
     */
    public static shutdown(): void {
        if (!this.isInitialized) {
            return;
        }

        logger.info('[WorkerInit] Shutting down universal worker system...');
        universalWorkerService.stop();
        this.isInitialized = false;
        logger.info('[WorkerInit] Universal worker system shut down');
    }

    /**
     * Get initialization status
     */
    public static isWorkerInitialized(): boolean {
        return this.isInitialized;
    }
}

// Auto-initialize when module is loaded (can be disabled if needed)
// WorkerInitializationService.initialize();
