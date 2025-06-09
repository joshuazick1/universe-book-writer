/**
 * WebSocket Server
 * Socket.IO-based WebSocket server for real-time collaboration
 */

import { EventEmitter } from 'node:events';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import type { Socket } from 'socket.io';
import type { ConnectionManager } from '../connection/connection-manager.js';
import type { EventManager } from '../events/event-manager.js';
import type { AuthenticationManager } from '../auth/authentication-manager.js';
import type { WebSocketConfig } from '../config/collaboration.config.js';

export interface WebSocketMetrics {
  /** Total connections established */
  totalConnections: number;
  /** Current active connections */
  activeConnections: number;
  /** Total messages sent */
  messagesSent: number;
  /** Total messages received */
  messagesReceived: number;
  /** Connection errors */
  connectionErrors: number;
  /** Message processing errors */
  messageErrors: number;
  /** Average message processing time */
  averageMessageProcessingTime: number;
}

export interface RateLimitInfo {
  /** Messages sent in current window */
  messageCount: number;
  /** Window start time */
  windowStart: number;
  /** Burst count */
  burstCount: number;
  /** Last message time */
  lastMessageTime: number;
}

export class WebSocketServer extends EventEmitter {
  private io?: SocketIOServer;
  private httpServer: HTTPServer;
  private connectionManager: ConnectionManager;
  private eventManager: EventManager;
  private authManager: AuthenticationManager;
  private config: WebSocketConfig;
  private metrics: WebSocketMetrics;
  private rateLimitMap = new Map<string, RateLimitInfo>();
  private isStarted = false;

