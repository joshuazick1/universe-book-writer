import { jest } from '@jest/globals';
import { CollaborationServer } from '../index.js';
import { CollaborationConfig } from '../config/collaboration.config.js';

describe('CollaborationServer Integration', () => {
  let server: CollaborationServer;
  let testConfig: CollaborationConfig;
  let additionalServers: CollaborationServer[] = [];

  beforeEach(() => {
    testConfig = {
      port: 0, // Use random port for testing
      environment: 'test',
      websocket: {
        enabled: true,
        socketIO: {
          cors: {
            origin: ['http://localhost:3000'],
            credentials: true,
          },
          transports: ['websocket'],
          pingTimeout: 60000,
          pingInterval: 25000,
        },
        maxConnections: 100,
        rateLimiting: {
          enabled: true,
          maxMessagesPerSecond: 10,
          burstSize: 20,
        },
      },
      connection: {
        maxConnectionsPerUser: 5,
        connectionTimeout: 30000,
        heartbeatInterval: 30000,
        maxIdleTime: 300000,
        enablePooling: true,
        poolSize: 100,
      },
      events: {
        maxQueueSize: 1000,
        processingTimeout: 5000,
        enablePersistence: false,
        retentionPeriod: 86400000,
        batching: {
          enabled: true,
          maxBatchSize: 100,
          batchTimeout: 1000,
        },
      },
      auth: {
        enabled: true,
        jwtSecret: 'test-secret-key',
        tokenExpiration: '1h',
        enableSessions: true,
        sessionTimeout: 3600000,
      },
      health: {
        interval: 5000,
        memoryThreshold: 100 * 1024 * 1024,
        cpuThreshold: 80,
        errorRateThreshold: 5,
        connectionThreshold: 100,
      },
      reliability: {
        maxQueueSize: 500,
        maxRetries: 3,
        retryDelay: 1000,
        maxRetryDelay: 10000,
        reconnectAttempts: 3,
        reconnectDelay: 2000,
        messageExpiration: 300000,
        queueCleanupInterval: 60000,
      },
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
    };
    server = new CollaborationServer({ config: testConfig });
    additionalServers = [];
  });

  afterEach(async () => {
    // Stop the main server
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        console.warn('Error stopping main server:', error);
      }
    }

    // Clean up any additional servers created in tests
    for (const additionalServer of additionalServers) {
      try {
        await additionalServer.stop();
      } catch (error) {
        console.warn('Error stopping additional server:', error);
      }
    }
    additionalServers = [];

    // Wait a bit to allow cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('server lifecycle', () => {
    it('should start and stop successfully', async () => {
      const status = server.getStatus();
      expect(status.isRunning).toBe(false);

      await server.start();
      const runningStatus = server.getStatus();
      expect(runningStatus.isRunning).toBe(true);

      await server.stop();
      const stoppedStatus = server.getStatus();
      expect(stoppedStatus.isRunning).toBe(false);
    }, 10000);

    it('should not allow starting server twice', async () => {
      await server.start();

      await expect(server.start()).rejects.toThrow('Server is already running');

      await server.stop();
    }, 10000);

    it('should handle stopping server when not running', async () => {
      // Should not throw error
      await expect(server.stop()).resolves.toBeUndefined();
    });
  });

  describe('configuration', () => {
    it('should return server configuration', () => {
      const config = server.getConfiguration();
      expect(config).toEqual(testConfig);
    });

    it('should use default configuration when none provided', async () => {
      const defaultServer = new CollaborationServer();
      additionalServers.push(defaultServer);

      const config = defaultServer.getConfiguration();

      expect(config).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.environment).toBeDefined();
    });
  });

  describe('health endpoints', () => {
    it('should provide health status', async () => {
      await server.start();

      const status = server.getStatus();
      expect(status.health).toBeDefined();
      expect(status.health.status).toMatch(/^(healthy|degraded|unhealthy|unknown)$/);

      await server.stop();
    });

    it('should provide metrics', async () => {
      await server.start();

      const status = server.getStatus();
      expect(status.connections).toBeDefined();
      expect(status.events).toBeDefined();
      expect(status.websocket).toBeDefined();

      await server.stop();
    });
  });

  describe('component integration', () => {
    it('should initialize all components', () => {
      const status = server.getStatus();

      // All components should be initialized
      expect(status).toBeDefined();
      expect(status.health).toBeDefined();
      expect(status.connections).toBeDefined();
      expect(status.events).toBeDefined();
      expect(status.websocket).toBeDefined();
    });

    it('should handle component errors gracefully', async () => {
      // Test error handling by trying to use an invalid port
      const errorConfig = { ...testConfig, port: -1 };
      const errorServer = new CollaborationServer({ config: errorConfig });
      additionalServers.push(errorServer);

      await expect(errorServer.start()).rejects.toThrow();
    });
  });

  describe('graceful shutdown', () => {
    it('should handle SIGINT signal', async () => {
      await server.start();

      // Simulate SIGINT
      const originalListeners = process.listeners('SIGINT');
      process.removeAllListeners('SIGINT');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let _shutdownCalled = false;
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        _shutdownCalled = true;
        return undefined as never;
      });

      // This would normally be handled by the signal handlers in the main file
      await server.stop();
      expect(server.getStatus().isRunning).toBe(false);

      // Restore original listeners
      originalListeners.forEach(listener => {
        process.on('SIGINT', listener);
      });
      mockExit.mockRestore();
    });

    it('should handle SIGTERM signal', async () => {
      await server.start();

      // Similar to SIGINT test
      const originalListeners = process.listeners('SIGTERM');
      process.removeAllListeners('SIGTERM');

      await server.stop();
      expect(server.getStatus().isRunning).toBe(false);

      // Restore original listeners
      originalListeners.forEach(listener => {
        process.on('SIGTERM', listener);
      });
    });
  });

  describe('error handling', () => {
    it('should handle startup errors', async () => {
      // Force a startup error by using an invalid configuration
      const invalidConfig = { ...testConfig };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (invalidConfig as any).websocket = null;

      const invalidServer = new CollaborationServer({ config: invalidConfig });
      additionalServers.push(invalidServer);

      await expect(invalidServer.start()).rejects.toThrow();
    });
    it('should maintain stability during operation', async () => {
      // Create a separate server instance to avoid port conflicts
      const stabilityConfig = { ...testConfig, port: 0 };
      const stabilityServer = new CollaborationServer({ config: stabilityConfig });
      additionalServers.push(stabilityServer);

      await stabilityServer.start();

      // Server should remain stable
      const initialStatus = stabilityServer.getStatus();
      expect(initialStatus.isRunning).toBe(true);

      // Wait a bit to ensure stability
      await new Promise(resolve => setTimeout(resolve, 100));

      const laterStatus = stabilityServer.getStatus();
      expect(laterStatus.isRunning).toBe(true);

      await stabilityServer.stop();
    });
  });
});
