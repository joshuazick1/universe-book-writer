/**
 * Protected Route Component Tests
 * Tests for authentication-based route protection and authorization
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProtectedRoute } from '../../src/auth/components/ProtectedRoute';
import { renderWithProviders, mockUser, mockAdminUser, cleanupMocks } from '../utils';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockLocation = { pathname: '/protected-page', state: null };

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as any;
  return {
    ...actual,
    Navigate: ({ to, state, replace }: any) => {
      mockNavigate(to, { state, replace });
      return React.createElement('div', { 'data-testid': 'navigate' }, `Redirecting to ${to}`);
    },
    useLocation: () => mockLocation,
  };
});

// Mock auth hooks
const mockCheckAuthStatus = jest.fn().mockResolvedValue(undefined);
const defaultAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  checkAuthStatus: mockCheckAuthStatus,
};

const mockUseAuth = jest.fn(() => defaultAuthState);

jest.mock('../../src/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    mockCheckAuthStatus.mockClear();
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue(defaultAuthState);
  });

  afterEach(() => {
    cleanupMocks();
  });
  describe('Authentication Required', () => {    it('should render children when user is authenticated', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      renderWithProviders(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();    });it('should redirect to login when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithProviders(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login', {
          state: { from: mockLocation },
          replace: true,
        });
      });
    });it('should show loading state while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      renderWithProviders(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should call checkAuthStatus on mount', () => {
      renderWithProviders(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      expect(mockCheckAuthStatus).toHaveBeenCalled();
    });
  });
  describe('Role-Based Authorization', () => {    it('should render children when user has required role', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockAdminUser,
        isAuthenticated: true,
        isLoading: false,
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="admin">
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });it('should redirect when user does not have required role', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockUser, // regular user, not admin
        isAuthenticated: true,
        isLoading: false,
      });      renderWithProviders(
        <ProtectedRoute requiredRole="admin">
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedRoute>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', {
        state: { from: mockLocation },
        replace: true,
      });
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });
  });

  describe('Permission-Based Authorization', () => {    it('should render children when user has required permissions', () => {
      // Admin user has all permissions (*)
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockAdminUser,
        isAuthenticated: true,
        isLoading: false,
      });

      renderWithProviders(
        <ProtectedRoute requiredPermissions={['read:posts']}>
          <div data-testid="content-with-permissions">Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('content-with-permissions')).toBeInTheDocument();
    });    it('should redirect when user lacks required permissions', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockUser, // regular user, limited permissions
        isAuthenticated: true,
        isLoading: false,
      });      renderWithProviders(
        <ProtectedRoute requiredPermissions={['admin:all']}>
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedRoute>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', {
        state: { from: mockLocation },
        replace: true,
      });
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });  });
  describe('Configuration Options', () => {    it('should use custom fallback URL', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });      renderWithProviders(
        <ProtectedRoute fallbackUrl="/custom-login">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/custom-login', {
          state: { from: mockLocation },
          replace: true,
        });
      });
    });    it('should not require auth when requiresAuth is false', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithProviders(
        <ProtectedRoute requiresAuth={false}>
          <div data-testid="public-content">Public Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('public-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });it('should not show loader when showLoader is false', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      renderWithProviders(
        <ProtectedRoute showLoader={false}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.queryByText(/checking authentication/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {    it('should handle multiple required permissions', () => {
      // Regular user won't have both permissions needed
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockUser, // regular user with limited permissions
        isAuthenticated: true,
        isLoading: false,
      });      renderWithProviders(
        <ProtectedRoute requiredPermissions={['read:posts', 'write:posts']}>
          <div data-testid="content-with-permissions">Content</div>
        </ProtectedRoute>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', {
        state: { from: mockLocation },
        replace: true,
      });
      expect(screen.queryByTestId('content-with-permissions')).not.toBeInTheDocument();
    });    it('should handle both role and permission requirements', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: mockAdminUser,
        isAuthenticated: true,
        isLoading: false,
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="admin" requiredPermissions={['admin:all']}>
          <div data-testid="admin-content">Admin Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });
  });
});
