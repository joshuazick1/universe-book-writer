/**
 * Ollama Server Manager
 * Orchestrates multiple Ollama servers with load balancing and health monitoring
 */

import { EventEmitter } from 'node:events';
import {
  type ModelInfo,
  OllamaClient,
  type OllamaRequest,
  type OllamaResponse,
  type OllamaStreamResponse,
} from '../client/ollama-client.js';
import {
  type OllamaConfig,
  type OllamaServerConfig,
  getOllamaConfig,
} from '../config/ollama.config.js';
import { OllamaHealthMonitor } from '../health/health-monitor.js';
import {
  LeastConnectionsStrategy,
  OllamaLoadBalancer,
  PriorityStrategy,
  ResponseTimeStrategy,
  RoundRobinStrategy,
} from '../load-balancer/load-balancer.js';

export interface ServerManagerOptions {
  config?: OllamaConfig;
  loadBalancingStrategy?: 'priority' | 'round-robin' | 'least-connections' | 'response-time';
}

export interface GenerationOptions {
  preferredServer?: string;
  requiredModel?: string;
  timeout?: number;
  retryAttempts?: number;
}

export class OllamaServerManager extends EventEmitter {
  private config: OllamaConfig;
  private healthMonitor: OllamaHealthMonitor;
  private loadBalancer: OllamaLoadBalancer;
  private clients = new Map<string, OllamaClient>();
  private isInitialized = false;

  constructor(options: ServerManagerOptions = {}) {
    super();

    this.config = options.config || getOllamaConfig();

    // Initialize health monitor
    this.healthMonitor = new OllamaHealthMonitor({
      timeout: this.config.requestTimeout,
      interval: this.config.healthCheckInterval,
      circuitBreakerThreshold: this.config.circuitBreakerThreshold,
      circuitBreakerTimeout: this.config.circuitBreakerTimeout,
    });

    // Initialize load balancer with strategy
    const strategy = this.createLoadBalancingStrategy(options.loadBalancingStrategy || 'priority');
    this.loadBalancer = new OllamaLoadBalancer(strategy, this.healthMonitor);

    this.setupEventHandlers();
  }

  /**
   * Initialize the server manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Add servers to load balancer and start monitoring
    for (const serverConfig of this.config.servers) {
      await this.addServer(serverConfig);
    }

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Add a new server
   */
  public async addServer(serverConfig: OllamaServerConfig): Promise<void> {
    // Create client for the server
    const client = new OllamaClient(serverConfig);
    this.clients.set(serverConfig.id, client);

    // Add to load balancer
    this.loadBalancer.addServer(serverConfig);

    // Start health monitoring
    this.healthMonitor.startMonitoring(serverConfig);

    // Setup client event handlers
    this.setupClientEventHandlers(client, serverConfig.id);

    this.emit('serverAdded', serverConfig.id);
  }

  /**
   * Remove a server
   */
  public async removeServer(serverId: string): Promise<void> {
    // Stop health monitoring
    this.healthMonitor.stopMonitoring(serverId);

    // Remove from load balancer
    this.loadBalancer.removeServer(serverId);

    // Remove client
    const client = this.clients.get(serverId);
    if (client) {
      client.removeAllListeners();
      this.clients.delete(serverId);
    }

    this.emit('serverRemoved', serverId);
  }

  /**
   * Update server configuration
   */
  public async updateServer(serverConfig: OllamaServerConfig): Promise<void> {
    const existingClient = this.clients.get(serverConfig.id);
    if (existingClient) {
      existingClient.updateServerConfig(serverConfig);
      this.loadBalancer.updateServer(serverConfig);
      this.emit('serverUpdated', serverConfig.id);
    } else {
      await this.addServer(serverConfig);
    }
  }

  /**
   * Generate text completion
   */
  public async generate(
    request: OllamaRequest,
    options: GenerationOptions = {}
  ): Promise<OllamaResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const server = this.selectServer(options);
    if (!server) {
      throw new Error('No available servers for request');
    }

    const client = this.clients.get(server.id);
    if (!client) {
      throw new Error(`Client not found for server ${server.id}`);
    }

    // Record request start
    this.loadBalancer.recordRequestStart(server.id);

    const startTime = Date.now();
    let success = false;

