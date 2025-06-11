/**
 * Dependency Injection Container
 * Centralized service registration and resolution following clean architecture principles
 */

import type { MongoClient, Db } from 'mongodb';
import type { UserRepository } from '../../core/interfaces/user.repository.js';
import type {
  AuthTokenRepository,
  AuthSessionRepository,
} from '../../core/interfaces/auth.repository.js';
import type {
  PasswordService,
  TokenService,
  EmailService,
  SecurityService,
} from '../../core/interfaces/auth.service.js';
import type { UserUseCase } from '../../application/use-cases/user.use-case.js';
import type { AuthUseCase } from '../../application/use-cases/auth.use-case.js';
import type { AdminUseCase } from '../../application/use-cases/admin.use-case.js';
import type { AuthController } from '../../api/controllers/auth.controller.js';
import type { UserController } from '../../api/controllers/user.controller.js';
import type { AdminController } from '../../api/controllers/admin.controller.js';
import type { AdminSettingsRepository } from '../../core/interfaces/repositories/admin-settings.repository.js';

// Import implementations
import { MongoUserRepository } from '../persistence/user.repository.js';
import { MongoAuthTokenRepository } from '../persistence/auth-token.repository.js';
import { MongoAuthSessionRepository } from '../persistence/auth-session.repository.js';
import { MongoAdminSettingsRepository } from '../repositories/mongo-admin-settings.repository.js';
import { BcryptPasswordService } from '../services/password.service.js';
import { JwtTokenService } from '../services/token.service.js';
import { NodemailerEmailService } from '../services/email.service.js';
import { CryptoSecurityService } from '../services/security.service.js';
import { UserUseCase as UserUseCaseImpl } from '../../application/use-cases/user.use-case.js';
import { AuthUseCase as AuthUseCaseImpl } from '../../application/use-cases/auth.use-case.js';
import { AdminUseCase as AdminUseCaseImpl } from '../../application/use-cases/admin.use-case.js';
import { AuthController as AuthControllerImpl } from '../../api/controllers/auth.controller.js';
import { UserController as UserControllerImpl } from '../../api/controllers/user.controller.js';
import { AdminController as AdminControllerImpl } from '../../api/controllers/admin.controller.js';
import { AuthMiddleware } from '../../api/middleware/auth.middleware.js';
import { ValidationMiddleware } from '../../api/middleware/validation.middleware.js';

/**
 * Service token types for dependency resolution
 */
export const TOKENS = {
  USER_REPOSITORY: Symbol('UserRepository'),
  AUTH_TOKEN_REPOSITORY: Symbol('AuthTokenRepository'),
  AUTH_SESSION_REPOSITORY: Symbol('AuthSessionRepository'),
  ADMIN_SETTINGS_REPOSITORY: Symbol('AdminSettingsRepository'),
  PASSWORD_SERVICE: Symbol('PasswordService'),
  TOKEN_SERVICE: Symbol('TokenService'),
  EMAIL_SERVICE: Symbol('EmailService'),
  SECURITY_SERVICE: Symbol('SecurityService'),
  USER_USE_CASE: Symbol('UserUseCase'),
  AUTH_USE_CASE: Symbol('AuthUseCase'),
  ADMIN_USE_CASE: Symbol('AdminUseCase'),
  AUTH_CONTROLLER: Symbol('AuthController'),
  USER_CONTROLLER: Symbol('UserController'),
  ADMIN_CONTROLLER: Symbol('AdminController'),
  AUTH_MIDDLEWARE: Symbol('AuthMiddleware'),
  VALIDATION_MIDDLEWARE: Symbol('ValidationMiddleware'),
  MONGO_CLIENT: Symbol('MongoClient'),
  DATABASE_NAME: Symbol('DatabaseName'),
  DATABASE: Symbol('Database'),
} as const;

/**
 * Service registration interface
 */
interface ServiceRegistration<T = unknown> {
  factory: (container: Container) => T;
  singleton: boolean;
  instance?: T;
}

/**
 * Container configuration interface
 */
export interface ContainerConfig {
  mongoClient: MongoClient;
  databaseName: string;
  emailConfig?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    password?: string;
    from?: string;
  };
  jwtConfig?: {
    accessTokenSecret?: string;
    refreshTokenSecret?: string;
    emailTokenSecret?: string;
    passwordResetTokenSecret?: string;
    accessTokenExpiry?: string;
    refreshTokenExpiry?: string;
    emailTokenExpiry?: string;
    passwordResetTokenExpiry?: string;
  };
  securityConfig?: {
    maxLoginAttempts?: number;
    lockoutDuration?: number;
    sessionTimeout?: number;
    auditLogLevel?: 'none' | 'basic' | 'detailed';
  };
}

