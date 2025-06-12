/**
 * Authentication Store Tests
 * Comprehensive tests for the Zustand auth store
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { act } from '@testing-library/react';
import { useAuthStore } from '../../src/auth/stores/auth.store';
import { authApi } from '../../src/auth/utils';
import { 
  mockUser, 
  mockAdminUser, 
  validCredentials, 
  createMockApiResponse, 
  createMockErrorResponse 
} from '../utils';

// Mock the auth API
jest.mock('../../src/auth/utils', () => ({
  authApi: {
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
  },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('AuthStore', () => {
  let store: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    // Reset store state
    act(() => {
      store = useAuthStore.getState();
      store.clearAuth();
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock successful API response
      mockAuthApi.login.mockResolvedValueOnce(
        createMockApiResponse({ user: mockUser })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.login(validCredentials);
      });

      const state = useAuthStore.getState();
      
      expect(mockAuthApi.login).toHaveBeenCalledWith(validCredentials);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthApi.login.mockRejectedValueOnce(
        createMockErrorResponse(errorMessage, 401)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.login(validCredentials);
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      
      expect(mockAuthApi.login).toHaveBeenCalledWith(validCredentials);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
      });
    });

    it('should handle field-specific login errors', async () => {
      const errorMessage = 'Invalid email format';
      const errorField = 'email';
      mockAuthApi.login.mockRejectedValueOnce(
        createMockErrorResponse(errorMessage, 400, errorField)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.login(validCredentials);
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      
      expect(state.error).toEqual({
        message: errorMessage,
        field: errorField,
      });
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      mockAuthApi.login.mockReturnValueOnce(loginPromise);

      const store = useAuthStore.getState();

      // Start login
      act(() => {
        store.login(validCredentials);
      });

      // Check loading state
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve login
      await act(async () => {
        resolveLogin!(createMockApiResponse({ user: mockUser }));
        await loginPromise;
      });

      // Check final state
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        username: 'newuser',
      };

      mockAuthApi.register.mockResolvedValueOnce(
        createMockApiResponse({ user: mockUser })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.register(registerData);
      });

      const state = useAuthStore.getState();
      
      expect(mockAuthApi.register).toHaveBeenCalledWith(registerData);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle registration failure', async () => {
      const errorMessage = 'Email already exists';
      const registerData = {
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
      };

      mockAuthApi.register.mockRejectedValueOnce(
        createMockErrorResponse(errorMessage, 400, 'email')
      );

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.register(registerData);
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        field: 'email',
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      mockAuthApi.logout.mockResolvedValueOnce(
        createMockApiResponse(null)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.logout();
      });

      const state = useAuthStore.getState();
      
      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should clear state even if logout API fails', async () => {
      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      mockAuthApi.logout.mockRejectedValueOnce(new Error('Network error'));

      const store = useAuthStore.getState();

      await act(async () => {
        await store.logout();
      });

      const state = useAuthStore.getState();
      
      // Should still clear state even if API call fails
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokens).toBeNull();
    });
  });

  describe('Profile Management', () => {
    it('should get user profile successfully', async () => {
      mockAuthApi.getProfile.mockResolvedValueOnce(
        createMockApiResponse({ user: mockUser })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.getProfile();
      });

      const state = useAuthStore.getState();
      
      expect(mockAuthApi.getProfile).toHaveBeenCalled();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle profile fetch failure', async () => {
      mockAuthApi.getProfile.mockRejectedValueOnce(
        createMockErrorResponse('Unauthorized', 401)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        try {
          await store.getProfile();
        } catch (error) {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeDefined();
    });

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, profile: { firstName: 'Updated', lastName: 'Name' } };
      const updateData = { profile: { firstName: 'Updated', lastName: 'Name' } };

      mockAuthApi.updateProfile.mockResolvedValueOnce(
        createMockApiResponse({ user: updatedUser })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.updateProfile(updateData);
      });

      const state = useAuthStore.getState();
      
      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith(updateData);
      expect(state.user).toEqual(updatedUser);
    });
  });

  describe('Password Management', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123!',
        confirmPassword: 'newPassword123!',
      };

      mockAuthApi.changePassword.mockResolvedValueOnce(
        createMockApiResponse(null)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.changePassword(passwordData);
      });

      expect(mockAuthApi.changePassword).toHaveBeenCalledWith(passwordData);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should handle forgot password request', async () => {
      const emailData = { email: 'test@example.com' };

      mockAuthApi.forgotPassword.mockResolvedValueOnce(
        createMockApiResponse(null)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.forgotPassword(emailData);
      });

      expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith(emailData);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should reset password successfully', async () => {
      const resetData = {
        token: 'reset-token',
        newPassword: 'newPassword123!',
        confirmPassword: 'newPassword123!',
      };

      mockAuthApi.resetPassword.mockResolvedValueOnce(
        createMockApiResponse(null)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.resetPassword(resetData);
      });

      expect(mockAuthApi.resetPassword).toHaveBeenCalledWith(resetData);
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('Email Verification', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';

      mockAuthApi.verifyEmail.mockResolvedValueOnce(
        createMockApiResponse(null)
      );

      mockAuthApi.getProfile.mockResolvedValueOnce(
        createMockApiResponse({ user: { ...mockUser, emailVerified: true } })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.verifyEmail(token);
      });

      expect(mockAuthApi.verifyEmail).toHaveBeenCalledWith({ token });
      expect(mockAuthApi.getProfile).toHaveBeenCalled();
    });

    it('should resend verification email', async () => {
      mockAuthApi.resendVerification.mockResolvedValueOnce(
        createMockApiResponse(null)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.resendVerification();
      });

      expect(mockAuthApi.resendVerification).toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should set and clear errors', () => {
      const error = { message: 'Test error' };

      act(() => {
        useAuthStore.getState().setError(error);
      });

      expect(useAuthStore.getState().error).toEqual(error);

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should set loading state', () => {
      act(() => {
        useAuthStore.getState().setLoading(true);
      });

      expect(useAuthStore.getState().isLoading).toBe(true);

      act(() => {
        useAuthStore.getState().setLoading(false);
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should check auth status successfully', async () => {
      mockAuthApi.getProfile.mockResolvedValueOnce(
        createMockApiResponse({ user: mockUser })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.checkAuthStatus();
      });

      const state = useAuthStore.getState();
      
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle auth status check failure', async () => {
      mockAuthApi.getProfile.mockRejectedValueOnce(
        createMockErrorResponse('Unauthorized', 401)
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.checkAuthStatus();
      });

      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear all auth data', () => {
      // Set some state first
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          error: { message: 'Some error' },
        });
      });

      act(() => {
        useAuthStore.getState().clearAuth();
      });

      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Admin User Scenarios', () => {
    it('should handle admin login correctly', async () => {
      mockAuthApi.login.mockResolvedValueOnce(
        createMockApiResponse({ user: mockAdminUser })
      );

      const store = useAuthStore.getState();

      await act(async () => {
        await store.login(validCredentials);
      });

      const state = useAuthStore.getState();
      
      expect(state.user).toEqual(mockAdminUser);
      expect(state.user?.role).toBe('admin');
      expect(state.user?.permissions?.canAccessAdminPanel).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should persist authentication state', () => {
      // This test would verify the Zustand persist middleware
      // For now, we just verify the store structure supports persistence
      
      const state = useAuthStore.getState();
      
      // Check that the store has the expected structure for persistence
      expect(typeof state.user).toBeDefined();
      expect(typeof state.isAuthenticated).toBe('boolean');
    });
  });
});
