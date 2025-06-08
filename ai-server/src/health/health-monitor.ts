/**
 * Ollama Server Health Monitoring
 * Manages health checks and server status tracking
 */

import { EventEmitter } from 'node:events';
import axios, { AxiosError } from 'axios';
import type { OllamaServerConfig } from '../config/ollama.config.js';

export interface ServerHealth {
  serverId: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  errorCount: number;
  consecutiveFailures: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastError?: string;
  models?: string[];
}

export interface HealthCheckOptions {
  timeout: number;
  interval: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export class OllamaHealthMonitor extends EventEmitter {
  private healthStatus = new Map<string, ServerHealth>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();
  private circuitBreakerTimers = new Map<string, NodeJS.Timeout>();
  private options: HealthCheckOptions;

  constructor(options: HealthCheckOptions) {
    super();
    this.options = options;
  }

  /**
   * Start monitoring a server
   */
  public startMonitoring(server: OllamaServerConfig): void {
    const initialHealth: ServerHealth = {
      serverId: server.id,
      isHealthy: false,
      lastCheck: new Date(),
      errorCount: 0,
      consecutiveFailures: 0,
      circuitBreakerState: 'CLOSED',
    };

    this.healthStatus.set(server.id, initialHealth);

    // Perform initial health check
    this.performHealthCheck(server);

    // Schedule periodic health checks
    const interval = setInterval(() => {
      this.performHealthCheck(server);
    }, this.options.interval);

    this.checkIntervals.set(server.id, interval);
  }

  /**
   * Stop monitoring a server
   */
  public stopMonitoring(serverId: string): void {
    const interval = this.checkIntervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(serverId);
    }

    const timer = this.circuitBreakerTimers.get(serverId);
    if (timer) {
      clearTimeout(timer);
      this.circuitBreakerTimers.delete(serverId);
    }

    this.healthStatus.delete(serverId);
  }

  /**
   * Get health status for a server
   */
  public getServerHealth(serverId: string): ServerHealth | undefined {
    return this.healthStatus.get(serverId);
  }

  /**
   * Get health status for all servers
   */
  public getAllServerHealth(): Map<string, ServerHealth> {
    return new Map(this.healthStatus);
  }

  /**
   * Check if a server is available for requests
   */
  public isServerAvailable(serverId: string): boolean {
    const health = this.healthStatus.get(serverId);
    return health?.isHealthy === true && health.circuitBreakerState === 'CLOSED';
  }

  /**
   * Record a successful request to update health metrics
   */
  public recordSuccess(serverId: string, responseTime: number): void {
    const health = this.healthStatus.get(serverId);
    if (!health) return;

    health.consecutiveFailures = 0;
    health.responseTime = responseTime;

    // Close circuit breaker if it was open
    if (health.circuitBreakerState === 'HALF_OPEN') {
      health.circuitBreakerState = 'CLOSED';
      this.emit('circuitBreakerClosed', serverId);
    }
  }

  /**
   * Record a failed request to update health metrics
   */
  public recordFailure(serverId: string, error: string): void {
    const health = this.healthStatus.get(serverId);
    if (!health) return;

    health.errorCount++;
    health.consecutiveFailures++;
    health.lastError = error;

    // Open circuit breaker if threshold is reached
    if (
      health.consecutiveFailures >= this.options.circuitBreakerThreshold &&
      health.circuitBreakerState === 'CLOSED'
    ) {
      this.openCircuitBreaker(serverId);
    }
  }

  /**
   * Perform health check on a server
   */
  private async performHealthCheck(server: OllamaServerConfig): Promise<void> {
    const health = this.healthStatus.get(server.id);
    if (!health) return;

    const startTime = Date.now();

    try {
      const healthCheckUrl = `${server.url}${server.healthCheckPath || '/api/tags'}`;
      const response = await axios.get(healthCheckUrl, {
        timeout: this.options.timeout,
        headers: server.apiKey ? { Authorization: `Bearer ${server.apiKey}` } : {},
      });

      const responseTime = Date.now() - startTime;

      // Update health status
      health.isHealthy = response.status === 200;
      health.lastCheck = new Date();
      health.responseTime = responseTime;

      if (response.data?.models) {
        health.models = response.data.models.map((model: { name: string }) => model.name);
      }

      // Reset failure count on successful health check
      if (health.isHealthy) {
        health.consecutiveFailures = 0;

        // Transition from HALF_OPEN to CLOSED if successful
        if (health.circuitBreakerState === 'HALF_OPEN') {
          health.circuitBreakerState = 'CLOSED';
          this.emit('circuitBreakerClosed', server.id);
        }
      }

      this.emit('healthCheckSuccess', server.id, health);
    } catch (error) {
      const responseTime = Date.now() - startTime;

      health.isHealthy = false;
      health.lastCheck = new Date();
      health.responseTime = responseTime;
      health.errorCount++;
      health.consecutiveFailures++;

      if (error instanceof AxiosError) {
        health.lastError = `${error.code}: ${error.message}`;
      } else {
        health.lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Open circuit breaker if threshold reached
      if (
        health.consecutiveFailures >= this.options.circuitBreakerThreshold &&
        health.circuitBreakerState === 'CLOSED'
      ) {
        this.openCircuitBreaker(server.id);
      }

      this.emit('healthCheckFailure', server.id, health, error);
    }
  }

  /**
   * Open circuit breaker for a server
   */
  private openCircuitBreaker(serverId: string): void {
    const health = this.healthStatus.get(serverId);
    if (!health) return;

    health.circuitBreakerState = 'OPEN';
    this.emit('circuitBreakerOpened', serverId);

    // Schedule circuit breaker to transition to HALF_OPEN
    const timer = setTimeout(() => {
      const currentHealth = this.healthStatus.get(serverId);
      if (currentHealth && currentHealth.circuitBreakerState === 'OPEN') {
        currentHealth.circuitBreakerState = 'HALF_OPEN';
        this.emit('circuitBreakerHalfOpen', serverId);
      }
    }, this.options.circuitBreakerTimeout);

    this.circuitBreakerTimers.set(serverId, timer);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clear all intervals
    for (const interval of this.checkIntervals.values()) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();

    // Clear all timers
    for (const timer of this.circuitBreakerTimers.values()) {
      clearTimeout(timer);
    }
    this.circuitBreakerTimers.clear();

    // Clear health status
    this.healthStatus.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}
