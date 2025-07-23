/**
 * Admin Middleware
 * 
 * Middleware for restricting access to admin-only endpoints.
 * Ensures the authenticated user has admin privileges.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../core/entities/user.entity.js';

export interface AdminRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
        permissions: string[];
    };
}

/**
 * Admin middleware function
 * Requires user to be authenticated and have admin role
 */
export const adminMiddleware = (req: AdminRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated (should be set by auth middleware)
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
        return;
    }

    // Check if user has admin role
    if (req.user.role !== UserRole.ADMIN) {
        res.status(403).json({
            success: false,
            message: 'Admin access required',
            code: 'ADMIN_REQUIRED',
            details: {
                userRole: req.user.role,
                requiredRole: UserRole.ADMIN,
            },
        });
        return;
    }

    // Check for admin permissions
    const adminPermissions = [
        'admin.users.read',
        'admin.users.write',
        'admin.monitoring.read',
        'admin.system.read',
    ];

    const hasAdminPermission = adminPermissions.some(permission =>
        req.user!.permissions.includes(permission)
    );

    if (!hasAdminPermission) {
        res.status(403).json({
            success: false,
            message: 'Insufficient admin permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            details: {
                userPermissions: req.user.permissions,
                requiredPermissions: adminPermissions,
            },
        });
        return;
    }

    next();
};

/**
 * Super admin middleware function
 * Requires user to be authenticated and have super admin role
 */
export const superAdminMiddleware = (req: AdminRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
        return;
    }

    // Check if user has super admin role or specific super admin permission
    const isSuperAdmin = req.user.role === UserRole.ADMIN &&
        req.user.permissions.includes('super.admin');

    if (!isSuperAdmin) {
        res.status(403).json({
            success: false,
            message: 'Super admin access required',
            code: 'SUPER_ADMIN_REQUIRED',
            details: {
                userRole: req.user.role,
                userPermissions: req.user.permissions,
            },
        });
        return;
    }

    next();
};

/**
 * Permission-based middleware factory
 * Creates middleware that checks for specific permissions
 */
export const requirePermission = (permission: string) => {
    return (req: AdminRequest, res: Response, next: NextFunction): void => {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }

        // Check if user has the required permission
        if (!req.user.permissions.includes(permission)) {
            res.status(403).json({
                success: false,
                message: `Permission required: ${permission}`,
                code: 'PERMISSION_REQUIRED',
                details: {
                    requiredPermission: permission,
                    userPermissions: req.user.permissions,
                },
            });
            return;
        }

        next();
    };
};

/**
 * Multiple permissions middleware factory
 * Creates middleware that checks for any of the specified permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
    return (req: AdminRequest, res: Response, next: NextFunction): void => {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }

        // Check if user has any of the required permissions
        const hasAnyPermission = permissions.some(permission =>
            req.user!.permissions.includes(permission)
        );

        if (!hasAnyPermission) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                details: {
                    requiredPermissions: permissions,
                    userPermissions: req.user.permissions,
                },
            });
            return;
        }

        next();
    };
};

/**
 * Multiple permissions middleware factory (requires ALL permissions)
 * Creates middleware that checks for all of the specified permissions
 */
export const requireAllPermissions = (permissions: string[]) => {
    return (req: AdminRequest, res: Response, next: NextFunction): void => {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }

        // Check if user has all required permissions
        const hasAllPermissions = permissions.every(permission =>
            req.user!.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            const missingPermissions = permissions.filter(permission =>
                !req.user!.permissions.includes(permission)
            );

            res.status(403).json({
                success: false,
                message: 'Missing required permissions',
                code: 'MISSING_PERMISSIONS',
                details: {
                    requiredPermissions: permissions,
                    missingPermissions,
                    userPermissions: req.user.permissions,
                },
            });
            return;
        }

        next();
    };
};
