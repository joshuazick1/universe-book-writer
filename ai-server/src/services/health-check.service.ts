/**
 * Real-time server health monitoring
 */

import { ServerId, ServerInfo } from 'shared/types/server';
import { logger } from '../../../shared/logging/logger.js';
import fetch from 'node-fetch';

export interface HealthStatus {
    readonly isHealthy: boolean;
    readonly responseTime: number;
    readonly lastChecked: Date;
    readonly errorMessage?: string;
    readonly details: {
        readonly cpuUsage?: number;
        readonly memoryUsage?: number;
        readonly gpuUsage?: number;
        readonly diskUsage?: number;
        readonly activeConnections?: number;
        readonly queueDepth?: number;
    };
}

export interface SystemHealthReport {
    readonly overallHealth: 'healthy' | 'degraded' | 'critical';
    readonly totalServers: number;
    readonly healthyServers: number;
    readonly degradedServers: number;
    readonly criticalServers: number;
    readonly serverDetails: Map<ServerId, HealthStatus>;
    readonly lastUpdate: Date;
}

export class HealthCheckService {
    private serverRegistry: Map<ServerId, ServerInfo> = new Map();
    private healthStatuses: Map<ServerId, HealthStatus> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;
    private readonly checkIntervalMs: number = 30000; // 30 seconds
    private readonly timeoutMs: number = 5000; // 5 seconds
    private readonly retryAttempts: number = 3;

    constructor() {
        logger.info('HealthCheckService: Initialized', {
            checkInterval: this.checkIntervalMs,
            timeout: this.timeoutMs
        });
    }

    /**
     * Start real-time monitoring of all registered servers
     */
    async startMonitoring(): Promise<void> {
        if (this.monitoringInterval) {
            logger.warn('HealthCheckService: Monitoring already started');
            return;
        }

        logger.info('HealthCheckService: Starting health monitoring');

        // Perform initial check
        await this.performHealthChecks();

        // Set up recurring checks
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performHealthChecks();
            } catch (error) {
                logger.error('HealthCheckService: Error during scheduled health check', {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, this.checkIntervalMs);

        logger.info('HealthCheckService: Health monitoring started successfully');
    }

    /**
     * Stop health monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info('HealthCheckService: Health monitoring stopped');
        }
    }

    /**
     * Register a server for health monitoring
     */
    registerServer(server: ServerInfo): void {
        this.serverRegistry.set(server.id, server);
        logger.info('HealthCheckService: Registered server', { serverId: server.id, url: server.baseUrl });
    }

    /**
     * Unregister a server from health monitoring
     */
    unregisterServer(serverId: ServerId): void {
        this.serverRegistry.delete(serverId);
        this.healthStatuses.delete(serverId);
        logger.info('HealthCheckService: Unregistered server', { serverId });
    }

    /**
     * Check health of a specific server
     */
    async checkServerHealth(serverId: ServerId): Promise<HealthStatus> {
        const server = this.serverRegistry.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not registered`);
        }

        return await this.performSingleHealthCheck(server);
    }

    /**
     * Get current system health report
     */
    async getSystemHealth(): Promise<SystemHealthReport> {
        const serverDetails = new Map<ServerId, HealthStatus>();
        let healthyCount = 0;
        let degradedCount = 0;
        let criticalCount = 0;

        // Get latest health status for each server
        for (const [serverId, _] of this.serverRegistry) {
            const status = this.healthStatuses.get(serverId);
            if (status) {
                serverDetails.set(serverId, status);

                if (status.isHealthy) {
                    if (status.responseTime < 1000) {
                        healthyCount++;
                    } else {
                        degradedCount++;
                    }
                } else {
                    criticalCount++;
                }
            } else {
                criticalCount++;
            }
        }

        const totalServers = this.serverRegistry.size;
        let overallHealth: 'healthy' | 'degraded' | 'critical';

        if (criticalCount > 0 || healthyCount === 0) {
            overallHealth = 'critical';
        } else if (degradedCount > 0 || healthyCount < totalServers * 0.8) {
            overallHealth = 'degraded';
        } else {
            overallHealth = 'healthy';
        }

        return {
            overallHealth,
            totalServers,
            healthyServers: healthyCount,
            degradedServers: degradedCount,
            criticalServers: criticalCount,
            serverDetails,
            lastUpdate: new Date()
        };
    }

    /**
     * Get health status for a specific server
     */
    getServerHealthStatus(serverId: ServerId): HealthStatus | null {
        return this.healthStatuses.get(serverId) || null;
    }

    /**
     * Perform health checks on all registered servers
     */
    private async performHealthChecks(): Promise<void> {
        const checkPromises = Array.from(this.serverRegistry.values()).map(server =>
            this.performSingleHealthCheck(server)
                .then(status => {
                    this.healthStatuses.set(server.id, status);
                    return { serverId: server.id, status };
                })
                .catch(error => {
                    const errorStatus: HealthStatus = {
                        isHealthy: false,
                        responseTime: 0,
                        lastChecked: new Date(),
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        details: {}
                    };
                    this.healthStatuses.set(server.id, errorStatus);
                    return { serverId: server.id, status: errorStatus };
                })
        );

        const results = await Promise.allSettled(checkPromises);

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - successful;

        logger.debug('HealthCheckService: Completed health check cycle', {
            totalServers: results.length,
            successful,
            failed
        });
    }

    /**
     * Perform health check on a single server with retries
     */
    private async performSingleHealthCheck(server: ServerInfo): Promise<HealthStatus> {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const startTime = Date.now();

                // Try to reach the server's health endpoint
                const healthUrl = `${server.baseUrl}/api/health`;

                // Create an AbortController for timeout handling
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Universe-Book-Writer-HealthChecker/1.0'
                    }
                });

                clearTimeout(timeoutId);

                const responseTime = Date.now() - startTime;

                if (response.ok) {
                    // Try to parse response for additional details
                    let details: any = {};
                    try {
                        const responseText = await response.text();
                        if (responseText) {
                            details = JSON.parse(responseText);
                        }
                    } catch {
                        // Ignore parsing errors - basic health check passed
                    }

                    return {
                        isHealthy: true,
                        responseTime,
                        lastChecked: new Date(),
                        details: {
                            cpuUsage: details.cpuUsage,
                            memoryUsage: details.memoryUsage,
                            gpuUsage: details.gpuUsage,
                            diskUsage: details.diskUsage,
                            activeConnections: details.activeConnections,
                            queueDepth: details.queueDepth
                        }
                    };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (error) {
                logger.debug('HealthCheckService: Health check attempt failed', {
                    serverId: server.id,
                    attempt,
                    maxAttempts: this.retryAttempts,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });

                // If this was the last attempt, throw the error
                if (attempt === this.retryAttempts) {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        // This should never be reached, but TypeScript needs it
        throw new Error('Max retry attempts exceeded');
    }
}
