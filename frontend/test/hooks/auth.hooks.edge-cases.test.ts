/**
 * Auth Hooks Edge Cases Tests - Using Successful Auth Store Test Pattern
 * Comprehensive edge case testing for the useAuth hook
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user' as const,
  emailVerified: true,
  preferences: {},
  createdAt: '2024-01-01T00:00:00.000Z',
};

// Create API mock object - matches auth store test pattern
const authApiMock = {
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

// Mock the auth utils module - SAME AS SUCCESSFUL TESTS
jest.unstable_mockModule('../../src/auth/utils/index.ts', () => ({
  authApi: authApiMock,
  authEvents: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  AuthEvents: class {
    static getInstance() {
      return {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };
    }
  },
}));

describe('useAuth Hook - Edge Cases', () => {
  let useAuth: any;
  let useAuthStore: any;

  beforeAll(async () => {
    // Import after mocks are set up
    const hookModule = await import('../../src/auth/hooks/index.js');
    const storeModule = await import('../../src/auth/stores/auth.store.js');
    useAuth = hookModule.useAuth;
    useAuthStore = storeModule.useAuthStore;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isEmailVerified: false,
    });

    // Set up default successful API responses
    (authApiMock.login as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
    (authApiMock.register as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
    (authApiMock.logout as any).mockResolvedValue({
      data: { success: true, message: 'Logged out successfully' },
    });
    (authApiMock.checkAuthStatus as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
  });
  describe('Error Handling Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useAuth());

      // Mock network error - set up the mock first
      const networkError = new Error('Network error');
      (authApiMock.login as any).mockRejectedValue(networkError);

      await act(async () => {
        try {
          await result.current.login({ email: 'test@example.com', password: 'password' });
        } catch (error) {
          // Expected to fail due to network error
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should handle API errors with field validation', async () => {
      const { result } = renderHook(() => useAuth());

      // Create field error structure
      const fieldError = Object.assign(new Error('Invalid email'), {
        response: {
          data: {
            success: false,
            message: 'Invalid email',
            field: 'email',
            errors: { email: 'Invalid email' },
          },
        },
      });

      (authApiMock.login as any).mockRejectedValue(fieldError);

      await act(async () => {
        try {
          await result.current.login({ email: 'invalid-email', password: 'password' });
        } catch (error) {
          // Expected to fail due to field validation error
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should handle undefined API responses', async () => {
      const { result } = renderHook(() => useAuth());

      // Mock undefined response - this should cause the auth store to handle the error
      (authApiMock.login as any).mockResolvedValue(undefined);

      await act(async () => {
        try {
          await result.current.login({ email: 'test@example.com', password: 'password' });
        } catch (error) {
          // Expected to throw due to undefined response
        }
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('State Management Edge Cases', () => {
    it('should handle rapid successive calls', async () => {
      const { result } = renderHook(() => useAuth());

      // Make multiple rapid calls
      const promises = [
        result.current.login({ email: 'test1@example.com', password: 'password' }),
        result.current.login({ email: 'test2@example.com', password: 'password' }),
        result.current.login({ email: 'test3@example.com', password: 'password' }),
      ];

      await Promise.allSettled(promises);

      // Should have made 3 API calls
      expect(authApiMock.login).toHaveBeenCalledTimes(3);
    });

    it('should handle logout when not authenticated', async () => {
      const { result } = renderHook(() => useAuth());

      // Logout when not authenticated
      await result.current.logout();

      expect(authApiMock.logout).toHaveBeenCalled();
    });

    it('should handle clearError when no error exists', () => {
      const { result } = renderHook(() => useAuth());

      // Clear error when no error exists
      result.current.clearError();

      expect(result.current.error).toBeNull();
    });
  });

  describe('Hook Lifecycle Edge Cases', () => {
    it('should handle hook unmounting during async operations', async () => {
      const { result, unmount } = renderHook(() => useAuth());

      // Start an async operation
      const loginPromise = result.current.login({
        email: 'test@example.com',
        password: 'password',
      });

      // Unmount before completion
      unmount();

      // Should not throw error
      await expect(loginPromise).resolves.not.toThrow();
    });

    it('should handle multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useAuth());
      const { result: result2 } = renderHook(() => useAuth());

      // Both hooks should return the same state
      expect(result1.current.isAuthenticated).toBe(result2.current.isAuthenticated);
      expect(result1.current.user).toEqual(result2.current.user);
    });
  });
});
