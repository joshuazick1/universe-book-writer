/**
 import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';  );

  // Create a mock AdminSettingsRepository for testing
  const adminSettingsRepository = {{ jest } from '@jest/globals';
import { Db, MongoClient } from 'mongodb';
import { createAuthRoutes } from '../../src/api/routes/auth.routes.js';
import { createAdminRoutes } from '../../src/api/routes/admin.routes.js';
import { AuthController } from '../../src/api/controllers/auth.controller.js';
import { AdminController } from '../../src/api/controllers/admin.controller.js';
import { AuthMiddleware } from '../../src/api/middleware/auth.middleware.js';
import { ValidationMiddleware } from '../../src/api/middleware/validation.middleware.js';cation Setup
 * Creates a test Express app with test database configuration
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { jest } from '@jest/globals';
import { Db, MongoClient } from 'mongodb';
import { createAuthRoutes } from '../../src/api/routes/auth.routes.js';
import { createAdminRoutes } from '../../src/api/routes/admin.routes.js';
import { AuthController } from '../../src/api/controllers/auth.controller.js';
import { AdminController } from '../../src/api/controllers/admin.controller.js';
import { AuthMiddleware } from '../../src/api/middleware/auth.middleware.js';
import { ValidationMiddleware } from '../../src/api/middleware/validation.middleware.js';
import { AuthUseCase } from '../../src/application/use-cases/auth.use-case.js';
import { AdminUseCase } from '../../src/application/use-cases/admin.use-case.js';
import { JwtTokenService } from '../../src/infrastructure/services/token.service.js';
import { BcryptPasswordService } from '../../src/infrastructure/services/password.service.js';
import { MockEmailService } from './mock-services.js';
import { CryptoSecurityService } from '../../src/infrastructure/services/security.service.js';
import { MongoUserRepository } from '../../src/infrastructure/persistence/user.repository.js';
import { MongoAuthTokenRepository } from '../../src/infrastructure/persistence/auth-token.repository.js';
import { MongoAuthSessionRepository } from '../../src/infrastructure/persistence/auth-session.repository.js';
import { AdminSettingsRepository } from '../../src/core/interfaces/repositories/admin-settings.repository.js';

export async function createTestApp(
  testDb: Db,
  mongoClient: MongoClient
): Promise<express.Express> {
  // Set test environment
  process.env.NODE_ENV = 'test';

  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // CORS for testing
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    })
  );

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Test configuration
  const testConfig = {
    accessTokenSecret: 'test-access-secret-key-for-testing-only',
    refreshTokenSecret: 'test-refresh-secret-key-for-testing-only',
    emailTokenSecret: 'test-email-secret-key-for-testing-only',
    passwordResetTokenSecret: 'test-reset-secret-key-for-testing-only',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    emailTokenExpiry: '24h',
    passwordResetTokenExpiry: '1h',
  }; // Initialize services
  const tokenService = new JwtTokenService(testConfig);
  const passwordService = new BcryptPasswordService();
  const emailService = new MockEmailService();
  const securityService = new CryptoSecurityService(); // Initialize repositories with the test database
  const userRepository = new MongoUserRepository(testDb);
  // Create repositories that use the specific test database
  const authTokenRepository = new MongoAuthTokenRepository(mongoClient);
  const authSessionRepository = new MongoAuthSessionRepository(mongoClient);

  // Override the collection to use our test database
  // @ts-expect-error - Accessing private property for testing
  authTokenRepository.collection = testDb.collection('auth_tokens');
  // @ts-expect-error - Accessing private property for testing
  authSessionRepository.collection = testDb.collection('auth_sessions'); // Initialize use cases
  const authUseCase = new AuthUseCase(
    userRepository,
    authTokenRepository,
    authSessionRepository,
    passwordService,
    tokenService,
    emailService,
    securityService
  );

  // Create a mock AdminSettingsRepository for testing
  const adminSettingsRepository = {
    findByKey: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const adminUseCase = new AdminUseCase(
    userRepository,
    adminSettingsRepository,
    securityService,
    passwordService,
    emailService
  );
  // Create a simple UserUseCase for the controller
  const userUseCase = {
    async getUserById(id: string) {
      return await userRepository.findById(id);
    },
    async getUserByEmail(email: string) {
      return await userRepository.findByEmail(email);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateUser(id: string, updates: any) {
      return await userRepository.update(id, updates);
    },
    async deleteUser(id: string) {
      return await userRepository.delete(id);
    },
    async getAllUsers() {
      const result = await userRepository.findMany();
      return result.users;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  // Initialize middleware
  const authMiddleware = new AuthMiddleware(
    tokenService,
    authTokenRepository,
    authSessionRepository,
    userRepository
  );

  const validationMiddleware = new ValidationMiddleware();
  // Initialize controllers
  const authController = new AuthController(authUseCase, userUseCase, securityService);
  const adminController = new AdminController(adminUseCase, securityService);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'test',
    });
  });
  // Setup routes
  app.use('/api/auth', createAuthRoutes(authController, authMiddleware, validationMiddleware));
  app.use('/api/admin', createAdminRoutes(adminController, authMiddleware));

  // Store reference for test utilities
  globalSecurityService = securityService;

  // Error handling middleware
  app.use(
    (error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Test app error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'test' ? error.message : undefined,
      });
    }
  );

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  return app;
}

/**
 * Store the security service instance for test utilities
 */
let globalSecurityService: CryptoSecurityService | null = null;

/**
 * Reset rate limiting for tests
 */
export function resetRateLimiting() {
  if (globalSecurityService) {
    // Clear all rate limiting records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalSecurityService as any).rateLimitStore.clear();
  }
  // Also add a small delay to avoid timing issues
  return new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Clear rate limiting for specific identifier
 */
export function clearRateLimitFor(identifier: string) {
  if (globalSecurityService) {
    globalSecurityService.clearRateLimit(identifier);
  }
}
