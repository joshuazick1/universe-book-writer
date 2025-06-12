/**
 * Frontend Test Utilities
 * Jest-compatible testing utilities for React components and hooks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Mock user data for testing
export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user' as const,
  emailVerified: true,
  preferences: {},
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};

export const mockAdminUser = {
  ...mockUser,
  id: 'admin-123',
  username: 'adminuser',
  email: 'admin@example.com',
  role: 'admin' as const,
  permissions: {
    canAccessAdminPanel: true,
    canManageUsers: true,
    canViewAnalytics: true,
  },
};

// Mock credentials for testing
export const validCredentials = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

export const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
};

// Simple render function with router
export function renderWithProviders(ui: React.ReactElement): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(BrowserRouter, null, children);
  }

  return render(ui, { wrapper: Wrapper });
}

// Mock functions for auth store
export const createMockAuthStore = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  clearError: jest.fn(),
  checkAuthStatus: jest.fn(),
  isAdmin: jest.fn(),
  hasRole: jest.fn(),
  hasPermission: jest.fn(),
  ...overrides,
});

// Mock API responses
export const createMockApiResponse = (data: any, success = true) => ({
  data: {
    success,
    data,
    message: success ? 'Operation successful' : 'Operation failed',
  },
  status: success ? 200 : 400,
  statusText: success ? 'OK' : 'Bad Request',
  headers: {},
  config: {},
});

// Mock error response
export const createMockErrorResponse = (message: string, status = 400, field?: string) => ({
  response: {
    data: {
      success: false,
      message,
      field,
    },
    status,
    statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
  },
  request: {},
  config: {},
});

// Helper to wait for async operations
export const waitForAsync = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Cleanup mocks after each test
export function cleanupMocks() {
  jest.clearAllMocks();
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRestore();
  }
}

// Re-export common testing utilities
export { 
  render, 
  screen, 
  fireEvent, 
  waitFor,
  userEvent,
  jest 
};
