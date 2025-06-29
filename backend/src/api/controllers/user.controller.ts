import { Response, NextFunction } from 'express';
import { UserUseCase } from '../../application/use-cases/user.use-case.js';
import { SecurityService } from '../../core/interfaces/auth.service.js';
import { User, UserRole, UserStatus } from '../../core/entities/user.entity.js';
import { AuthRequest } from './auth.controller.js';

export class UserController {
  constructor(
    private userUseCase: UserUseCase,
    private securityService: SecurityService
  ) { }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, ...profileData } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // UserUseCase.updateProfile returns User directly, not a result object
      const user = await this.userUseCase.updateProfile(userId, {
        firstName,
        lastName,
        ...profileData,
      });

      // Log security event - 3 parameters only
      await this.securityService.logSecurityEvent(userId, 'profile_updated', {
        ipAddress,
        userAgent,
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user,
        },
      });
    } catch (error) {
      const userAgent = req.get('User-Agent') || 'unknown';
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      if (req.user?.id) {
        await this.securityService.logSecurityEvent(req.user.id, 'profile_update_failed', {
          ipAddress,
          userAgent,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
        return;
      }

      // UserUseCase.changePassword returns void (throws on error)
      await this.userUseCase.changePassword(userId, currentPassword, newPassword);

      // Log successful password change
      await this.securityService.logSecurityEvent(userId, 'password_changed', {
        ipAddress,
        userAgent,
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Log failed attempt
      if (req.user?.id) {
        await this.securityService.logSecurityEvent(req.user.id, 'password_change_failed', {
          ipAddress,
          userAgent,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { password, confirmDeletion } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!password || confirmDeletion !== 'DELETE_MY_ACCOUNT') {
        res.status(400).json({
          success: false,
          message: 'Password and confirmation text are required',
        });
        return;
      }

      // UserUseCase.deleteUser returns boolean (true on success, throws on error)
      const deleted = await this.userUseCase.deleteUser(userId, password);

      if (!deleted) {
        res.status(400).json({
          success: false,
          message: 'Failed to delete account',
        });
        return;
      }

      // Log successful account deletion
      await this.securityService.logSecurityEvent(userId, 'account_deleted', {
        ipAddress,
        userAgent,
      });

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (req.user?.id) {
        await this.securityService.logSecurityEvent(req.user.id, 'account_deletion_failed', {
          ipAddress,
          userAgent,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      next(error);
    }
  }

  // Admin only methods
  async listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fix: User has single 'role' property, not 'roles' array
      const userRole = req.user?.role;

      if (userRole !== UserRole.ADMIN && userRole !== UserRole.MODERATOR) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // Fix: UserUseCase.listUsers expects different options structure
      const result = await this.userUseCase.listUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        filters: {
          role: role as UserRole,
          status: status as UserStatus,
        },
      });

      res.json({
        success: true,
        data: {
          users: result.users,
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fix: User has single 'role' property, not 'roles' array
      const userRole = req.user?.role;
      const requestedUserId = req.params.id;
      const currentUserId = req.user?.id;

      if (!requestedUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      // Users can view their own profile, admins and moderators can view any profile
      if (
        requestedUserId !== currentUserId &&
        userRole !== UserRole.ADMIN &&
        userRole !== UserRole.MODERATOR
      ) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
      }

      const user = await this.userUseCase.findById(requestedUserId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            // Fix: User entity properties
            role: user.role, // not 'roles'
            status: user.status,
            emailVerified: user.emailVerified, // not 'isEmailVerified'
            profile: user.profile,
            permissions: user.permissions,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fix: User has single 'role' property, not 'roles' array
      const userRole = req.user?.role;
      const targetUserId = req.params.id;
      const { role: newRole } = req.body; // Fix: expecting single role, not roles array
      const currentUserId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      // Only admins can change roles
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Only administrators can change user roles',
        });
        return;
      }

      // Prevent self-role modification
      if (targetUserId === currentUserId) {
        res.status(400).json({
          success: false,
          message: 'Cannot modify your own role',
        });
        return;
      }

      if (!newRole || !Object.values(UserRole).includes(newRole)) {
        res.status(400).json({
          success: false,
          message: 'Valid role is required',
        });
        return;
      }

      // Fix: UserUseCase.updateUserRoles expects single UserRole, returns User directly
      const updatedUser = await this.userUseCase.updateUserRoles(targetUserId, newRole);

      // Log security event
      await this.securityService.logSecurityEvent(currentUserId || 'unknown', 'user_role_updated', {
        targetUserId,
        newRole,
        ipAddress,
        userAgent,
      });

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fix: User has single 'role' property, not 'roles' array
      const userRole = req.user?.role;
      const targetUserId = req.params.id;
      const { reason } = req.body;
      const currentUserId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      // Only admins and moderators can suspend users
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.MODERATOR) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions to suspend users',
        });
        return;
      }

      // Prevent self-suspension
      if (targetUserId === currentUserId) {
        res.status(400).json({
          success: false,
          message: 'Cannot suspend yourself',
        });
        return;
      }

      // Fix: UserUseCase.suspendUser returns User directly, not a result object
      const suspendedUser = await this.userUseCase.suspendUser(targetUserId, reason);

      // Log security event
      await this.securityService.logSecurityEvent(currentUserId || 'unknown', 'user_suspended', {
        targetUserId,
        reason,
        ipAddress,
        userAgent,
      });

      res.json({
        success: true,
        message: 'User suspended successfully',
        data: {
          user: suspendedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users for collaboration invitations
   * GET /api/users/search
   */
  async searchUsersForCollaboration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const {
        query,
        limit = 10,
      } = req.query;

      if (!query || typeof query !== 'string' || query.length < 2) {
        res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long',
        });
        return;
      }

      // Search for users with privacy controls - exclude current user
      const result = await this.userUseCase.searchUsersForCollaboration(
        query,
        currentUserId,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          users: result.users.map((user: User) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            status: user.status,
            canInvite: user.status === UserStatus.ACTIVE
          })),
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
