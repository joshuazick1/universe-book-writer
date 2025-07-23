/**
 * Authentication Store Tests - Manual Mock Implementation
 * Uses manual mocking to completely avoid Jest module conflicts
 * This approach guarantees isolation from other test files
 */

import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { act } from '@testing-library/react';
import type { User } from '../../src/auth/types';

// Mock user data
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user',
  emailVerified: true,
  preferences: {},
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockAdminUser: User = {
  ...mockUser,
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin',
};

// Valid credentials for testing
const validCredentials = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

const validRegisterCredentials = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!',
};

const validChangePasswordData = {
  currentPassword: 'CurrentPassword123!',
  newPassword: 'NewPassword123!',
  confirmNewPassword: 'NewPassword123!',
};

const validForgotPasswordData = {
  email: 'test@example.com',
};

const validResetPasswordData = {
  token: 'reset-token-123',
  newPassword: 'NewPassword123!',
  confirmPassword: 'NewPassword123!',
};

const validEmailVerificationData = {
  token: 'verification-token-123',
};

const validProfileUpdateData = {
  firstName: 'Updated',
  lastName: 'Name',
};

// Create field-specific error helper
function createFieldError(message: string, field: string) {
  const error = new Error(message) as any;
  error.response = {
    data: {
      success: false,
      message,
      field,
      errors: { [field]: message },
    },
    status: 400,
  };
  return error;
}

