/**
 * Zustand store for authentication state management
 * Designed to work with HTTP-only cookie authentication
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  AuthState,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthError,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
} from '../types';
import { authApi } from '../utils';

// Define error response type for API calls
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      field?: string;
    };
  };
  message?: string;
}

interface AuthActions {
  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;

  // User profile actions
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;

  // Password management
  changePassword: (data: ChangePasswordData) => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;

  // Email verification
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;

  // State management
  setError: (error: AuthError | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  checkAuthStatus: () => Promise<void>;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isEmailVerified: false,

        // Authentication actions
        login: async (credentials: LoginCredentials) => {
          try {
            set({ isLoading: true, error: null });

            const response = await authApi.login(credentials);
            const { data } = response.data;

            // With HTTP-only cookies, tokens are managed by the browser
            // We only store user data and authentication state
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return data.user;
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Login failed',
              field: apiError.response?.data?.field,
            };
            set({
              isLoading: false,
              error: authError,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        register: async (credentials: RegisterCredentials) => {
          try {
            set({ isLoading: true, error: null });

            const response = await authApi.register(credentials);
            const { data } = response.data;

            // With HTTP-only cookies, we just store user state
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Registration failed',
              field: apiError.response?.data?.field,
            };
            set({
              isLoading: false,
              error: authError,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        logout: async () => {
          try {
            set({ isLoading: true });

            // Call logout endpoint to clear HTTP-only cookies
            await authApi.logout();
          } catch (error) {
            // Continue with logout even if server call fails
          } finally {
            // Clear local state
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        // User profile actions
        getProfile: async () => {
          try {
            set({ isLoading: true, error: null });

            const response = await authApi.getProfile();
            const { data } = response.data;

            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Failed to fetch profile',
            };
            set({
              isLoading: false,
              error: authError,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        updateProfile: async (data: Partial<User>) => {
          try {
            set({ isLoading: true, error: null });

            const response = await authApi.updateProfile(data);
            const { data: responseData } = response.data;

            set({
              user: responseData.user,
              isLoading: false,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Failed to update profile',
              field: apiError.response?.data?.field,
            };
            set({
              isLoading: false,
              error: authError,
            });
            throw error;
          }
        },

        // Password management
        changePassword: async (data: ChangePasswordData) => {
          try {
            set({ isLoading: true, error: null });

            await authApi.changePassword(data);
            set({
              isLoading: false,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Failed to change password',
              field: apiError.response?.data?.field,
            };
            set({
              isLoading: false,
              error: authError,
            });
            throw error;
          }
        },

        forgotPassword: async (data: ForgotPasswordData) => {
          try {
            set({ isLoading: true, error: null });

            await authApi.forgotPassword(data);
            set({
              isLoading: false,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Failed to send reset email',
              field: apiError.response?.data?.field,
            };
            set({
              isLoading: false,
              error: authError,
            });
            throw error;
          }
        },

        resetPassword: async (data: ResetPasswordData) => {
          try {
            set({ isLoading: true, error: null });

            await authApi.resetPassword(data);
            set({
              isLoading: false,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Failed to reset password',
              field: apiError.response?.data?.field,
            };
            set({
              isLoading: false,
              error: authError,
            });
            throw error;
          }
        },

        // Email verification
        verifyEmail: async (token: string) => {
          try {
            set({ isLoading: true, error: null });

            await authApi.verifyEmail({ token });

            // Refresh user profile to get updated verification status
            await get().getProfile();
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Email verification failed',
            };
            set({
              isLoading: false,
              error: authError,
            });
            throw error;
          }
        },

        resendVerification: async () => {
          try {
            set({ isLoading: true, error: null });

            await authApi.resendVerification();
            set({
              isLoading: false,
            });
          } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            const authError: AuthError = {
              message: apiError.response?.data?.message || 'Failed to resend verification email',
            };
            set({
              isLoading: false,
              error: authError,
            });
            throw error;
          }
        },

        // State management
        setError: (error: AuthError | null) => {
          const currentError = get().error;
          // Only update if the error actually changed
          if (JSON.stringify(currentError) !== JSON.stringify(error)) {
            set({ error });
          }
        },

        clearError: () => {
          const currentError = get().error;
          // Only clear if there is an error
          if (currentError) {
            set({ error: null });
          }
        },

        setLoading: (loading: boolean) => {
          const currentLoading = get().isLoading;
          // Only update if the loading state changed
          if (currentLoading !== loading) {
            set({ isLoading: loading });
          }
        },

        checkAuthStatus: async () => {
          // Skip if we're already loading
          if (get().isLoading) {
            return;
          }

          try {
            set({ isLoading: true, error: null });

            // Try to get user profile - if successful, user is authenticated
            const response = await authApi.getProfile();
            const { data } = response.data;

            set({
              user: data.user,
              isAuthenticated: true,
            });
          } catch (error) {
            // If profile fetch fails, user is not authenticated
            set({
              user: null,
              isAuthenticated: false,
            });
          } finally {
            set({ isLoading: false });
          }
        },

        clearAuth: () => {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        },
      }),
      {
        name: 'auth-store',
        // Don't persist authentication state for HTTP-only cookies
        // The server will validate the cookie on each request  
        partialize: () => ({}),
      }
    )
  )
);
