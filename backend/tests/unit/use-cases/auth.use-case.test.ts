/**
 * Authentication Use Case Unit Tests
 * Tests login, logout, session management, and token operations
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthUseCase } from '../../../src/application/use-cases/auth.use-case.js';
import { UserRepository } from '../../../src/core/interfaces/user.repository.js';
import { 
  AuthTokenRepository, 
  AuthSessionRepository 
} from '../../../src/core/interfaces/auth.repository.js';
import { PasswordService } from '../../../src/core/interfaces/password.service.js';
import { TokenService } from '../../../src/core/interfaces/auth.service.js';
import { EmailService } from '../../../src/core/interfaces/email.service.js';
import { SecurityService } from '../../../src/core/interfaces/security.service.js';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest,
  LogoutRequest,
  RegisterRequest,
  RegisterResponse,
} from '../../../src/core/entities/auth.entity.js';
import { User, UserRole, UserStatus } from '../../../src/core/entities/user.entity.js';

// Mock repositories and services
const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
} as jest.Mocked<UserRepository>;

const mockTokenRepository = {
  findByToken: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  deleteExpired: jest.fn(),
  revokeAllForUser: jest.fn(),
} as jest.Mocked<AuthTokenRepository>;

const mockSessionRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findActiveByUserId: jest.fn(),
  deleteExpired: jest.fn(),
  deactivateAllForUser: jest.fn(),
  findByRefreshTokenId: jest.fn(),
  updateActivity: jest.fn(),
} as jest.Mocked<AuthSessionRepository>;

const mockPasswordService = {
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
} as jest.Mocked<PasswordService>;

const mockTokenService = {
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
  generateTokenPair: jest.fn(),
  refreshAccessToken: jest.fn(),
  generateVerificationToken: jest.fn(),
  verifyVerificationToken: jest.fn(),
  revokeToken: jest.fn(),
  getTokenExpiration: jest.fn(),
} as jest.Mocked<TokenService>;

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendLoginNotification: jest.fn(),
  sendSecurityAlert: jest.fn(),
} as jest.Mocked<EmailService>;

const mockSecurityService = {
  generateSecureRandom: jest.fn(),
  checkSuspiciousActivity: jest.fn(),
  logSecurityEvent: jest.fn(),
  validateSecurityToken: jest.fn(),
} as jest.Mocked<SecurityService>;

describe('AuthUseCase', () => {
  let authUseCase: AuthUseCase;

  beforeEach(() => {
    authUseCase = new AuthUseCase(
      mockUserRepository,
      mockTokenRepository,
      mockSessionRepository,
      mockPasswordService,
      mockTokenService,
      mockEmailService,
      mockSecurityService
    );

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockTokenService.getTokenExpiration.mockReturnValue(3600000); // 1 hour
    mockSecurityService.generateSecureRandom.mockReturnValue('random-id-123');
  });

  describe('login', () => {
    const validLoginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'ValidPassword123!',
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        deviceId: 'device123',
      },
    };

    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      passwordHash: 'hashed-password',
      canLogin: jest.fn().mockReturnValue(true),
      update: jest.fn().mockReturnThis(),
    };

    it('should login with valid credentials', async () => {
      // Arrange
      const mockSecurityCheck = {
        isSuspicious: false,
        recommendedAction: 'allow' as const,
        riskScore: 0.1,
        reason: '',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockSecurityService.checkSuspiciousActivity.mockResolvedValue(mockSecurityCheck);
      mockTokenService.generateToken.mockResolvedValue('access-token');
      mockTokenService.generateToken.mockResolvedValue('refresh-token');
      mockSessionRepository.save.mockResolvedValue(undefined);
      mockTokenRepository.save.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act
      const result = await authUseCase.login(validLoginRequest);

      // Assert
      expect(result).toEqual({
        user: mockUser,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        accessTokenExpiresAt: expect.any(Date),
        refreshTokenExpiresAt: expect.any(Date),
        sessionId: expect.any(String),
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith(
        'ValidPassword123!',
        'hashed-password'
      );
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'login_success',
        expect.any(Object)
      );
    });

    it('should reject invalid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authUseCase.login(validLoginRequest)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(mockPasswordService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject invalid password', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verifyPassword.mockResolvedValue(false);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act & Assert
      await expect(authUseCase.login(validLoginRequest)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'login_failed',
        expect.objectContaining({
          reason: 'invalid_password',
        })
      );
    });

    it('should create sessions with proper JWT linking', async () => {
      // Arrange
      const mockSecurityCheck = {
        isSuspicious: false,
        recommendedAction: 'allow' as const,
        riskScore: 0.1,
        reason: '',
      };

      const sessionId = 'session123';
      const refreshTokenId = 'refresh123';

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockSecurityService.checkSuspiciousActivity.mockResolvedValue(mockSecurityCheck);
      mockSecurityService.generateSecureRandom
        .mockReturnValueOnce(sessionId)
        .mockReturnValueOnce(refreshTokenId)
        .mockReturnValue('token-id');

      mockTokenService.generateToken.mockImplementation(async (claims) => {
        if (claims.jti === sessionId) {
          return 'access-token-with-session-id';
        }
        return 'refresh-token';
      });

      mockSessionRepository.save.mockResolvedValue(undefined);
      mockTokenRepository.save.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act
      const result = await authUseCase.login(validLoginRequest);

      // Assert
      expect(result.sessionId).toBe(sessionId);
      expect(mockTokenService.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          jti: sessionId, // Session ID should be used as JWT ID
        })
      );
      expect(mockSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sessionId,
          userId: 'user123',
          refreshTokenId: refreshTokenId,
        })
      );
    });

    it('should handle concurrent sessions', async () => {
      // Arrange
      const mockSecurityCheck = {
        isSuspicious: false,
        recommendedAction: 'allow' as const,
        riskScore: 0.1,
        reason: '',
      };

      // Setup multiple sessions for the same user
      const existingSessions = [
        { id: 'session1', userId: 'user123', isActive: true },
        { id: 'session2', userId: 'user123', isActive: true },
      ];

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockSecurityService.checkSuspiciousActivity.mockResolvedValue(mockSecurityCheck);
      mockSessionRepository.findActiveByUserId.mockResolvedValue(existingSessions);
      mockTokenService.generateToken.mockResolvedValue('new-token');
      mockSessionRepository.save.mockResolvedValue(undefined);
      mockTokenRepository.save.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act
      const result = await authUseCase.login(validLoginRequest);

      // Assert
      expect(result).toBeDefined();
      expect(mockSessionRepository.save).toHaveBeenCalled();
      // Should create a new session alongside existing ones
    });

    it('should block suspicious login attempts', async () => {
      // Arrange
      const mockSecurityCheck = {
        isSuspicious: true,
        recommendedAction: 'block' as const,
        riskScore: 0.9,
        reason: 'Multiple failed attempts from different locations',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      mockSecurityService.checkSuspiciousActivity.mockResolvedValue(mockSecurityCheck);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act & Assert
      await expect(authUseCase.login(validLoginRequest)).rejects.toThrow(
        'Login blocked for security reasons'
      );
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'login_blocked',
        expect.objectContaining({
          reason: mockSecurityCheck.reason,
          riskScore: mockSecurityCheck.riskScore,
        })
      );
    });
  });

  describe('refreshToken', () => {
    const refreshTokenRequest: RefreshTokenRequest = {
      refreshToken: 'valid-refresh-token',
    };    const mockStoredToken = {
      id: 'token123',
      userId: 'user123',
      canBeUsed: jest.fn().mockReturnValue(true),
      markAsUsed: jest.fn().mockReturnValue({ id: 'token123', userId: 'user123', isUsed: true }),
    };

    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      role: UserRole.USER,
      canLogin: jest.fn().mockReturnValue(true),
    };    const mockSession = {
      id: 'session123',
      userId: 'user123',
      refreshTokenId: 'token123',
      isActive: true,
      toPlainObject: jest.fn().mockReturnValue({
        id: 'session123',
        userId: 'user123',
        refreshTokenId: 'token123',
        isActive: true,
        deviceInfo: {},
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    it('should refresh tokens correctly', async () => {
      // Arrange
      mockTokenRepository.findByToken.mockResolvedValue(mockStoredToken);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockSessionRepository.findByRefreshTokenId.mockResolvedValue(mockSession);
      mockTokenService.generateToken.mockResolvedValue('new-access-token');
      mockTokenService.generateToken.mockResolvedValue('new-refresh-token');
      mockTokenRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await authUseCase.refreshToken(refreshTokenRequest);

      // Assert
      expect(result).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        accessTokenExpiresAt: expect.any(Date),
        refreshTokenExpiresAt: expect.any(Date),
      });
      expect(mockTokenRepository.findByToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockSessionRepository.findByRefreshTokenId).toHaveBeenCalledWith('token123');
    });

    it('should reject invalid refresh tokens', async () => {
      // Arrange
      mockTokenRepository.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(authUseCase.refreshToken(refreshTokenRequest)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should reject expired refresh tokens', async () => {
      // Arrange
      const expiredToken = {
        ...mockStoredToken,
        canBeUsed: jest.fn().mockReturnValue(false),
      };
      mockTokenRepository.findByToken.mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(authUseCase.refreshToken(refreshTokenRequest)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });
  describe('logout', () => {
    const logoutRequest: LogoutRequest = {
      userId: 'user123',
      sessionId: 'session123',
    };

    const mockSession = {
      id: 'session123',
      userId: 'user123',
      refreshTokenId: 'token123',
      deactivate: jest.fn().mockReturnThis(),
    };

    const mockRefreshToken = {
      id: 'token123',
      userId: 'user123',
      revoke: jest.fn().mockReturnThis(),
    };

    it('should logout and cleanup sessions', async () => {
      // Arrange
      mockSessionRepository.findById.mockResolvedValue(mockSession);
      mockTokenRepository.findById.mockResolvedValue(mockRefreshToken);
      mockSessionRepository.update.mockResolvedValue(undefined);
      mockTokenRepository.update.mockResolvedValue(undefined);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act
      await authUseCase.logout(logoutRequest);

      // Assert
      expect(mockSessionRepository.findById).toHaveBeenCalledWith('session123');
      expect(mockSession.deactivate).toHaveBeenCalled();
      expect(mockRefreshToken.revoke).toHaveBeenCalledWith('user123');
      expect(mockSessionRepository.update).toHaveBeenCalled();
      expect(mockTokenRepository.update).toHaveBeenCalled();
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'logout',
        expect.any(Object)
      );
    });

    it('should handle logout for all sessions', async () => {
      // Arrange
      const logoutAllRequest: LogoutRequest = {
        userId: 'user123',
        logoutAll: true,
      };

      mockTokenRepository.revokeAllForUser.mockResolvedValue(3);
      mockSessionRepository.deactivateAllForUser.mockResolvedValue(2);
      mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);

      // Act
      await authUseCase.logout(logoutAllRequest);

      // Assert
      expect(mockTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user123');
      expect(mockSessionRepository.deactivateAllForUser).toHaveBeenCalledWith('user123');
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'logout',
        expect.any(Object)
      );
    });
  });

  describe('register', () => {
    const registerRequest: RegisterRequest = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register new user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null); // No existing user
      mockPasswordService.validatePassword.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue('hashed-password');
      mockUserRepository.save.mockResolvedValue(undefined);
      mockTokenService.generateVerificationToken.mockResolvedValue({
        token: 'verification-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockTokenRepository.save.mockResolvedValue(undefined);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      // Act
      const result = await authUseCase.register(registerRequest);      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          user: expect.any(Object),
          verificationToken: 'verification-token',
        },
      });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should reject duplicate email registration', async () => {
      // Arrange
      const existingUser = { id: 'existing123', email: 'newuser@example.com' };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act
      const result = await authUseCase.register(registerRequest);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'User with this email already exists',
      });
      expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
    });

    it('should validate password strength', async () => {
      // Arrange
      const weakPasswordRequest = {
        ...registerRequest,
        password: '123', // Weak password
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.validatePassword.mockResolvedValue({
        isValid: false,
        errors: ['Password too short', 'No uppercase letters'],
      });

      // Act
      const result = await authUseCase.register(weakPasswordRequest);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Password validation failed: Password too short, No uppercase letters',
      });
      expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up expired tokens and sessions', async () => {
      // Arrange
      mockTokenRepository.deleteExpired.mockResolvedValue(5);
      mockSessionRepository.deleteExpired.mockResolvedValue(3);

      // Act
      const result = await authUseCase.cleanup();

      // Assert
      expect(result).toEqual({
        expiredTokens: 5,
        expiredSessions: 3,
      });
      expect(mockTokenRepository.deleteExpired).toHaveBeenCalled();
      expect(mockSessionRepository.deleteExpired).toHaveBeenCalled();
    });
  });
});
