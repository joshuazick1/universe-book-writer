/**
 * @fileoverview Aggregation Scheduler Service for the benchmark storage architecture.
 * @module ai-server/services/aggregation-scheduler
 *
 * Periodically triggers model and server aggregations to keep performance data up-to-date.
 *
 * @example
 * const scheduler = new AggregationSchedulerService();
 * scheduler.start();
 *
 * @edgecase
 * Handles service failures and automatic retry logic.
 */

import { ModelAggregationService } from './model-aggregation.service.js';
import { ServerAggregationService } from './server-aggregation.service.js';
import { PERFORMANCE_CONFIG } from '../config/performance.config.js';

export class AggregationSchedulerService {
    private modelAggregationService: ModelAggregationService;
    private serverAggregationService: ServerAggregationService;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private retryCount = 0;

    constructor(
        modelAggregationService?: ModelAggregationService,
        serverAggregationService?: ServerAggregationService
    ) {
        this.modelAggregationService = modelAggregationService || new ModelAggregationService();
        this.serverAggregationService = serverAggregationService || new ServerAggregationService();
    }

    /**
     * Start periodic aggregation
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Aggregation scheduler is already running');
            return;
        }

        console.log(`Starting aggregation scheduler with interval: ${PERFORMANCE_CONFIG.AGGREGATION_INTERVAL_MS}ms`);

        this.isRunning = true;
        this.retryCount = 0;

        // Run initial aggregation
        this.runAggregation().catch(error => {
            console.error('Initial aggregation failed:', error);
        });

        // Schedule periodic aggregations
        this.intervalId = setInterval(() => {
            this.runAggregation().catch(error => {
                console.error('Scheduled aggregation failed:', error);
                this.handleAggregationFailure(error);
            });
        }, PERFORMANCE_CONFIG.AGGREGATION_INTERVAL_MS);

        console.log('Aggregation scheduler started successfully');
    }

    /**
     * Stop periodic aggregation
     */
    public stop(): void {
        if (!this.isRunning) {
            console.warn('Aggregation scheduler is not running');
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        this.retryCount = 0;

        console.log('Aggregation scheduler stopped');
    }

    /**
     * Trigger immediate aggregation for specific models and servers
     * Useful when benchmarks complete and we want fresh aggregated data
     */
    public async triggerImmediateAggregation(
        modelIds?: string[],
        serverIds?: string[]
    ): Promise<void> {
        console.log('Triggering immediate aggregation:', { modelIds, serverIds });

        try {
            if (modelIds && modelIds.length > 0) {
                // Aggregate specific models
                const modelPromises = modelIds.map(async (modelId) => {
                    try {
                        await this.modelAggregationService.aggregateModelPerformance(modelId);
                        console.log(`✓ Immediate aggregation completed for model: ${modelId}`);
                    } catch (error) {
                        console.error(`✗ Immediate aggregation failed for model ${modelId}:`, error);
                    }
                });

                await Promise.all(modelPromises);
            }

            if (serverIds && serverIds.length > 0) {
                // Aggregate specific servers
                const serverPromises = serverIds.map(async (serverId) => {
                    try {
                        await this.serverAggregationService.aggregateServerPerformance(serverId);
                        console.log(`✓ Immediate aggregation completed for server: ${serverId}`);
                    } catch (error) {
                        console.error(`✗ Immediate aggregation failed for server ${serverId}:`, error);
                    }
                });

                await Promise.all(serverPromises);
            }

            // If no specific targets provided, run full aggregation
            if ((!modelIds || modelIds.length === 0) && (!serverIds || serverIds.length === 0)) {
                await this.runAggregation();
            }

            console.log('Immediate aggregation completed successfully');
        } catch (error) {
            console.error('Immediate aggregation failed:', error);
            throw error;
        }
    }

    /**
     * Get the current status of the scheduler
     */
    public getStatus(): {
        isRunning: boolean;
        intervalMs: number;
        retryCount: number;
        nextRun?: Date;
    } {
        const status = {
            isRunning: this.isRunning,
            intervalMs: PERFORMANCE_CONFIG.AGGREGATION_INTERVAL_MS,
            retryCount: this.retryCount,
        };

        if (this.isRunning) {
            return {
                ...status,
                nextRun: new Date(Date.now() + PERFORMANCE_CONFIG.AGGREGATION_INTERVAL_MS),
            };
        }

        return status;
    }

    /**
     * Enhanced debugging for model aggregation
     */
    public async triggerModelAggregation(modelId?: string): Promise<void> {
        try {
            console.log(`[ModelAggregation Debug] Starting aggregation for model: ${modelId || 'all models'}`);
            if (modelId) {
                await this.modelAggregationService.aggregateModelPerformance(modelId);
                console.log(`[ModelAggregation Debug] Completed aggregation for model: ${modelId}`);
            } else {
                await this.modelAggregationService.aggregateAllModels();
                console.log(`[ModelAggregation Debug] Completed aggregation for all models`);
            }
        } catch (error) {
            console.error(`[ModelAggregation Debug] Aggregation failed for model: ${modelId || 'all models'}`, error);
            throw error;
        }
    }

    /**
     * Enhanced debugging for server aggregation
     */
    public async triggerServerAggregation(serverId?: string): Promise<void> {
        try {
            console.log(`[ServerAggregation Debug] Starting aggregation for server: ${serverId || 'all servers'}`);
            if (serverId) {
                await this.serverAggregationService.aggregateServerPerformance(serverId);
                console.log(`[ServerAggregation Debug] Completed aggregation for server: ${serverId}`);
            } else {
                await this.serverAggregationService.aggregateAllServers();
                console.log(`[ServerAggregation Debug] Completed aggregation for all servers`);
            }
        } catch (error) {
            console.error(`[ServerAggregation Debug] Aggregation failed for server: ${serverId || 'all servers'}`, error);
            throw error;
        }
    }

    /**
     * Trigger both model and server aggregations
     */
    public async triggerFullAggregation(): Promise<void> {
        console.log('Starting full aggregation (models and servers)');

        try {
            await Promise.all([
                this.triggerModelAggregation(),
                this.triggerServerAggregation(),
            ]);

            console.log('Full aggregation completed successfully');
            this.retryCount = 0; // Reset retry count on success
        } catch (error) {
            console.error('Full aggregation failed:', error);
            throw error;
        }
    }

    /**
     * Enhanced logging for debugging aggregation issues
     */
    private logDetailedAggregationInfo(context: string, details: Record<string, any>): void {
        console.log(`[Aggregation Debug] Context: ${context}`, details);
    }

    /**
     * Updated runAggregation with detailed logging
     */
    private async runAggregation(): Promise<void> {
        const startTime = Date.now();

        try {
            this.logDetailedAggregationInfo('Starting aggregation', {
                timestamp: new Date().toISOString(),
                retryCount: this.retryCount,
            });

            // Use Promise.race to implement timeout
            await Promise.race([
                this.triggerFullAggregation(),
                this.createTimeoutPromise(),
            ]);

            const duration = Date.now() - startTime;
            this.logDetailedAggregationInfo('Aggregation completed', {
                durationMs: duration,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logDetailedAggregationInfo('Aggregation failed', {
                durationMs: duration,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    /**
     * Create a timeout promise that rejects after the configured timeout
     */
    private createTimeoutPromise(): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Aggregation timeout after ${PERFORMANCE_CONFIG.AGGREGATION_TIMEOUT_MS}ms`));
            }, PERFORMANCE_CONFIG.AGGREGATION_TIMEOUT_MS);
        });
    }

    /**
     * Handle aggregation failures with retry logic
     */
    private handleAggregationFailure(error: any): void {
        this.retryCount++;

        console.error(`Aggregation failure (attempt ${this.retryCount}/${PERFORMANCE_CONFIG.MAX_AGGREGATION_RETRIES}):`, error);

        if (this.retryCount >= PERFORMANCE_CONFIG.MAX_AGGREGATION_RETRIES) {
            console.error('Maximum retry attempts reached. Stopping scheduler.');
            this.stop();
            return;
        }

        // Schedule a retry with delay
        console.log(`Scheduling retry in ${PERFORMANCE_CONFIG.AGGREGATION_RETRY_DELAY_MS}ms`);
        setTimeout(() => {
            if (this.isRunning) {
                this.runAggregation().catch(retryError => {
                    console.error('Retry aggregation failed:', retryError);
                    this.handleAggregationFailure(retryError);
                });
            }
        }, PERFORMANCE_CONFIG.AGGREGATION_RETRY_DELAY_MS);
    }

    /**
     * Force restart the scheduler (stops and starts)
     */
    public restart(): void {
        console.log('Restarting aggregation scheduler');
        this.stop();

        // Small delay before restart
        setTimeout(() => {
            this.start();
        }, 1000);
    }

    /**
     * Get aggregation statistics
     */
    public getStats(): {
        isRunning: boolean;
        uptime: number;
        totalRetries: number;
        lastRun?: Date;
        nextRun?: Date;
    } {
        const stats = {
            isRunning: this.isRunning,
            uptime: this.isRunning ? Date.now() - (this.intervalId ? 0 : Date.now()) : 0,
            totalRetries: this.retryCount,
        };

        if (this.isRunning) {
            return {
                ...stats,
                lastRun: new Date(Date.now() - PERFORMANCE_CONFIG.AGGREGATION_INTERVAL_MS),
                nextRun: new Date(Date.now() + PERFORMANCE_CONFIG.AGGREGATION_INTERVAL_MS),
            };
        }

        return stats;
    }
}

// Export a singleton instance for convenience
export const aggregationScheduler = new AggregationSchedulerService();