// Manual mock approach - create our own mock API that we control completely
const authStoreMockApi = {
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

// Mock the module using a completely isolated approach
jest.unstable_mockModule('../../src/auth/utils/index.ts', () => ({
  authApi: authStoreMockApi,
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

// Use Jest's isolateModules for complete isolation
describe('AuthStore', () => {
  let useAuthStore: any;

  beforeAll(async () => {
    // Import the store after our mock is established
    const module = await import('../../src/auth/stores/auth.store');
    useAuthStore = module.useAuthStore;
  });
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset store state
    act(() => {
      const store = useAuthStore.getState();
      store.clearAuth();
    });

    // Set up enhanced mock responses
    (authStoreMockApi.login as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser },
        message: 'Login successful',
      },
    });

    (authStoreMockApi.register as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser, message: 'Registration successful' },
        message: 'Registration successful',
      },
    });

    (authStoreMockApi.logout as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        message: 'Logout successful',
      },
    });

    (authStoreMockApi.getProfile as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser },
        message: 'Profile retrieved',
      },
    });

    (authStoreMockApi.updateProfile as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: { ...mockUser, firstName: 'Updated', lastName: 'Name' } },
        message: 'Profile updated',
      },
    });

    (authStoreMockApi.changePassword as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        message: 'Password changed successfully',
      },
    });

    (authStoreMockApi.forgotPassword as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        message: 'Password reset email sent',
      },
    });

    (authStoreMockApi.resetPassword as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        message: 'Password reset successfully',
      },
    });

    (authStoreMockApi.verifyEmail as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        message: 'Email verified successfully',
      },
    });

    (authStoreMockApi.resendVerification as any).mockResolvedValue({
      data: {
        success: true,
        data: null,
        message: 'Verification email sent',
      },
    });

    (authStoreMockApi.checkAuthStatus as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser },
        message: 'Auth status checked',
      },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      await act(async () => {
        await useAuthStore.getState().login(validCredentials);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.login).toHaveBeenCalledWith(validCredentials);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (authStoreMockApi.login as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().login(validCredentials);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.login).toHaveBeenCalledWith(validCredentials);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error?.message).toBe(errorMessage);
    });
    it('should handle field-specific login errors', async () => {
      const errorMessage = 'Invalid email format';
      const errorField = 'email';
      (authStoreMockApi.login as any).mockRejectedValueOnce(
        createFieldError(errorMessage, errorField)
      );

      await act(async () => {
        try {
          await useAuthStore.getState().login(validCredentials);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(state.error).toEqual({
        message: errorMessage,
        field: errorField,
      });
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      await act(async () => {
        await useAuthStore.getState().register(validRegisterCredentials);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.register).toHaveBeenCalledWith(validRegisterCredentials);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle registration failure', async () => {
      const errorMessage = 'Email already exists';
      (authStoreMockApi.register as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().register(validRegisterCredentials);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.register).toHaveBeenCalledWith(validRegisterCredentials);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error?.message).toBe(errorMessage);
    });
    it('should handle field-specific registration errors', async () => {
      const errorMessage = 'Password too weak';
      const errorField = 'password';
      (authStoreMockApi.register as any).mockRejectedValueOnce(
        createFieldError(errorMessage, errorField)
      );

      await act(async () => {
        try {
          await useAuthStore.getState().register(validRegisterCredentials);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(state.error).toEqual({
        message: errorMessage,
        field: errorField,
      });
    });
  });

  describe('Profile Management', () => {
    it('should get user profile successfully', async () => {
      await act(async () => {
        await useAuthStore.getState().getProfile();
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.getProfile).toHaveBeenCalled();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle profile fetch failure', async () => {
      const errorMessage = 'Profile not found';
      (authStoreMockApi.getProfile as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().getProfile();
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.getProfile).toHaveBeenCalled();
      expect(state.isLoading).toBe(false);
      expect(state.error?.message).toBe(errorMessage);
    });

    it('should update profile successfully', async () => {
      // Set up initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await useAuthStore.getState().updateProfile(validProfileUpdateData);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.updateProfile).toHaveBeenCalledWith(validProfileUpdateData);
      expect(state.user).toEqual({ ...mockUser, ...validProfileUpdateData });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle profile update failure', async () => {
      const errorMessage = 'Update failed';
      (authStoreMockApi.updateProfile as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().updateProfile(validProfileUpdateData);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.updateProfile).toHaveBeenCalledWith(validProfileUpdateData);
      expect(state.isLoading).toBe(false);
      expect(state.error?.message).toBe(errorMessage);
    });
  });

  describe('Password Management', () => {
    it('should change password successfully', async () => {
      await act(async () => {
        await useAuthStore.getState().changePassword(validChangePasswordData);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.changePassword).toHaveBeenCalledWith(validChangePasswordData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle change password failure', async () => {
      const errorMessage = 'Current password incorrect';
      const errorField = 'currentPassword';
      (authStoreMockApi.changePassword as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage, field: errorField } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().changePassword(validChangePasswordData);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.changePassword).toHaveBeenCalledWith(validChangePasswordData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        field: errorField,
      });
    });

    it('should handle forgot password request', async () => {
      await act(async () => {
        await useAuthStore.getState().forgotPassword(validForgotPasswordData);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.forgotPassword).toHaveBeenCalledWith(validForgotPasswordData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle forgot password failure', async () => {
      const errorMessage = 'Email not found';
      const errorField = 'email';
      (authStoreMockApi.forgotPassword as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage, field: errorField } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().forgotPassword(validForgotPasswordData);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.forgotPassword).toHaveBeenCalledWith(validForgotPasswordData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        field: errorField,
      });
    });

    it('should reset password successfully', async () => {
      await act(async () => {
        await useAuthStore.getState().resetPassword(validResetPasswordData);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.resetPassword).toHaveBeenCalledWith(validResetPasswordData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle reset password failure', async () => {
      const errorMessage = 'Invalid or expired token';
      const errorField = 'token';
      (authStoreMockApi.resetPassword as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage, field: errorField } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().resetPassword(validResetPasswordData);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.resetPassword).toHaveBeenCalledWith(validResetPasswordData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        field: errorField,
      });
    });
  });

  describe('Email Verification', () => {
    it('should verify email successfully', async () => {
      await act(async () => {
        await useAuthStore.getState().verifyEmail('verification-token-123');
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.verifyEmail).toHaveBeenCalledWith(validEmailVerificationData);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
    it('should handle email verification failure', async () => {
      const errorMessage = 'Invalid verification token';
      (authStoreMockApi.verifyEmail as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().verifyEmail('invalid-token');
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.verifyEmail).toHaveBeenCalledWith({ token: 'invalid-token' });
      expect(state.isLoading).toBe(false);
      expect(state.error?.message).toBe(errorMessage);
      // Note: verifyEmail implementation doesn't set field errors
    });

    it('should resend verification email', async () => {
      await act(async () => {
        await useAuthStore.getState().resendVerification();
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.resendVerification).toHaveBeenCalled();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle resend verification failure', async () => {
      const errorMessage = 'Too many requests';
      (authStoreMockApi.resendVerification as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        try {
          await useAuthStore.getState().resendVerification();
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.resendVerification).toHaveBeenCalled();
      expect(state.isLoading).toBe(false);
      expect(state.error?.message).toBe(errorMessage);
    });
  });
  describe('Auth Status Check', () => {
    it('should check auth status successfully', async () => {
      // checkAuthStatus actually calls getProfile internally
      await act(async () => {
        await useAuthStore.getState().checkAuthStatus();
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.getProfile).toHaveBeenCalled();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle auth status check failure', async () => {
      const errorMessage = 'Session expired';
      (authStoreMockApi.getProfile as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        await useAuthStore.getState().checkAuthStatus();
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.getProfile).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      // Note: checkAuthStatus doesn't set error on failure, just clears auth
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      // Set up initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.logout).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear state even if logout API fails', async () => {
      // Set up initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      const errorMessage = 'Logout failed';
      (authStoreMockApi.logout as any).mockRejectedValueOnce({
        response: { data: { message: errorMessage } },
      });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.logout).toHaveBeenCalled();
      // State should still be cleared even if API call fails
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should set and clear errors', () => {
      const store = useAuthStore.getState();

      // Set error
      store.setError({ message: 'Test error' });
      expect(useAuthStore.getState().error?.message).toBe('Test error');

      // Clear error
      store.clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should set loading state', () => {
      const store = useAuthStore.getState();

      store.setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      store.setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should clear all auth data', () => {
      // Set up some state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          error: { message: 'Test error' },
        });
      });

      // Clear auth
      act(() => {
        useAuthStore.getState().clearAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Admin User Scenarios', () => {
    it('should handle admin login correctly', async () => {
      // Mock admin login response
      (authStoreMockApi.login as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: { user: mockAdminUser },
          message: 'Admin login successful',
        },
      });

      await act(async () => {
        await useAuthStore.getState().login(validCredentials);
      });

      const state = useAuthStore.getState();

      expect(authStoreMockApi.login).toHaveBeenCalledWith(validCredentials);
      expect(state.user).toEqual(mockAdminUser);
      expect(state.user?.role).toBe('admin');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
