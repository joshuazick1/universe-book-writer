/**
 * Auth Controller Unit Tests
 * Tests the AuthController class methods in isolation with mocked dependencies
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AuthController, AuthRequest } from '../../../src/api/controllers/auth.controller.js';
import { AuthUseCase } from '../../../src/application/use-cases/auth.use-case.js';
import { UserUseCase } from '../../../src/application/use-cases/user.use-case.js';
import { SecurityService } from '../../../src/core/interfaces/auth.service.js';
import { User, UserRole, UserStatus } from '../../../src/core/entities/user.entity.js';

// Mock dependencies
const mockAuthUseCase = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendEmailVerification: jest.fn(),
  getUserSessions: jest.fn(),
  revokeSession: jest.fn(),
  cleanup: jest.fn(),
} as unknown as jest.Mocked<AuthUseCase>;

const mockUserUseCase = {
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  searchUsers: jest.fn(),
  getUsersWithPagination: jest.fn(),
  getUserByUsername: jest.fn(),
  findById: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  deactivateUser: jest.fn(),
  reactivateUser: jest.fn(),
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  getUserStats: jest.fn(),
} as unknown as jest.Mocked<UserUseCase>;

const mockSecurityService = {
  isRateLimited: jest.fn(),
  validateEmailFormat: jest.fn(),
  checkPasswordStrength: jest.fn(),
  logSecurityEvent: jest.fn(),
  checkSuspiciousActivity: jest.fn(),
  checkRateLimit: jest.fn(),
  generateSecureRandom: jest.fn(),
  validateDeviceFingerprint: jest.fn(),
} as unknown as jest.Mocked<SecurityService>;

// Mock request/response helpers
const createMockRequest = (overrides: Partial<Request | AuthRequest> = {}): Request | AuthRequest => ({
  body: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' } as any,
  get: jest.fn().mockReturnValue('test-user-agent'),
  cookies: {},
  ...overrides,
} as Request | AuthRequest);

const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
  return res;
};

const createMockNext = (): jest.MockedFunction<NextFunction> => 
  jest.fn() as unknown as jest.MockedFunction<NextFunction>;

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Request | AuthRequest;
  let mockResponse: jest.Mocked<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh instances
    authController = new AuthController(
      mockAuthUseCase,
      mockUserUseCase,
      mockSecurityService
    );
    
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();    // Set default mock implementations
    mockSecurityService.isRateLimited.mockReturnValue(false);
    mockSecurityService.validateEmailFormat.mockReturnValue(true);
    mockSecurityService.checkPasswordStrength.mockReturnValue({
      isSecure: true,
      score: 100,
      issues: [],
    });
    mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should successfully register a user', async () => {
      // Arrange
      mockRequest.body = validRegistrationData;
      
      const mockUser = new User({
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        role: UserRole.USER,
        status: UserStatus.PENDING,
        emailVerified: false,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            theme: 'auto' as const,
            language: 'en',
            timezone: 'UTC',
            notifications: {
              email: true,
              push: true,
              mentions: true,
            },
          },
        },
      });
      
      const mockRegistrationResult = {
        success: true,
        data: {
          user: mockUser,
        },
      };
      
      mockAuthUseCase.register.mockResolvedValue(mockRegistrationResult);

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.register).toHaveBeenCalledWith(
        validRegistrationData,
        '127.0.0.1',
        'test-user-agent'
      );
      
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'user_registered',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          email: 'test@example.com',
        }
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            emailVerified: false,
          },
        },
      });
    });

    it('should return 429 when rate limited', async () => {
      // Arrange
      mockRequest.body = validRegistrationData;
      mockSecurityService.isRateLimited.mockReturnValue(true);

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.isRateLimited).toHaveBeenCalledWith(
        'register:127.0.0.1',
        { maxAttempts: 5, windowMs: 15 * 60 * 1000 }
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many registration attempts. Please try again later.',
      });
      
      expect(mockAuthUseCase.register).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' }; // Missing other fields

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required',
      });
      
      expect(mockAuthUseCase.register).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      mockRequest.body = { ...validRegistrationData, email: 'invalid-email' };
      mockSecurityService.validateEmailFormat.mockReturnValue(false);

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.validateEmailFormat).toHaveBeenCalledWith('invalid-email');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email format',
      });
      
      expect(mockAuthUseCase.register).not.toHaveBeenCalled();
    });

    it('should return 400 for weak password', async () => {
      // Arrange
      mockRequest.body = { ...validRegistrationData, password: 'weak' };      mockSecurityService.checkPasswordStrength.mockReturnValue({
        isSecure: false,
        score: 20,
        issues: ['Password too short', 'No uppercase letters'],
      });

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.checkPasswordStrength).toHaveBeenCalledWith('weak');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password does not meet security requirements',
        issues: ['Password too short', 'No uppercase letters'],
      });
      
      expect(mockAuthUseCase.register).not.toHaveBeenCalled();
    });

    it('should return 400 when registration fails', async () => {
      // Arrange
      mockRequest.body = validRegistrationData;
      mockAuthUseCase.register.mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists',
      });
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.body = validRegistrationData;
      const error = new Error('Database connection failed');
      mockAuthUseCase.register.mockRejectedValue(error);

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle unknown IP address', async () => {
      // Arrange
      mockRequest = createMockRequest({
        body: validRegistrationData,
        ip: undefined,
        connection: {} as any,
      });
      
      const mockUser = new User({
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        role: UserRole.USER,
        status: UserStatus.PENDING,
        emailVerified: false,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            theme: 'auto' as const,
            language: 'en',
            timezone: 'UTC',
            notifications: {
              email: true,
              push: true,
              mentions: true,
            },
          },
        },
      });
      
      const mockRegistrationResult = {
        success: true,
        data: {
          user: mockUser,
        },
      };
      
      mockAuthUseCase.register.mockResolvedValue(mockRegistrationResult);

      // Act
      await authController.register(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.register).toHaveBeenCalledWith(
        validRegistrationData,
        'unknown',
        'test-user-agent'
      );
    });
  });
  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      rememberMe: false,
    };

    const mockLoginResult = {
      user: new User({
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          preferences: {
            theme: 'auto' as const,
            language: 'en',
            timezone: 'UTC',
            notifications: {
              email: true,
              push: true,
              mentions: true,
            },
          },
        },
      }),
      sessionId: 'session123',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      // Set NODE_ENV to test for token inclusion in response
      process.env.NODE_ENV = 'test';
    });

    it('should successfully login a user', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      mockAuthUseCase.login.mockResolvedValue(mockLoginResult);

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        deviceInfo: {
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
        },
        rememberMe: false,
      });

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'login_success',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          sessionId: 'session123',
        }
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', 'access-token-123', {
        httpOnly: true,
        secure: false, // NODE_ENV is test
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-123', {
        httpOnly: true,
        secure: false, // NODE_ENV is test
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (rememberMe is false)
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
            emailVerified: true,
          },
          session: {
            id: 'session123',
            expiresAt: mockLoginResult.accessTokenExpiresAt,
          },
          // Test environment includes tokens
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          accessTokenExpiresAt: mockLoginResult.accessTokenExpiresAt,
          refreshTokenExpiresAt: mockLoginResult.refreshTokenExpiresAt,
          sessionId: 'session123',
        },
      });
    });

    it('should use longer refresh token expiry when rememberMe is true', async () => {
      // Arrange
      mockRequest.body = { ...validLoginData, rememberMe: true };
      mockAuthUseCase.login.mockResolvedValue(mockLoginResult);

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-123', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (rememberMe is true)
      });
    });

    it('should return 429 when rate limited', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      mockSecurityService.isRateLimited.mockReturnValue(true);

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.isRateLimited).toHaveBeenCalledWith(
        'login:127.0.0.1',
        { maxAttempts: 5, windowMs: 15 * 60 * 1000 }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many login attempts. Please try again later.',
      });

      expect(mockAuthUseCase.login).not.toHaveBeenCalled();
    });

    it('should return 400 for missing credentials', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' }; // Missing password

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email and password are required',
      });

      expect(mockAuthUseCase.login).not.toHaveBeenCalled();
    });

    it('should return 401 when login fails', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      const loginError = new Error('Invalid credentials');
      mockAuthUseCase.login.mockRejectedValue(loginError);

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'unknown',
        'login_failed',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          email: 'test@example.com',
          reason: 'Invalid credentials',
        }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.body = validLoginData;
      const error = new Error('Database connection failed');
      mockSecurityService.logSecurityEvent.mockRejectedValue(error);

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle production environment (secure cookies)', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockRequest.body = validLoginData;
      mockAuthUseCase.login.mockResolvedValue(mockLoginResult);

      // Act
      await authController.login(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', 'access-token-123', {
        httpOnly: true,
        secure: true, // NODE_ENV is production
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: { id: 'user123', email: 'test@example.com', role: 'user', permissions: [] },
        session: { id: 'session123', deviceId: 'device123' },
      }) as AuthRequest;

      // Act
      await authController.logout(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.logout).toHaveBeenCalledWith({
        userId: 'user123',
        sessionId: 'session123',
      });

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken', {
        httpOnly: true,
        secure: false, // NODE_ENV is test
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false, // NODE_ENV is test
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'logout',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          sessionId: 'session123',
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should handle logout without session ID', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: { id: 'user123', email: 'test@example.com', role: 'user', permissions: [] },
        session: undefined,
      }) as AuthRequest;

      // Act
      await authController.logout(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.logout).toHaveBeenCalledWith({
        userId: 'user123',
        sessionId: undefined,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should handle logout without user', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: undefined,
        session: undefined,
      }) as AuthRequest;

      // Act
      await authController.logout(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.logout).not.toHaveBeenCalled();
      expect(mockSecurityService.logSecurityEvent).not.toHaveBeenCalled();

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: { id: 'user123', email: 'test@example.com', role: 'user', permissions: [] },
        session: { id: 'session123', deviceId: 'device123' },
      }) as AuthRequest;
      
      const error = new Error('Database connection failed');
      mockAuthUseCase.logout.mockRejectedValue(error);

      // Act
      await authController.logout(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshToken', () => {
    const mockRefreshResult = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    it('should successfully refresh token from cookie', async () => {
      // Arrange
      mockRequest.cookies = { refreshToken: 'old-refresh-token' };
      mockAuthUseCase.refreshToken.mockResolvedValue(mockRefreshResult);

      // Act
      await authController.refreshToken(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.refreshToken).toHaveBeenCalledWith({
        refreshToken: 'old-refresh-token',
        deviceInfo: {
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
        },
      });

      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', 'new-access-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresAt: mockRefreshResult.accessTokenExpiresAt,
          refreshTokenExpiresAt: mockRefreshResult.refreshTokenExpiresAt,
        },
      });
    });

    it('should successfully refresh token from request body', async () => {
      // Arrange
      mockRequest.body = { refreshToken: 'body-refresh-token' };
      mockAuthUseCase.refreshToken.mockResolvedValue(mockRefreshResult);

      // Act
      await authController.refreshToken(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.refreshToken).toHaveBeenCalledWith({
        refreshToken: 'body-refresh-token',
        deviceInfo: {
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
        },
      });
    });

    it('should return 401 when refresh token is not provided', async () => {
      // Arrange
      mockRequest.cookies = {};
      mockRequest.body = {};

      // Act
      await authController.refreshToken(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token not provided',
      });

      expect(mockAuthUseCase.refreshToken).not.toHaveBeenCalled();
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Arrange
      mockRequest.cookies = { refreshToken: 'invalid-token' };
      const refreshError = new Error('Invalid refresh token');
      mockAuthUseCase.refreshToken.mockRejectedValue(refreshError);

      // Act
      await authController.refreshToken(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid refresh token',
      });
    });    it('should call next with error when exception occurs', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      // Mock a general error in the outer try block (e.g., in cookie reading)
      Object.defineProperty(mockRequest, 'cookies', {
        get: () => {
          throw error;
        }
      });

      // Act
      await authController.refreshToken(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('forgotPassword', () => {
    it('should successfully process forgot password request', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      mockAuthUseCase.forgotPassword.mockResolvedValue(undefined);

      // Act
      await authController.forgotPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.forgotPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        deviceInfo: {
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
        },
      });

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'unknown',
        'password_reset_requested',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          email: 'test@example.com',
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    });

    it('should return 429 when rate limited', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      mockSecurityService.isRateLimited.mockReturnValue(true);

      // Act
      await authController.forgotPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.isRateLimited).toHaveBeenCalledWith(
        'forgot-password:127.0.0.1',
        { maxAttempts: 3, windowMs: 15 * 60 * 1000 }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many password reset attempts. Please try again later.',
      });

      expect(mockAuthUseCase.forgotPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await authController.forgotPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Valid email address is required',
      });

      expect(mockAuthUseCase.forgotPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      mockRequest.body = { email: 'invalid-email' };
      mockSecurityService.validateEmailFormat.mockReturnValue(false);

      // Act
      await authController.forgotPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.validateEmailFormat).toHaveBeenCalledWith('invalid-email');
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Valid email address is required',
      });

      expect(mockAuthUseCase.forgotPassword).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      const error = new Error('Database connection failed');
      mockAuthUseCase.forgotPassword.mockRejectedValue(error);

      // Act
      await authController.forgotPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPassword', () => {
    const validResetData = {
      token: 'reset-token-123',
      newPassword: 'NewSecurePassword123!',
    };

    it('should successfully reset password', async () => {
      // Arrange
      mockRequest.body = validResetData;
      mockAuthUseCase.resetPassword.mockResolvedValue(undefined);

      // Act
      await authController.resetPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.checkPasswordStrength).toHaveBeenCalledWith('NewSecurePassword123!');
      
      expect(mockAuthUseCase.resetPassword).toHaveBeenCalledWith({
        token: 'reset-token-123',
        newPassword: 'NewSecurePassword123!',
        deviceInfo: {
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should return 400 for missing token', async () => {
      // Arrange
      mockRequest.body = { newPassword: 'NewSecurePassword123!' };

      // Act
      await authController.resetPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token and new password are required',
      });

      expect(mockAuthUseCase.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      mockRequest.body = { token: 'reset-token-123' };

      // Act
      await authController.resetPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token and new password are required',
      });

      expect(mockAuthUseCase.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for weak password', async () => {
      // Arrange
      mockRequest.body = { ...validResetData, newPassword: 'weak' };      mockSecurityService.checkPasswordStrength.mockReturnValue({
        isSecure: false,
        score: 30,
        issues: ['Password too short'],
      });

      // Act
      await authController.resetPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password does not meet security requirements',
        issues: ['Password too short'],
      });

      expect(mockAuthUseCase.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 when reset fails', async () => {
      // Arrange
      mockRequest.body = validResetData;
      const resetError = new Error('Invalid or expired token');
      mockAuthUseCase.resetPassword.mockRejectedValue(resetError);

      // Act
      await authController.resetPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token',
      });
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.body = validResetData;
      const error = new Error('Database connection failed');
      mockSecurityService.checkPasswordStrength.mockImplementation(() => {
        throw error;
      });

      // Act
      await authController.resetPassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
  describe('verifyEmail', () => {
    const mockUser = new User({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        preferences: {
          theme: 'auto' as const,
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            mentions: true,
          },
        },
      },
    });

    it('should successfully verify email', async () => {
      // Arrange
      mockRequest.body = { token: 'verify-token-123' };
      mockAuthUseCase.verifyEmail.mockResolvedValue(mockUser);

      // Act
      await authController.verifyEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.verifyEmail).toHaveBeenCalledWith({
        token: 'verify-token-123',
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            emailVerified: true,
          },
        },
      });
    });

    it('should return 400 for missing token', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await authController.verifyEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Verification token is required',
      });

      expect(mockAuthUseCase.verifyEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when verification fails', async () => {
      // Arrange
      mockRequest.body = { token: 'invalid-token' };
      const verifyError = new Error('Invalid verification token');
      mockAuthUseCase.verifyEmail.mockRejectedValue(verifyError);

      // Act
      await authController.verifyEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid verification token',
      });
    });    it('should call next with error when exception occurs', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      // Mock a general error in the outer try block (e.g., in request body reading)
      Object.defineProperty(mockRequest, 'body', {
        get: () => {
          throw error;
        }
      });

      // Act
      await authController.verifyEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resendVerification', () => {
    it('should successfully resend verification email', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      mockAuthUseCase.resendEmailVerification.mockResolvedValue(undefined);

      // Act
      await authController.resendVerification(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAuthUseCase.resendEmailVerification).toHaveBeenCalledWith({
        email: 'test@example.com',
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If an unverified account with that email exists, a new verification email has been sent.',
      });
    });

    it('should return 429 when rate limited', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      mockSecurityService.isRateLimited.mockReturnValue(true);

      // Act
      await authController.resendVerification(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.isRateLimited).toHaveBeenCalledWith(
        'resend-verification:test@example.com',
        { maxAttempts: 3, windowMs: 60 * 60 * 1000 }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many verification requests. Please wait before requesting another.',
      });

      expect(mockAuthUseCase.resendEmailVerification).not.toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await authController.resendVerification(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Valid email address is required',
      });

      expect(mockAuthUseCase.resendEmailVerification).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      mockRequest.body = { email: 'invalid-email' };
      mockSecurityService.validateEmailFormat.mockReturnValue(false);

      // Act
      await authController.resendVerification(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Valid email address is required',
      });

      expect(mockAuthUseCase.resendEmailVerification).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };
      const error = new Error('Database connection failed');
      mockAuthUseCase.resendEmailVerification.mockRejectedValue(error);

      // Act
      await authController.resendVerification(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
  describe('getProfile', () => {
    const mockUser = new User({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        preferences: {
          theme: 'auto' as const,
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            mentions: true,
          },
        },
      },
      createdAt: new Date('2023-01-01'),
      lastLoginAt: new Date('2023-12-01'),
    });

    it('should successfully get user profile', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: { id: 'user123', email: 'test@example.com', role: 'user', permissions: [] },
      }) as AuthRequest;
      
      mockUserUseCase.getUserById.mockResolvedValue(mockUser);

      // Act
      await authController.getProfile(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.getUserById).toHaveBeenCalledWith('user123');      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
            permissions: mockUser.permissions,
            emailVerified: true,
            profile: mockUser.profile,
            createdAt: new Date('2023-01-01'),
            lastLoginAt: new Date('2023-12-01'),
          },
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: undefined,
      }) as AuthRequest;

      // Act
      await authController.getProfile(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated',
      });

      expect(mockUserUseCase.getUserById).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: { id: 'user123', email: 'test@example.com', role: 'user', permissions: [] },
      }) as AuthRequest;
      
      mockUserUseCase.getUserById.mockResolvedValue(null);

      // Act
      await authController.getProfile(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      const authRequest = createMockRequest({
        user: { id: 'user123', email: 'test@example.com', role: 'user', permissions: [] },
      }) as AuthRequest;
      
      const error = new Error('Database connection failed');
      mockUserUseCase.getUserById.mockRejectedValue(error);

      // Act
      await authController.getProfile(authRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
