/**
 * Protected Route component for authentication-based route guarding
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import type { User } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  requiredRole?: string;
  requiredPermissions?: string[];
  fallbackUrl?: string;
  showLoader?: boolean;
}

/**
 * Loading component for authentication check
 */
const AuthLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full space-y-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <h2 className="text-lg font-medium text-gray-900">Checking authentication...</h2>
      <p className="text-sm text-gray-600">Please wait while we verify your session.</p>
    </div>
  </div>
);

/**
 * Protected Route component that handles authentication and authorization
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresAuth = true,
  requiredRole,
  requiredPermissions = [],
  fallbackUrl = '/auth/login',
  showLoader = true,
}) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      if (!hasCheckedAuth && (!isAuthenticated && !user)) {
        try {
          await checkAuthStatus();
        } catch {
          // Authentication check failed, but we'll handle this below
        }
      }
      
      if (mounted) {
        setHasCheckedAuth(true);
      }
    };

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]); // Removed checkAuthStatus to prevent infinite loop

  // Show loader while checking authentication
  if (!hasCheckedAuth || isLoading) {
    return showLoader ? <AuthLoader /> : null;
  }

  // Check authentication requirement
  if (requiresAuth && !isAuthenticated) {
    return <Navigate to={fallbackUrl} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && (!user || !hasRole(user, requiredRole))) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && (!user || !hasPermissions(user, requiredPermissions))) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * Check if user has required role
 */
const hasRole = (user: User, requiredRole: string): boolean => {
  return user.role === requiredRole || isHigherRole(user.role, requiredRole);
};

/**
 * Check if user has required permissions
 */
const hasPermissions = (user: User, requiredPermissions: string[]): boolean => {
  // For now, we'll use role-based permissions
  // This can be extended to use a proper permission system
  const userPermissions = getRolePermissions(user.role);

  return requiredPermissions.every(
    permission => userPermissions.includes(permission) || userPermissions.includes('*')
  );
};

/**
 * Check if current role is higher than required role
 */
const isHigherRole = (currentRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    guest: 0,
    user: 1,
    moderator: 2,
    admin: 3,
  };

  const currentLevel = roleHierarchy[currentRole as keyof typeof roleHierarchy] ?? 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 0;

  return currentLevel >= requiredLevel;
};

/**
 * Get permissions for a role
 */
const getRolePermissions = (role: string): string[] => {
  const rolePermissions = {
    guest: [],
    user: [
      'universe:read:own',
      'story:read:own',
      'story:write:own',
      'character:read:own',
      'character:write:own',
    ],
    moderator: [
      'universe:read:own',
      'universe:read:shared',
      'story:read:own',
      'story:read:shared',
      'story:write:own',
      'story:write:shared',
      'character:read:own',
      'character:read:shared',
      'character:write:own',
      'character:write:shared',
      'user:read',
    ],
    admin: ['*'], // All permissions
  };

  return rolePermissions[role as keyof typeof rolePermissions] ?? [];
};

export default ProtectedRoute;
