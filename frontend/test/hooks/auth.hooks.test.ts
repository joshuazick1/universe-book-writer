/**
 * Authentication Hooks Tests
 * Tests for useAuth and other authentication-related hooks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../../src/auth/hooks';
import { mockUser, mockAdminUser, validCredentials, cleanupMocks } from '../utils';

// Mock the auth store
const mockAuthStore = {
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
};

jest.mock('../../src/auth/stores/auth.store', () => ({
  useAuthStore: jest.fn(() => mockAuthStore),
}));

const { useAuthStore } = jest.requireMock('../../src/auth/stores/auth.store');

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mockAuthStore).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockClear();
      }
    });

    // Reset store state
    useAuthStore.mockReturnValue({
      ...mockAuthStore,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Authentication State', () => {
    it('should return current authentication state', () => {
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return unauthenticated state by default', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return loading state', () => {
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        isLoading: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return error state', () => {
      const errorMessage = 'Authentication failed';
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        error: errorMessage,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Authentication Actions', () => {
    it('should call login action', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login(validCredentials);
      });

      expect(mockAuthStore.login).toHaveBeenCalledWith(validCredentials);
    });

    it('should call register action', async () => {
      const registerData = {
        ...validCredentials,
        username: 'testuser',
      };

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(mockAuthStore.register).toHaveBeenCalledWith(registerData);
    });

    it('should call logout action', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthStore.logout).toHaveBeenCalled();
    });

    it('should call updateProfile action', async () => {
      const profileData = {
        username: 'newusername',
        email: 'newemail@example.com',
      };

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.updateProfile(profileData);
      });

      expect(mockAuthStore.updateProfile).toHaveBeenCalledWith(profileData);
    });

    it('should call changePassword action', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.changePassword(passwordData);
      });

      expect(mockAuthStore.changePassword).toHaveBeenCalledWith(passwordData);
    });

    it('should call forgotPassword action', async () => {
      const email = 'test@example.com';

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.forgotPassword(email);
      });

      expect(mockAuthStore.forgotPassword).toHaveBeenCalledWith(email);
    });

    it('should call resetPassword action', async () => {
      const resetData = {
        token: 'reset-token',
        password: 'newpassword',
      };

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.resetPassword(resetData);
      });

      expect(mockAuthStore.resetPassword).toHaveBeenCalledWith(resetData);
    });

    it('should call verifyEmail action', async () => {
      const token = 'verification-token';

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.verifyEmail(token);
      });

      expect(mockAuthStore.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('should call clearError action', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.clearError();
      });

      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });

    it('should call checkAuthStatus action', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(mockAuthStore.checkAuthStatus).toHaveBeenCalled();
    });
  });

  describe('Authorization Helpers', () => {
    it('should check if user is admin', () => {
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAdmin()).toBe(true);
    });

    it('should check user role', () => {
      const role = 'admin';
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.hasRole(role)).toBe(true);
    });

    it('should check user permissions', () => {
      const permission = 'canAccessAdminPanel';
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: mockAdminUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.hasPermission(permission)).toBe(true);
    });
  });

  describe('Hook Consistency', () => {
    it('should maintain stable references for functions', () => {
      const { result, rerender } = renderHook(() => useAuth());

      const firstLogin = result.current.login;
      const firstLogout = result.current.logout;

      rerender();

      expect(result.current.login).toBe(firstLogin);
      expect(result.current.logout).toBe(firstLogout);
    });

    it('should update when store state changes', () => {
      const { result, rerender } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);

      // Simulate store state change
      useAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: mockUser,
        isAuthenticated: true,
      });

      rerender();

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Error Handling', () => {
    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthStore.login.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.login(validCredentials);
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle network errors gracefully', async () => {
      mockAuthStore.checkAuthStatus.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.checkAuthStatus();
        })
      ).rejects.toThrow('Network error');
    });
  });
});
