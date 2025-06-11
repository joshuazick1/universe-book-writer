/**
 * Admin Authentication Wrapper
 * Ensures users are authenticated and have admin privileges before accessing admin panel
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks';

interface AdminAuthWrapperProps {
  children: React.ReactNode;
}

export const AdminAuthWrapper: React.FC<AdminAuthWrapperProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ returnTo: '/admin' }} />;
  }

  // Check if user has admin role
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need administrator privileges to access this page.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
            <p className="text-sm text-gray-500">
              Current role: <span className="font-semibold">{user?.role || 'none'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has admin role
  return <>{children}</>;
};
