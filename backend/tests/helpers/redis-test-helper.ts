/**
 * Redis Test Helper
 * Provides utilities for setting up Redis tests with mock or real instances
 */

import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import type { Callback, RedisKey } from 'ioredis';

// Interface defining what our Redis test setup provides
export interface RedisTestSetup {
  /** Mock Redis client */
  client: Redis;
  /** Clean up resources after tests */
  cleanup: () => Promise<void>;
  /** Reset mocks and state between tests */
  reset: () => void;
}

/**
 * Mock Redis client that can be used for testing without a real Redis server
 */
export class MockRedis extends EventEmitter {
  private dataStore: Map<string, string> = new Map();
  private connected: boolean = false;
  
  constructor() {
    super();
    this.connected = true;
  }

  // Basic Redis operations
  async get(key: string): Promise<string | null> {
    return this.dataStore.get(key) || null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.dataStore.set(key, value);
    return 'OK';
  }

  // Implementation compatible with ioredis signature
  async del(...args: any[]): Promise<number> {
    // If the last argument is a function, it's a callback
    const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    
    // Handle the case where the first argument is an array of keys
    const keys = Array.isArray(args[0]) ? args[0] : args;
    
    let count = 0;
    for (const key of keys) {
      if (this.dataStore.has(key)) {
        this.dataStore.delete(key);
        count++;
      }
    }
    
    if (callback) {
      callback(null, count);
    }
    
    return count;
  }

  async flushall(): Promise<'OK'> {
    this.dataStore.clear();
    return 'OK';
  }

  async flushdb(): Promise<'OK'> {
    return this.flushall();
  }

  // Clear all data in the mock
  clearData(): void {
    this.dataStore.clear();
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connect');
    this.emit('ready');
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('end');
    return Promise.resolve();
  }

  async quit(): Promise<'OK'> {
    await this.disconnect();
    return 'OK';
  }

  // Add more Redis methods as needed
}

/**
 * Setup a Redis test environment
 * @param useMock Whether to use a mock Redis or attempt to connect to a real one
 * @returns A RedisTestSetup object containing the client and cleanup function
 */
export async function setupRedisForTest(useMock: boolean = true): Promise<RedisTestSetup> {
  if (useMock) {
    // Use a mock Redis implementation for tests
    const mockRedis = new MockRedis();
    
    return {
      client: mockRedis as unknown as Redis,
      cleanup: async () => {
        await mockRedis.disconnect();
      },      reset: () => {
        mockRedis.clearData();
      }
    };
  } else {
    // Use a real Redis connection for integration tests
    // Configure to use a separate database for tests
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
      db: 15, // Use DB 15 for tests to avoid conflicts
      keyPrefix: 'ubw_test:', // Different prefix for tests
    });
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      redis.once('ready', resolve);
      redis.once('error', reject);
    });
    
    // Flush the test database to ensure clean state
    await redis.flushdb();
    
    return {
      client: redis,
      cleanup: async () => {
        await redis.flushdb();
        await redis.quit();
      },
      reset: async () => {
        await redis.flushdb();
      }
    };
  }
}
