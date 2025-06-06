import Redis from 'ioredis';
import { MongoClient } from 'mongodb';

jest.mock('ioredis', () => require('ioredis-mock'));
jest.mock('mongodb', () => ({
  MongoClient: {
    connect: jest.fn().mockResolvedValue({
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({ insertedId: 'some-id' }),
          findOne: jest.fn().mockResolvedValue({ test: 'data' })
        })
      }),
      close: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

describe('Database Mocking Tests', () => {
  describe('MongoDB Mocking', () => {
    it('should work with mock MongoDB operations', async () => {
      const client = await new MongoClient('mock://mongodb').connect();
      const collection = client.db('test').collection('test');
      
      await collection.insertOne({ test: 'data' });
      const result = await collection.findOne({ test: 'data' });
      
      expect(result).toBeDefined();
      expect(result?.test).toBe('data');
      await client.close();
    });
  });  describe('Redis Mocking', () => {
    let redis: Redis;

    beforeEach(() => {
      redis = new Redis();
    });

    afterEach(() => {
      redis.disconnect();
    });

    it('should work with mock Redis', async () => {
      await redis.set('test', 'value');
      const result = await redis.get('test');
      expect(result).toBe('value');
    });
  });
});