  constructor(
    httpServer: HTTPServer,
    connectionManager: ConnectionManager,
    eventManager: EventManager,
    authManager: AuthenticationManager,
    config: WebSocketConfig
  ) {
    super();
    this.httpServer = httpServer;
    this.connectionManager = connectionManager;
    this.eventManager = eventManager;
    this.authManager = authManager;
    this.config = config;
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      connectionErrors: 0,
      messageErrors: 0,
      averageMessageProcessingTime: 0,
    };
  }

  /**
   * Start the WebSocket server
   */
  public async start(): Promise<void> {
    if (this.isStarted || !this.config.enabled) {
      return;
    }
    try {
      // Create Socket.IO server
      this.io = new SocketIOServer(this.httpServer, {
        cors: this.config.socketIO.cors,
        transports: this.config.socketIO.transports as any,
        pingTimeout: this.config.socketIO.pingTimeout,
        pingInterval: this.config.socketIO.pingInterval,
      });

      // Setup middleware
      this.setupMiddleware();

      // Setup event handlers
      this.setupEventHandlers();

      // Register collaboration event handlers
      this.registerCollaborationHandlers();

      this.isStarted = true;
      this.emit('serverStarted', this.httpServer.address());
      console.log('WebSocket server started successfully');
    } catch (error) {
      this.emit('serverError', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop the WebSocket server
   */
  public async stop(): Promise<void> {
    if (!this.isStarted || !this.io) {
      return;
    }

    try {
      await new Promise<void>(resolve => {
        this.io!.close(() => {
          console.log('WebSocket server stopped');
          resolve();
        });
      });

      this.isStarted = false;
      this.emit('serverStopped');
    } catch (error) {
      this.emit('serverError', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Setup Socket.IO middleware
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const authResult = await this.authManager.authenticate(socket);

        if (!authResult.success) {
          return next(new Error(authResult.error || 'Authentication failed'));
        }

        // Store session in socket
        socket.data.session = authResult.session;
        socket.data.userId = authResult.session!.userId;

        next();
      } catch (error) {
        next(error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Rate limiting middleware
    if (this.config.rateLimiting.enabled) {
      this.io.use((socket, next) => {
        const userId = socket.data.userId;
        if (!userId) {
          return next(new Error('User ID not found'));
        }

        // Check rate limit
        if (!this.checkRateLimit(userId)) {
          return next(new Error('Rate limit exceeded'));
        }

        next();
      });
    }

    // Connection limit middleware
    this.io.use((socket, next) => {
      if (this.metrics.activeConnections >= this.config.maxConnections) {
        return next(new Error('Connection limit exceeded'));
      }
      next();
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', socket => {
      this.handleConnection(socket);
    });

    this.io.on('error', error => {
      this.metrics.connectionErrors++;
      this.emit('serverError', error);
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId;
    const session = socket.data.session;

    try {
      // Add connection to manager
      const connection = this.connectionManager.addConnection(socket, userId, {
        sessionId: session?.sessionId,
        clientVersion: socket.handshake.headers['x-client-version'],
      });

      // Update metrics
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      console.log(`WebSocket connection established: ${connection.id} (User: ${userId})`);

      // Setup socket event handlers
      this.setupSocketHandlers(socket, connection.id);

      // Send welcome message
      socket.emit('connected', {
        connectionId: connection.id,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to handle connection:', error);
      this.metrics.connectionErrors++;
      socket.disconnect(true);
    }
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketHandlers(socket: Socket, connectionId: string): void {
    // Handle disconnection
    socket.on('disconnect', reason => {
      this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
      console.log(`Socket disconnected: ${connectionId}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', error => {
      this.metrics.connectionErrors++;
      console.error(`Socket error for ${connectionId}:`, error);
    });

    // Handle generic messages
    socket.on('message', data => {
      this.handleMessage(socket, connectionId, 'message', data);
    });

    // Handle ping/pong
    socket.on('ping', () => {
      this.connectionManager.updateLastActivity(connectionId);
      socket.emit('pong');
    });

    // Handle room subscription
    socket.on('subscribe', data => {
      this.handleSubscription(socket, connectionId, data);
    });

    // Handle room unsubscription
    socket.on('unsubscribe', data => {
      this.handleUnsubscription(socket, connectionId, data);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(
    socket: Socket,
    connectionId: string,
    eventType: string,
    data: unknown
  ): void {
    const startTime = Date.now();
    const userId = socket.data.userId;

    try {
      // Check rate limit
      if (this.config.rateLimiting.enabled && !this.checkRateLimit(userId)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Update metrics
      this.metrics.messagesReceived++;
      this.connectionManager.updateLastActivity(connectionId);

      // Emit event through event manager
      this.eventManager.emitEvent(eventType, data, userId, {
        metadata: {
          connectionId,
          timestamp: new Date().toISOString(),
        },
      });

      // Update processing time
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);
    } catch (error) {
      this.metrics.messageErrors++;
      console.error(`Error handling message from ${connectionId}:`, error);
      socket.emit('error', {
        message: 'Failed to process message',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle room subscription
   */
  private handleSubscription(socket: Socket, connectionId: string, data: { room: string }): void {
    try {
      if (!data.room) {
        socket.emit('error', { message: 'Room name is required' });
        return;
      }

      this.connectionManager.subscribe(connectionId, data.room);
      socket.emit('subscribed', { room: data.room, timestamp: new Date().toISOString() });

      console.log(`Connection ${connectionId} subscribed to room: ${data.room}`);
    } catch (error) {
      console.error(`Subscription error for ${connectionId}:`, error);
      socket.emit('error', { message: 'Failed to subscribe to room' });
    }
  }

  /**
   * Handle room unsubscription
   */
  private handleUnsubscription(socket: Socket, connectionId: string, data: { room: string }): void {
    try {
      if (!data.room) {
        socket.emit('error', { message: 'Room name is required' });
        return;
      }

      this.connectionManager.unsubscribe(connectionId, data.room);
      socket.emit('unsubscribed', { room: data.room, timestamp: new Date().toISOString() });

      console.log(`Connection ${connectionId} unsubscribed from room: ${data.room}`);
    } catch (error) {
      console.error(`Unsubscription error for ${connectionId}:`, error);
      socket.emit('error', { message: 'Failed to unsubscribe from room' });
    }
  }

  /**
   * Register collaboration event handlers
   */
  private registerCollaborationHandlers(): void {
    // Document editing events
    this.eventManager.registerHandler(
      'document:edit',
      async (event, connections) => {
        await this.broadcastToConnections('document:edit', event.payload, connections);
      },
      10
    );

    this.eventManager.registerHandler(
      'document:save',
      async (event, connections) => {
        await this.broadcastToConnections('document:save', event.payload, connections);
      },
      10
    );

    // Collaboration events
    this.eventManager.registerHandler(
      'user:joined',
      async (event, connections) => {
        await this.broadcastToConnections('user:joined', event.payload, connections);
      },
      5
    );

    this.eventManager.registerHandler(
      'user:left',
      async (event, connections) => {
        await this.broadcastToConnections('user:left', event.payload, connections);
      },
      5
    );

    // Cursor and selection events
    this.eventManager.registerHandler(
      'cursor:move',
      async (event, connections) => {
        await this.broadcastToConnections('cursor:move', event.payload, connections);
      },
      1
    );

    this.eventManager.registerHandler(
      'selection:change',
      async (event, connections) => {
        await this.broadcastToConnections('selection:change', event.payload, connections);
      },
      1
    );

    // Chat events
    this.eventManager.registerHandler(
      'chat:message',
      async (event, connections) => {
        await this.broadcastToConnections('chat:message', event.payload, connections);
      },
      5
    );
  }

  /**
   * Broadcast message to specific connections
   */
  private async broadcastToConnections(
    eventType: string,
    payload: unknown,
    connectionIds: string[]
  ): Promise<void> {
    if (!this.io) return;

    const message = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;

    for (const connectionId of connectionIds) {
      const connection = this.connectionManager.getConnection(connectionId);
      if (connection && connection.socket.connected) {
        try {
          connection.socket.emit(eventType, message);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to ${connectionId}:`, error);
          this.metrics.messageErrors++;
        }
      }
    }

    this.metrics.messagesSent += sentCount;
  }

  /**
   * Broadcast to room
   */
  public broadcastToRoom(room: string, eventType: string, payload: unknown): void {
    if (!this.io) return;

    const message = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.io.to(room).emit(eventType, message);
    this.metrics.messagesSent++;
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, eventType: string, payload: unknown): void {
    const connections = this.connectionManager.getUserConnections(userId);

    for (const connection of connections) {
      if (connection.socket.connected) {
        try {
          connection.socket.emit(eventType, {
            type: eventType,
            payload,
            timestamp: new Date().toISOString(),
          });
          this.metrics.messagesSent++;
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
          this.metrics.messageErrors++;
        }
      }
    }
  }

  /**
   * Check rate limit for user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowSize = 1000; // 1 second window

    let rateLimitInfo = this.rateLimitMap.get(userId);

    if (!rateLimitInfo) {
      rateLimitInfo = {
        messageCount: 0,
        windowStart: now,
        burstCount: 0,
        lastMessageTime: 0,
      };
      this.rateLimitMap.set(userId, rateLimitInfo);
    }

    // Reset window if needed
    if (now - rateLimitInfo.windowStart >= windowSize) {
      rateLimitInfo.messageCount = 0;
      rateLimitInfo.windowStart = now;
      rateLimitInfo.burstCount = 0;
    }

    // Check burst limit
    const timeSinceLastMessage = now - rateLimitInfo.lastMessageTime;
    if (timeSinceLastMessage < 100) {
      // Less than 100ms between messages
      rateLimitInfo.burstCount++;
      if (rateLimitInfo.burstCount > this.config.rateLimiting.burstSize) {
        return false;
      }
    } else {
      rateLimitInfo.burstCount = 0;
    }

    // Check rate limit
    if (rateLimitInfo.messageCount >= this.config.rateLimiting.maxMessagesPerSecond) {
      return false;
    }

    // Update counters
    rateLimitInfo.messageCount++;
    rateLimitInfo.lastMessageTime = now;

    return true;
  }

  /**
   * Update average message processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageMessageProcessingTime =
      alpha * processingTime + (1 - alpha) * this.metrics.averageMessageProcessingTime;
  }

  /**
   * Get WebSocket metrics
   */
  public getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Get server status
   */
  public getStatus() {
    return {
      isStarted: this.isStarted,
      isEnabled: this.config.enabled,
      activeConnections: this.metrics.activeConnections,
      totalConnections: this.metrics.totalConnections,
      rateLimitMapSize: this.rateLimitMap.size,
    };
  }
}
