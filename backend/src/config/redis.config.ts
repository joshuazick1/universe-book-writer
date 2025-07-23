import { Redis } from 'ioredis';

interface RedisConfig {
  host: string;
  port: number;
  db: number;
  keyPrefix: string;
  retryStrategy: (times: number) => number | undefined;
}

const config: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  db: Number.parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: 'ubw:', // VerseForge prefix
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const createRedisClient = (): Redis => {
  const client = new Redis({
    ...config,
    lazyConnect: true, // Don't connect immediately
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  });

  // Error handling
  client.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
  });

  client.on('connect', () => {
    console.log('Redis client connected');
  });

  return client;
};

export default config;
