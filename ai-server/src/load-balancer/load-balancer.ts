/**
 * Ollama Load Balancer
 * Manages request distribution across multiple Ollama servers
 */

import { EventEmitter } from 'events';
import { OllamaServerConfig } from '../config/ollama.config';
import { OllamaHealthMonitor, ServerHealth } from '../health/health-monitor';

export interface LoadBalancingStrategy {
  name: string;
  selectServer(
    availableServers: OllamaServerConfig[], 
    healthStatus: Map<string, ServerHealth>, 
    metrics?: Map<string, RequestMetrics>
  ): OllamaServerConfig | null;
}

export interface RequestMetrics {
  serverId: string;
  requestCount: number;
  activeRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date;
}

/**
 * Round Robin load balancing strategy
 */
export class RoundRobinStrategy implements LoadBalancingStrategy {
  name = 'round-robin';
  private currentIndex = 0;

  selectServer(availableServers: OllamaServerConfig[], healthStatus: Map<string, ServerHealth>, metrics?: Map<string, RequestMetrics>): OllamaServerConfig | null {
    if (availableServers.length === 0) return null;
    
    const server = availableServers[this.currentIndex % availableServers.length];
    this.currentIndex = (this.currentIndex + 1) % availableServers.length;
    return server;
  }
}

/**
 * Priority-based load balancing strategy
 */
export class PriorityStrategy implements LoadBalancingStrategy {
  name = 'priority';

  selectServer(availableServers: OllamaServerConfig[], healthStatus: Map<string, ServerHealth>, metrics?: Map<string, RequestMetrics>): OllamaServerConfig | null {
    if (availableServers.length === 0) return null;
    
    // Sort by priority (highest first) and select the first one
    const sorted = [...availableServers].sort((a, b) => b.priority - a.priority);
    return sorted[0];
  }
}

/**
 * Least connections load balancing strategy
 */
export class LeastConnectionsStrategy implements LoadBalancingStrategy {
  name = 'least-connections';
  selectServer(availableServers: OllamaServerConfig[], healthStatus: Map<string, ServerHealth>, metrics?: Map<string, RequestMetrics>): OllamaServerConfig | null {
    if (availableServers.length === 0) return null;
    
    let bestServer = availableServers[0];
    let leastConnections = metrics?.get(bestServer.id)?.activeRequests ?? 0;
    
    for (const server of availableServers.slice(1)) {
      const connections = metrics?.get(server.id)?.activeRequests ?? 0;
      if (connections < leastConnections) {
        leastConnections = connections;
        bestServer = server;
      }
    }
    
    return bestServer;
  }
}

/**
 * Response time-based load balancing strategy
 */
export class ResponseTimeStrategy implements LoadBalancingStrategy {
  name = 'response-time';

  selectServer(availableServers: OllamaServerConfig[], healthStatus: Map<string, ServerHealth>, metrics?: Map<string, RequestMetrics>): OllamaServerConfig | null {
    if (availableServers.length === 0) return null;
    
    let bestServer = availableServers[0];
    let bestTime = healthStatus.get(bestServer.id)?.responseTime ?? Infinity;
    
    for (const server of availableServers.slice(1)) {
      const responseTime = healthStatus.get(server.id)?.responseTime ?? Infinity;
      if (responseTime < bestTime) {
        bestTime = responseTime;
        bestServer = server;
      }
    }
    
    return bestServer;
  }
}

export class OllamaLoadBalancer extends EventEmitter {
  private servers = new Map<string, OllamaServerConfig>();
  private metrics = new Map<string, RequestMetrics>();
  private strategy: LoadBalancingStrategy;
  private healthMonitor: OllamaHealthMonitor;

  constructor(strategy: LoadBalancingStrategy = new PriorityStrategy(), healthMonitor: OllamaHealthMonitor) {
    super();
    this.strategy = strategy;
    this.healthMonitor = healthMonitor;
  }

  /**
   * Add a server to the load balancer
   */
  public addServer(server: OllamaServerConfig): void {
    this.servers.set(server.id, server);
    
    // Initialize metrics for the server
    this.metrics.set(server.id, {
      serverId: server.id,
      requestCount: 0,
      activeRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
    });

    this.emit('serverAdded', server.id);
  }