/**
 * Simple Dependency Injection Container
 */
export class Container {
  private services = new Map<symbol, ServiceRegistration>();
  private config: ContainerConfig;

  constructor(config: ContainerConfig) {
    this.config = config;
    this.registerDefaults();
  }

  /**
   * Register a service with the container
   */
  register<T>(
    token: symbol,
    factory: (container: Container) => T,
    singleton: boolean = true
  ): void {
    this.services.set(token, { factory, singleton });
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: symbol): T {
    const registration = this.services.get(token);
    if (!registration) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    if (registration.singleton) {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance as T;
    }

    return registration.factory(this) as T;
  }

  /**
   * Get configuration value
   */
  getConfig(): ContainerConfig {
    return this.config;
  }

  /**
   * Register default service implementations
   */ private registerDefaults(): void {
    // Register external dependencies
    this.register(TOKENS.MONGO_CLIENT, () => this.config.mongoClient);
    this.register(TOKENS.DATABASE_NAME, () => this.config.databaseName);
    // Register database instance
    this.register(TOKENS.DATABASE, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      const databaseName = container.resolve<string>(TOKENS.DATABASE_NAME);
      return mongoClient.db(databaseName);
    }); // Register repositories
    this.register(TOKENS.USER_REPOSITORY, container => {
      const db = container.resolve<Db>(TOKENS.DATABASE);
      return new MongoUserRepository(db);
    });

