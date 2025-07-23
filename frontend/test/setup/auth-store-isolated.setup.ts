/**
 * Isolated Test Setup for Auth Store Tests
 *
 * This setup file ensures complete isolation of mocks
 * specifically for auth store testing.
 */

import { jest, beforeAll } from '@jest/globals';

// Mock the entire auth utils module before any imports
jest.mock('../../src/auth/utils/index.ts', () => {
  // Create isolated mock API
  const mockAuthApi = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    checkAuthStatus: jest.fn(),
  };

  // Mock events system
  const mockAuthEvents = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  const MockAuthEvents = class {
    static getInstance() {
      return mockAuthEvents;
    }
  };

  return {
    authApi: mockAuthApi,
    authEvents: mockAuthEvents,
    AuthEvents: MockAuthEvents,
  };
});

// Ensure mocks are available globally for the test
beforeAll(() => {
  // Additional global setup if needed
  global.console = {
    ...console,
    error: jest.fn(), // Mock console.error to reduce noise
  };
});
