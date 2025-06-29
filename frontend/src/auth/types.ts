/**
 * Auth types
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export type UserRole = 'admin' | 'moderator' | 'user';

export interface RoleHierarchy {
  admin: number;
  moderator: number;
  user: number;
}

export const ROLE_HIERARCHY: RoleHierarchy = {
  admin: 3,
  moderator: 2,
  user: 1,
};

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  emailVerified?: boolean;
  createdAt?: string;
  profile?: UserProfile;
  preferences?: UserPreferences;
  bio?: string;
  permissions?: { [key: string]: boolean };
}

export interface UserProfile {
  // Add any profile-specific fields here
  avatarUrl?: string;
  // Add other profile fields as needed
}

export interface UserPreferences {
  // Add any user preferences fields here
  theme?: 'light' | 'dark';
  // Add other preference fields as needed
}

export interface LoginResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  isEmailVerified: boolean;
  tokens?: {
    access?: string;
    refresh?: string;
  };
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerificationData {
  token: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}


