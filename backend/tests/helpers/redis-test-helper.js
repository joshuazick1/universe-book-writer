/**
 * Redis Test Helper
 * Provides utilities for setting up Redis tests with mock or real instances
 */
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
/**
 * Mock Redis client that can be used for testing without a real Redis server
 */
export class MockRedis extends EventEmitter {
    dataStore = new Map();
    connected = false;
    constructor() {
        super();
        this.connected = true;
    }
    // Basic Redis operations
    async get(key) {
        return this.dataStore.get(key) || null;
    }
    async set(key, value) {
        this.dataStore.set(key, value);
        return 'OK';
    }
    // Implementation compatible with ioredis signature
    async del(...args) {
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
    async flushall() {
        this.dataStore.clear();
        return 'OK';
    }
    async flushdb() {
        return this.flushall();
    }
    // Clear all data in the mock
    clearData() {
        this.dataStore.clear();
    }
    async connect() {
        this.connected = true;
        this.emit('connect');
        this.emit('ready');
        return Promise.resolve();
    }
    async disconnect() {
        this.connected = false;
        this.emit('end');
        return Promise.resolve();
    }
    async quit() {
        await this.disconnect();
        return 'OK';
    }
}
/**
 * Setup a Redis test environment
 * @param useMock Whether to use a mock Redis or attempt to connect to a real one
 * @returns A RedisTestSetup object containing the client and cleanup function
 */
export async function setupRedisForTest(useMock = true) {
    if (useMock) {
        // Use a mock Redis implementation for tests
        const mockRedis = new MockRedis();
        return {
            client: mockRedis,
            cleanup: async () => {
                await mockRedis.disconnect();
            }, reset: () => {
                mockRedis.clearData();
            }
        };
    }
    else {
        // Use a real Redis connection for integration tests
        // Configure to use a separate database for tests
        const redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
            db: 15, // Use DB 15 for tests to avoid conflicts
            keyPrefix: 'ubw_test:', // Different prefix for tests
        });
        // Wait for connection
        await new Promise((resolve, reject) => {
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
//# sourceMappingURL=redis-test-helper.js.map