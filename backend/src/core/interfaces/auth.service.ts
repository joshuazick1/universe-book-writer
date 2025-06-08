/**
 * Authentication domain service interfaces
 * Defines contracts for authentication-related services
 */

import { User } from '../entities/user.entity.js';
import { TokenClaims, TokenType } from '../entities/auth.entity.js';

export interface PasswordValidationRules {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  prohibitCommonPasswords: boolean;
  prohibitUserInfo: boolean;
}

export interface PasswordService {
  /**
   * Hash a password using secure algorithm
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify password against hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Validate password strength
   */
  validatePassword(
    password: string,
    user?: Partial<User>
  ): Promise<{
    isValid: boolean;
    score: number; // 0-100
    feedback: string[];
    errors: string[];
  }>;

  /**
   * Generate secure random password
   */
  generateSecurePassword(length?: number): string;

  /**
   * Check if password is compromised (via HaveIBeenPwned or similar)
   */
  isPasswordCompromised(password: string): Promise<boolean>;
}

export interface TokenService {
  /**
   * Generate JWT token with claims
   */
  generateToken(claims: Omit<TokenClaims, 'iat' | 'exp'>): Promise<string>;

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): Promise<TokenClaims>;

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(
    user: User,
    deviceInfo?: Record<string, unknown>
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }>;

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }>;

  /**
   * Generate verification token
   */
  generateVerificationToken(
    user: User,
    type: TokenType
  ): Promise<{
    token: string;
    expiresAt: Date;
  }>;

  /**
   * Verify verification token
   */
  verifyVerificationToken(
    token: string,
    type: TokenType
  ): Promise<{
    userId: string;
    isValid: boolean;
    claims?: TokenClaims;
  }>;

  /**
   * Revoke token
   */
  revokeToken(tokenId: string, revokedBy?: string): Promise<boolean>;

  /**
   * Get token expiration time
   */
  getTokenExpiration(tokenType: TokenType): number; // milliseconds
}

export interface EmailService {
  /**
   * Send welcome email to new user
   */
  sendWelcomeEmail(user: User, verificationToken?: string): Promise<boolean>;

  /**
   * Send email verification
   */
  sendEmailVerification(user: User, verificationToken: string): Promise<boolean>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean>;

  /**
   * Send login notification
   */
  sendLoginNotification(user: User, deviceInfo: Record<string, unknown>): Promise<boolean>;

  /**
   * Send security alert
   */
  sendSecurityAlert(
    user: User,
    alertType: string,
    details: Record<string, unknown>
  ): Promise<boolean>;
}

export interface SecurityService {
  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): SecurityCheck;

  /**
   * Validate email format
   */
  validateEmailFormat(email: string): boolean;

  /**
   * Check if identifier is rate limited
   */
  isRateLimited(identifier: string, config: RateLimitConfig): boolean;

  /**
   * Check for suspicious login activity
   */
  checkSuspiciousActivity(
    user: User,
    deviceInfo: Record<string, unknown>
  ): Promise<{
    isSuspicious: boolean;
    reason?: string;
    riskScore: number; // 0-100
    recommendedAction: 'allow' | 'challenge' | 'block';
  }>;

  /**
   * Log security event
   */
  logSecurityEvent(
    userId: string,
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void>;

  /**
   * Check rate limits
   */
  checkRateLimit(
    identifier: string,
    action: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }>;

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number): string;

  /**
   * Validate device fingerprint
   */
  validateDeviceFingerprint(
    fingerprint: string,
    userId: string
  ): Promise<{
    isValid: boolean;
    isKnownDevice: boolean;
    riskScore: number;
  }>;
}

export interface SecurityCheck {
  isSecure: boolean;
  score: number; // 0-100
  issues: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  result?: string;
  details: Record<string, unknown>;
  riskScore?: number;
}
