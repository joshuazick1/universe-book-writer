/**
 * Comprehensive test for backend/src/index.ts
 * Tests the main application initialization, middleware setup, and server startup
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import centralizedMocks, { setupCommonMocks } from '../__mocks__/centralized-mocks.js';
import type { Server } from 'http';
import { findAvailablePort } from '../utils/port-finder.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock MongoDB
jest.mock('../../src/config/mongodb.config.js', () => {
  return {
    mongoDBConnection: {
      connect: () => Promise.resolve({
        db: () => ({
          collection: () => ({
            find: () => ({
              toArray: () => Promise.resolve([])
            }),
            insertOne: () => Promise.resolve({ insertedId: 'test-id' }),
            updateOne: () => Promise.resolve({ modifiedCount: 1 }),
            deleteOne: () => Promise.resolve({ deletedCount: 1 })
          })
        }),
        close: () => Promise.resolve()
      }),
      disconnect: () => Promise.resolve()
    }
  };
});

// Mock environment variables with all required fields
const mockEnv = {
  NODE_ENV: 'test',
  PORT: '5001',
  MONGODB_URI: 'mongodb://localhost:27017',
  MONGODB_DB_NAME: 'test_verseforge',
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EMAIL_SECRET: 'test-email-secret',
  JWT_RESET_SECRET: 'test-reset-secret',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  CORS_ORIGIN: 'http://localhost:5173',
  FRONTEND_URL: 'http://localhost:5173',
  SHUTDOWN_TIMEOUT: '10000',
  PLUGIN_DIR: '' // Will be set to temp dir in beforeAll
};

// Store original env and server
const originalEnv = process.env;
let mockServer: Server | null = null;
let tempPluginDir: string;

describe('Backend Index - Application Initialization', () => {
  beforeAll(async () => {
    // Create temporary plugin directory
    tempPluginDir = path.join(os.tmpdir(), `test-plugins-${Date.now()}`);
    await fs.mkdir(tempPluginDir, { recursive: true });
    mockEnv.PLUGIN_DIR = tempPluginDir;

    // Set test environment with all required variables
    process.env = { ...originalEnv, ...mockEnv };
    setupCommonMocks();

    // Mock fs operations for plugin loading
    jest.spyOn(fs, 'readdir').mockResolvedValue([]);
  });

  beforeEach(() => {
    setupCommonMocks();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => {
        mockServer!.close(() => resolve());
      });
      mockServer = null;
    }
  });

  afterAll(async () => {
    // Cleanup temp plugin directory
    try {
      await fs.rm(tempPluginDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp plugin directory:', error);
    }
    // Restore original environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Environment Configuration', () => {
    it('should use configured port from environment', () => {
      expect(process.env.PORT).toBe('5001');
    });

    it('should have all required environment variables', () => {
      const requiredEnvVars = [
        'NODE_ENV',
        'PORT',
        'MONGODB_URI',
        'MONGODB_DB_NAME',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_EMAIL_SECRET',
        'JWT_RESET_SECRET',
        'JWT_ACCESS_EXPIRY',
        'JWT_REFRESH_EXPIRY',
        'CORS_ORIGIN',
        'FRONTEND_URL',
        'PLUGIN_DIR'
      ];

      requiredEnvVars.forEach(envVar => {
        expect(process.env[envVar]).toBeDefined();
      });
    });
  });

  describe('Plugin Loading', () => {
    beforeEach(async () => {
      // Clear the temp plugin directory before each test
      const entries = await fs.readdir(tempPluginDir);
      await Promise.all(
        entries.map(entry =>
          fs.rm(path.join(tempPluginDir, entry), { recursive: true, force: true })
        )
      );
    });

    it('should handle empty plugin directory', async () => {
      const { loadPlugins } = await import('../../src/plugins/loader.js');
      const plugins = await loadPlugins();
      expect(plugins).toEqual([]);
    });

    it('should load valid plugins', async () => {
      // Create a test plugin structure
      const pluginDir = path.join(tempPluginDir, 'test-plugin');
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(path.join(pluginDir, 'manifest.json'), JSON.stringify({
        name: 'test-plugin',
        version: '1.0.0',
        universeType: 'test',
        description: 'Test plugin',
        author: 'Test Author',
        main: 'index.js'
      }));

      // Create plugin index.js
      await fs.writeFile(path.join(pluginDir, 'index.js'), `
        export default {
          initialize: () => {},
          getUniverseType: () => 'test',
          validateUniverse: () => true
        };
      `);

      const { loadPlugins } = await import('../../src/plugins/loader.js?time=' + Date.now());
      const plugins = await loadPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0]).toMatchObject({
        name: 'test-plugin',
        version: '1.0.0',
        universeType: 'test'
      });
    });

    it('should skip plugins with invalid manifest', async () => {
      // Create an invalid plugin
      const pluginDir = path.join(tempPluginDir, 'invalid-plugin');
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(path.join(pluginDir, 'manifest.json'), JSON.stringify({
        name: 'invalid-plugin'
        // Missing required fields
      }));

      const { loadPlugins } = await import('../../src/plugins/loader.js?time=' + Date.now());
      const plugins = await loadPlugins();
      expect(plugins).toHaveLength(0);
    });

    it('should handle malformed manifest.json', async () => {
      // Create plugin with malformed manifest
      const pluginDir = path.join(tempPluginDir, 'malformed-plugin');
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(path.join(pluginDir, 'manifest.json'), 'invalid json{');

      const { loadPlugins } = await import('../../src/plugins/loader.js?time=' + Date.now());
      const plugins = await loadPlugins();
      expect(plugins).toHaveLength(0);
    });
  });

  describe('Server Initialization', () => {
    let originalPort: string | undefined;
    let availablePort: number | null = null;

    beforeEach(async () => {
      originalPort = process.env.PORT;
      const port = await findAvailablePort(10000, 65535, 5);
      if (!port) {
        throw new Error('Could not find available port for tests');
      }
      availablePort = port;
      process.env.PORT = String(port);
    });

    afterEach(() => {
      if (originalPort) {
        process.env.PORT = originalPort;
      } else {
        delete process.env.PORT;
      }
    });

    it('should import main module without errors', async () => {
      const indexModule = await import('../../src/index.js?time=' + Date.now());
      expect(indexModule).toBeDefined();
      expect(indexModule.initializeApp).toBeDefined();
      expect(indexModule.startServer).toBeDefined();
      expect(typeof indexModule.initializeApp).toBe('function');
      expect(typeof indexModule.startServer).toBe('function');
    });

    it('should initialize application with proper configuration', async () => {
      const { initializeApp } = await import('../../src/index.js?time=' + Date.now());
      mockServer = await initializeApp();

      expect(mockServer).toBeDefined();
      if (!mockServer) {
        throw new Error('Server initialization failed');
      }
      expect(mockServer.listening).toBe(true);

      const address = mockServer.address();
      expect(address).toBeDefined();
      if (typeof address === 'object' && address && availablePort) {
        expect(address.port).toBe(availablePort);
      }
    });

    it('should handle server startup errors gracefully', async () => {
      // Force port conflict by starting a server first
      const http = await import('http');
      const conflictServer = http.createServer();
      await new Promise<void>(resolve => {
        conflictServer.listen(availablePort, () => resolve());
      });

      try {
        const { initializeApp } = await import('../../src/index.js?time=' + Date.now());
        await expect(initializeApp()).rejects.toThrow(/EADDRINUSE/);
      } finally {
        await new Promise<void>(resolve => {
          conflictServer.close(() => resolve());
        });
      }
    });

    it('should properly initialize all required middleware and routes', async () => {
      const { initializeApp } = await import('../../src/index.js?time=' + Date.now());
      mockServer = await initializeApp();

      expect(mockServer).toBeDefined();

      // Get the Express app instance
      const app = (mockServer as any)._events.request;
      expect(app).toBeDefined();

      // Verify essential middleware is present
      const middleware = app._router.stack
        .filter((layer: any) => layer.name)
        .map((layer: any) => layer.name);

      expect(middleware).toContain('cors');
      expect(middleware).toContain('json');
      expect(middleware).toContain('urlencodedParser');
      expect(middleware).toContain('cookieParser');
      expect(middleware).toContain('helmetMiddleware');

      // Verify essential routes are mounted
      const routes = app._router.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route?.path,
          methods: Object.keys(layer.route?.methods || {})
        }));

      // Check health endpoint
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/api/health',
          methods: expect.arrayContaining(['get'])
        })
      );

      // Check security status endpoint
      expect(routes).toContainEqual(
        expect.objectContaining({
          path: '/api/security/status',
          methods: expect.arrayContaining(['get'])
        })
      );

      // Check authentication routes
      const authRoutes = routes.filter(r => r.path.startsWith('/api/auth'));
      expect(authRoutes.length).toBeGreaterThan(0);

      // Check user routes
      const userRoutes = routes.filter(r => r.path.startsWith('/api/users'));
      expect(userRoutes.length).toBeGreaterThan(0);
    });

    it('should handle server shutdown gracefully', async () => {
      const { initializeApp } = await import('../../src/index.js?time=' + Date.now());
      mockServer = await initializeApp();

      expect(mockServer).toBeDefined();
      if (!mockServer) return;

      await new Promise<void>((resolve) => {
        mockServer!.close(() => resolve());
      });

      expect(mockServer.listening).toBe(false);
    });
  });
});
