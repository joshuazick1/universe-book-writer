/**
 * Temporary minimal container for debugging
 */
import type { MongoClient, Db } from 'mongodb';
import type { UserRepository } from '../../core/interfaces/user.repository.js';
import type { AuthController } from '../../api/controllers/auth.controller.js';
import type { UserController } from '../../api/controllers/user.controller.js';
import { AuthMiddleware } from '../../api/middleware/auth.middleware.js';
import { ValidationMiddleware } from '../../api/middleware/validation.middleware.js';

// Import only essential implementations
import { MongoUserRepository } from '../persistence/user.repository.js';
import { AuthController as AuthControllerImpl } from '../../api/controllers/auth.controller.js';
import { UserController as UserControllerImpl } from '../../api/controllers/user.controller.js';

export const MINIMAL_TOKENS = {
  // Essential tokens only
  USER_REPOSITORY: Symbol('UserRepository'),
  AUTH_CONTROLLER: Symbol('AuthController'),
  USER_CONTROLLER: Symbol('UserController'),
  AUTH_MIDDLEWARE: Symbol('AuthMiddleware'),
  VALIDATION_MIDDLEWARE: Symbol('ValidationMiddleware'),
  MONGO_CLIENT: Symbol('MongoClient'),
  DATABASE_NAME: Symbol('DatabaseName'),
  DATABASE: Symbol('Database'),
} as const;

interface ServiceRegistration<T = unknown> {
  factory: (container: MinimalContainer) => T;
  singleton: boolean;
  instance?: T;
}

export interface ContainerConfig {
  mongoClient: MongoClient;
  databaseName: string;
}

export class MinimalContainer {
  private services = new Map<symbol, ServiceRegistration>();
  private config: ContainerConfig;

  constructor(config: ContainerConfig) {
    this.config = config;
    this.registerDefaults();
  }

  register<T>(
    token: symbol,
    factory: (container: MinimalContainer) => T,
    singleton: boolean = true
  ): void {
    this.services.set(token, { factory, singleton });
  }

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

  getConfig(): ContainerConfig {
    return this.config;
  }

  private registerDefaults(): void {
    // Register external dependencies
    this.register(MINIMAL_TOKENS.MONGO_CLIENT, () => this.config.mongoClient);
    this.register(MINIMAL_TOKENS.DATABASE_NAME, () => this.config.databaseName);
    this.register(MINIMAL_TOKENS.DATABASE, container => {
      const mongoClient = container.resolve<MongoClient>(MINIMAL_TOKENS.MONGO_CLIENT);
      const databaseName = container.resolve<string>(MINIMAL_TOKENS.DATABASE_NAME);
      return mongoClient.db(databaseName);
    });

    // Register repositories
    this.register(MINIMAL_TOKENS.USER_REPOSITORY, container => {
      const db = container.resolve<Db>(MINIMAL_TOKENS.DATABASE);
      return new MongoUserRepository(db);
    });

    // Register middleware
    this.register(MINIMAL_TOKENS.AUTH_MIDDLEWARE, () => {
      // Return a dummy auth middleware for now
      return new AuthMiddleware({} as any, {} as any, {} as any, {} as any);
    });

    this.register(MINIMAL_TOKENS.VALIDATION_MIDDLEWARE, () => {
      return new ValidationMiddleware();
    });
  }

  async initialize(): Promise<void> {
    // Minimal initialization
    console.log('Minimal container initialized');
  }
}

export function createMinimalContainer(config: ContainerConfig): MinimalContainer {
  return new MinimalContainer(config);
}
