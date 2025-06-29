/**
 * Admin Controller Unit Tests
 * Tests the AdminController class methods in isolation with mocked dependencies
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import { AdminController } from '../../../src/api/controllers/admin.controller.js';
import { AdminUseCase } from '../../../src/application/use-cases/admin.use-case.js';
import { SecurityService } from '../../../src/core/interfaces/auth.service.js';
import { AuthRequest } from '../../../src/api/middleware/auth.middleware.js';
import { User, UserRole, UserStatus } from '../../../src/core/entities/user.entity.js';
import { AdminSettings } from '../../../src/core/domain/entities/admin-settings.entity.js';

// Mock dependencies
const mockAdminUseCase = {
  getAllUsers: jest.fn(),
  updateUserRole: jest.fn(),
  updateUserStatus: jest.fn(),
  verifyUserEmail: jest.fn(),
  getAdminSettings: jest.fn(),
  updateAdminSettings: jest.fn(),
  getSecurityLogs: jest.fn(),
  createUser: jest.fn(),
} as unknown as jest.Mocked<AdminUseCase>;

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
const createMockAuthRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  body: {},
  params: {},
  query: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' } as any,
  get: jest.fn().mockReturnValue('test-user-agent'),
  user: {
    id: 'admin-user-123',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['admin:all'],
  },
  ...overrides,
} as AuthRequest);

const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
  return res;
};

const createMockNext = (): jest.MockedFunction<NextFunction> => 
  jest.fn() as unknown as jest.MockedFunction<NextFunction>;

// Helper function to create mock User instances
const createMockUser = (overrides: Partial<any> = {}) => {
  return new User({
    id: 'user-123',
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
    ...overrides,
  });
};

describe('AdminController', () => {
  let adminController: AdminController;
  let mockRequest: AuthRequest;
  let mockResponse: jest.Mocked<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh instances
    adminController = new AdminController(mockAdminUseCase, mockSecurityService);
    mockRequest = createMockAuthRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();

    // Set default mock implementations
    mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    const mockPaginatedResult = {
      items: [
        createMockUser({
          id: 'user-1',
          email: 'user1@example.com',
          profile: { firstName: 'John', lastName: 'Doe' },
        }),
        createMockUser({
          id: 'user-2',
          email: 'user2@example.com',
          profile: { firstName: 'Jane', lastName: 'Smith' },
        }),
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      },
    };

    it('should successfully get all users with default parameters', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockAdminUseCase.getAllUsers.mockResolvedValue(mockPaginatedResult);

      // Act
      await adminController.getAllUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.getAllUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        filters: {
          role: undefined,
          status: undefined,
          emailVerified: undefined,
        },
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin-123',
        'admin_users_viewed',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          filters: {
            role: undefined,
            status: undefined,
            emailVerified: undefined,
          },
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users: [
            {
              id: 'user-1',
              email: 'user1@example.com',
              firstName: 'John',
              lastName: 'Doe',
              role: UserRole.USER,
              status: UserStatus.ACTIVE,
              emailVerified: true,
              createdAt: expect.any(Date),
              lastLoginAt: expect.any(Date),
            },
            {
              id: 'user-2',
              email: 'user2@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
              role: UserRole.USER,
              status: UserStatus.ACTIVE,
              emailVerified: true,
              createdAt: expect.any(Date),
              lastLoginAt: expect.any(Date),
            },
          ],
          pagination: mockPaginatedResult.pagination,
        },
      });
    });

    it('should handle query parameters correctly', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.query = {
        page: '2',
        limit: '10',
        search: 'john',
        role: 'user',
        status: 'active',
        emailVerified: 'true',
        sortBy: 'email',
        sortOrder: 'asc',
      };
      mockAdminUseCase.getAllUsers.mockResolvedValue(mockPaginatedResult);

      // Act
      await adminController.getAllUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.getAllUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'john',
        filters: {
          role: 'user',
          status: 'active',
          emailVerified: true,
        },
        sortBy: 'email',
        sortOrder: 'asc',
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };

      // Act
      await adminController.getAllUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.getAllUsers).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      const error = new Error('Database connection failed');
      mockAdminUseCase.getAllUsers.mockRejectedValue(error);

      // Act
      await adminController.getAllUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUserRole', () => {
    const mockUpdatedUser = createMockUser({
      id: 'user-123',
      role: UserRole.MODERATOR,
    });

    it('should successfully update user role', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { role: UserRole.MODERATOR };
      mockAdminUseCase.updateUserRole.mockResolvedValue(mockUpdatedUser);

      // Act
      await adminController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.updateUserRole).toHaveBeenCalledWith('user-123', UserRole.MODERATOR);

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin-123',
        'admin_user_role_updated',
        {
          targetUserId: 'user-123',
          oldRole: UserRole.MODERATOR,
          newRole: UserRole.MODERATOR,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            role: UserRole.MODERATOR,
          },
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };
      mockRequest.params = { id: 'other-user-123' };
      mockRequest.body = { role: UserRole.MODERATOR };

      // Act
      await adminController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.updateUserRole).not.toHaveBeenCalled();
    });

    it('should return 400 for missing user ID', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = {};
      mockRequest.body = { role: UserRole.MODERATOR };

      // Act
      await adminController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID and role are required',
      });

      expect(mockAdminUseCase.updateUserRole).not.toHaveBeenCalled();
    });

    it('should return 400 for missing role', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {};

      // Act
      await adminController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID and role are required',
      });

      expect(mockAdminUseCase.updateUserRole).not.toHaveBeenCalled();
    });

    it('should return 400 when trying to modify own role', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'admin-123' };
      mockRequest.body = { role: UserRole.USER };

      // Act
      await adminController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot modify your own role',
      });

      expect(mockAdminUseCase.updateUserRole).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { role: UserRole.MODERATOR };
      const error = new Error('Database error');
      mockAdminUseCase.updateUserRole.mockRejectedValue(error);

      // Act
      await adminController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUserStatus', () => {
    const mockUpdatedUser = createMockUser({
      id: 'user-123',
      status: UserStatus.SUSPENDED,
    });

    it('should successfully update user status', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { status: UserStatus.SUSPENDED };
      mockAdminUseCase.updateUserStatus.mockResolvedValue(mockUpdatedUser);

      // Act
      await adminController.updateUserStatus(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.updateUserStatus).toHaveBeenCalledWith('user-123', UserStatus.SUSPENDED);

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin-123',
        'admin_user_status_updated',
        {
          targetUserId: 'user-123',
          newStatus: UserStatus.SUSPENDED,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User status updated successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            status: UserStatus.SUSPENDED,
          },
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };
      mockRequest.params = { id: 'other-user-123' };
      mockRequest.body = { status: UserStatus.SUSPENDED };

      // Act
      await adminController.updateUserStatus(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.updateUserStatus).not.toHaveBeenCalled();
    });

    it('should return 400 when trying to modify own status', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'admin-123' };
      mockRequest.body = { status: UserStatus.SUSPENDED };

      // Act
      await adminController.updateUserStatus(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot modify your own status',
      });

      expect(mockAdminUseCase.updateUserStatus).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = {};
      mockRequest.body = {};

      // Act
      await adminController.updateUserStatus(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID and status are required',
      });

      expect(mockAdminUseCase.updateUserStatus).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = { status: UserStatus.SUSPENDED };
      const error = new Error('Database error');
      mockAdminUseCase.updateUserStatus.mockRejectedValue(error);

      // Act
      await adminController.updateUserStatus(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('verifyUserEmail', () => {
    const mockUpdatedUser = createMockUser({
      id: 'user-123',
      emailVerified: true,
    });

    it('should successfully verify user email', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      mockAdminUseCase.verifyUserEmail.mockResolvedValue(mockUpdatedUser);

      // Act
      await adminController.verifyUserEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.verifyUserEmail).toHaveBeenCalledWith('user-123');

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin-123',
        'admin_user_email_verified',
        {
          targetUserId: 'user-123',
          targetEmail: 'test@example.com',
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User email verified successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            emailVerified: true,
          },
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };
      mockRequest.params = { id: 'other-user-123' };

      // Act
      await adminController.verifyUserEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.verifyUserEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for missing user ID', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = {};

      // Act
      await adminController.verifyUserEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required',
      });

      expect(mockAdminUseCase.verifyUserEmail).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.params = { id: 'user-123' };
      const error = new Error('Database error');
      mockAdminUseCase.verifyUserEmail.mockRejectedValue(error);

      // Act
      await adminController.verifyUserEmail(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
  describe('getAdminSettings', () => {
    const mockSettings = AdminSettings.createDefault();

    it('should successfully get admin settings', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockAdminUseCase.getAdminSettings.mockResolvedValue(mockSettings);

      // Act
      await adminController.getAdminSettings(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.getAdminSettings).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          settings: mockSettings,
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };

      // Act
      await adminController.getAdminSettings(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.getAdminSettings).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      const error = new Error('Database error');
      mockAdminUseCase.getAdminSettings.mockRejectedValue(error);

      // Act
      await adminController.getAdminSettings(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
  describe('updateAdminSettings', () => {
    const settingsUpdate = {
      userRegistration: {
        enabled: false,
        requireApproval: true,
        defaultRole: 'user',
      },
    };

    const updatedSettings = AdminSettings.createDefault().update(settingsUpdate);

    it('should successfully update admin settings', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.body = settingsUpdate;
      mockAdminUseCase.updateAdminSettings.mockResolvedValue(updatedSettings);

      // Act
      await adminController.updateAdminSettings(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.updateAdminSettings).toHaveBeenCalledWith(settingsUpdate);

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin-123',
        'admin_settings_updated',
        {
          changes: settingsUpdate,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Admin settings updated successfully',
        data: {
          settings: updatedSettings,
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };
      mockRequest.body = settingsUpdate;

      // Act
      await adminController.updateAdminSettings(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.updateAdminSettings).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.body = settingsUpdate;
      const error = new Error('Database error');
      mockAdminUseCase.updateAdminSettings.mockRejectedValue(error);

      // Act
      await adminController.updateAdminSettings(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getSecurityLogs', () => {
    const mockSecurityLogs = {
      items: [
        {
          id: 'log-1',
          userId: 'user-123',
          eventType: 'login_success',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date('2023-12-01T10:00:00Z'),
          details: { sessionId: 'session-123' },
        },
        {
          id: 'log-2',
          userId: 'user-456',
          eventType: 'login_failed',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date('2023-12-01T10:05:00Z'),
          details: { reason: 'invalid_password' },
        },
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 2,
        pages: 1,
      },
    };

    it('should successfully get security logs with default parameters', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockAdminUseCase.getSecurityLogs.mockResolvedValue(mockSecurityLogs);

      // Act
      await adminController.getSecurityLogs(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.getSecurityLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        filters: {
          eventType: undefined,
          userId: undefined,
          startDate: undefined,
          endDate: undefined,
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          logs: mockSecurityLogs.items,
          pagination: mockSecurityLogs.pagination,
        },
      });
    });

    it('should handle query parameters for filtering', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.query = {
        page: '2',
        limit: '25',
        eventType: 'login_failed',
        userId: 'user-123',
        startDate: '2023-12-01',
        endDate: '2023-12-31',
      };
      mockAdminUseCase.getSecurityLogs.mockResolvedValue(mockSecurityLogs);

      // Act
      await adminController.getSecurityLogs(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.getSecurityLogs).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        filters: {
          eventType: 'login_failed',
          userId: 'user-123',
          startDate: new Date('2023-12-01'),
          endDate: new Date('2023-12-31'),
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };

      // Act
      await adminController.getSecurityLogs(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.getSecurityLogs).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      const error = new Error('Database error');
      mockAdminUseCase.getSecurityLogs.mockRejectedValue(error);

      // Act
      await adminController.getSecurityLogs(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.USER,
      skipEmailVerification: false,
    };

    const mockCreatedUser = createMockUser({
      id: 'new-user-123',
      email: 'newuser@example.com',
      profile: { firstName: 'New', lastName: 'User' },
      role: UserRole.USER,
      emailVerified: false,
    });

    it('should successfully create a new user', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.body = validUserData;
      mockAdminUseCase.createUser.mockResolvedValue(mockCreatedUser);

      // Act
      await adminController.createUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.createUser).toHaveBeenCalledWith(validUserData);

      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin-123',
        'admin_user_created',
        {
          newUserId: 'new-user-123',
          newUserEmail: 'newuser@example.com',
          newUserRole: UserRole.USER,
          skipEmailVerification: false,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',        data: {
          user: {
            id: 'new-user-123',
            email: 'newuser@example.com',
            firstName: 'New',
            lastName: 'User',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            emailVerified: false,
          },
        },
      });
    });

    it('should use default values for optional parameters', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.body = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
      };
      mockAdminUseCase.createUser.mockResolvedValue(mockCreatedUser);

      // Act
      await adminController.createUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockAdminUseCase.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.USER,
        skipEmailVerification: false,
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.user = { id: 'user-123', role: UserRole.USER, email: 'user@test.com', permissions: [] };
      mockRequest.body = validUserData;

      // Act
      await adminController.createUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });

      expect(mockAdminUseCase.createUser).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.body = {
        email: 'newuser@example.com',
        // Missing password, firstName, lastName
      };

      // Act
      await adminController.createUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email, password, first name, and last name are required',
      });

      expect(mockAdminUseCase.createUser).not.toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      // Arrange
      mockRequest.user = { id: 'admin-123', role: UserRole.ADMIN, email: 'admin@test.com', permissions: [] };
      mockRequest.body = validUserData;
      const error = new Error('Database error');
      mockAdminUseCase.createUser.mockRejectedValue(error);

      // Act
      await adminController.createUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
