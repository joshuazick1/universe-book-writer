/**
 * Dependency Injection Container Tests
 * Tests for backend/src/infrastructure/container/container.ts
 * 
 * Coverage Target: 0% → 100%
 * Priority: Critical (Phase 1)
 */

import { MongoClient, Db } from 'mongodb';
import { jest } from '@jest/globals';
import { setupMongoForTest, type MongoTestSetup } from '../../helpers/mongodb-test-helper';
import { Container, createAuthContainer, TOKENS, type ContainerConfig } from '../../../src/infrastructure/container/container';

// Mock all the implementation classes with explicit mock objects
jest.mock('@/infrastructure/persistence/user.repository', () => ({
  MongoUserRepository: jest.fn()
}));
jest.mock('@/infrastructure/persistence/auth-token.repository', () => ({
  MongoAuthTokenRepository: jest.fn()
}));
jest.mock('@/infrastructure/persistence/auth-session.repository', () => ({
  MongoAuthSessionRepository: jest.fn()
}));
jest.mock('@/infrastructure/repositories/mongo-admin-settings.repository', () => ({
  MongoAdminSettingsRepository: jest.fn()
}));
jest.mock('@/infrastructure/services/password.service', () => ({
  BcryptPasswordService: jest.fn()
}));
jest.mock('@/infrastructure/services/token.service', () => ({
  JwtTokenService: jest.fn()
}));
jest.mock('@/infrastructure/services/email.service', () => ({
  NodemailerEmailService: jest.fn()
}));
jest.mock('@/infrastructure/services/security.service', () => ({
  CryptoSecurityService: jest.fn()
}));
jest.mock('@/application/use-cases/user.use-case', () => ({
  UserUseCase: jest.fn()
}));
jest.mock('@/application/use-cases/auth.use-case', () => ({
  AuthUseCase: jest.fn()
}));
jest.mock('@/application/use-cases/admin.use-case', () => ({
  AdminUseCase: jest.fn()
}));
jest.mock('@/api/controllers/auth.controller', () => ({
  AuthController: jest.fn()
}));
jest.mock('@/api/controllers/user.controller', () => ({
  UserController: jest.fn()
}));
jest.mock('@/api/controllers/admin.controller', () => ({
  AdminController: jest.fn()
}));
jest.mock('@/api/middleware/auth.middleware', () => ({
  AuthMiddleware: jest.fn()
}));
jest.mock('@/api/middleware/validation.middleware', () => ({
  ValidationMiddleware: jest.fn()
}));

describe('Dependency Injection Container', () => {
  let mongoSetup: MongoTestSetup;
  let containerConfig: ContainerConfig;
  let container: Container;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeAll(async () => {
    // Setup test database
    mongoSetup = await setupMongoForTest('container_test');
    
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
  });
  afterAll(async () => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Cleanup
    await mongoSetup.cleanup();
  });
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset container configuration
    containerConfig = {
      mongoClient: mongoSetup.mongoClient,
      databaseName: 'test_db',
      emailConfig: {
        host: 'test-host',
        port: 587,
        secure: true,
        user: 'test-user',
        password: 'test-pass'
      },
      jwtConfig: {
        accessTokenSecret: 'test-secret',
        refreshTokenSecret: 'test-refresh-secret',
        emailTokenSecret: 'test-email-secret',
        passwordResetTokenSecret: 'test-reset-secret',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        emailTokenExpiry: '1h',
        passwordResetTokenExpiry: '1h'
      }
    };
    
    // Reset logs
    consoleLogs = [];
    consoleErrors = [];
  });

  describe('Container Creation', () => {
    it('should create a container with all dependencies', () => {
      container = new Container(containerConfig);
      expect(container).toBeDefined();
    });

    it('should register a value and retrieve it', () => {
      container = new Container(containerConfig);
      const testToken = Symbol('test');
      const testValue = { test: 'value' };
      container.register(testToken, (c) => testValue);
      expect(container.resolve(testToken)).toBe(testValue);
    });
  });

  describe('createAuthContainer', () => {
    it('should create auth container with all required dependencies', () => {
      const authContainer = createAuthContainer(containerConfig);
      expect(authContainer).toBeDefined();      const db = authContainer.resolve(TOKENS.DATABASE) as Db;
      expect(db).toBeDefined();
      // Check if it's a MongoDB database instance
      expect(db.constructor.name).toBe('Db');
      expect(db.databaseName).toBe(containerConfig.databaseName);
    });

    it('should create singleton instances of repositories', () => {
      const authContainer = createAuthContainer(containerConfig);
      const userRepo1 = authContainer.resolve(TOKENS.USER_REPOSITORY);
      const userRepo2 = authContainer.resolve(TOKENS.USER_REPOSITORY);
      expect(userRepo1).toBe(userRepo2);
    });

    it('should create singleton instances of services', () => {
      const authContainer = createAuthContainer(containerConfig);
      const tokenService1 = authContainer.resolve(TOKENS.TOKEN_SERVICE);
      const tokenService2 = authContainer.resolve(TOKENS.TOKEN_SERVICE);
      expect(tokenService1).toBe(tokenService2);
    });

    it('should create singleton instances of controllers', () => {
      const authContainer = createAuthContainer(containerConfig);
      const authController1 = authContainer.resolve(TOKENS.AUTH_CONTROLLER);
      const authController2 = authContainer.resolve(TOKENS.AUTH_CONTROLLER);
      expect(authController1).toBe(authController2);
    });

    it('should create singleton instances of use cases', () => {
      const authContainer = createAuthContainer(containerConfig);
      const authUseCase1 = authContainer.resolve(TOKENS.AUTH_USE_CASE);
      const authUseCase2 = authContainer.resolve(TOKENS.AUTH_USE_CASE);
      expect(authUseCase1).toBe(authUseCase2);
    });
  });
});
