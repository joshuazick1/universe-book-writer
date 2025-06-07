import Redis from 'ioredis-mock';

// Extend Redis mock with custom configuration
const CustomRedisMock = (...args) => {
  const instance = new Redis({
    data: {},
    lazyConnect: false,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1, // Reduce retries for tests
  });

  // Add missing methods that might be needed
  instance.duplicate = () => new CustomRedisMock(...args);

  return instance;
};

// Ensure the mock has all static properties from Redis
Object.assign(CustomRedisMock, Redis);

jest.mock('ioredis', () => ({
  __esModule: true,
  default: CustomRedisMock,
}));
