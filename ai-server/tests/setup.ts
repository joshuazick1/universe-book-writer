import { jest } from '@jest/globals';

/**
 * AI Server Test Environment Configuration
 * Sets up the testing environment for AI server components
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.OLLAMA_HOST = 'http://localhost:11434';
process.env.AI_SERVER_PORT = '3002';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(30000);

// Suppress console output during tests unless explicitly needed
const originalLog = console.log;
const originalInfo = console.info;

beforeAll(() => {
  // console.log = jest.fn();
  // console.info = jest.fn();
});

afterAll(() => {
  // console.log = originalLog;
  // console.info = originalInfo;
});

jest.mock('node:cluster', () => ({
  isPrimary: true,
  fork: jest.fn(),
  on: jest.fn(),
}));