    try {
      const response = await this.executeWithRetry(
        () => client.generate(request),
        options.retryAttempts || this.config.retryAttempts,
        this.config.retryDelay
      );

      success = true;
      return response;
    } finally {
      // Record request completion
      const duration = Date.now() - startTime;
      this.loadBalancer.recordRequestComplete(server.id, duration, success);
    }
  }

  /**
   * Generate streaming text completion
   */
  public async generateStream(
    request: OllamaRequest,
    onChunk: (chunk: OllamaStreamResponse) => void,
    options: GenerationOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const server = this.selectServer(options);
    if (!server) {
      throw new Error('No available servers for request');
    }

    const client = this.clients.get(server.id);
    if (!client) {
      throw new Error(`Client not found for server ${server.id}`);
    }

    // Record request start
    this.loadBalancer.recordRequestStart(server.id);

    const startTime = Date.now();
    let success = false;

    try {
      await client.generateStream(request, onChunk);
      success = true;
    } finally {
      // Record request completion
      const duration = Date.now() - startTime;
      this.loadBalancer.recordRequestComplete(server.id, duration, success);
    }
  }

  /**
   * Get available models across all servers
   */
  public async getAvailableModels(): Promise<Map<string, ModelInfo[]>> {
    const modelsByServer = new Map<string, ModelInfo[]>();

    for (const [serverId, client] of this.clients) {
      if (this.healthMonitor.isServerAvailable(serverId)) {
        try {
          const models = await client.getModels();
          modelsByServer.set(serverId, models);
        } catch (error) {
          this.emit('getModelsError', serverId, error);
        }
      }
    }

    return modelsByServer;
  }

  /**
   * Get all unique models across servers
   */
  public async getAllModels(): Promise<string[]> {
    const modelsByServer = await this.getAvailableModels();
    const uniqueModels = new Set<string>();

    for (const models of modelsByServer.values()) {
      for (const model of models) {
        uniqueModels.add(model.name);
      }
    }

    return Array.from(uniqueModels);
  }

  /**
   * Pull a model on a specific server
   */
  public async pullModel(
    modelName: string,
    serverId?: string,
    onProgress?: (progress: any) => void
  ): Promise<void> {
    let targetServerId = serverId;

    if (!targetServerId) {
      const server = this.selectServer({ requiredModel: undefined });
      if (!server) {
        throw new Error('No available servers for model pull');
      }
      targetServerId = server.id;
    }

    const client = this.clients.get(targetServerId);
    if (!client) {
      throw new Error(`Client not found for server ${targetServerId}`);
    }

    await client.pullModel(modelName, onProgress);

    // Update server model list after successful pull
    const serverConfig = this.loadBalancer.getServers().get(targetServerId);
    if (serverConfig && !serverConfig.models.includes(modelName)) {
      const updatedConfig = {
        ...serverConfig,
        models: [...serverConfig.models, modelName],
      };
      await this.updateServer(updatedConfig);
    }
  }

  /**
   * Get server status and metrics
   */
  public getServerStatus(): Array<{
    serverId: string;
    name: string;
    url: string;
    isActive: boolean;
    isHealthy: boolean;
    health: any;
    utilization: any;
  }> {
    const status: Array<any> = [];
    const servers = this.loadBalancer.getServers();
    const utilization = this.loadBalancer.getServerUtilization();

    for (const [serverId, server] of servers) {
      const health = this.healthMonitor.getServerHealth(serverId);
      const util = utilization.find(u => u.serverId === serverId);

      status.push({
        serverId,
        name: server.name,
        url: server.url,
        isActive: server.isActive,
        isHealthy: health?.isHealthy || false,
        health,
        utilization: util,
      });
    }

    return status;
  }

  /**
   * Set load balancing strategy
   */
  public setLoadBalancingStrategy(
    strategy: 'priority' | 'round-robin' | 'least-connections' | 'response-time'
  ): void {
    const strategyImpl = this.createLoadBalancingStrategy(strategy);
    this.loadBalancer.setStrategy(strategyImpl);
  }

  /**
   * Get configuration
   */
  public getConfiguration(): OllamaConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public async updateConfiguration(config: Partial<OllamaConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Destroy the server manager
   */
  public async destroy(): Promise<void> {
    // Remove all clients
    for (const client of this.clients.values()) {
      client.removeAllListeners();
    }
    this.clients.clear();

    // Destroy components
    this.healthMonitor.destroy();
    this.loadBalancer.destroy();

    this.isInitialized = false;
    this.removeAllListeners();
    this.emit('destroyed');
  }

  /**
   * Select a server for a request
   */
  private selectServer(options: GenerationOptions): OllamaServerConfig | null {
    if (options.preferredServer) {
      const servers = this.loadBalancer.getServers();
      const preferredServer = servers.get(options.preferredServer);
      if (preferredServer && this.healthMonitor.isServerAvailable(options.preferredServer)) {
        return preferredServer;
      }
    }

    return this.loadBalancer.selectServer(options.requiredModel);
  }

  /**
   * Create load balancing strategy
   */
  private createLoadBalancingStrategy(strategy: string) {
    switch (strategy) {
      case 'round-robin':
        return new RoundRobinStrategy();
      case 'least-connections':
        return new LeastConnectionsStrategy();
      case 'response-time':
        return new ResponseTimeStrategy();
      default:
        return new PriorityStrategy();
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    delay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.healthMonitor.on('healthCheckFailure', (serverId, health, error) => {
      this.emit('serverHealthCheckFailed', serverId, health, error);
    });

    this.healthMonitor.on('circuitBreakerOpened', serverId => {
      this.emit('serverCircuitBreakerOpened', serverId);
    });

    this.loadBalancer.on('noServersAvailable', requiredModel => {
      this.emit('noServersAvailable', requiredModel);
    });
  }

  /**
   * Setup client event handlers
   */
  private setupClientEventHandlers(client: OllamaClient, serverId: string): void {
    client.on('requestStart', (requestId, request) => {
      this.emit('requestStart', serverId, requestId, request);
    });

    client.on('requestComplete', (requestId, duration, success) => {
      this.emit('requestComplete', serverId, requestId, duration, success);
    });

    client.on('requestError', (requestId, error) => {
      this.emit('requestError', serverId, requestId, error);
    });
  }
}
