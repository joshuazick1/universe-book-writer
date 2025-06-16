/**
 * useAuth Hook Detailed Tests - Using Successful Auth Store Test Pattern
 * Comprehensive tests for all auth hook functionality
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock user data - matches auth store test
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

describe('useAuth Hook - Detailed Tests', () => {
  let useAuth: any;

  beforeAll(async () => {
    // Import useAuth after mocks are set up - SAME AS AUTH STORE TEST
    const module = await import('../../src/auth/hooks/index.js');
    useAuth = module.useAuth;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up default successful mock responses
    (authApiMock.login as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
    (authApiMock.register as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
    (authApiMock.logout as any).mockResolvedValue({
      data: { success: true, message: 'Logged out successfully' },
    });
    (authApiMock.getProfile as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
    (authApiMock.updateProfile as any).mockResolvedValue({
      data: { success: true, data: { user: { ...mockUser, firstName: 'Updated' } } },
    });
    (authApiMock.changePassword as any).mockResolvedValue({
      data: { success: true, message: 'Password changed successfully' },
    });
    (authApiMock.forgotPassword as any).mockResolvedValue({
      data: { success: true, message: 'Reset email sent' },
    });
    (authApiMock.resetPassword as any).mockResolvedValue({
      data: { success: true, message: 'Password reset successfully' },
    });
    (authApiMock.verifyEmail as any).mockResolvedValue({
      data: { success: true, message: 'Email verified' },
    });
    (authApiMock.resendVerification as any).mockResolvedValue({
      data: { success: true, message: 'Verification email sent' },
    });
    (authApiMock.checkAuthStatus as any).mockResolvedValue({
      data: { success: true, data: { user: mockUser } },
    });
  });

  describe('Authentication Methods', () => {
    it('should handle login', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      expect(authApiMock.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should handle registration', async () => {
      const { result } = renderHook(() => useAuth());
      const registerData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'password',
        confirmPassword: 'password',
      };

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(authApiMock.register).toHaveBeenCalledWith(registerData);
    });

    it('should handle logout', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(authApiMock.logout).toHaveBeenCalled();
    });
  });

  describe('Profile Management', () => {
    it('should handle profile retrieval', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.getProfile();
      });

      expect(authApiMock.getProfile).toHaveBeenCalled();
    });

    it('should handle profile updates', async () => {
      const { result } = renderHook(() => useAuth());
      const updateData = { firstName: 'Updated', lastName: 'Name' };

      await act(async () => {
        await result.current.updateProfile(updateData);
      });

      expect(authApiMock.updateProfile).toHaveBeenCalledWith(updateData);
    });
  });

  describe('Password Management', () => {
    it('should handle password change', async () => {
      const { result } = renderHook(() => useAuth());
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        confirmNewPassword: 'newpass',
      };

      await act(async () => {
        await result.current.changePassword(passwordData);
      });

      expect(authApiMock.changePassword).toHaveBeenCalledWith(passwordData);
    });

    it('should handle forgot password', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.forgotPassword({ email: 'test@example.com' });
      });

      expect(authApiMock.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should handle password reset', async () => {
      const { result } = renderHook(() => useAuth());
      const resetData = {
        token: 'reset-token',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      };

      await act(async () => {
        await result.current.resetPassword(resetData);
      });

      expect(authApiMock.resetPassword).toHaveBeenCalledWith(resetData);
    });
  });

  describe('Email Verification', () => {
    it('should handle email verification', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.verifyEmail('verify-token');
      });

      expect(authApiMock.verifyEmail).toHaveBeenCalledWith({ token: 'verify-token' });
    });

    it('should handle resend verification', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.resendVerification();
      });

      expect(authApiMock.resendVerification).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    it('should handle auth status check', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(authApiMock.getProfile).toHaveBeenCalled();
    });

    it('should handle error clearing', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.clearError();
      });

      // clearError is a synchronous operation, no API call expected
      expect(authApiMock.login).not.toHaveBeenCalled();
    });
  });
});
