/**
 * ProtectedRoute Component Tests
 * Tests role-based access control and authentication routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { authStore } from '../../stores/auth.store';
import { User } from '../../types/auth.types';

// Mock the auth store
vi.mock('../../stores/auth.store', () => ({
  authStore: {
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

const mockAuthStore = vi.mocked(authStore);

// Test component to render inside protected routes
const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

// Test wrapper with router
const TestWrapper = ({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [] 
}: { 
  children?: React.ReactNode; 
  requiredRoles?: string[];
  requiredPermissions?: string[];
}) => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute 
            requiredRoles={requiredRoles}
            requiredPermissions={requiredPermissions}
          >
            <TestComponent />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
      <Route path="/unauthorized" element={<div data-testid="unauthorized-page">Unauthorized</div>} />
    </Routes>
  </BrowserRouter>
);

describe('ProtectedRoute', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin123',
    email: 'admin@example.com',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock subscribe to return an unsubscribe function
    mockAuthStore.subscribe.mockReturnValue(() => {});
  });

  describe('authentication checks', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        error: null,
      });

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow authenticated users to access protected content', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should show loading state while checking authentication', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        isLoading: true,
        error: null,
      });

      render(<TestWrapper />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  describe('role-based access control', () => {
    it('should allow users with required roles', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper requiredRoles={['admin']} />);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should deny users without required roles', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: mockUser, // regular user
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper requiredRoles={['admin']} />);

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow users with any of the required roles', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: mockUser, // user role
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper requiredRoles={['admin', 'user']} />);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('permission-based access control', () => {
    it('should allow users with required permissions', async () => {
      const userWithPermissions = {
        ...mockUser,
        permissions: ['read_posts', 'write_posts'],
      };

      mockAuthStore.getState.mockReturnValue({
        user: userWithPermissions,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper requiredPermissions={['read_posts']} />);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should deny users without required permissions', async () => {
      const userWithoutPermissions = {
        ...mockUser,
        permissions: ['read_posts'],
      };

      mockAuthStore.getState.mockReturnValue({
        user: userWithoutPermissions,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper requiredPermissions={['admin_access']} />);

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should require all specified permissions', async () => {
      const userWithSomePermissions = {
        ...mockUser,
        permissions: ['read_posts'],
      };

      mockAuthStore.getState.mockReturnValue({
        user: userWithSomePermissions,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(<TestWrapper requiredPermissions={['read_posts', 'write_posts']} />);

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
      });
    });
  });

  describe('combined role and permission checks', () => {
    it('should require both role and permissions to be satisfied', async () => {
      const adminWithPermissions = {
        ...mockAdminUser,
        permissions: ['manage_users'],
      };

      mockAuthStore.getState.mockReturnValue({
        user: adminWithPermissions,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(
        <TestWrapper 
          requiredRoles={['admin']} 
          requiredPermissions={['manage_users']} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should deny if role matches but permissions do not', async () => {
      const adminWithoutPermissions = {
        ...mockAdminUser,
        permissions: ['read_posts'],
      };

      mockAuthStore.getState.mockReturnValue({
        user: adminWithoutPermissions,
        isAuthenticated: true,
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      });

      render(
        <TestWrapper 
          requiredRoles={['admin']} 
          requiredPermissions={['manage_users']} 
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
      });
    });
  });

  describe('token expiration handling', () => {
    it('should redirect to login when token is expired', async () => {
      // Mock an expired token scenario
      mockAuthStore.getState.mockReturnValue({
        user: mockUser,
        isAuthenticated: false, // Token expired, auth state cleared
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        error: 'Token expired',
      });

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });
});
