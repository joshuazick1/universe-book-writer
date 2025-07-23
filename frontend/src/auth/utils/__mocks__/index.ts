/**
 * Manual mock for auth utils
 * This file is automatically used by Jest when mocking the auth utils module
 */

import { jest } from '@jest/globals';
import type {
  LoginCredentials,
  RegisterCredentials,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  EmailVerificationData,
  User,
  ApiResponse,
  LoginResponse,
  RegisterResponse,
} from '../../types';

// Mock user data
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user',
  emailVerified: true,
  preferences: {},
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin',
};

// Helper to create successful responses
const createSuccessResponse = <T>(data: T): { data: ApiResponse<T> } => ({
  data: {
    success: true,
    data,
    message: 'Operation successful',
  },
});

const createLoginResponse = (user: User): { data: LoginResponse } => ({
  data: {
    success: true,
    user,
    message: 'Login successful',
  },
});

const createRegisterResponse = (user: User): { data: RegisterResponse } => ({
  data: {
    success: true,
    user,
    message: 'Registration successful',
  },
});

// Mock API implementation
export const authApi = {
  // Authentication endpoints
  login: jest
    .fn<(credentials: LoginCredentials) => Promise<{ data: LoginResponse }>>()
    .mockResolvedValue(createLoginResponse(mockUser)),

  register: jest
    .fn<(credentials: RegisterCredentials) => Promise<{ data: RegisterResponse }>>()
    .mockResolvedValue(createRegisterResponse(mockUser)),

  logout: jest
    .fn<() => Promise<{ data: ApiResponse<null> }>>()
    .mockResolvedValue(createSuccessResponse(null)),

  // Profile management
  getProfile: jest
    .fn<() => Promise<{ data: ApiResponse<User> }>>()
    .mockResolvedValue(createSuccessResponse(mockUser)),

  updateProfile: jest
    .fn<(data: Partial<User>) => Promise<{ data: ApiResponse<User> }>>()
    .mockResolvedValue(createSuccessResponse({ ...mockUser, ...{} })),

  // Password management
  changePassword: jest
    .fn<(data: ChangePasswordData) => Promise<{ data: ApiResponse<null> }>>()
    .mockResolvedValue(createSuccessResponse(null)),

  forgotPassword: jest
    .fn<(data: ForgotPasswordData) => Promise<{ data: ApiResponse<null> }>>()
    .mockResolvedValue(createSuccessResponse(null)),

  resetPassword: jest
    .fn<(data: ResetPasswordData) => Promise<{ data: ApiResponse<null> }>>()
    .mockResolvedValue(createSuccessResponse(null)),

  // Email verification
  verifyEmail: jest
    .fn<(data: EmailVerificationData) => Promise<{ data: ApiResponse<null> }>>()
    .mockResolvedValue(createSuccessResponse(null)),

  resendVerification: jest
    .fn<() => Promise<{ data: ApiResponse<null> }>>()
    .mockResolvedValue(createSuccessResponse(null)),

  // Auth status
  checkAuth: jest
    .fn<() => Promise<{ data: ApiResponse<User> }>>()
    .mockResolvedValue(createSuccessResponse(mockUser)),
};

// Mock utility functions
export const isTokenExpired = jest.fn<(token: string) => boolean>().mockReturnValue(false);

export const getTokenExpiration = jest
  .fn<(token: string) => Date | null>()
  .mockReturnValue(new Date(Date.now() + 3600000)); // 1 hour from now

export const checkAuthStatus = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);

// Mock auth events
export const authEvents = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

export class AuthEvents {
  static getInstance() {
    return authEvents;
  }
}

export default authApi;
