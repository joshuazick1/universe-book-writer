/**
 * Protected Route Component Tests
 * Comprehensive tests for authentication and authorization logic
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/components/ProtectedRoute';
import { renderWithProviders, mockUser, mockAdminUser, cleanupMocks } from '../../test/utils';
import * as authHooks from '../../auth/hooks';

// Mock the auth hooks
jest.mock('../../auth/hooks', () => ({
  useAuth: jest.fn(),
}));

// Mock react-router-dom Navigate component
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, state }: any) => {
    mockNavigate(to, state);
    return <div data-testid="navigate-component">Redirecting to {to}</div>;
  },
}));

describe('ProtectedRoute', () => {
  const mockCheckAuthStatus = jest.fn();
  
  const defaultAuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    checkAuthStatus: mockCheckAuthStatus,
  };

  const TestContent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    jest.mocked(authHooks.useAuth).mockReturnValue(defaultAuthState);
    mockCheckAuthStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanupMocks();
    mockNavigate.mockClear();
    mockCheckAuthStatus.mockClear();
  });

  describe('Authentication Checks', () => {
    it('should render children when user is authenticated', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: mockUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestContent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestContent />
        </ProtectedRoute>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
        state: expect.objectContaining({ from: expect.any(Object) })
      }));
    });

    it('should redirect to custom fallback URL when specified', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
      });

      renderWithProviders(
        <ProtectedRoute fallbackUrl="/custom-login">
          <TestContent />
        </ProtectedRoute>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/custom-login', expect.objectContaining({
        state: expect.objectContaining({ from: expect.any(Object) })
      }));
    });

    it('should not require authentication when requiresAuth is false', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
      });

      renderWithProviders(
        <ProtectedRoute requiresAuth={false}>
          <TestContent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Role-Based Authorization', () => {
    it('should allow access when user has required role', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: mockAdminUser,
        isAuthenticated: true,
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="admin">
          <TestContent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should deny access when user lacks required role', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        user: mockUser, // regular user, not admin
        isAuthenticated: true,
      });

      renderWithProviders(
        <ProtectedRoute requiredRole="admin">
          <TestContent />
        </ProtectedRoute>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/auth/login', expect.any(Object));
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loader when authentication is loading', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });

      renderWithProviders(
        <ProtectedRoute>
          <TestContent />
        </ProtectedRoute>
      );

      expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should call checkAuthStatus on mount', async () => {
      renderWithProviders(
        <ProtectedRoute>
          <TestContent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockCheckAuthStatus).toHaveBeenCalled();
      });
    });
  });
});
