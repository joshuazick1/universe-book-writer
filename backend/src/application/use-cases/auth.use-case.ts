/**
 * Authentication use cases
 * Application layer orchestrating authentication-related business operations
 */

import { User, UserStatus, UserRole } from '../../core/entities/user.entity.js';
import { AuthToken, AuthSession, TokenType } from '../../core/entities/auth.entity.js';
import { UserRepository } from '../../core/interfaces/user.repository.js';
import {
  AuthTokenRepository,
  AuthSessionRepository,
} from '../../core/interfaces/auth.repository.js';
import {
  PasswordService,
  TokenService,
  EmailService,
  SecurityService,
} from '../../core/interfaces/auth.service.js';

export interface LoginRequest {
  email: string;
  password: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
    browser?: string;
    deviceId?: string;
  };
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  sessionId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface LogoutRequest {
  userId: string;
  sessionId?: string;
  logoutAll?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    user: User;
    verificationToken?: string;
  };
  error?: string;
}

/**
 * Authentication use cases
 */
export class AuthUseCase {
  constructor(
    private userRepository: UserRepository,
    private tokenRepository: AuthTokenRepository,
    private sessionRepository: AuthSessionRepository,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private emailService: EmailService,
    private securityService: SecurityService
  ) {}

  /**
   * Authenticate user and create session
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(request.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user can login
    if (!user.canLogin()) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new Error('Account is suspended');
      }
      if (user.status === UserStatus.INACTIVE) {
        throw new Error('Account is inactive');
      }
      if (!user.emailVerified) {
        throw new Error('Please verify your email before logging in');
      }
      throw new Error('Account cannot login');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      request.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.securityService.logSecurityEvent(user.id, 'login_failed', {
        reason: 'invalid_password',
        deviceInfo: request.deviceInfo,
      });
      throw new Error('Invalid email or password');
    }

    // Check for suspicious activity
    const securityCheck = await this.securityService.checkSuspiciousActivity(
      user,
      request.deviceInfo || {}
    );

    if (securityCheck.recommendedAction === 'block') {
      await this.securityService.logSecurityEvent(user.id, 'login_blocked', {
        reason: securityCheck.reason,
        riskScore: securityCheck.riskScore,
        deviceInfo: request.deviceInfo,
      });
      throw new Error('Login blocked for security reasons');
    }

    // Create session first to get session ID for JWT jti
    const sessionId = this.securityService.generateSecureRandom(24);
    const refreshTokenId = this.securityService.generateSecureRandom(24);
    
    const session = new AuthSession({
      id: sessionId,
      userId: user.id,
      refreshTokenId: refreshTokenId,
      deviceInfo: request.deviceInfo || {},
      expiresAt: new Date(Date.now() + this.tokenService.getTokenExpiration(TokenType.REFRESH)),
    });

    // Generate tokens with session ID as jti
    const baseClaims = {
      sub: user.id,
      email: user.email,
      username: user.username || user.email,
      role: user.role,
      jti: sessionId, // Use session ID as JWT ID
    };

    const accessToken = await this.tokenService.generateToken({
      ...baseClaims,
      tokenType: TokenType.ACCESS,
    });

    const refreshToken = await this.tokenService.generateToken({
      ...baseClaims,
      tokenType: TokenType.REFRESH,
    });

    const accessTokenExpiresAt = new Date(Date.now() + this.tokenService.getTokenExpiration(TokenType.ACCESS));
    const refreshTokenExpiresAt = new Date(Date.now() + this.tokenService.getTokenExpiration(TokenType.REFRESH));

    // Save access token
    const accessTokenRecord = new AuthToken({
      id: this.securityService.generateSecureRandom(24),
      userId: user.id,
      type: TokenType.ACCESS,
      token: accessToken,
      expiresAt: accessTokenExpiresAt,
      deviceInfo: request.deviceInfo,
    });

    await this.tokenRepository.save(accessTokenRecord);

    // Save refresh token
    const refreshTokenRecord = new AuthToken({
      id: refreshTokenId, // Use the pre-generated ID
      userId: user.id,
      type: TokenType.REFRESH,
      token: refreshToken,
      expiresAt: refreshTokenExpiresAt,
      deviceInfo: request.deviceInfo,
    });

    await this.tokenRepository.save(refreshTokenRecord);

    // Save session (no need to update since it already has the correct refresh token ID)
    await this.sessionRepository.save(session);

    // Update last login
    await this.userRepository.update(user.id, user.update({ lastLoginAt: new Date() }));

    // Log successful login
    await this.securityService.logSecurityEvent(user.id, 'login_success', {
      sessionId: session.id,
      deviceInfo: request.deviceInfo,
      riskScore: securityCheck.riskScore,
    });

    // Send login notification if suspicious
    if (securityCheck.isSuspicious) {
      try {
        await this.emailService.sendLoginNotification(user, request.deviceInfo || {});
      } catch (error) {
        console.warn('Failed to send login notification:', error);
      }
    }

    return {
      user,
      accessToken: accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      sessionId: session.id,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  }> {
    // Find refresh token
    const storedToken = await this.tokenRepository.findByToken(request.refreshToken);
    if (!storedToken || !storedToken.canBeUsed()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.userRepository.findById(storedToken.userId);
    if (!user || !user.canLogin()) {
      throw new Error('User cannot login');
    }

    // Find session to get session ID for jti
    const session = await this.sessionRepository.findByRefreshTokenId(storedToken.id);
    if (!session) {
      throw new Error('Session not found');
    }

    // Generate new access token ID (using session ID for access token)
    const newRefreshTokenId = this.securityService.generateSecureRandom(24);
    
    // Generate new tokens with different IDs
    const newAccessToken = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      username: user.username || user.email,
      role: user.role,
      jti: session.id, // Use session ID for access token
      tokenType: TokenType.ACCESS,
    });

    const newRefreshToken = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      username: user.username || user.email,
      role: user.role,
      jti: newRefreshTokenId, // Use new unique ID for refresh token
      tokenType: TokenType.REFRESH,
    });

    const accessTokenExpiresAt = new Date(Date.now() + this.tokenService.getTokenExpiration(TokenType.ACCESS));
    const refreshTokenExpiresAt = new Date(Date.now() + this.tokenService.getTokenExpiration(TokenType.REFRESH));

    // Update old refresh token
    const updatedToken = storedToken.markAsUsed();
    await this.tokenRepository.update(storedToken.id, updatedToken);

    // Save new access token
    const newAccessTokenRecord = new AuthToken({
      id: this.securityService.generateSecureRandom(24),
      userId: user.id,
      type: TokenType.ACCESS,
      token: newAccessToken,
      expiresAt: accessTokenExpiresAt,
      deviceInfo: request.deviceInfo,
    });

    await this.tokenRepository.save(newAccessTokenRecord);

    // Save new refresh token
    const newRefreshTokenRecord = new AuthToken({
      id: newRefreshTokenId, // Use the same ID as the JWT jti
      userId: user.id,
      type: TokenType.REFRESH,
      token: newRefreshToken,
      expiresAt: refreshTokenExpiresAt,
      deviceInfo: request.deviceInfo,
    });

    await this.tokenRepository.save(newRefreshTokenRecord);

    // Update session with new refresh token
    const updatedSession = new AuthSession({
      ...session.toPlainObject(),
      refreshTokenId: newRefreshTokenRecord.id,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    } as ConstructorParameters<typeof AuthSession>[0]);
    await this.sessionRepository.update(session.id, updatedSession);

    // Log token refresh
    await this.securityService.logSecurityEvent(user.id, 'token_refreshed', {
      oldTokenId: storedToken.id,
      newTokenId: newRefreshTokenRecord.id,
      deviceInfo: request.deviceInfo,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
    };
  }

  /**
   * Logout user
   */
  async logout(request: LogoutRequest): Promise<void> {
    if (request.logoutAll) {
      // Revoke all tokens for user
      await this.tokenRepository.revokeAllForUser(request.userId);
      // Deactivate all sessions
      await this.sessionRepository.deactivateAllForUser(request.userId);
    } else if (request.sessionId) {
      // Logout specific session
      const session = await this.sessionRepository.findById(request.sessionId);
      if (session && session.userId === request.userId) {
        // Deactivate session
        const deactivatedSession = session.deactivate();
        await this.sessionRepository.update(session.id, deactivatedSession);

        // Revoke refresh token
        const refreshToken = await this.tokenRepository.findById(session.refreshTokenId);
        if (refreshToken) {
          const revokedToken = refreshToken.revoke(request.userId);
          await this.tokenRepository.update(refreshToken.id, revokedToken);
        }
      }
    } else {
      // If no specific session, revoke all active tokens for the user
      // This ensures logout always revokes tokens even without session ID
      await this.tokenRepository.revokeAllForUser(request.userId);
      await this.sessionRepository.deactivateAllForUser(request.userId);
    }

    // Log logout
    await this.securityService.logSecurityEvent(request.userId, 'logout', {
      sessionId: request.sessionId,
      logoutAll: request.logoutAll,
    });
  }

