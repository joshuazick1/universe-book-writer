/**
 * User Controller Unit Tests
 * Tests the UserController class methods in isolation with mocked dependencies
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { UserController } from '../../../src/api/controllers/user.controller.js';
import { UserUseCase } from '../../../src/application/use-cases/user.use-case.js';
import { SecurityService } from '../../../src/core/interfaces/auth.service.js';
import { User, UserRole, UserStatus } from '../../../src/core/entities/user.entity.js';
import { AuthRequest } from '../../../src/api/controllers/auth.controller.js';

// Mock dependencies
const mockUserUseCase = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
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
  listUsers: jest.fn(),
  updateUserRoles: jest.fn(),
  suspendUser: jest.fn(),
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
const createMockAuthRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  body: {},
  params: {},
  query: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' } as any,
  get: jest.fn().mockReturnValue('test-user-agent'),
  user: {
    id: 'user123',
    email: 'test@example.com',
    role: 'user',
    permissions: [],
  },
  ...overrides,
} as AuthRequest);

const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Response>;
  return res;
};

const createMockNext = (): jest.MockedFunction<NextFunction> => 
  jest.fn() as unknown as jest.MockedFunction<NextFunction>;

// Sample user data for tests
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
  updatedAt: new Date('2023-12-01'),
  lastLoginAt: new Date('2023-12-01'),
});

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: AuthRequest;
  let mockResponse: jest.Mocked<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh instances
    userController = new UserController(mockUserUseCase, mockSecurityService);
    mockRequest = createMockAuthRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();

    // Set default mock implementations
    mockSecurityService.logSecurityEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      // Arrange
      const profileData = {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio',
      };
      mockRequest.body = profileData;
      mockUserUseCase.updateProfile.mockResolvedValue(mockUser);

      // Act
      await userController.updateProfile(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.updateProfile).toHaveBeenCalledWith('user123', profileData);
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'profile_updated',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: mockUser,
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await userController.updateProfile(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated',
      });
      expect(mockUserUseCase.updateProfile).not.toHaveBeenCalled();
    });

    it('should handle update errors and call next', async () => {
      // Arrange
      mockRequest.body = { firstName: 'Jane' };
      const error = new Error('Update failed');
      mockUserUseCase.updateProfile.mockRejectedValue(error);

      // Act
      await userController.updateProfile(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'profile_update_failed',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          reason: 'Update failed',
        }
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });    it('should handle errors when user ID is missing during error logging', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.body = { firstName: 'Jane' };

      // Act
      await userController.updateProfile(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated',
      });
      expect(mockSecurityService.logSecurityEvent).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      // Arrange
      mockRequest.body = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456!',
      };
      mockUserUseCase.changePassword.mockResolvedValue(undefined);

      // Act
      await userController.changePassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.changePassword).toHaveBeenCalledWith(
        'user123',
        'oldPassword123!',
        'newPassword456!'
      );
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'password_changed',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await userController.changePassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated',
      });
      expect(mockUserUseCase.changePassword).not.toHaveBeenCalled();
    });

    it('should return 400 when passwords are missing', async () => {
      // Arrange
      mockRequest.body = { currentPassword: 'oldPassword123!' }; // Missing newPassword

      // Act
      await userController.changePassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Current password and new password are required',
      });
      expect(mockUserUseCase.changePassword).not.toHaveBeenCalled();
    });

    it('should handle password change errors and call next', async () => {
      // Arrange
      mockRequest.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword456!',
      };
      const error = new Error('Invalid current password');
      mockUserUseCase.changePassword.mockRejectedValue(error);

      // Act
      await userController.changePassword(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'password_change_failed',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          reason: 'Invalid current password',
        }
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAccount', () => {
    it('should successfully delete user account', async () => {
      // Arrange
      mockRequest.body = {
        password: 'userPassword123!',
        confirmDeletion: 'DELETE_MY_ACCOUNT',
      };
      mockUserUseCase.deleteUser.mockResolvedValue(true);

      // Act
      await userController.deleteAccount(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.deleteUser).toHaveBeenCalledWith('user123', 'userPassword123!');
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'account_deleted',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await userController.deleteAccount(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated',
      });
      expect(mockUserUseCase.deleteUser).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      // Arrange
      mockRequest.body = { confirmDeletion: 'DELETE_MY_ACCOUNT' }; // Missing password

      // Act
      await userController.deleteAccount(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password and confirmation text are required',
      });
      expect(mockUserUseCase.deleteUser).not.toHaveBeenCalled();
    });

    it('should return 400 when confirmation text is incorrect', async () => {
      // Arrange
      mockRequest.body = {
        password: 'userPassword123!',
        confirmDeletion: 'WRONG_TEXT',
      };

      // Act
      await userController.deleteAccount(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Password and confirmation text are required',
      });
      expect(mockUserUseCase.deleteUser).not.toHaveBeenCalled();
    });

    it('should return 400 when deletion fails', async () => {
      // Arrange
      mockRequest.body = {
        password: 'userPassword123!',
        confirmDeletion: 'DELETE_MY_ACCOUNT',
      };
      mockUserUseCase.deleteUser.mockResolvedValue(false);

      // Act
      await userController.deleteAccount(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete account',
      });
    });

    it('should handle deletion errors and call next', async () => {
      // Arrange
      mockRequest.body = {
        password: 'wrongPassword',
        confirmDeletion: 'DELETE_MY_ACCOUNT',
      };
      const error = new Error('Invalid password');
      mockUserUseCase.deleteUser.mockRejectedValue(error);

      // Act
      await userController.deleteAccount(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'user123',
        'account_deletion_failed',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          reason: 'Invalid password',
        }
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listUsers', () => {
    it('should successfully list users for admin', async () => {
      // Arrange
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      mockRequest.query = {
        page: '2',
        limit: '10',
        search: 'john',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        sortBy: 'email',
        sortOrder: 'asc',
      };

      const mockResult = {
        users: [mockUser],
        total: 1,
        page: 2,
        limit: 10,
        hasMore: false,
      };
      mockUserUseCase.listUsers.mockResolvedValue(mockResult);

      // Act
      await userController.listUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.listUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'john',
        sortBy: 'email',
        sortOrder: 'asc',
        filters: {
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users: [mockUser],
          total: 1,
          page: 2,
          limit: 10,
          hasMore: false,
        },
      });
    });

    it('should successfully list users for moderator', async () => {
      // Arrange
      mockRequest.user = { 
        id: 'mod123', 
        email: 'mod@example.com', 
        role: UserRole.MODERATOR, 
        permissions: [] 
      };
      const mockResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };
      mockUserUseCase.listUsers.mockResolvedValue(mockResult);

      // Act
      await userController.listUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.listUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: {
          role: undefined,
          status: undefined,
        },
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 403 for regular users', async () => {
      // Arrange
      mockRequest.user = { 
        id: 'user123', 
        email: 'user@example.com', 
        role: UserRole.USER, 
        permissions: [] 
      };

      // Act
      await userController.listUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockUserUseCase.listUsers).not.toHaveBeenCalled();
    });

    it('should handle listing errors and call next', async () => {
      // Arrange
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      const error = new Error('Database error');
      mockUserUseCase.listUsers.mockRejectedValue(error);

      // Act
      await userController.listUsers(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should allow users to view their own profile', async () => {
      // Arrange
      mockRequest.params = { id: 'user123' };
      mockRequest.user = { 
        id: 'user123', 
        email: 'user@example.com', 
        role: UserRole.USER, 
        permissions: [] 
      };
      mockUserUseCase.findById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.findById).toHaveBeenCalledWith('user123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            role: mockUser.role,
            status: mockUser.status,
            emailVerified: mockUser.emailVerified,
            profile: mockUser.profile,
            permissions: mockUser.permissions,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            lastLoginAt: mockUser.lastLoginAt,
          },
        },
      });
    });

    it('should allow admins to view any user profile', async () => {
      // Arrange
      mockRequest.params = { id: 'otheruser123' };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      mockUserUseCase.findById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.findById).toHaveBeenCalledWith('otheruser123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            role: mockUser.role,
            status: mockUser.status,
            emailVerified: mockUser.emailVerified,
            profile: mockUser.profile,
            permissions: mockUser.permissions,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            lastLoginAt: mockUser.lastLoginAt,
          },
        },
      });
    });

    it('should allow moderators to view any user profile', async () => {
      // Arrange
      mockRequest.params = { id: 'otheruser123' };
      mockRequest.user = { 
        id: 'mod123', 
        email: 'mod@example.com', 
        role: UserRole.MODERATOR, 
        permissions: [] 
      };
      mockUserUseCase.findById.mockResolvedValue(mockUser);

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.findById).toHaveBeenCalledWith('otheruser123');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 400 when user ID is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required',
      });
      expect(mockUserUseCase.findById).not.toHaveBeenCalled();
    });

    it('should return 403 when regular user tries to view another user profile', async () => {
      // Arrange
      mockRequest.params = { id: 'otheruser123' };
      mockRequest.user = { 
        id: 'user123', 
        email: 'user@example.com', 
        role: UserRole.USER, 
        permissions: [] 
      };

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
      });
      expect(mockUserUseCase.findById).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found', async () => {
      // Arrange
      mockRequest.params = { id: 'nonexistent123' };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      mockUserUseCase.findById.mockResolvedValue(null);

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should handle retrieval errors and call next', async () => {
      // Arrange
      mockRequest.params = { id: 'user123' };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      const error = new Error('Database error');
      mockUserUseCase.findById.mockRejectedValue(error);

      // Act
      await userController.getUserById(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUserRole', () => {
    it('should successfully update user role', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { role: UserRole.MODERATOR };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };      const updatedUser = new User({
        ...mockUser,
        role: UserRole.MODERATOR
      });
      mockUserUseCase.updateUserRoles.mockResolvedValue(updatedUser);

      // Act
      await userController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.updateUserRoles).toHaveBeenCalledWith('target123', UserRole.MODERATOR);
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin123',
        'user_role_updated',
        {
          targetUserId: 'target123',
          newRole: UserRole.MODERATOR,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: updatedUser,
        },
      });
    });

    it('should return 400 when user ID is missing', async () => {
      // Arrange
      mockRequest.params = {};
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };

      // Act
      await userController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required',
      });
      expect(mockUserUseCase.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { role: UserRole.MODERATOR };
      mockRequest.user = { 
        id: 'user123', 
        email: 'user@example.com', 
        role: UserRole.USER, 
        permissions: [] 
      };

      // Act
      await userController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only administrators can change user roles',
      });
      expect(mockUserUseCase.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should return 400 when trying to modify own role', async () => {
      // Arrange
      mockRequest.params = { id: 'admin123' };
      mockRequest.body = { role: UserRole.USER };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };

      // Act
      await userController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot modify your own role',
      });
      expect(mockUserUseCase.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should return 400 when role is invalid', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { role: 'invalid_role' };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };

      // Act
      await userController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Valid role is required',
      });
      expect(mockUserUseCase.updateUserRoles).not.toHaveBeenCalled();
    });

    it('should handle update errors and call next', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { role: UserRole.MODERATOR };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      const error = new Error('Update failed');
      mockUserUseCase.updateUserRoles.mockRejectedValue(error);

      // Act
      await userController.updateUserRole(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('suspendUser', () => {
    it('should successfully suspend user as admin', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { reason: 'Violation of terms' };      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      const suspendedUser = new User({
        ...mockUser,
        status: UserStatus.SUSPENDED
      });
      mockUserUseCase.suspendUser.mockResolvedValue(suspendedUser);

      // Act
      await userController.suspendUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.suspendUser).toHaveBeenCalledWith('target123', 'Violation of terms');
      expect(mockSecurityService.logSecurityEvent).toHaveBeenCalledWith(
        'admin123',
        'user_suspended',
        {
          targetUserId: 'target123',
          reason: 'Violation of terms',
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User suspended successfully',
        data: {
          user: suspendedUser,
        },
      });
    });

    it('should successfully suspend user as moderator', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { reason: 'Spam posting' };      mockRequest.user = { 
        id: 'mod123', 
        email: 'mod@example.com', 
        role: UserRole.MODERATOR, 
        permissions: [] 
      };
      const suspendedUser = new User({
        ...mockUser,
        status: UserStatus.SUSPENDED
      });
      mockUserUseCase.suspendUser.mockResolvedValue(suspendedUser);

      // Act
      await userController.suspendUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockUserUseCase.suspendUser).toHaveBeenCalledWith('target123', 'Spam posting');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User suspended successfully',
        data: {
          user: suspendedUser,
        },
      });
    });

    it('should return 400 when user ID is missing', async () => {
      // Arrange
      mockRequest.params = {};
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };

      // Act
      await userController.suspendUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required',
      });
      expect(mockUserUseCase.suspendUser).not.toHaveBeenCalled();
    });

    it('should return 403 for regular users', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { reason: 'Some reason' };
      mockRequest.user = { 
        id: 'user123', 
        email: 'user@example.com', 
        role: UserRole.USER, 
        permissions: [] 
      };

      // Act
      await userController.suspendUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions to suspend users',
      });
      expect(mockUserUseCase.suspendUser).not.toHaveBeenCalled();
    });

    it('should return 400 when trying to suspend themselves', async () => {
      // Arrange
      mockRequest.params = { id: 'admin123' };
      mockRequest.body = { reason: 'Self suspension' };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };

      // Act
      await userController.suspendUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot suspend yourself',
      });
      expect(mockUserUseCase.suspendUser).not.toHaveBeenCalled();
    });

    it('should handle suspension errors and call next', async () => {
      // Arrange
      mockRequest.params = { id: 'target123' };
      mockRequest.body = { reason: 'Some reason' };
      mockRequest.user = { 
        id: 'admin123', 
        email: 'admin@example.com', 
        role: UserRole.ADMIN, 
        permissions: [] 
      };
      const error = new Error('Suspension failed');
      mockUserUseCase.suspendUser.mockRejectedValue(error);

      // Act
      await userController.suspendUser(mockRequest, mockResponse, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
