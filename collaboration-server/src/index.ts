/**
 * Collaboration Server
 * Real-time collaboration server using Socket.IO for the Universe Book Writer project
 */

import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { WebSocketServer } from './websocket/websocket-server.js';
import { ConnectionManager } from './connection/connection-manager.js';
import { EventManager } from './events/event-manager.js';
import { AuthenticationManager } from './auth/authentication-manager.js';
import { HealthMonitor } from './health/health-monitor.js';
import { ReliabilityManager } from './reliability/reliability-manager.js';
import { CollaborationConfig, getCollaborationConfig } from './config/collaboration.config.js';

export interface CollaborationServerOptions {
  config?: CollaborationConfig;
  port?: number;
}

export class CollaborationServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private webSocketServer: WebSocketServer;
  private connectionManager: ConnectionManager;
  private eventManager: EventManager;
  private authManager: AuthenticationManager;
  private healthMonitor: HealthMonitor;
  private reliabilityManager: ReliabilityManager;
  private config: CollaborationConfig;
  private isRunning = false;

  constructor(options: CollaborationServerOptions = {}) {
    this.config = options.config || getCollaborationConfig();

    // Initialize Express app
    this.app = express();
    this.setupMiddleware();

    // Create HTTP server
    this.httpServer = createServer(this.app);
    // Initialize components
    this.authManager = new AuthenticationManager(this.config.auth);
    this.connectionManager = new ConnectionManager(this.config.connection);
    this.eventManager = new EventManager(this.config.events);
    this.healthMonitor = new HealthMonitor(this.config.health);
    this.reliabilityManager = new ReliabilityManager(this.config.reliability);

    // Initialize WebSocket server
    this.webSocketServer = new WebSocketServer(
      this.httpServer,
      this.connectionManager,
      this.eventManager,
      this.authManager,
      this.config.websocket
    );

    this.setupRoutes();
    this.setupEventHandlers();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors(this.config.cors));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const metrics = this.healthMonitor.getLastMetrics();
      const isHealthy = metrics?.status === 'healthy';
      res.status(isHealthy ? 200 : 503).json({
        status: metrics?.status || 'unknown',
        timestamp: metrics?.timestamp || Date.now(),
        uptime: metrics?.uptime || 0,
        metrics,
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = {
        connections: this.connectionManager.getMetrics(),
        events: this.eventManager.getMetrics(),
        websocket: this.webSocketServer.getMetrics(),
      };
      res.json(metrics);
    });

    // Connection status endpoint
    this.app.get('/connections', (req, res) => {
      const connections = this.connectionManager.getActiveConnections();
      res.json({
        count: connections.length,
        connections: connections.map(conn => ({
          id: conn.id,
          userId: conn.userId,
          connectedAt: conn.connectedAt,
          lastActivity: conn.lastActivity,
        })),
      });
    });
  }
  /**
   * Setup event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {
    // Connection events
    this.connectionManager.on('connectionEstablished', connection => {
      console.log(`Connection established: ${connection.id} (User: ${connection.userId})`);
      this.healthMonitor.incrementEventCount();
      this.healthMonitor.updateConnectionCount(
        this.connectionManager.getActiveConnections().length,
        this.connectionManager.getMetrics().totalConnections
      );
    });

    this.connectionManager.on('connectionClosed', (connectionId, userId) => {
      console.log(`Connection closed: ${connectionId} (User: ${userId})`);
      this.healthMonitor.updateConnectionCount(
        this.connectionManager.getActiveConnections().length,
        this.connectionManager.getMetrics().totalConnections
      );
    });

    this.connectionManager.on('connectionError', (connectionId, error) => {
      console.error(`Connection error for ${connectionId}:`, error.message);
      this.healthMonitor.incrementErrorCount(error.message);
    });

    // Event system events
    this.eventManager.on('eventProcessed', (_eventType, _connectionCount) => {
      this.healthMonitor.incrementEventCount();
    });

    this.eventManager.on('eventError', (eventType, error) => {
      console.error(`Event processing error for ${eventType}:`, error.message);
      this.healthMonitor.incrementErrorCount(error.message);
    });

    // WebSocket server events
    this.webSocketServer.on('serverStarted', port => {
      console.log(`WebSocket server started on port ${port}`);
    });

    this.webSocketServer.on('serverError', error => {
      console.error('WebSocket server error:', error.message);
      this.healthMonitor.incrementErrorCount(error.message);
    });

    // Health monitoring events
    this.healthMonitor.on('status-change', (oldStatus, newStatus, metrics) => {
      console.warn(`Health status changed from ${oldStatus} to ${newStatus}`, metrics);
    });

    this.healthMonitor.on('threshold-exceeded', (threshold, value, limit) => {
      console.warn(`Health threshold exceeded: ${threshold} = ${value} (limit: ${limit})`);
    });

    // Reliability manager events
    this.reliabilityManager.on('message-failed', (message, error) => {
      console.error(`Message delivery failed for user ${message.userId}:`, error.message);
      this.healthMonitor.incrementErrorCount(`Message delivery failed: ${error.message}`);
    });

    this.reliabilityManager.on('queue-full', (userId, queueSize) => {
      console.warn(`Message queue full for user ${userId}, size: ${queueSize}`);
    });
  }

  /**
   * Start the collaboration server
   */ public async start(port?: number): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    const serverPort = port ?? this.config.port ?? 3001;
    try {
      // Start health monitoring
      this.healthMonitor.start();

      // Start reliability manager
      this.reliabilityManager.start();

      // Start the HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer.listen(serverPort, () => {
          console.log(`Collaboration server started on port ${serverPort}`);
          this.isRunning = true;
          resolve();
        });

        this.httpServer.on('error', reject);
      });

      // Start WebSocket server
      await this.webSocketServer.start();

      console.log('Collaboration server fully initialized');
    } catch (error) {
      console.error('Failed to start collaboration server:', error);
      throw error;
    }
  }

  /**
   * Stop the collaboration server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping collaboration server...');
    try {
      // Stop WebSocket server
      await this.webSocketServer.stop();

      // Stop reliability manager
      this.reliabilityManager.stop();

      // Stop health monitoring
      this.healthMonitor.stop();

      // Close HTTP server
      await new Promise<void>(resolve => {
        this.httpServer.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      });

      this.isRunning = false;
      console.log('Collaboration server stopped');
    } catch (error) {
      console.error('Error stopping collaboration server:', error);
      throw error;
    }
  }
  /**
   * Get server status
   */
  public getStatus() {
    const healthMetrics = this.healthMonitor.getLastMetrics();
    return {
      isRunning: this.isRunning,
      health: {
        status: healthMetrics?.status || 'unknown',
        metrics: healthMetrics,
      },
      connections: this.connectionManager.getMetrics(),
      events: this.eventManager.getMetrics(),
      websocket: this.webSocketServer.getMetrics(),
    };
  }

  /**
   * Get configuration
   */
  public getConfiguration(): CollaborationConfig {
    return { ...this.config };
  }
}

// Start server if this file is run directly
// Only start if not in test environment
if (process.env.NODE_ENV !== 'test' && process.argv[1] && process.argv[1].endsWith('index.js')) {
  const server = new CollaborationServer();

  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Gracefully shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Gracefully shutting down...');
    await server.stop();
    process.exit(0);
  });

  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
