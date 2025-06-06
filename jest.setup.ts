import '@testing-library/jest-dom';
import redisMock from 'redis-mock';

// Global test setup
jest.setTimeout(10000); // 10 second timeout

// Redis Mocking
jest.mock('redis', () => redisMock);
