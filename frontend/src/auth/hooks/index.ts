/**
 * Authentication hooks
 * React hooks for authentication state management
 */

import { useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import type {
  LoginCredentials,
  RegisterCredentials,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  User,
  AuthError,
} from '../types';

/**
 * Main authentication hook
 * Provides authentication state and actions
 */
export const useAuth = () => {
  const store = useAuthStore();

  // Memoized actions to prevent unnecessary re-renders
  const login = useCallback((credentials: LoginCredentials) => store.login(credentials), [store]);

  const register = useCallback(
    (credentials: RegisterCredentials) => store.register(credentials),
    [store]
  );

  const logout = useCallback(() => store.logout(), [store]);

  const getProfile = useCallback(() => store.getProfile(), [store]);

  const updateProfile = useCallback((data: Partial<User>) => store.updateProfile(data), [store]);

  const changePassword = useCallback(
    (data: ChangePasswordData) => store.changePassword(data),
    [store]
  );

  const forgotPassword = useCallback(
    (data: ForgotPasswordData) => store.forgotPassword(data),
    [store]
  );

  const resetPassword = useCallback(
    (data: ResetPasswordData) => store.resetPassword(data),
    [store]
  );

  const verifyEmail = useCallback((token: string) => store.verifyEmail(token), [store]);

  const resendVerification = useCallback(() => store.resendVerification(), [store]);

  const setError = useCallback((error: AuthError | null) => store.setError(error), [store]);

  const clearError = useCallback(() => store.clearError(), [store]);

  const setLoading = useCallback((loading: boolean) => store.setLoading(loading), [store]);

  const checkAuthStatus = useCallback(() => store.checkAuthStatus(), [store]);

  const clearAuth = useCallback(() => store.clearAuth(), [store]);

  // Authorization helpers
  const hasRole = useCallback(
    (role: string): boolean => {
      return store.user?.role === role;
    },
    [store.user]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return store.user?.permissions?.[permission] === true;
    },
    [store.user]
  );

  const isAdmin = useCallback((): boolean => {
    return store.user?.role === 'admin';
  }, [store.user]);

  return {
    // State
    user: store.user,
    tokens: store.tokens,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    setError,
    clearError,
    setLoading,
    checkAuthStatus,
    clearAuth,

    // Authorization helpers
    hasRole,
    hasPermission,
    isAdmin,
  };
};

/**
 * Hook for checking user permissions
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.role === role;
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      return roles.some(role => user?.role === role);
    },
    [user]
  );

  const isAdmin = useCallback((): boolean => {
    return user?.role === 'admin';
  }, [user]);

  const isModerator = useCallback((): boolean => {
    return user?.role === 'moderator' || user?.role === 'admin';
  }, [user]);

  const isUser = useCallback((): boolean => {
    return user?.role === 'user';
  }, [user]);

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isUser,
  };
};

/**
 * Hook for authentication status checking
 */
export const useAuthStatus = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  const isLoggedIn = isAuthenticated && !!user;
  const isLoggedOut = !isAuthenticated && !user;
  const isPending = isLoading;
  const isReady = !isLoading;

  return {
    isLoggedIn,
    isLoggedOut,
    isPending,
    isReady,
    isAuthenticated,
    isLoading,
  };
};

/**
 * Hook for user profile management
 */
export const useProfile = () => {
  const { user, updateProfile, isLoading, error } = useAuth();

  const profile = user?.profile;
  const preferences = user?.preferences;

  const updateUserProfile = useCallback(
    async (data: Partial<User>) => {
      try {
        await updateProfile(data);
        return true;
      } catch {
        return false;
      }
    },
    [updateProfile]
  );

  return {
    user,
    profile,
    preferences,
    updateProfile: updateUserProfile,
    isLoading,
    error,
  };
};

/**
 * Hook for authentication errors
 */
export const useAuthError = () => {
  const { error, setError, clearError } = useAuth();

  const hasError = !!error;
  const errorMessage = error?.message;
  const errorField = error?.field;
  const errorCode = error?.code;

  const isFieldError = useCallback(
    (field: string): boolean => {
      return error?.field === field;
    },
    [error]
  );

  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return error?.field === field ? error.message : undefined;
    },
    [error]
  );

  return {
    error,
    hasError,
    errorMessage,
    errorField,
    errorCode,
    isFieldError,
    getFieldError,
    setError,
    clearError,
  };
};

export default useAuth;
