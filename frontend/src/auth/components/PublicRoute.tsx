import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * Public Route Component
 * Redirects authenticated users to dashboard
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const isAuthenticated = Boolean(user);

  // Use a loading state or skeleton during initial load
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-universe-background">
        <div className="text-universe-text">Loading...</div>
      </div>
    );
  }

  // Only redirect if we're sure the user is authenticated
  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