  /**
   * Remove a server from the load balancer
   */
  public removeServer(serverId: string): void {
    this.servers.delete(serverId);
    this.metrics.delete(serverId);
    this.emit('serverRemoved', serverId);
  }

  /**
   * Update server configuration
   */
  public updateServer(server: OllamaServerConfig): void {
    this.servers.set(server.id, server);
    this.emit('serverUpdated', server.id);
  }

  /**
   * Get all servers
   */
  public getServers(): Map<string, OllamaServerConfig> {
    return new Map(this.servers);
  }

  /**
   * Get server metrics
   */
  public getMetrics(): Map<string, RequestMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Set load balancing strategy
   */
  public setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.emit('strategyChanged', strategy.name);
  }

  /**
   * Select the best server for a request
   */
  public selectServer(requiredModel?: string): OllamaServerConfig | null {
    const availableServers = this.getAvailableServers(requiredModel);
    
    if (availableServers.length === 0) {
      this.emit('noServersAvailable', requiredModel);
      return null;
    }

    const healthStatus = this.healthMonitor.getAllServerHealth();
    const selectedServer = this.strategy.selectServer(availableServers, healthStatus, this.metrics);
    
    if (selectedServer) {
      this.emit('serverSelected', selectedServer.id, this.strategy.name);
    }
    
    return selectedServer;
  }

  /**
   * Get available servers that meet the criteria
   */
  private getAvailableServers(requiredModel?: string): OllamaServerConfig[] {
    const available: OllamaServerConfig[] = [];
    
    for (const server of this.servers.values()) {
      // Check if server is active
      if (!server.isActive) continue;
      
      // Check if server is healthy
      if (!this.healthMonitor.isServerAvailable(server.id)) continue;
      
      // Check if server has required model
      if (requiredModel && !server.models.includes(requiredModel)) continue;
      
      // Check if server has capacity
      const metrics = this.metrics.get(server.id);
      if (metrics && metrics.activeRequests >= server.maxConcurrentRequests) continue;
      
      available.push(server);
    }
    
    return available;
  }

  /**
   * Record the start of a request
   */
  public recordRequestStart(serverId: string): void {
    const metrics = this.metrics.get(serverId);
    if (metrics) {
      metrics.activeRequests++;
      metrics.requestCount++;
      metrics.lastRequestTime = new Date();
    }
  }

  /**
   * Record the completion of a request
   */
  public recordRequestComplete(serverId: string, responseTime: number, success: boolean): void {
    const metrics = this.metrics.get(serverId);
    if (metrics) {
      metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
      
      // Update average response time (exponential moving average)
      if (success) {
        const alpha = 0.1; // Smoothing factor
        metrics.averageResponseTime = alpha * responseTime + (1 - alpha) * metrics.averageResponseTime;
        
        // Record success in health monitor
        this.healthMonitor.recordSuccess(serverId, responseTime);
      } else {
        // Record failure in health monitor
        this.healthMonitor.recordFailure(serverId, 'Request failed');
      }
    }
  }

  /**
   * Get server utilization statistics
   */
  public getServerUtilization(): Array<{
    serverId: string;
    name: string;
    isHealthy: boolean;
    activeRequests: number;
    maxRequests: number;
    utilization: number;
    averageResponseTime: number;
  }> {
    const utilization: Array<any> = [];
    
    for (const [serverId, server] of this.servers) {
      const metrics = this.metrics.get(serverId);
      const health = this.healthMonitor.getServerHealth(serverId);
      
      if (metrics && health) {
        utilization.push({
          serverId,
          name: server.name,
          isHealthy: health.isHealthy,
          activeRequests: metrics.activeRequests,
          maxRequests: server.maxConcurrentRequests,
          utilization: (metrics.activeRequests / server.maxConcurrentRequests) * 100,
          averageResponseTime: metrics.averageResponseTime,
        });
      }
    }
    
    return utilization;
  }

  /**
   * Reset metrics for all servers
   */
  public resetMetrics(): void {
    for (const [serverId, metrics] of this.metrics) {
      metrics.requestCount = 0;
      metrics.activeRequests = 0;
      metrics.averageResponseTime = 0;
      metrics.lastRequestTime = new Date();
    }
    this.emit('metricsReset');
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.servers.clear();
    this.metrics.clear();
    this.removeAllListeners();
  }
}