    this.register(TOKENS.AUTH_TOKEN_REPOSITORY, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      return new MongoAuthTokenRepository(mongoClient);
    });

    this.register(TOKENS.AUTH_SESSION_REPOSITORY, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      return new MongoAuthSessionRepository(mongoClient);
    });

    this.register(TOKENS.ADMIN_SETTINGS_REPOSITORY, container => {
      const db = container.resolve<Db>(TOKENS.DATABASE);
      return new MongoAdminSettingsRepository(db);
    });

    // Register services
    this.register<PasswordService>(TOKENS.PASSWORD_SERVICE, () => {
      return new BcryptPasswordService();
    });

    this.register<TokenService>(TOKENS.TOKEN_SERVICE, _container => {
      const jwtConfig = this.config.jwtConfig || {};
      return new JwtTokenService({
        accessTokenSecret:
          jwtConfig.accessTokenSecret || process.env.JWT_ACCESS_SECRET || 'default-access-secret',
        refreshTokenSecret:
          jwtConfig.refreshTokenSecret ||
          process.env.JWT_REFRESH_SECRET ||
          'default-refresh-secret',
        emailTokenSecret:
          jwtConfig.emailTokenSecret || process.env.JWT_EMAIL_SECRET || 'default-email-secret',
        passwordResetTokenSecret:
          jwtConfig.passwordResetTokenSecret ||
          process.env.JWT_PASSWORD_RESET_SECRET ||
          'default-password-reset-secret',
        accessTokenExpiry: jwtConfig.accessTokenExpiry || process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: jwtConfig.refreshTokenExpiry || process.env.JWT_REFRESH_EXPIRY || '7d',
        emailTokenExpiry: jwtConfig.emailTokenExpiry || process.env.JWT_EMAIL_EXPIRY || '24h',
        passwordResetTokenExpiry:
          jwtConfig.passwordResetTokenExpiry || process.env.JWT_PASSWORD_RESET_EXPIRY || '1h',
      });
    });
    this.register<EmailService>(TOKENS.EMAIL_SERVICE, () => {
      const emailConfig = this.config.emailConfig || {};
      return new NodemailerEmailService({
        host: emailConfig.host || process.env.SMTP_HOST || 'localhost',
        port: emailConfig.port || Number(process.env.SMTP_PORT) || 587,
        secure: emailConfig.secure ?? process.env.SMTP_SECURE === 'true',
        auth: {
          user: emailConfig.user || process.env.SMTP_USER || '',
          pass: emailConfig.password || process.env.SMTP_PASS || '',
        },
      });
    });
    this.register<SecurityService>(TOKENS.SECURITY_SERVICE, _container => {
      return new CryptoSecurityService();
    }); // Register use cases
    this.register<UserUseCase>(TOKENS.USER_USE_CASE, container => {
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const passwordService = container.resolve<PasswordService>(TOKENS.PASSWORD_SERVICE);
      const emailService = container.resolve<EmailService>(TOKENS.EMAIL_SERVICE);
      const securityService = container.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);

      return new UserUseCaseImpl(userRepository, passwordService, emailService, securityService);
    });

    this.register<AuthUseCase>(TOKENS.AUTH_USE_CASE, container => {
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const authTokenRepository = container.resolve<AuthTokenRepository>(
        TOKENS.AUTH_TOKEN_REPOSITORY
      );
      const authSessionRepository = container.resolve<AuthSessionRepository>(
        TOKENS.AUTH_SESSION_REPOSITORY
      );
      const passwordService = container.resolve<PasswordService>(TOKENS.PASSWORD_SERVICE);
      const tokenService = container.resolve<TokenService>(TOKENS.TOKEN_SERVICE);
      const emailService = container.resolve<EmailService>(TOKENS.EMAIL_SERVICE);
      const securityService = container.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);

      return new AuthUseCaseImpl(
        userRepository,
        authTokenRepository,
        authSessionRepository,
        passwordService,
        tokenService,
        emailService,
        securityService
      );
    });

    this.register<AdminUseCase>(TOKENS.ADMIN_USE_CASE, container => {
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const adminSettingsRepository = container.resolve<AdminSettingsRepository>(
        TOKENS.ADMIN_SETTINGS_REPOSITORY
      );
      const securityService = container.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);
      const passwordService = container.resolve<PasswordService>(TOKENS.PASSWORD_SERVICE);
      const emailService = container.resolve<EmailService>(TOKENS.EMAIL_SERVICE);

      return new AdminUseCaseImpl(
        userRepository,
        adminSettingsRepository,
        securityService,
        passwordService,
        emailService
      );
    });

    // Register controllers
    this.register<AuthController>(TOKENS.AUTH_CONTROLLER, container => {
      const authUseCase = container.resolve<AuthUseCase>(TOKENS.AUTH_USE_CASE);
      const userUseCase = container.resolve<UserUseCase>(TOKENS.USER_USE_CASE);
      const securityService = container.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);
      return new AuthControllerImpl(authUseCase, userUseCase, securityService);
    });

    this.register<UserController>(TOKENS.USER_CONTROLLER, container => {
      const userUseCase = container.resolve<UserUseCase>(TOKENS.USER_USE_CASE);
      const securityService = container.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);
      return new UserControllerImpl(userUseCase, securityService);
    });

    this.register<AdminController>(TOKENS.ADMIN_CONTROLLER, container => {
      const adminUseCase = container.resolve<AdminUseCase>(TOKENS.ADMIN_USE_CASE);
      const securityService = container.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);
      return new AdminControllerImpl(adminUseCase, securityService);
    });

    // Register middleware
    this.register(TOKENS.AUTH_MIDDLEWARE, container => {
      const tokenService = container.resolve<TokenService>(TOKENS.TOKEN_SERVICE);
      const authTokenRepository = container.resolve<AuthTokenRepository>(
        TOKENS.AUTH_TOKEN_REPOSITORY
      );
      const authSessionRepository = container.resolve<AuthSessionRepository>(
        TOKENS.AUTH_SESSION_REPOSITORY
      );
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);

      return new AuthMiddleware(
        tokenService,
        authTokenRepository,
        authSessionRepository,
        userRepository
      );
    });

    this.register(TOKENS.VALIDATION_MIDDLEWARE, () => {
      return new ValidationMiddleware();
    });
  }

  /**
   * Initialize all repositories (create indexes, etc.)
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing authentication repositories...');

      // Initialize repositories
      const userRepo = this.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const tokenRepo = this.resolve<AuthTokenRepository>(TOKENS.AUTH_TOKEN_REPOSITORY);
      const sessionRepo = this.resolve<AuthSessionRepository>(TOKENS.AUTH_SESSION_REPOSITORY);
      const adminSettingsRepo = this.resolve<AdminSettingsRepository>(TOKENS.ADMIN_SETTINGS_REPOSITORY);

      // Initialize repositories if they have initialize methods
      if ('initialize' in userRepo && typeof userRepo.initialize === 'function') {
        await userRepo.initialize();
      }
      if ('initialize' in tokenRepo && typeof tokenRepo.initialize === 'function') {
        await tokenRepo.initialize();
      }
      if ('initialize' in sessionRepo && typeof sessionRepo.initialize === 'function') {
        await sessionRepo.initialize();
      }
      if ('initialize' in adminSettingsRepo && typeof adminSettingsRepo.initialize === 'function') {
        await adminSettingsRepo.initialize();
      }

      console.log('Authentication repositories initialized successfully');
    } catch (error) {
      console.error('Failed to initialize authentication repositories:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    try {
      // Cleanup services that need it
      const securityService = this.resolve<SecurityService>(TOKENS.SECURITY_SERVICE);
      if ('cleanup' in securityService && typeof securityService.cleanup === 'function') {
        await securityService.cleanup();
      }

      console.log('Authentication container disposed successfully');
    } catch (error) {
      console.error('Error disposing authentication container:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create and configure the authentication container
 */
export function createAuthContainer(config: ContainerConfig): Container {
  return new Container(config);
}
