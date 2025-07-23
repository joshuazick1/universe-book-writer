import type { Redis } from 'ioredis';
import { type MongoClient } from 'mongodb';
import type { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  let mongoUri: string;
  let mongoClient: MongoClient;
  let mongod: MongoMemoryServer;
  let redisClient: Redis;
  let testUtils: {
    mockUser: {
      id: string;
      email: string;
      role: string;
      profile: {
        firstName: string;
        lastName: string;
      };
      emailVerified: boolean;
      permissions: {
        canCreateUniverse: boolean;
        canEditOwnContent: boolean;
        canEditOtherContent: boolean;
        canDeleteContent: boolean;
        canManageUsers: boolean;
        canManagePlugins: boolean;
        canAccessAdminPanel: boolean;
      };
    };
    mockAdminUser: {
      id: string;
      email: string;
      role: string;
      profile: {
        firstName: string;
        lastName: string;
      };
      emailVerified: boolean;
      permissions: {
        canCreateUniverse: boolean;
        canEditOwnContent: boolean;
        canEditOtherContent: boolean;
        canDeleteContent: boolean;
        canManageUsers: boolean;
        canManagePlugins: boolean;
        canAccessAdminPanel: boolean;
      };
    };
    validCredentials: {
      email: string;
      password: string;
    };
    invalidCredentials: {
      email: string;
      password: string;
    };
    wait: (ms?: number) => Promise<void>;
  };

  namespace jest {
    interface Matchers<R> {
      toBeMongoError(type?: string): R;
      toBeRedisError(type?: string): R;
    }
  }

  namespace NodeJS {
    interface Global {
      mongoUri: string;
      mongoClient: MongoClient;
      mongod: MongoMemoryServer;
      redisClient: Redis;
      testUtils: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockUser: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockRequest: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockResponse: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cleanup: any;
      };
    }
  }
}

export {};