  /**
   * Forgot password flow
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    const user = await this.userRepository.findByEmail(request.email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Check rate limit
    const rateLimit = await this.securityService.checkRateLimit(
      `forgot_password:${user.email}`,
      'forgot_password'
    );

    if (!rateLimit.allowed) {
      throw new Error('Too many password reset requests. Please try again later.');
    }

    // Generate reset token
    const resetTokenData = await this.tokenService.generateVerificationToken(
      user,
      TokenType.PASSWORD_RESET
    );

    // Save reset token
    const resetToken = new AuthToken({
      id: this.securityService.generateSecureRandom(24),
      userId: user.id,
      type: TokenType.PASSWORD_RESET,
      token: resetTokenData.token,
      expiresAt: resetTokenData.expiresAt,
      deviceInfo: request.deviceInfo,
    });

    await this.tokenRepository.save(resetToken);

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user, resetTokenData.token);

    // Log password reset request
    await this.securityService.logSecurityEvent(user.id, 'password_reset_requested', {
      tokenId: resetToken.id,
      deviceInfo: request.deviceInfo,
    });
  }

  /**
   * Reset password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    // Verify reset token
    const tokenVerification = await this.tokenService.verifyVerificationToken(
      request.token,
      TokenType.PASSWORD_RESET
    );

    if (!tokenVerification.isValid) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await this.userRepository.findById(tokenVerification.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find stored token
    const storedToken = await this.tokenRepository.findByToken(request.token);
    if (!storedToken || !storedToken.canBeUsed()) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = await this.passwordService.validatePassword(
      request.newPassword,
      user
    );

    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(request.newPassword);

    // Update user password
    const updatedUser = user.update({
      passwordHash: newPasswordHash,
    });

    await this.userRepository.update(user.id, updatedUser);

    // Mark token as used
    const usedToken = storedToken.markAsUsed();
    await this.tokenRepository.update(storedToken.id, usedToken);

    // Revoke all other tokens for security
    await this.tokenRepository.revokeAllForUser(user.id);
    await this.sessionRepository.deactivateAllForUser(user.id);

    // Log password reset
    await this.securityService.logSecurityEvent(user.id, 'password_reset_completed', {
      tokenId: storedToken.id,
      deviceInfo: request.deviceInfo,
    });

    // Send security alert
    try {
      await this.emailService.sendSecurityAlert(user, 'password_reset', {
        deviceInfo: request.deviceInfo,
      });
    } catch (error) {
      console.warn('Failed to send security alert:', error);
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(request: VerifyEmailRequest): Promise<User> {
    // Verify token
    const tokenVerification = await this.tokenService.verifyVerificationToken(
      request.token,
      TokenType.EMAIL_VERIFICATION
    );

    if (!tokenVerification.isValid) {
      throw new Error('Invalid or expired verification token');
    }

    const user = await this.userRepository.findById(tokenVerification.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      return user; // Already verified
    }

    // Find stored token
    const storedToken = await this.tokenRepository.findByToken(request.token);
    if (storedToken && storedToken.canBeUsed()) {
      // Mark token as used
      const usedToken = storedToken.markAsUsed();
      await this.tokenRepository.update(storedToken.id, usedToken);
    }

    // Update user
    const verifiedUser = user.update({
      emailVerified: true,
      status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
    });

    const savedUser = await this.userRepository.update(user.id, verifiedUser);

    // Log email verification
    await this.securityService.logSecurityEvent(savedUser.id, 'email_verified', {
      email: savedUser.email,
    });

    return savedUser;
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(request: ResendVerificationRequest): Promise<void> {
    const user = await this.userRepository.findByEmail(request.email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    if (user.emailVerified) {
      return; // Already verified
    }

    // Check rate limit
    const rateLimit = await this.securityService.checkRateLimit(
      `email_verification:${user.email}`,
      'email_verification'
    );

    if (!rateLimit.allowed) {
      throw new Error('Too many verification emails sent. Please try again later.');
    }

    // Generate verification token
    const verificationTokenData = await this.tokenService.generateVerificationToken(
      user,
      TokenType.EMAIL_VERIFICATION
    );

    // Save verification token
    const verificationToken = new AuthToken({
      id: this.securityService.generateSecureRandom(24),
      userId: user.id,
      type: TokenType.EMAIL_VERIFICATION,
      token: verificationTokenData.token,
      expiresAt: verificationTokenData.expiresAt,
    });

    await this.tokenRepository.save(verificationToken);

    // Send verification email
    await this.emailService.sendEmailVerification(user, verificationTokenData.token);

    // Log verification resend
    await this.securityService.logSecurityEvent(user.id, 'email_verification_resent', {
      tokenId: verificationToken.id,
    });
  }

  /**
   * Register new user
   */
  async register(
    request: RegisterRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RegisterResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(request.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Validate password
      const passwordValidation = await this.passwordService.validatePassword(request.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(request.password);

      // Generate username from email if not provided
      const username = request.email.split('@')[0] + '_' + Date.now();

      // Create user
      const user = new User({
        id: this.securityService.generateSecureRandom(24),
        email: request.email,
        username,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.PENDING,
        profile: {
          firstName: request.firstName,
          lastName: request.lastName,
          preferences: {
            theme: 'auto' as const,
            language: 'en',
            timezone: 'UTC',
            notifications: {
              email: true,
              push: false,
              mentions: true,
            },
          },
        },
        permissions: {
          canCreateUniverse: true,
          canEditOwnContent: true,
          canEditOtherContent: false,
          canDeleteContent: false,
          canManageUsers: false,
          canManagePlugins: false,
          canAccessAdminPanel: false,
        },
        emailVerified: false,
      });

      // Save user
      await this.userRepository.save(user);

      // Generate email verification token
      const verificationTokenData = await this.tokenService.generateVerificationToken(
        user,
        TokenType.EMAIL_VERIFICATION
      );

      const verificationToken = new AuthToken({
        id: this.securityService.generateSecureRandom(24),
        userId: user.id,
        type: TokenType.EMAIL_VERIFICATION,
        token: verificationTokenData.token,
        expiresAt: verificationTokenData.expiresAt,
        deviceInfo: { ip: ipAddress, userAgent },
      });

      await this.tokenRepository.save(verificationToken);

      // Send verification email
      try {
        await this.emailService.sendEmailVerification(user, verificationTokenData.token);
      } catch (error) {
        console.warn('Failed to send verification email:', error);
      }

      // Log registration
      await this.securityService.logSecurityEvent(user.id, 'user_registered', {
        ip: ipAddress,
        userAgent,
        email: user.email,
      });

      return {
        success: true,
        data: {
          user,
          verificationToken: verificationTokenData.token,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Revoke session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found');
    }

    // Deactivate session
    const deactivatedSession = session.deactivate();
    await this.sessionRepository.update(sessionId, deactivatedSession);

    // Revoke refresh token
    const refreshToken = await this.tokenRepository.findById(session.refreshTokenId);
    if (refreshToken) {
      const revokedToken = refreshToken.revoke(userId);
      await this.tokenRepository.update(refreshToken.id, revokedToken);
    }

    // Log session revocation
    await this.securityService.logSecurityEvent(userId, 'session_revoked', {
      sessionId,
    });
  }

  /**
   * Clean up expired tokens and sessions
   */
  async cleanup(): Promise<{
    expiredTokens: number;
    expiredSessions: number;
  }> {
    const [expiredTokens, expiredSessions] = await Promise.all([
      this.tokenRepository.deleteExpired(),
      this.sessionRepository.deleteExpired(),
    ]);

    return {
      expiredTokens,
      expiredSessions,
    };
  }
}
