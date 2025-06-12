/**
 * Authentication Hooks Tests
 * Comprehensive tests for React authentication hooks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useAuth, usePermissions } from '../index';
import { useAuthStore } from '../../stores/auth.store';
import { 
  mockUser, 
  mockAdminUser, 
  validCredentials, 
  cleanupMocks,
  createMockApiResponse,
  createMockErrorResponse 
} from '../../../test/utils';

// Mock the auth store
jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

describe('Authentication Hooks', () => {
  const mockStoreActions = {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    clearError: jest.fn(),
    checkAuthStatus: jest.fn(),
  };

  const mockStoreState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    ...mockStoreActions,
  };

  beforeEach(() => {
    jest.mocked(useAuthStore).mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('useAuth Hook', () => {
    describe('State Access', () => {
      it('should provide authentication state from store', () => {
        const mockState = {
          ...mockStoreState,
          user: mockUser,
          isAuthenticated: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      it('should provide loading state', () => {
        const mockState = {
          ...mockStoreState,
          isLoading: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.isLoading).toBe(true);
      });

      it('should provide error state', () => {
        const errorMessage = 'Authentication failed';
        const mockState = {
          ...mockStoreState,
          error: errorMessage,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.error).toBe(errorMessage);
      });
    });

    describe('Action Methods', () => {
      it('should provide login method', async () => {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.login(validCredentials);
        });

        expect(mockStoreActions.login).toHaveBeenCalledWith(validCredentials);
      });

      it('should provide logout method', async () => {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.logout();
        });

        expect(mockStoreActions.logout).toHaveBeenCalled();
      });

      it('should provide register method', async () => {
        const registerData = {
          email: 'new@example.com',
          password: 'password123',
          username: 'newuser',
        };

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.register(registerData);
        });

        expect(mockStoreActions.register).toHaveBeenCalledWith(registerData);
      });

      it('should provide updateProfile method', async () => {
        const profileData = { username: 'updateduser' };

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.updateProfile(profileData);
        });

        expect(mockStoreActions.updateProfile).toHaveBeenCalledWith(profileData);
      });

      it('should provide changePassword method', async () => {
        const passwordData = {
          currentPassword: 'oldpass',
          newPassword: 'newpass',
        };

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.changePassword(passwordData);
        });

        expect(mockStoreActions.changePassword).toHaveBeenCalledWith(passwordData);
      });

      it('should provide forgotPassword method', async () => {
        const forgotData = { email: 'forgot@example.com' };

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.forgotPassword(forgotData);
        });

        expect(mockStoreActions.forgotPassword).toHaveBeenCalledWith(forgotData);
      });

      it('should provide resetPassword method', async () => {
        const resetData = {
          token: 'reset-token',
          newPassword: 'newpassword',
        };

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.resetPassword(resetData);
        });

        expect(mockStoreActions.resetPassword).toHaveBeenCalledWith(resetData);
      });

      it('should provide verifyEmail method', async () => {
        const token = 'verify-token';

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.verifyEmail(token);
        });

        expect(mockStoreActions.verifyEmail).toHaveBeenCalledWith(token);
      });

      it('should provide resendVerification method', async () => {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.resendVerification();
        });

        expect(mockStoreActions.resendVerification).toHaveBeenCalled();
      });

      it('should provide clearError method', () => {
        const { result } = renderHook(() => useAuth());

        act(() => {
          result.current.clearError();
        });

        expect(mockStoreActions.clearError).toHaveBeenCalled();
      });

      it('should provide checkAuthStatus method', async () => {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.checkAuthStatus();
        });

        expect(mockStoreActions.checkAuthStatus).toHaveBeenCalled();
      });
    });

    describe('Utility Methods', () => {
      it('should provide isAdmin utility method', () => {
        const mockState = {
          ...mockStoreState,
          user: mockAdminUser,
          isAuthenticated: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.isAdmin()).toBe(true);
      });

      it('should return false for isAdmin when user is not admin', () => {
        const mockState = {
          ...mockStoreState,
          user: mockUser,
          isAuthenticated: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.isAdmin()).toBe(false);
      });

      it('should return false for isAdmin when user is null', () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.isAdmin()).toBe(false);
      });

      it('should provide hasRole utility method', () => {
        const mockState = {
          ...mockStoreState,
          user: mockAdminUser,
          isAuthenticated: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.hasRole('admin')).toBe(true);
        expect(result.current.hasRole('user')).toBe(false);
      });

      it('should return false for hasRole when user is null', () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.hasRole('admin')).toBe(false);
      });

      it('should provide hasPermission utility method', () => {
        const userWithPermissions = {
          ...mockUser,
          permissions: { canRead: true, canWrite: false },
        };
        const mockState = {
          ...mockStoreState,
          user: userWithPermissions,
          isAuthenticated: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.hasPermission('canRead')).toBe(true);
        expect(result.current.hasPermission('canWrite')).toBe(false);
        expect(result.current.hasPermission('nonExistent')).toBe(false);
      });

      it('should return false for hasPermission when user has no permissions', () => {
        const mockState = {
          ...mockStoreState,
          user: mockUser,
          isAuthenticated: true,
        };
        jest.mocked(useAuthStore).mockReturnValue(mockState);

        const { result } = renderHook(() => useAuth());

        expect(result.current.hasPermission('canRead')).toBe(false);
      });
    });

    describe('Hook Stability', () => {
      it('should maintain referential equality for methods', () => {
        const { result, rerender } = renderHook(() => useAuth());

        const firstRender = {
          login: result.current.login,
          logout: result.current.logout,
          register: result.current.register,
          clearError: result.current.clearError,
        };

        rerender();

        expect(result.current.login).toBe(firstRender.login);
        expect(result.current.logout).toBe(firstRender.logout);
        expect(result.current.register).toBe(firstRender.register);
        expect(result.current.clearError).toBe(firstRender.clearError);
      });
    });
  });

  describe('usePermissions Hook', () => {
    it('should provide permission checking utilities', () => {
      const userWithPermissions = {
        ...mockUser,
        permissions: { 
          canRead: true, 
          canWrite: true, 
          canDelete: false,
          canManageUsers: false,
        },
      };
      const mockState = {
        ...mockStoreState,
        user: userWithPermissions,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission('canRead')).toBe(true);
      expect(result.current.hasPermission('canWrite')).toBe(true);
      expect(result.current.hasPermission('canDelete')).toBe(false);
      expect(result.current.hasPermission('canManageUsers')).toBe(false);
    });

    it('should provide hasAnyPermission method', () => {
      const userWithPermissions = {
        ...mockUser,
        permissions: { canRead: true, canWrite: false },
      };
      const mockState = {
        ...mockStoreState,
        user: userWithPermissions,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(['canRead', 'canWrite'])).toBe(true);
      expect(result.current.hasAnyPermission(['canWrite', 'canDelete'])).toBe(false);
      expect(result.current.hasAnyPermission([])).toBe(false);
    });

    it('should provide hasAllPermissions method', () => {
      const userWithPermissions = {
        ...mockUser,
        permissions: { canRead: true, canWrite: true, canDelete: false },
      };
      const mockState = {
        ...mockStoreState,
        user: userWithPermissions,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAllPermissions(['canRead', 'canWrite'])).toBe(true);
      expect(result.current.hasAllPermissions(['canRead', 'canDelete'])).toBe(false);
      expect(result.current.hasAllPermissions([])).toBe(true);
    });

    it('should provide getUserPermissions method', () => {
      const userPermissions = { canRead: true, canWrite: true, canDelete: false };
      const userWithPermissions = {
        ...mockUser,
        permissions: userPermissions,
      };
      const mockState = {
        ...mockStoreState,
        user: userWithPermissions,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.getUserPermissions()).toEqual(userPermissions);
    });

    it('should return empty object when user has no permissions', () => {
      const mockState = {
        ...mockStoreState,
        user: mockUser,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.getUserPermissions()).toEqual({});
    });

    it('should return empty object when user is null', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.getUserPermissions()).toEqual({});
      expect(result.current.hasPermission('canRead')).toBe(false);
      expect(result.current.hasAnyPermission(['canRead'])).toBe(false);
      expect(result.current.hasAllPermissions(['canRead'])).toBe(false);
    });

    it('should provide isAdmin shortcut', () => {
      const mockState = {
        ...mockStoreState,
        user: mockAdminUser,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
    });

    it('should maintain referential equality for methods', () => {
      const { result, rerender } = renderHook(() => usePermissions());

      const firstRender = {
        hasPermission: result.current.hasPermission,
        hasAnyPermission: result.current.hasAnyPermission,
        hasAllPermissions: result.current.hasAllPermissions,
        getUserPermissions: result.current.getUserPermissions,
      };

      rerender();

      expect(result.current.hasPermission).toBe(firstRender.hasPermission);
      expect(result.current.hasAnyPermission).toBe(firstRender.hasAnyPermission);
      expect(result.current.hasAllPermissions).toBe(firstRender.hasAllPermissions);
      expect(result.current.getUserPermissions).toBe(firstRender.getUserPermissions);
    });
  });

  describe('Hook Integration', () => {
    it('should work together for comprehensive auth checking', () => {
      const userWithPermissions = {
        ...mockAdminUser,
        permissions: { canManageUsers: true, canViewAnalytics: true },
      };
      const mockState = {
        ...mockStoreState,
        user: userWithPermissions,
        isAuthenticated: true,
      };
      jest.mocked(useAuthStore).mockReturnValue(mockState);

      const { result: authResult } = renderHook(() => useAuth());
      const { result: permResult } = renderHook(() => usePermissions());

      // User is authenticated and admin
      expect(authResult.current.isAuthenticated).toBe(true);
      expect(authResult.current.isAdmin()).toBe(true);
      expect(authResult.current.hasRole('admin')).toBe(true);

      // User has specific permissions
      expect(permResult.current.hasPermission('canManageUsers')).toBe(true);
      expect(permResult.current.hasAllPermissions(['canManageUsers', 'canViewAnalytics'])).toBe(true);
      expect(permResult.current.isAdmin).toBe(true);
    });
  });
});
