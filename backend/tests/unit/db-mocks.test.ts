import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import type { Collection, MongoClient } from 'mongodb';
import { MongoServerError } from 'mongodb';
import { setupMongoForTest, globalMongoCleanup } from '../../helpers/mongodb-test-helper.js';

describe('Database Infrastructure', () => {
    let mongoClient: MongoClient;
    let cleanup: () => Promise<void>;

    beforeAll(async () => {
        const setup = await setupMongoForTest('db_mocks_test');
        mongoClient = setup.mongoClient;
        cleanup = setup.cleanup;
    });

    afterAll(async () => {
        await cleanup();
        await globalMongoCleanup();
    });

    describe('MongoDB Memory Server', () => {
        let testCollection: Collection;

        beforeAll(async () => {
            testCollection = mongoClient.db().collection('test');
        });

        it('should perform basic CRUD operations', async () => {
            // Create
            const insertResult = await testCollection.insertOne({ test: 'data' });
            expect(insertResult.acknowledged).toBe(true);

            // Read
            const readResult = await testCollection.findOne({ _id: insertResult.insertedId });
            expect(readResult).toBeDefined();
            expect(readResult?.test).toBe('data');

            // Update
            const updateResult = await testCollection.updateOne(
                { _id: insertResult.insertedId },
                { $set: { test: 'updated' } }
            );
            expect(updateResult.modifiedCount).toBe(1);

            // Delete
            const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
            expect(deleteResult.deletedCount).toBe(1);
        });

        it('should handle validation errors', async () => {
            // Create a collection with schema validation
            await mongoClient.db().createCollection('validated', {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['name'],
                        properties: {
                            name: { bsonType: 'string' },
                        },
                    },
                },
            });

            const validatedCollection = mongoClient.db().collection('validated');

            // Attempt to insert invalid document
            try {
                await validatedCollection.insertOne({ wrongField: 'test' });
                throw new Error('Expected validation error');
            } catch (error) {
                expect(error).toBeInstanceOf(MongoServerError);
            }
        });
    });

    describe('Redis Mocking', () => {
        let redisClient: any;

        beforeAll(async () => {
            // Import Redis mock dynamically
            const IORedis = await import('ioredis-mock').then(m => m.default);
            redisClient = new IORedis({
                data: {},
                lazyConnect: false,
                enableReadyCheck: false,
                maxRetriesPerRequest: 1,
            });
        });

        it('should work with Redis mock', async () => {
            expect(redisClient).toBeDefined();

            // Test string operations
            await redisClient.set('test', 'value');
            const result = await redisClient.get('test');
            expect(result).toBe('value');
        });

        it('should handle list operations', async () => {
            // Test list operations
            await redisClient.lpush('testList', 'item1', 'item2');
            const listResult = await redisClient.lrange('testList', 0, -1);
            expect(listResult).toEqual(['item2', 'item1']);
        });

        it('should handle hash operations', async () => {
            // Test hash operations
            await redisClient.hset('testHash', 'field1', 'value1');
            const hashResult = await redisClient.hget('testHash', 'field1');
            expect(hashResult).toBe('value1');
        });

        it('should handle timeouts gracefully', async () => {
            // Test operation with timeout
            const result = await Promise.race([
                redisClient.get('nonexistent'),
                new Promise(resolve => setTimeout(() => resolve('timeout'), 1000)),
            ]);
            expect(result).not.toBe('timeout');
        });
    });
});
