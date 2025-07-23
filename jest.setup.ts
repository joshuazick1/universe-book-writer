import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { MongoClient, MongoServerError } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

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
const redisClient = new IORedis(redisMockConfig);
(global as unknown as { redisClient: typeof redisClient }).redisClient = redisClient;

let mongod: MongoMemoryServer;
let mongoClient: MongoClient;

// Global setup for tests
beforeAll(async () => {
  // Increase timeout for setup
  jest.setTimeout(60000); // Increase to 60s for slower CI environments

  try {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'test',
        storageEngine: 'wiredTiger',
      },
      binary: {
        version: '6.0.12',
      },
    });
    const uri = mongod.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();

    // Make connection available globally
    Object.assign(global, {
      mongoUri: uri,
      mongoClient: mongoClient,
      mongod: mongod,
    });

    // Verify connections
    await Promise.all([mongoClient.db().command({ ping: 1 }), redisClient.ping()]);
    // eslint-disable-next-line no-console
    console.log('Connected successfully to test environment');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start test environment:', error);
    if (error instanceof MongoServerError) {
      // eslint-disable-next-line no-console
      console.error('MongoDB Error Details:', error.errInfo);
    }
    throw error;
  }
});

// Clean up resources after each test
afterEach(async () => {
  try {
    // Clear MongoDB collections
    const collections = await mongoClient.db().collections();
    await Promise.all(collections.map(collection => collection.deleteMany({})));

    // Clear Redis mock data
    await redisClient.flushall();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in afterEach cleanup:', error);
  }
});

// Clean up after all tests
afterAll(async () => {
  const cleanup = async () => {
    try {
      // Clean up order matters - Redis first, then MongoDB
      if (redisClient) {
        await redisClient.flushall(); // Clear all data
        redisClient.disconnect(false);
      }

      if (mongoClient) {
        await mongoClient.close(true); // Force close
      }
      if (mongod) {
        await mongod.stop({ doCleanup: true, force: true });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in afterAll cleanup:', error);
      // Don't throw here to ensure all cleanup attempts run
    }
  };

  await cleanup();
});

// Custom matchers
expect.extend({
  toBeMongoError(received: unknown, type?: string) {
    const pass =
      received instanceof MongoServerError &&
      (!type || (received as MongoServerError).codeName === type);
    return {
      pass,
      message: () =>
        pass
          ? `Expected error not to be a MongoServerError${type ? ` of type ${type}` : ''}`
          : `Expected error to be a MongoServerError${type ? ` of type ${type}` : ''}`,
    };
  },
  toBeRedisError(received: unknown, code?: string) {
    const isRedisError =
      received instanceof Error &&
      'code' in received &&
      (!code || (received as { code: string }).code === code);
    return {
      pass: isRedisError,
      message: () =>
        isRedisError
          ? `Expected error not to be a Redis error${code ? ` with code ${code}` : ''}`
          : `Expected error to be a Redis error${code ? ` with code ${code}` : ''}`,
    };
  },
});
