/**
 * Authentication API utilities
 * HTTP client for authentication-related API calls
 */

import axios, { AxiosResponse } from 'axios';
import type {
  LoginCredentials,
  RegisterCredentials,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  EmailVerificationData,
  ApiResponse,
  LoginResponse,
  RegisterResponse,
  User,
} from '../types';

// Configure axios instance for auth API
const authApiClient = axios.create({
  baseURL: '/api', // Using relative URL for proxy
  timeout: 10000,
  withCredentials: true, // Important for HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth headers
authApiClient.interceptors.request.use(
  config => {
    // With HTTP-only cookies, we don't need to manually add auth headers
    // The browser will automatically include the cookies
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
authApiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // Handle common auth errors
    if (error.response?.status === 401) {
      // Token expired or invalid - let the auth store handle this
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    return Promise.reject(error);
  }
);

// Authentication API methods
export const authApi = {
  /**
   * Login user with credentials
   */
  login: (credentials: LoginCredentials): Promise<AxiosResponse<ApiResponse<LoginResponse>>> => {
    return authApiClient.post('/auth/login', credentials);
  },

  /**
   * Register new user
   */
  register: (
    credentials: RegisterCredentials
  ): Promise<AxiosResponse<ApiResponse<RegisterResponse>>> => {
    return authApiClient.post('/auth/register', credentials);
  },

  /**
   * Logout current user
   */
  logout: (): Promise<AxiosResponse<ApiResponse<void>>> => {
    return authApiClient.post('/auth/logout');
  },

  /**
   * Get current user profile
   */
  getProfile: (): Promise<AxiosResponse<ApiResponse<{ user: User }>>> => {
    return authApiClient.get('/auth/profile');
  },

  /**
   * Update user profile
   */
  updateProfile: (data: Partial<User>): Promise<AxiosResponse<ApiResponse<{ user: User }>>> => {
    return authApiClient.put('/users/profile', data);
  },

  /**
   * Change password
   */
  changePassword: (data: ChangePasswordData): Promise<AxiosResponse<ApiResponse<void>>> => {
    return authApiClient.put('/users/change-password', data);
  },

  /**
   * Request password reset
   */
  forgotPassword: (data: ForgotPasswordData): Promise<AxiosResponse<ApiResponse<void>>> => {
    return authApiClient.post('/auth/forgot-password', data);
  },

  /**
   * Reset password with token
   */
  resetPassword: (data: ResetPasswordData): Promise<AxiosResponse<ApiResponse<void>>> => {
    return authApiClient.post('/auth/reset-password', data);
  },

  /**
   * Verify email address
   */
  verifyEmail: (data: EmailVerificationData): Promise<AxiosResponse<ApiResponse<void>>> => {
    return authApiClient.post('/auth/verify-email', data);
  },

  /**
   * Resend email verification
   */
  resendVerification: (): Promise<AxiosResponse<ApiResponse<void>>> => {
    return authApiClient.post('/auth/resend-verification');
  },

  /**
   * Refresh authentication token
   */
  refreshToken: (): Promise<AxiosResponse<ApiResponse<LoginResponse>>> => {
    return authApiClient.post('/auth/refresh-token');
  },

  /**
   * Check authentication status
   */
  checkAuthStatus: (): Promise<AxiosResponse<ApiResponse<{ user: User }>>> => {
    return authApiClient.get('/auth/me');
  },
};

// Utility functions for API responses
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') {
      return message;
    }

    // Handle validation errors
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        return errors[0].message || 'Validation error';
      }
    }

    // Default HTTP error messages
    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'A conflict occurred. This resource may already exist.';
      case 422:
        return 'Invalid data provided.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
};

// Check if user is authenticated based on response
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await authApi.getProfile();
    return true;
  } catch {
    return false;
  }
};

// Auth status event emitter for cross-component communication
export class AuthEvents {
  private static instance: AuthEvents;
  private eventTarget = new EventTarget();

  static getInstance(): AuthEvents {
    if (!AuthEvents.instance) {
      AuthEvents.instance = new AuthEvents();
    }
    return AuthEvents.instance;
  }

  emit(eventType: string, data?: unknown): void {
    this.eventTarget.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }

  on(eventType: string, callback: (event: CustomEvent) => void): void {
    this.eventTarget.addEventListener(eventType, callback as EventListener);
  }

  off(eventType: string, callback: (event: CustomEvent) => void): void {
    this.eventTarget.removeEventListener(eventType, callback as EventListener);
  }
}

export const authEvents = AuthEvents.getInstance();

export default authApi;
