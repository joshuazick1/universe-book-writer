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
  EmailService as AuthEmailService,
  SecurityService,
} from '../../core/interfaces/auth.service.js';
import type { EmailService as CoreEmailService } from '../../core/interfaces/email.service.js';
import type { UserUseCase } from '../../application/use-cases/user.use-case.js';
import type { AuthUseCase } from '../../application/use-cases/auth.use-case.js';
import type { AdminUseCase } from '../../application/use-cases/admin.use-case.js';
import type { AuthController } from '../../api/controllers/auth.controller.js';
import type { UserController } from '../../api/controllers/user.controller.js';
import type { AdminController } from '../../api/controllers/admin.controller.js';
import type { AdminSettingsRepository } from '../../core/interfaces/repositories/admin-settings.repository.js';
import type { UniverseRepository } from '../../core/entities/universe.entity.js';
import type { CollaborationInvitationRepository } from '../../core/interfaces/collaboration-invitation.repository.js';
import type { PluginManager } from '../../plugins/types/plugin.types.js';

// Monitoring types
import type { MonitoringController } from '../../api/controllers/monitoring.controller.js';
import type { PluginHealthMonitoringController } from '../../api/controllers/plugin-health.controller.js';

// Import implementations
import { MongoUserRepository } from '../persistence/user.repository.js';
import { MongoAuthTokenRepository } from '../persistence/auth-token.repository.js';
import { MongoAuthSessionRepository } from '../persistence/auth-session.repository.js';
import { MongoAdminSettingsRepository } from '../repositories/mongo-admin-settings.repository.js';
import { MongoUniverseRepository } from '../repositories/universe.repository.js';
import { MongoCollaborationInvitationRepository } from '../repositories/mongo-collaboration-invitation.repository.js';
import { BcryptPasswordService } from '../services/password.service.js';
import { JwtTokenService } from '../services/token.service.js';
import { NodemailerEmailService } from '../services/email.service.js';
import { CryptoSecurityService } from '../services/security.service.js';
import { UserUseCase as UserUseCaseImpl } from '../../application/use-cases/user.use-case.js';
import { AuthUseCase as AuthUseCaseImpl } from '../../application/use-cases/auth.use-case.js';
import { AdminUseCase as AdminUseCaseImpl } from '../../application/use-cases/admin.use-case.js';
import { CreateUniverseUseCase } from '../../application/use-cases/universe/create-universe.use-case.js';
import { UpdateUniverseUseCase } from '../../application/use-cases/universe/update-universe.use-case.js';
import { DeleteUniverseUseCase } from '../../application/use-cases/universe/delete-universe.use-case.js';
import { CollaborationInvitationUseCase } from '../../application/use-cases/collaboration-invitation.use-case.js';
import { UniverseCollaborationUseCase } from '../../application/use-cases/universe-collaboration.use-case.js';
import { AuthController as AuthControllerImpl } from '../../api/controllers/auth.controller.js';
import { UserController as UserControllerImpl } from '../../api/controllers/user.controller.js';
import { AdminController as AdminControllerImpl } from '../../api/controllers/admin.controller.js';
import { UniverseController, UniverseValidationController } from '../../api/controllers/universe.controller.js';
import { CollaborationInvitationController } from '../../api/controllers/collaboration-invitation.controller.js';
import { UniverseCollaborationController } from '../../api/controllers/universe-collaboration.controller.js';
import { AuthMiddleware } from '../../api/middleware/auth.middleware.js';
import { ValidationMiddleware } from '../../api/middleware/validation.middleware.js';
import { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';
import { SimpleUniverseDomainService } from '../services/simple-universe-domain.service.js';

// Monitoring implementations
import { MongoMonitoringRepository } from '../persistence/mongo-monitoring.repository.js';
import { PluginHealthMonitoringRepository } from '../persistence/mongo-plugin-health.repository.js';
import { MonitoringController as MonitoringControllerImpl } from '../../api/controllers/monitoring.controller.js';
import { PluginHealthMonitoringController as PluginHealthControllerImpl } from '../../api/controllers/plugin-health.controller.js';

// User activity analytics implementations
import { UserActivityAnalyticsRepository as MongoUserActivityAnalyticsRepository } from '../persistence/mongo-user-activity-analytics.repository.js';
import { UserActivityAnalyticsController } from '../../api/controllers/user-activity-analytics.controller.js';

// Security audit implementations
import { MongoSecurityAuditRepository } from '../persistence/mongo-security-audit.repository.js';
import { SecurityAuditServiceImpl } from '../services/security-audit.service.js';
import { SecurityAuditController } from '../../api/controllers/security-audit.controller.js';

/**
 * Service token types for dependency resolution
 */
export const TOKENS = {
  USER_REPOSITORY: Symbol('UserRepository'),
  AUTH_TOKEN_REPOSITORY: Symbol('AuthTokenRepository'),
  AUTH_SESSION_REPOSITORY: Symbol('AuthSessionRepository'),
  ADMIN_SETTINGS_REPOSITORY: Symbol('AdminSettingsRepository'),
  UNIVERSE_REPOSITORY: Symbol('UniverseRepository'),
  COLLABORATION_INVITATION_REPOSITORY: Symbol('CollaborationInvitationRepository'),
  PASSWORD_SERVICE: Symbol('PasswordService'),
  TOKEN_SERVICE: Symbol('TokenService'),
  EMAIL_SERVICE: Symbol('EmailService'), // Auth email service
  CORE_EMAIL_SERVICE: Symbol('CoreEmailService'), // Core email service
  SECURITY_SERVICE: Symbol('SecurityService'),
  USER_USE_CASE: Symbol('UserUseCase'),
  AUTH_USE_CASE: Symbol('AuthUseCase'),
  ADMIN_USE_CASE: Symbol('AdminUseCase'),
  CREATE_UNIVERSE_USE_CASE: Symbol('CreateUniverseUseCase'),
  UPDATE_UNIVERSE_USE_CASE: Symbol('UpdateUniverseUseCase'),
  DELETE_UNIVERSE_USE_CASE: Symbol('DeleteUniverseUseCase'),
  COLLABORATION_INVITATION_USE_CASE: Symbol('CollaborationInvitationUseCase'),
  // NEW: Simplified collaboration system
  UNIVERSE_COLLABORATION_USE_CASE: Symbol('UniverseCollaborationUseCase'),
  UNIVERSE_COLLABORATION_CONTROLLER: Symbol('UniverseCollaborationController'),
  AUTH_CONTROLLER: Symbol('AuthController'),
  USER_CONTROLLER: Symbol('UserController'),
  ADMIN_CONTROLLER: Symbol('AdminController'),
  UNIVERSE_CONTROLLER: Symbol('UniverseController'),
  UNIVERSE_VALIDATION_CONTROLLER: Symbol('UniverseValidationController'),
  COLLABORATION_INVITATION_CONTROLLER: Symbol('CollaborationInvitationController'),
  AUTH_MIDDLEWARE: Symbol('AuthMiddleware'),
  VALIDATION_MIDDLEWARE: Symbol('ValidationMiddleware'),
  PLUGIN_MANAGER: Symbol('PluginManager'),
  MONGO_CLIENT: Symbol('MongoClient'),
  DATABASE_NAME: Symbol('DatabaseName'),
  DATABASE: Symbol('Database'),
  // Monitoring and plugin health
  MONITORING_REPOSITORY: Symbol('MonitoringRepository'),
  MONITORING_CONTROLLER: Symbol('MonitoringController'),
  PLUGIN_HEALTH_REPOSITORY: Symbol('PluginHealthRepository'),
  PLUGIN_HEALTH_CONTROLLER: Symbol('PluginHealthController'),
  // User activity analytics
  USER_ACTIVITY_ANALYTICS_REPOSITORY: Symbol('UserActivityAnalyticsRepository'),
  USER_ACTIVITY_ANALYTICS_CONTROLLER: Symbol('UserActivityAnalyticsController'),
  // Security audit logging
  SECURITY_AUDIT_REPOSITORY: Symbol('SecurityAuditRepository'),
  SECURITY_AUDIT_SERVICE: Symbol('SecurityAuditService'),
  SECURITY_AUDIT_CONTROLLER: Symbol('SecurityAuditController'),
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
  private resolutionStack = new Set<symbol>();

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

    // Check for circular dependency
    if (this.resolutionStack.has(token)) {
      throw new Error(`Circular dependency detected: ${token.toString()}`);
    }

    if (registration.singleton) {
      if (!registration.instance) {
        // Add to resolution stack before creating instance
        this.resolutionStack.add(token);
        try {
          registration.instance = registration.factory(this);
        } finally {
          // Remove from resolution stack after creation
          this.resolutionStack.delete(token);
        }
      }
      return registration.instance as T;
    }

    // For non-singletons, still check for circular dependencies
    this.resolutionStack.add(token);
    try {
      return registration.factory(this) as T;
    } finally {
      this.resolutionStack.delete(token);
    }
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

    this.register(TOKENS.UNIVERSE_REPOSITORY, container => {
      const db = container.resolve<Db>(TOKENS.DATABASE);
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      return new MongoUniverseRepository(db, mongoClient, userRepository);
    });

    this.register(TOKENS.COLLABORATION_INVITATION_REPOSITORY, container => {
      const db = container.resolve<Db>(TOKENS.DATABASE);
      return new MongoCollaborationInvitationRepository(db);
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
    this.register<CoreEmailService>(TOKENS.EMAIL_SERVICE, () => {
      return new NodemailerEmailService();
    });
    this.register<CoreEmailService>(TOKENS.CORE_EMAIL_SERVICE, () => {
      return new NodemailerEmailService();
    });
    this.register<SecurityService>(TOKENS.SECURITY_SERVICE, _container => {
      return new CryptoSecurityService();
    }); // Register use cases
    this.register<UserUseCase>(TOKENS.USER_USE_CASE, container => {
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const passwordService = container.resolve<PasswordService>(TOKENS.PASSWORD_SERVICE);
      const emailService = container.resolve<AuthEmailService>(TOKENS.EMAIL_SERVICE);
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
      const emailService = container.resolve<AuthEmailService>(TOKENS.EMAIL_SERVICE);
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
      const emailService = container.resolve<AuthEmailService>(TOKENS.EMAIL_SERVICE);

      return new AdminUseCaseImpl(
        userRepository,
        adminSettingsRepository,
        securityService,
        passwordService,
        emailService
      );
    });

    // Universe use cases
    this.register(TOKENS.CREATE_UNIVERSE_USE_CASE, container => {
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      const universeDomainService = new SimpleUniverseDomainService();
      return new CreateUniverseUseCase(universeRepository, universeDomainService);
    });

    this.register(TOKENS.UPDATE_UNIVERSE_USE_CASE, container => {
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      const universeDomainService = new SimpleUniverseDomainService();
      return new UpdateUniverseUseCase(universeRepository, universeDomainService);
    });

    this.register(TOKENS.DELETE_UNIVERSE_USE_CASE, container => {
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      return new DeleteUniverseUseCase(universeRepository);
    });

    this.register(TOKENS.COLLABORATION_INVITATION_USE_CASE, container => {
      const invitationRepository = container.resolve<CollaborationInvitationRepository>(TOKENS.COLLABORATION_INVITATION_REPOSITORY);
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const emailService = container.resolve<CoreEmailService>(TOKENS.CORE_EMAIL_SERVICE);
      return new CollaborationInvitationUseCase(invitationRepository, universeRepository, userRepository, emailService);
    });

    // NEW: Simplified collaboration system
    this.register(TOKENS.UNIVERSE_COLLABORATION_USE_CASE, container => {
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      const userRepository = container.resolve<UserRepository>(TOKENS.USER_REPOSITORY);
      const emailService = container.resolve<CoreEmailService>(TOKENS.CORE_EMAIL_SERVICE);
      return new UniverseCollaborationUseCase(universeRepository, userRepository, emailService);
    });

    // Plugin manager (using PluginUseCase which implements PluginManager)
    this.register(TOKENS.PLUGIN_MANAGER, container => {
      const db = container.resolve<Db>(TOKENS.DATABASE);
      // For now, return a simplified implementation
      // TODO: Implement proper plugin system setup
      return new PluginUseCase(null as any, null as any, null as any);
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

    // Universe controllers
    this.register(TOKENS.UNIVERSE_CONTROLLER, container => {
      const createUniverseUseCase = container.resolve<CreateUniverseUseCase>(TOKENS.CREATE_UNIVERSE_USE_CASE);
      const updateUniverseUseCase = container.resolve<UpdateUniverseUseCase>(TOKENS.UPDATE_UNIVERSE_USE_CASE);
      const deleteUniverseUseCase = container.resolve<DeleteUniverseUseCase>(TOKENS.DELETE_UNIVERSE_USE_CASE);
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      const pluginManager = container.resolve<PluginUseCase>(TOKENS.PLUGIN_MANAGER);
      return new UniverseController(
        createUniverseUseCase,
        updateUniverseUseCase,
        deleteUniverseUseCase,
        universeRepository,
        pluginManager
      );
    });

    this.register(TOKENS.UNIVERSE_VALIDATION_CONTROLLER, container => {
      const universeRepository = container.resolve<UniverseRepository>(TOKENS.UNIVERSE_REPOSITORY);
      const pluginManager = container.resolve<PluginUseCase>(TOKENS.PLUGIN_MANAGER);
      return new UniverseValidationController(universeRepository, pluginManager);
    });

    // NEW: Simplified collaboration controller
    this.register(TOKENS.UNIVERSE_COLLABORATION_CONTROLLER, container => {
      const collaborationUseCase = container.resolve<UniverseCollaborationUseCase>(TOKENS.UNIVERSE_COLLABORATION_USE_CASE);
      return new UniverseCollaborationController(collaborationUseCase);
    });

    // Register monitoring repositories
    this.register(TOKENS.MONITORING_REPOSITORY, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      const dbName = container.resolve<string>(TOKENS.DATABASE_NAME);
      return new MongoMonitoringRepository(mongoClient, dbName);
    });

    this.register(TOKENS.PLUGIN_HEALTH_REPOSITORY, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      const dbName = container.resolve<string>(TOKENS.DATABASE_NAME);
      return new PluginHealthMonitoringRepository(mongoClient, dbName);
    });

    // Register monitoring controllers
    this.register<MonitoringController>(TOKENS.MONITORING_CONTROLLER, container => {
      const monitoringRepository = container.resolve<MongoMonitoringRepository>(TOKENS.MONITORING_REPOSITORY);
      return new MonitoringControllerImpl(monitoringRepository);
    });

    this.register<PluginHealthMonitoringController>(TOKENS.PLUGIN_HEALTH_CONTROLLER, container => {
      const pluginHealthRepository = container.resolve<PluginHealthMonitoringRepository>(TOKENS.PLUGIN_HEALTH_REPOSITORY);
      return new PluginHealthControllerImpl(pluginHealthRepository);
    });

    // Register user activity analytics
    this.register(TOKENS.USER_ACTIVITY_ANALYTICS_REPOSITORY, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      const dbName = container.resolve<string>(TOKENS.DATABASE_NAME);
      return new MongoUserActivityAnalyticsRepository(mongoClient, dbName);
    });

    this.register(TOKENS.USER_ACTIVITY_ANALYTICS_CONTROLLER, container => {
      const analyticsRepository = container.resolve<MongoUserActivityAnalyticsRepository>(TOKENS.USER_ACTIVITY_ANALYTICS_REPOSITORY);
      return new UserActivityAnalyticsController(analyticsRepository);
    });

    // Register security audit logging
    this.register(TOKENS.SECURITY_AUDIT_REPOSITORY, container => {
      const mongoClient = container.resolve<MongoClient>(TOKENS.MONGO_CLIENT);
      const dbName = container.resolve<string>(TOKENS.DATABASE_NAME);
      const repository = new MongoSecurityAuditRepository(mongoClient, dbName);
      return repository;
    });

    this.register(TOKENS.SECURITY_AUDIT_SERVICE, container => {
      const auditRepository = container.resolve<MongoSecurityAuditRepository>(TOKENS.SECURITY_AUDIT_REPOSITORY);
      return new SecurityAuditServiceImpl(auditRepository);
    });

    this.register(TOKENS.SECURITY_AUDIT_CONTROLLER, container => {
      const auditService = container.resolve<SecurityAuditServiceImpl>(TOKENS.SECURITY_AUDIT_SERVICE);
      return new SecurityAuditController(auditService);
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
      const adminSettingsRepo = this.resolve<AdminSettingsRepository>(
        TOKENS.ADMIN_SETTINGS_REPOSITORY
      );

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
