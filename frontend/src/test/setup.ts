/**
 * Test Setup File
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Clean up after each test case
afterEach(() => {
  cleanup();
});

// Mock window.location
beforeAll(() => {
  // Mock window.location for navigation tests
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:5173',
      origin: 'http://localhost:5173',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });

  // Mock window.dispatchEvent for auth events
  const originalDispatchEvent = window.dispatchEvent;
  vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
    return originalDispatchEvent.call(window, event);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    profile: {
      firstName: 'Test',
      lastName: 'User',
    },
    emailVerified: true,
    permissions: {
      canCreateUniverse: true,
      canEditOwnContent: true,
      canEditOtherContent: false,
      canDeleteContent: false,
      canManageUsers: false,
      canManagePlugins: false,
      canAccessAdminPanel: false,
    },
  },

  mockAdminUser: {
    id: 'test-admin-id',
    email: 'admin@example.com',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'User',
    },
    emailVerified: true,
    permissions: {
      canCreateUniverse: true,
      canEditOwnContent: true,
      canEditOtherContent: true,
      canDeleteContent: true,
      canManageUsers: true,
      canManagePlugins: true,
      canAccessAdminPanel: true,
    },
  },

  // Mock credentials
  validCredentials: {
    email: 'test@example.com',
    password: 'TestPassword123!',
  },

  invalidCredentials: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },

  // Helper to wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
};
