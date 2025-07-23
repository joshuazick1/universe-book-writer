/**
 * Authentication Hooks Tests - Using Successful Auth Store Test Pattern
 * Mocks the authApi directly like the working auth.store.test.ts
 */

import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// Mock user data - matches auth store test
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user' as const,
  emailVerified: true,
  preferences: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  username: 'testuser',
};

const mockAdminUser = {
  ...mockUser,
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin' as const,
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

// Mock the auth utils module - SAME AS AUTH STORE TEST
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

describe('useAuth Hook - Using Working Mock Pattern', () => {
  let useAuth: any;
  let useAuthStore: any;

  beforeAll(async () => {
    // Import useAuth after mocks are set up - SAME AS AUTH STORE TEST
    const hookModule = await import('../../src/auth/hooks/index.js');
    useAuth = hookModule.useAuth;

    // Also import the auth store to control its state
    const authStoreModule = await import('../../src/auth/stores/auth.store.js');
    useAuthStore = authStoreModule.useAuthStore;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset auth store to initial state
    const store = useAuthStore.getState();
    store.clearAuth();
  });

  // Test wrapper component
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return React.createElement('div', {}, children);
  };

  describe('Authentication State', () => {
    it('should return current authentication state', () => {
      // Set up authenticated user state in the store
      const store = useAuthStore.getState();
      store.user = mockUser;
      store.isAuthenticated = true;
      store.isLoading = false;
      store.error = null;

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return unauthenticated state by default', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return loading state', () => {
      // Set up loading state in the store
      const store = useAuthStore.getState();
      store.isLoading = true;

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('should return error state', () => {
      // Set up error state in the store
      const store = useAuthStore.getState();
      store.error = { message: 'Test error', field: 'email' };

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(result.current.error).toEqual({ message: 'Test error', field: 'email' });
    });
  });

  describe('Authentication Actions', () => {
    it('should call login when login is invoked', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      // Mock successful login
      (authApiMock.login as any).mockResolvedValue({
        data: { success: true, data: { user: mockUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(authApiMock.login).toHaveBeenCalledWith(credentials);
    });

    it('should call register when register is invoked', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
      };

      // Mock successful registration
      (authApiMock.register as any).mockResolvedValue({
        data: { success: true, data: { user: mockUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.register(userData);
      });

      expect(authApiMock.register).toHaveBeenCalledWith(userData);
    });

    it('should call logout when logout is invoked', async () => {
      // Mock successful logout
      (authApiMock.logout as any).mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(authApiMock.logout).toHaveBeenCalled();
    });

    it('should call clearError when clearError is invoked', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      act(() => {
        result.current.clearError();
      });

      // clearError is a store method, so we check if it was called by checking the error state
      expect(result.current.error).toBeNull();
    });
  });

  describe('Hook Behavior', () => {
    it('should return consistent function references', () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      // Function references should be stable
      expect(firstRender.login).toBe(secondRender.login);
      expect(firstRender.register).toBe(secondRender.register);
      expect(firstRender.logout).toBe(secondRender.logout);
    });
    it('should handle store updates', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      // Initially unauthenticated
      expect(result.current.isAuthenticated).toBe(false);

      // Update store state using the proper Zustand method
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      // Hook should reflect the update
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
