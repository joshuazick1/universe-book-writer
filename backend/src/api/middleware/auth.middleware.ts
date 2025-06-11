import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../../core/interfaces/auth.service.js';
import { TokenClaims } from '../../core/entities/auth.entity.js';
import {
  AuthTokenRepository,
  AuthSessionRepository,
} from '../../core/interfaces/auth.repository.js';
import { UserRepository } from '../../core/interfaces/user.repository.js';
import { UserRole, UserStatus, UserPermissions } from '../../core/entities/user.entity.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
  session?: {
    id: string;
    deviceId: string;
  };
}

export class AuthMiddleware {
  constructor(
    private tokenService: TokenService,
    private authTokenRepository: AuthTokenRepository,
    private authSessionRepository: AuthSessionRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Middleware to authenticate requests using JWT tokens
   */
  authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Access token required',
        });
        return;
      }

      // Validate the token
      let tokenClaims: TokenClaims;
      try {
        tokenClaims = await this.tokenService.verifyToken(token);
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
        return;
      }

      // Check if token exists in database and is not revoked
      const tokenRecord = await this.authTokenRepository.findByToken(token);
      if (!tokenRecord || !tokenRecord.canBeUsed()) {
        res.status(401).json({
          success: false,
          message: 'Token has been revoked or expired',
        });
        return;
      }

      // Check if session is still active (using jti which maps to session ID)
      if (tokenClaims.jti) {
        const session = await this.authSessionRepository.findById(tokenClaims.jti);
        if (!session || !session.isActive || session.expiresAt < new Date()) {
          res.status(401).json({
            success: false,
            message: 'Session has expired',
          });
          return;
        }

        // Update session activity
        await this.authSessionRepository.updateActivity(tokenClaims.jti);

        req.session = {
          id: session.id,
          deviceId: session.deviceInfo.deviceId || 'unknown',
        };
      }

      // Get user details to ensure user still exists and is active (using sub which is user ID)
      const user = await this.userRepository.findById(tokenClaims.sub);
      if (!user || user.status !== UserStatus.ACTIVE) {
        res.status(401).json({
          success: false,
          message: 'User account is not active',
        });
        return;
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role, // Use single role property
        permissions: this.convertPermissionsToArray(user.permissions),
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  };
  /**
   * Middleware to check if user has required roles
   */
  requireRoles(requiredRoles: UserRole[]) {
    const self = this;
    return function(req: AuthRequest, res: Response, next: NextFunction): void {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const userRole = req.user.role;
      const hasRequiredRole = requiredRoles && requiredRoles.includes(userRole);

      if (!hasRequiredRole) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to check if user has required permissions
   */
  requirePermissions(requiredPermissions: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const userPermissions = req.user.permissions;
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    };
  }

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        next();
        return;
      }

      // Validate the token
      let tokenClaims: TokenClaims;
      try {
        tokenClaims = await this.tokenService.verifyToken(token);
      } catch (error) {
        // Don't fail on optional auth errors, just continue without user
        next();
        return;
      }

      // Check if token exists in database and is not revoked
      const tokenRecord = await this.authTokenRepository.findByToken(token);
      if (tokenRecord && tokenRecord.canBeUsed()) {
        // Get user details
        const user = await this.userRepository.findById(tokenClaims.sub);
        if (user && user.status === UserStatus.ACTIVE) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role, // Use single role property
            permissions: this.convertPermissionsToArray(user.permissions),
          };

          // Handle session if present
          if (tokenClaims.jti) {
            const session = await this.authSessionRepository.findById(tokenClaims.jti);
            if (session && session.isActive && session.expiresAt > new Date()) {
              await this.authSessionRepository.updateActivity(tokenClaims.jti);
              req.session = {
                id: session.id,
                deviceId: session.deviceInfo.deviceId || 'unknown',
              };
            }
          }
        }
      }

      next();
    } catch (error) {
      // Don't fail on optional auth errors, just continue without user
      next();
    }
  };

  /**
   * Middleware to ensure email is verified
   */
  requireEmailVerification = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Get user details to check email verification status
    this.userRepository
      .findById(req.user.id)
      .then(user => {
        if (!user || !user.emailVerified) {
          res.status(403).json({
            success: false,
            message: 'Email verification required',
          });
          return;
        }
        next();
      })
      .catch(error => {
        console.error('Email verification check error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to verify email status',
        });
      });
  };

  /**
   * Admin only middleware
   */
  get requireAdmin() {
    return this.requireRoles([UserRole.ADMIN]);
  }

  /**
   * Admin or Moderator middleware
   */
  get requireModeratorOrAdmin() {
    return this.requireRoles([UserRole.ADMIN, UserRole.MODERATOR]);
  }

  /**
   * Extract token from Authorization header or cookies
   */
  private extractToken(req: Request): string | null {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try cookies
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    return null;
  }

  /**
   * Convert UserPermissions object to string array
   */
  private convertPermissionsToArray(permissions: UserPermissions): string[] {
    const result: string[] = [];
    if (permissions.canCreateUniverse) result.push('create_universe');
    if (permissions.canEditOwnContent) result.push('edit_own_content');
    if (permissions.canEditOtherContent) result.push('edit_other_content');
    if (permissions.canDeleteContent) result.push('delete_content');
    if (permissions.canManageUsers) result.push('manage_users');
    if (permissions.canManagePlugins) result.push('manage_plugins');
    if (permissions.canAccessAdminPanel) result.push('access_admin_panel');
    return result;
  }
}
