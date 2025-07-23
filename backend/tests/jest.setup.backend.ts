/**
 * Backend-specific Jest setup
 * Lighter setup for unit tests that don't require full database integration
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Import Redis mock dynamically to work around ESM issues
const IORedis = await import('ioredis-mock').then(m => m.default);

// Redis mock configuration
const redisMockConfig = {
  data: {},
  lazyConnect: false,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
};

// Initialize Redis mock with config
const redisClient = new (IORedis as any)(redisMockConfig);
(global as unknown as { redisClient: typeof redisClient }).redisClient = redisClient;

// Mock MongoDB client for unit tests that don't need real database
const mockMongoClient = {
  connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  db: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      insertOne: jest.fn<() => Promise<{ insertedId: string }>>().mockResolvedValue({ insertedId: 'mock-id' }),
      findOne: jest.fn<() => Promise<any>>().mockResolvedValue(null),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn<() => Promise<any[]>>().mockResolvedValue([])
      }),
      updateOne: jest.fn<() => Promise<{ modifiedCount: number }>>().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn<() => Promise<{ deletedCount: number }>>().mockResolvedValue({ deletedCount: 1 }),
    })
  })
};

// Make mock MongoDB client available globally
Object.assign(global, {
  mongoUri: 'mongodb://localhost:27017',
  mongoClient: mockMongoClient,
});

// Global setup for tests
beforeAll(async () => {
  jest.setTimeout(15000);
});

afterAll(async () => {
  // Clean up Redis mock
  if (redisClient) {
    redisClient.disconnect();
  }
});

// Enhanced error logging for debugging
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'test') {
    originalConsoleError('[TEST ERROR]:', ...args);
  } else {
    originalConsoleError(...args);
  }
};
