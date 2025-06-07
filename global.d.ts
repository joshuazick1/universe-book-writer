import { MongoClient, MongoServerError } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Redis } from 'ioredis';

declare global {
  let mongoUri: string;
  let mongoClient: MongoClient;
  let mongod: MongoMemoryServer;
  let redisClient: Redis;

  namespace jest {
    interface Matchers<R> {
      toBeMongoError(type?: string): R;
      toBeRedisError(type?: string): R;
    }
  }

  // Extend NodeJS namespace to include our test environment
  namespace NodeJS {
    interface Global {
      mongoUri: string;
      mongoClient: MongoClient;
      mongod: MongoMemoryServer;
      redisClient: Redis;
    }
  }
}
