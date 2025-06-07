import { describe, expect, it, beforeAll } from '@jest/globals';
import { MongoServerError } from 'mongodb';

describe('Database Infrastructure', () => {
  describe('MongoDB Memory Server', () => {
    let testCollection;

    beforeAll(async () => {
      testCollection = global.mongoClient.db().collection('test');
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
      await global.mongoClient.db().createCollection('validated', {
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

      const validatedCollection = global.mongoClient.db().collection('validated');

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
    it('should work with Redis mock', async () => {
      expect(global.redisClient).toBeDefined();

      // Test string operations
      await global.redisClient.set('test', 'value');
      const result = await global.redisClient.get('test');
      expect(result).toBe('value');
    });

    it('should handle list operations', async () => {
      // Test list operations
      await global.redisClient.lpush('testList', 'item1', 'item2');
      const listResult = await global.redisClient.lrange('testList', 0, -1);
      expect(listResult).toEqual(['item2', 'item1']);
    });

    it('should handle hash operations', async () => {
      // Test hash operations
      await global.redisClient.hset('testHash', 'field1', 'value1');
      const hashResult = await global.redisClient.hget('testHash', 'field1');
      expect(hashResult).toBe('value1');
    });

    it('should handle timeouts gracefully', async () => {
      // Test operation with timeout
      const result = await Promise.race([
        global.redisClient.get('nonexistent'),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 1000)),
      ]);
      expect(result).not.toBe('timeout');
    });
  });
});
