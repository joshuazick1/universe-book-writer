/**
 * Admin controller for administrative functionality
 */

import { Response, NextFunction } from 'express';
import { AdminUseCase } from '../../application/use-cases/admin.use-case.js';
import { SecurityService } from '../../core/interfaces/auth.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { UserRole } from '../../core/entities/user.entity.js';

export class AdminController {
  constructor(
    private adminUseCase: AdminUseCase,
    private securityService: SecurityService
  ) { }

  /**
   * Get all users with filtering and pagination
   */
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        emailVerified,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        filters: {
          role: role as string,
          status: status as string,
          emailVerified:
            emailVerified === 'true' ? true : emailVerified === 'false' ? false : undefined,
        },
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.adminUseCase.getAllUsers(options);

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId || 'unknown',
        'admin_users_viewed',
        {
          ipAddress,
          userAgent,
          filters: options.filters,
        }
      );
      res.json({
        success: true,
        data: {
          users: result.items.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          })),
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const targetUserId = req.params.id;
      const { role: newRole } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      // Validate input
      if (!targetUserId || !newRole) {
        res.status(400).json({
          success: false,
          message: 'User ID and role are required',
        });
        return;
      }

      // Prevent self-modification
      if (targetUserId === currentUserId) {
        res.status(400).json({
          success: false,
          message: 'Cannot modify your own role',
        });
        return;
      }

      const updatedUser = await this.adminUseCase.updateUserRole(targetUserId, newRole);

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId || 'unknown',
        'admin_user_role_updated',
        {
          targetUserId,
          oldRole: updatedUser.role,
          newRole,
          ipAddress,
          userAgent,
        }
      );

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status (admin only)
   */
  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const targetUserId = req.params.id;
      const { status: newStatus } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      // Validate input
      if (!targetUserId || !newStatus) {
        res.status(400).json({
          success: false,
          message: 'User ID and status are required',
        });
        return;
      }

      // Prevent self-modification
      if (targetUserId === currentUserId) {
        res.status(400).json({
          success: false,
          message: 'Cannot modify your own status',
        });
        return;
      }

      const updatedUser = await this.adminUseCase.updateUserStatus(targetUserId, newStatus);

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId || 'unknown',
        'admin_user_status_updated',
        {
          targetUserId,
          newStatus,
          ipAddress,
          userAgent,
        }
      );

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            status: updatedUser.status,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually verify user email (admin only)
   */
  async verifyUserEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const targetUserId = req.params.id;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      const updatedUser = await this.adminUseCase.verifyUserEmail(targetUserId);

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId || 'unknown',
        'admin_user_email_verified',
        {
          targetUserId,
          targetEmail: updatedUser.email,
          ipAddress,
          userAgent,
        }
      );

      res.json({
        success: true,
        message: 'User email verified successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            emailVerified: updatedUser.emailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admin settings
   */
  async getAdminSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const settings = await this.adminUseCase.getAdminSettings();

      res.json({
        success: true,
        data: {
          settings,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update admin settings
   */
  async updateAdminSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const settingsUpdate = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const updatedSettings = await this.adminUseCase.updateAdminSettings(settingsUpdate);

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId || 'unknown',
        'admin_settings_updated',
        {
          changes: settingsUpdate,
          ipAddress,
          userAgent,
        }
      );

      res.json({
        success: true,
        message: 'Admin settings updated successfully',
        data: {
          settings: updatedSettings,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security audit logs (admin only)
   */
  async getSecurityLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const { page = 1, limit = 50, eventType, userId, startDate, endDate } = req.query;

      const options = {
        page: Number(page),
        limit: Number(limit),
        filters: {
          eventType: eventType as string,
          userId: userId as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
        },
      };

      const result = await this.adminUseCase.getSecurityLogs(options);
      res.json({
        success: true,
        data: {
          logs: result.items,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user with admin privileges
   */
  async createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        role = UserRole.USER,
        skipEmailVerification = false,
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Email, password, first name, and last name are required',
        });
        return;
      }

      const newUser = await this.adminUseCase.createUser({
        email,
        password,
        firstName,
        lastName,
        role,
        skipEmailVerification,
      });

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId || 'unknown',
        'admin_user_created',
        {
          newUserId: newUser.id,
          newUserEmail: newUser.email,
          newUserRole: newUser.role,
          skipEmailVerification,
          ipAddress,
          userAgent,
        }
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.profile?.firstName,
            lastName: newUser.profile?.lastName,
            role: newUser.role,
            status: newUser.status,
            emailVerified: newUser.emailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;
      const targetUserId = req.params.id;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check admin permission
      if (userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const deleted = await this.adminUseCase.deleteUser(targetUserId, currentUserId);

      // Log admin action
      await this.securityService.logSecurityEvent(
        currentUserId,
        'admin_user_deleted',
        {
          targetUserId,
          ipAddress,
          userAgent,
        }
      );

      res.json({
        success: true,
        message: 'User deleted successfully',
        data: {
          deleted: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
