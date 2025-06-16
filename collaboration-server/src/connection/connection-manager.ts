/**
 * Connection Management
 * Manages WebSocket connections, authentication, and connection pooling
 */

import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import type { Socket } from 'socket.io';
import type { ConnectionConfig } from '../config/collaboration.config.js';
import { Logger } from '../utils/logger.js';

const logger = Logger.getInstance();

export interface ConnectionInfo {
  /** Unique connection identifier */
  id: string;
  /** User ID associated with the connection */
  userId: string;
  /** Socket.IO socket instance */
  socket: Socket;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Connection metadata */
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    clientVersion?: string;
    [key: string]: unknown;
  };
  /** Subscribed rooms/channels */
  subscriptions: Set<string>;
  /** Connection state */
  state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
}

export interface ConnectionMetrics {
  /** Total active connections */
  activeConnections: number;
  /** Total connections created */
  totalConnections: number;
  /** Total connections closed */
  totalDisconnections: number;
  /** Average connection duration */
  averageConnectionDuration: number;
  /** Connections by user */
  connectionsByUser: Map<string, number>;
  /** Peak concurrent connections */
  peakConcurrentConnections: number;
  /** Connection errors */
  connectionErrors: number;
}

export class ConnectionManager extends EventEmitter {
  private connections = new Map<string, ConnectionInfo>();
  private userConnections = new Map<string, Set<string>>();
  private connectionPool: ConnectionInfo[] = [];
  private config: ConnectionConfig;
  private metrics: ConnectionMetrics;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: ConnectionConfig) {
    super();
    this.config = config;
    this.metrics = {
      activeConnections: 0,
      totalConnections: 0,
      totalDisconnections: 0,
      averageConnectionDuration: 0,
      connectionsByUser: new Map(),
      peakConcurrentConnections: 0,
      connectionErrors: 0,
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Add a new connection
   */
  public addConnection(
    socket: Socket,
    userId: string,
    metadata: Record<string, unknown> = {}
  ): ConnectionInfo {
    // Check connection limits
    const userConnectionCount = this.userConnections.get(userId)?.size || 0;
    if (userConnectionCount >= this.config.maxConnectionsPerUser) {
      throw new Error(`User ${userId} has reached maximum connection limit`);
    }

    // Create connection info
    const connection: ConnectionInfo = {
      id: uuidv4(),
      userId,
      socket,
      connectedAt: new Date(),
      lastActivity: new Date(),
      metadata: {
        userAgent: socket.handshake.headers['user-agent'],
        ipAddress: socket.handshake.address,
        ...metadata,
      },
      subscriptions: new Set(),
      state: 'connecting',
    };

    // Store connection
    this.connections.set(connection.id, connection);

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connection.id);

    // Update metrics
    this.metrics.activeConnections++;
    this.metrics.totalConnections++;
    this.metrics.peakConcurrentConnections = Math.max(
      this.metrics.peakConcurrentConnections,
      this.metrics.activeConnections
    );

    const userConnectionsCount = this.metrics.connectionsByUser.get(userId) || 0;
    this.metrics.connectionsByUser.set(userId, userConnectionsCount + 1);

    // Set connection state
    connection.state = 'connected';

    // Setup socket event handlers
    this.setupSocketHandlers(connection);

    this.emit('connectionEstablished', connection);
    return connection;
  }

  /**
   * Remove a connection
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.state = 'disconnecting';

    // Calculate connection duration
    const duration = Date.now() - connection.connectedAt.getTime();
    this.updateAverageConnectionDuration(duration);

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
        this.metrics.connectionsByUser.delete(connection.userId);
      } else {
        const userConnectionsCount = this.metrics.connectionsByUser.get(connection.userId) || 0;
        this.metrics.connectionsByUser.set(
          connection.userId,
          Math.max(0, userConnectionsCount - 1)
        );
      }
    }

    // Remove from connections
    this.connections.delete(connectionId);

    // Update metrics
    this.metrics.activeConnections--;
    this.metrics.totalDisconnections++;

    connection.state = 'disconnected';

    // Add to pool if pooling is enabled
    if (this.config.enablePooling && this.connectionPool.length < this.config.poolSize) {
      // Clean connection for reuse
      const cleanConnection = { ...connection };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanConnection.socket = null as any; // Clear socket reference
      cleanConnection.subscriptions.clear();
      this.connectionPool.push(cleanConnection);
    }

    this.emit('connectionClosed', connectionId, connection.userId);
  }

  /**
   * Get connection by ID
   */
  public getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get connections by user ID
   */
  public getUserConnections(userId: string): ConnectionInfo[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return [];
    }

    const connections: ConnectionInfo[] = [];
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connections.push(connection);
      }
    }

    return connections;
  }

  /**
   * Get all active connections
   */
  public getActiveConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values()).filter(conn => conn.state === 'connected');
  }

  /**
   * Subscribe connection to a room/channel
   */
  public subscribe(connectionId: string, room: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    connection.subscriptions.add(room);
    connection.socket.join(room);
    this.updateLastActivity(connectionId);
  }

  /**
   * Unsubscribe connection from a room/channel
   */
  public unsubscribe(connectionId: string, room: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    connection.subscriptions.delete(room);
    connection.socket.leave(room);
    this.updateLastActivity(connectionId);
  }

  /**
   * Update last activity for a connection
   */
  public updateLastActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      connectionsByUser: new Map(this.metrics.connectionsByUser),
    };
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(connection: ConnectionInfo): void {
    const { socket } = connection;

    socket.on('disconnect', reason => {
      logger.info(`Socket disconnected: ${connection.id}, reason: ${reason}`);
      this.removeConnection(connection.id);
    });

    socket.on('error', error => {
      logger.error(`Socket error for ${connection.id}:`, { error: error.message });
      this.metrics.connectionErrors++;
      this.emit('connectionError', connection.id, error);
    });

    socket.on('pong', () => {
      this.updateLastActivity(connection.id);
    });

    // Setup connection timeout
    const timeout = setTimeout(() => {
      if (connection.state === 'connecting') {
        logger.info(`Connection timeout for ${connection.id}`);
        socket.disconnect(true);
        this.removeConnection(connection.id);
      }
    }, this.config.connectionTimeout);

    // Clear timeout when connection is established
    socket.once('connect', () => {
      clearTimeout(timeout);
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const connection of this.connections.values()) {
        // Send ping to check connection
        connection.socket.emit('ping');

        // Check for idle connections
        const idleTime = now - connection.lastActivity.getTime();
        if (idleTime > this.config.maxIdleTime) {
          logger.info(`Disconnecting idle connection: ${connection.id}`);
          connection.socket.disconnect(true);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up disconnected connections that might have been missed
      for (const [connectionId, connection] of this.connections.entries()) {
        if (!connection.socket.connected) {
          logger.info(`Cleaning up disconnected connection: ${connectionId}`);
          this.removeConnection(connectionId);
        }
      }

      // Trim connection pool if it's too large
      if (this.connectionPool.length > this.config.poolSize) {
        this.connectionPool = this.connectionPool.slice(0, this.config.poolSize);
      }
    }, 60000); // Run cleanup every minute
  }

  /**
   * Update average connection duration
   */
  private updateAverageConnectionDuration(duration: number): void {
    const alpha = 0.1; // Smoothing factor for exponential moving average
    this.metrics.averageConnectionDuration =
      alpha * duration + (1 - alpha) * this.metrics.averageConnectionDuration;
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all connections
    for (const connection of this.connections.values()) {
      connection.socket.disconnect(true);
    }

    // Clear data structures
    this.connections.clear();
    this.userConnections.clear();
    this.connectionPool = [];

    // Remove all listeners
    this.removeAllListeners();
  }
}
