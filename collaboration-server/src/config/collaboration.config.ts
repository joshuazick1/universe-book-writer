/**
 * Collaboration Server Configuration
 * Configuration management for the real-time collaboration server
 */

import { HealthCheckOptions } from '../health/health-monitor.js';
import { ReliabilityOptions } from '../reliability/reliability-manager.js';

export interface WebSocketConfig {
  /** Enable WebSocket server */
  enabled: boolean;
  /** Socket.IO server options */
  socketIO: {
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    transports: string[];
    pingTimeout: number;
    pingInterval: number;
  };
  /** Connection limits */
  maxConnections: number;
  /** Message rate limiting */
  rateLimiting: {
    enabled: boolean;
    maxMessagesPerSecond: number;
    burstSize: number;
  };
}

export interface ConnectionConfig {
  /** Maximum concurrent connections per user */
  maxConnectionsPerUser: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
  /** Maximum idle time before disconnection */
  maxIdleTime: number;
  /** Enable connection pooling */
  enablePooling: boolean;
  /** Connection pool size */
  poolSize: number;
}

export interface EventConfig {
  /** Maximum event queue size */
  maxQueueSize: number;
  /** Event processing timeout */
  processingTimeout: number;
  /** Enable event persistence */
  enablePersistence: boolean;
  /** Event retention period in milliseconds */
  retentionPeriod: number;
  /** Batch processing settings */
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeout: number;
  };
}

export interface AuthConfig {
  /** Enable authentication */
  enabled: boolean;
  /** JWT secret key */
  jwtSecret: string;
  /** Token expiration time */
  tokenExpiration: string;
  /** Enable session management */
  enableSessions: boolean;
  /** Session timeout */
  sessionTimeout: number;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface CollaborationConfig {
  /** Server port */
  port: number;
  /** Environment */
  environment: 'development' | 'production' | 'test';
  /** WebSocket configuration */
  websocket: WebSocketConfig;
  /** Connection management configuration */
  connection: ConnectionConfig;
  /** Event system configuration */
  events: EventConfig;
  /** Authentication configuration */
  auth: AuthConfig;
  /** Health monitoring configuration */
  health: Partial<HealthCheckOptions>;
  /** Reliability configuration */
  reliability: Partial<ReliabilityOptions>;
  /** CORS configuration */
  cors: CorsConfig;
}

/**
 * Get collaboration server configuration
 */
export function getCollaborationConfig(): CollaborationConfig {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return {
    port: parseInt(process.env.COLLABORATION_PORT || '3001'),
    environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',

    websocket: {
      enabled: process.env.WEBSOCKET_ENABLED !== 'false',
      socketIO: {
        cors: {
          origin:
            process.env.WEBSOCKET_CORS_ORIGIN?.split(',') ||
            (isDevelopment ? ['http://localhost:5173', 'http://localhost:3000'] : []),
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT || '60000'),
        pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '25000'),
      },
      maxConnections: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '1000'),
      rateLimiting: {
        enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
        maxMessagesPerSecond: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_SECOND || '10'),
        burstSize: parseInt(process.env.RATE_LIMIT_BURST_SIZE || '20'),
      },
    },

    connection: {
      maxConnectionsPerUser: parseInt(process.env.MAX_CONNECTIONS_PER_USER || '5'),
      connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '30000'),
      heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'),
      maxIdleTime: parseInt(process.env.MAX_IDLE_TIME || '300000'), // 5 minutes
      enablePooling: process.env.CONNECTION_POOLING_ENABLED !== 'false',
      poolSize: parseInt(process.env.CONNECTION_POOL_SIZE || '100'),
    },

    events: {
      maxQueueSize: parseInt(process.env.EVENT_MAX_QUEUE_SIZE || '10000'),
      processingTimeout: parseInt(process.env.EVENT_PROCESSING_TIMEOUT || '5000'),
      enablePersistence: process.env.EVENT_PERSISTENCE_ENABLED === 'true',
      retentionPeriod: parseInt(process.env.EVENT_RETENTION_PERIOD || '86400000'), // 24 hours
      batching: {
        enabled: process.env.EVENT_BATCHING_ENABLED !== 'false',
        maxBatchSize: parseInt(process.env.EVENT_BATCH_SIZE || '100'),
        batchTimeout: parseInt(process.env.EVENT_BATCH_TIMEOUT || '1000'),
      },
    },

    auth: {
      enabled: process.env.AUTH_ENABLED !== 'false',
      jwtSecret: process.env.JWT_SECRET || 'collaboration-server-secret-key-change-in-production',
      tokenExpiration: process.env.JWT_EXPIRATION || '24h',
      enableSessions: process.env.SESSION_ENABLED !== 'false',
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
    },
    health: {
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      memoryThreshold: parseInt(process.env.HEALTH_MAX_MEMORY_USAGE || '500') * 1024 * 1024, // Convert MB to bytes
      cpuThreshold: parseInt(process.env.HEALTH_MAX_CPU_USAGE || '80'),
      errorRateThreshold: parseInt(process.env.HEALTH_MAX_ERROR_RATE || '5'),
      connectionThreshold: parseInt(process.env.HEALTH_MAX_CONNECTION_COUNT || '1000'),
    },

    reliability: {
      maxQueueSize: parseInt(process.env.RELIABILITY_MAX_QUEUE_SIZE || '1000'),
      maxRetries: parseInt(process.env.RELIABILITY_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.RELIABILITY_RETRY_DELAY || '1000'),
      maxRetryDelay: parseInt(process.env.RELIABILITY_MAX_RETRY_DELAY || '30000'),
      reconnectAttempts: parseInt(process.env.RELIABILITY_RECONNECT_ATTEMPTS || '5'),
      reconnectDelay: parseInt(process.env.RELIABILITY_RECONNECT_DELAY || '5000'),
      messageExpiration: parseInt(process.env.RELIABILITY_MESSAGE_EXPIRATION || '300000'), // 5 minutes
      queueCleanupInterval: parseInt(process.env.RELIABILITY_CLEANUP_INTERVAL || '60000'), // 1 minute
    },

    cors: {
      origin:
        process.env.CORS_ORIGIN?.split(',') ||
        (isDevelopment ? ['http://localhost:5173', 'http://localhost:3000'] : false),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  };
}

/**
 * Validate configuration
 */
export function validateCollaborationConfig(config: CollaborationConfig): string[] {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }

  if (config.auth.enabled && !config.auth.jwtSecret) {
    errors.push('JWT secret is required when authentication is enabled');
  }

  if (config.websocket.maxConnections < 1) {
    errors.push('Max connections must be greater than 0');
  }

  if (config.connection.maxConnectionsPerUser < 1) {
    errors.push('Max connections per user must be greater than 0');
  }

  if (config.events.maxQueueSize < 1) {
    errors.push('Event max queue size must be greater than 0');
  }
  if (config.health.interval && config.health.interval < 1000) {
    errors.push('Health check interval must be at least 1000ms');
  }

  return errors;
}
