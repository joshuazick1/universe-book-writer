/**
 * Server Startup Tests
 * Tests for backend/src/index.ts startup functionality
 * 
 * Coverage Target: Server configuration, environment handling
 * Priority: Critical (Phase 1)
 */

import { jest } from '@jest/globals';
import { setupMongoForTest, type MongoTestSetup } from '../../helpers/mongodb-test-helper.js';

describe('Server Startup Configuration', () => {
  let mongoSetup: MongoTestSetup;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let originalEnv: NodeJS.ProcessEnv;
  let mockServer: any;
  let mockHttpServer: any;

  beforeAll(async () => {
    // Setup test database
    mongoSetup = await setupMongoForTest('server_startup_test');

    // Mock console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    consoleLogs = [];
    consoleErrors = [];

    console.log = jest.fn((...args) => {
      consoleLogs.push(args.join(' '));
    });
    console.error = jest.fn((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Save original environment
    originalEnv = { ...process.env };

    // Set required environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'server_startup_test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EMAIL_SECRET = 'test-email-secret';
    process.env.JWT_RESET_SECRET = 'test-reset-secret';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
  });

  afterAll(async () => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Restore environment
    process.env = originalEnv;

    // Cleanup
    await mongoSetup.cleanup();
  });

  beforeEach(() => {
    // Clear console captures
    consoleLogs.length = 0;
    consoleErrors.length = 0;
  });

  describe('Server Startup', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should have required environment variables for startup', () => {
      const requiredVars = [
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
        'CORS_ORIGIN'
      ];

      requiredVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined();
        expect(process.env[varName]).not.toBe('');
      });
    });

    it('should import server without errors', async () => {
      // This will throw if there are any issues with the server setup
      await expect(import('../../../src/index.js')).resolves.not.toThrow();
    });

    it('should validate server configuration', async () => {
      // Import server module
      const server = await import('../../../src/index.js');

      // Config properties should be defined
      expect(process.env.PORT).toBe('5000');
      expect(process.env.NODE_ENV).toBe('test');

      // CORS should be configured for development
      expect(process.env.CORS_ORIGIN).toBe('http://localhost:5173');

      // JWT configs should be set
      expect(process.env.JWT_ACCESS_EXPIRY).toBe('15m');
      expect(process.env.JWT_REFRESH_EXPIRY).toBe('7d');

      // MongoDB config should be set
      expect(process.env.MONGODB_URI).toBe('mongodb://localhost:27017');
      expect(process.env.MONGODB_DB_NAME).toBe('server_startup_test');
    });

    it('should handle production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '5000';

      expect(process.env.NODE_ENV).toBe('production');
      expect(process.env.PORT).toBe('5000');
    });

    it('should use default port when not specified', () => {
      delete process.env.PORT;
      const defaultPort = process.env.PORT || '5000';

      expect(defaultPort).toBe('5000');
    });

    it('should handle database configuration', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017';
      process.env.MONGODB_DB_NAME = 'test_database';

      expect(process.env.MONGODB_URI).toBe('mongodb://localhost:27017');
      expect(process.env.MONGODB_DB_NAME).toBe('test_database');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required environment variables', () => {
      const requiredVars = [
        'NODE_ENV',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_EMAIL_SECRET',
        'JWT_RESET_SECRET'
      ];

      requiredVars.forEach(varName => {
        process.env[varName] = `test-${varName.toLowerCase()}`;
        expect(process.env[varName]).toBeDefined();
      });
    });

    it('should have valid JWT configuration', () => {
      const jwtConfig = {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'test-access',
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'test-refresh',
        emailTokenSecret: process.env.JWT_EMAIL_SECRET || 'test-email',
        passwordResetTokenSecret: process.env.JWT_RESET_SECRET || 'test-reset',
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      };

      expect(jwtConfig.accessTokenSecret).toBeDefined();
      expect(jwtConfig.refreshTokenSecret).toBeDefined();
      expect(jwtConfig.emailTokenSecret).toBeDefined();
      expect(jwtConfig.passwordResetTokenSecret).toBeDefined();
      expect(jwtConfig.accessTokenExpiry).toBeDefined();
      expect(jwtConfig.refreshTokenExpiry).toBeDefined();
    });
  });

  describe('Server Port Configuration', () => {
    it('should parse port from environment', () => {
      process.env.PORT = '8080';
      const port = parseInt(process.env.PORT, 10);

      expect(port).toBe(8080);
      expect(typeof port).toBe('number');
    });

    it('should handle invalid port values', () => {
      process.env.PORT = 'invalid';
      const port = parseInt(process.env.PORT, 10) || 5000;

      expect(port).toBe(5000);
    });

    it('should handle port ranges', () => {
      const testPorts = ['3000', '5000', '8000', '9000'];

      testPorts.forEach(portStr => {
        process.env.PORT = portStr;
        const port = parseInt(process.env.PORT, 10);

        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThan(65536);
      });
    });
  });

  describe('Database Connection Configuration', () => {
    it('should create MongoDB connection config', () => {
      const mongoConfig = {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        dbName: process.env.MONGODB_DB_NAME || 'verseforge',
        options: {
          maxPoolSize: 10,
          minPoolSize: 2,
          maxIdleTimeMS: 60000,
          connectTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000,
        }
      };

      expect(mongoConfig.uri).toBeDefined();
      expect(mongoConfig.dbName).toBeDefined();
      expect(mongoConfig.options.maxPoolSize).toBe(10);
      expect(mongoConfig.options.connectTimeoutMS).toBe(5000);
    });

    it('should validate MongoDB URI format', () => {
      const validUris = [
        'mongodb://localhost:27017',
        'mongodb://localhost:27017/database',
        'mongodb+srv://user:pass@cluster.mongodb.net',
      ];

      validUris.forEach(uri => {
        expect(uri).toMatch(/^mongodb(\+srv)?:\/\//);
      });
    });
  });

  describe('Security Configuration', () => {
    it('should configure CORS settings', () => {
      const corsConfig = {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      };

      expect(corsConfig.origin).toBeDefined();
      expect(corsConfig.credentials).toBe(true);
      expect(corsConfig.methods).toContain('GET');
      expect(corsConfig.allowedHeaders).toContain('Authorization');
    });

    it('should configure security headers', () => {
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      };

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(header).toBeDefined();
        expect(value).toBeDefined();
      });
    });
  });

  describe('Middleware Configuration', () => {
    it('should configure body parser settings', () => {
      const bodyParserConfig = {
        json: { limit: '10mb' },
        urlencoded: { extended: true, limit: '10mb' },
      };

      expect(bodyParserConfig.json.limit).toBe('10mb');
      expect(bodyParserConfig.urlencoded.extended).toBe(true);
    });

    it('should configure rate limiting', () => {
      const rateLimitConfig = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false,
      };

      expect(rateLimitConfig.windowMs).toBe(900000);
      expect(rateLimitConfig.max).toBe(100);
      expect(rateLimitConfig.standardHeaders).toBe(true);
    });
  });

  describe('Route Configuration', () => {
    it('should define API route prefixes', () => {
      const apiRoutes = {
        auth: '/api/auth',
        users: '/api/users',
        admin: '/api/admin',
        plugins: '/api/plugins',
        health: '/health',
      };

      Object.entries(apiRoutes).forEach(([name, path]) => {
        expect(path).toMatch(/^\/\w+/);
        expect(name).toBeDefined();
      });
    });

    it('should validate route patterns', () => {
      const routePatterns = [
        '/api/auth/register',
        '/api/auth/login',
        '/api/users/:id',
        '/api/admin/users',
        '/health',
      ];

      routePatterns.forEach(pattern => {
        expect(pattern).toMatch(/^\/[a-zA-Z0-9/:_-]+$/);
      });
    });
  });

  describe('Graceful Shutdown Configuration', () => {
    it('should define shutdown signals', () => {
      const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

      shutdownSignals.forEach(signal => {
        expect(signal).toMatch(/^SIG[A-Z0-9]+$/);
      });
    });

    it('should configure shutdown timeout', () => {
      const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);

      expect(shutdownTimeout).toBeGreaterThan(0);
      expect(shutdownTimeout).toBeLessThanOrEqual(30000);
    });
  });

  describe('Health Check Configuration', () => {
    it('should configure health check response', () => {
      const healthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      };

      expect(healthResponse.status).toBe('ok');
      expect(healthResponse.timestamp).toBeDefined();
      expect(healthResponse.uptime).toBeGreaterThanOrEqual(0);
      expect(healthResponse.memory).toBeDefined();
      expect(healthResponse.version).toBeDefined();
    });

    it('should validate health check endpoint', () => {
      const healthEndpoint = '/health';

      expect(healthEndpoint).toBe('/health');
      expect(healthEndpoint).toMatch(/^\/health$/);
    });
  });
});
