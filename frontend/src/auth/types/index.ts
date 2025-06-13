/**
 * Authentication types and interfaces
 * Central type definitions for the authentication system
 */

// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: string;
  emailVerified: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  profile?: UserProfile;
  preferences?: UserPreferences;
  permissions?: UserPermissions;
  bio?: string;
}

export interface UserPermissions {
  canCreateUniverse?: boolean;
  canEditOwnContent?: boolean;
  canEditOtherContent?: boolean;
  canDeleteContent?: boolean;
  canManageUsers?: boolean;
  canManagePlugins?: boolean;
  canAccessAdminPanel?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  timezone?: string;
  locale?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: NotificationPreferences;
  privacy?: PrivacySettings;
  editor?: EditorPreferences;
}

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  inApp?: boolean;
}

export interface PrivacySettings {
  showEmail?: boolean;
  showProfile?: boolean;
}

export interface EditorPreferences {
  fontSize?: number;
  theme?: string;
  lineNumbers?: boolean;
}

// Authentication credentials
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  username: string;
  acceptTerms?: boolean;
}

// Password management
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Authentication state
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
  details?: Record<string, unknown>;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginResponse {
  user: User;
  session: {
    id: string;
    expiresAt: Date;
  };
}

export interface RegisterResponse {
  user: User;
  verificationRequired?: boolean;
}

// Session management
export interface UserSession {
  id: string;
  userId: string;
  deviceInfo?: DeviceInfo;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  browser?: string;
  ip?: string;
  deviceId?: string;
}

// Verification
export interface EmailVerificationData {
  token: string;
}

// Type guards
export const isUser = (obj: unknown): obj is User => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    typeof (obj as User).id === 'string' &&
    typeof (obj as User).email === 'string'
  );
};

export const isAuthError = (obj: unknown): obj is AuthError => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as AuthError).message === 'string'
  );
};

// Constants
export const AUTH_STORAGE_KEY = 'auth-store';
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

// User roles
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest',
}

// User status
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}
