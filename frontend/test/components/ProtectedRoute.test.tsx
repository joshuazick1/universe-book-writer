/**
 * ProtectedRoute Component Tests - Using Successful Auth Store Test Pattern
 * Mocks the authApi directly like the working auth.store.test.ts
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Mock user data - matches auth store test
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'user' as const,
  emailVerified: true,
  preferences: {},
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockAdminUser = {
  ...mockUser,
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin' as const,
};

// Mock navigation - capture redirects
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

// Create API mock object - matches auth store test pattern
const authApiMock = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  checkAuthStatus: jest.fn(),
};

// Mock the auth utils module - SAME AS AUTH STORE TEST
jest.unstable_mockModule('../../src/auth/utils/index.ts', () => ({
  authApi: authApiMock,
  authEvents: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  AuthEvents: class {
    static getInstance() {
      return {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };
    }
  },
}));

describe('ProtectedRoute - Using Working Mock Pattern', () => {
  let ProtectedRoute: any;
  let useAuthStore: any;

  beforeAll(async () => {
    // Import ProtectedRoute after mocks are set up - SAME AS AUTH STORE TEST
    const protectedRouteModule = await import('../../src/auth/components/ProtectedRoute.js');
    ProtectedRoute = protectedRouteModule.ProtectedRoute;

    // Also import the auth store to control its state
    const authStoreModule = await import('../../src/auth/stores/auth.store.js');
    useAuthStore = authStoreModule.useAuthStore;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Reset auth store to initial state
    const store = useAuthStore.getState();
    store.clearAuth();
  });

  const renderProtectedRoute = (
    props = {},
    children = <div data-testid="protected-content">Protected Content</div>
  ) => {
    return render(
      <BrowserRouter>
        <ProtectedRoute {...props}>{children}</ProtectedRoute>
      </BrowserRouter>
    );
  };
  describe('Authentication Required', () => {
    it('should render children when user is authenticated', async () => {
      // Set up authenticated user state in the store
      const store = useAuthStore.getState();
      store.user = mockUser;
      store.isAuthenticated = true;
      store.isLoading = false;

      // Mock the API call that ProtectedRoute makes
      (authApiMock.checkAuthStatus as any).mockResolvedValue({
        data: {
          success: true,
          data: { user: mockUser },
        },
      });

      renderProtectedRoute();

      // Wait for authentication check and content to appear
      await waitFor(
        () => {
          expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should redirect to login when user is not authenticated', async () => {
      // Set up unauthenticated state
      (authApiMock.checkAuthStatus as any).mockRejectedValue(new Error('Not authenticated'));

      renderProtectedRoute();

      // Wait for redirect
      await waitFor(
        () => {
          expect(screen.getByTestId('navigate')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should show loading state while checking authentication', () => {
      // Don't resolve the promise immediately
      (authApiMock.checkAuthStatus as any).mockReturnValue(new Promise(() => {}));

      renderProtectedRoute();

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    });
  });
  describe('Role-Based Authorization', () => {
    it('should render children when user has required role', async () => {
      // Set up authenticated admin user state in the store
      const store = useAuthStore.getState();
      store.user = mockAdminUser;
      store.isAuthenticated = true;
      store.isLoading = false;

      (authApiMock.checkAuthStatus as any).mockResolvedValue({
        data: {
          success: true,
          data: { user: mockAdminUser },
        },
      });

      renderProtectedRoute({ requiredRole: 'admin' });

      await waitFor(
        () => {
          expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should redirect when user does not have required role', async () => {
      (authApiMock.checkAuthStatus as any).mockResolvedValue({
        data: {
          success: true,
          data: { user: mockUser }, // regular user, not admin
        },
      });

      renderProtectedRoute({ requiredRole: 'admin' });

      await waitFor(
        () => {
          expect(screen.getByTestId('navigate')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Configuration Options', () => {
    it('should use custom fallback URL', async () => {
      (authApiMock.checkAuthStatus as any).mockRejectedValue(new Error('Not authenticated'));

      renderProtectedRoute({ fallbackUrl: '/custom-login' });

      await waitFor(
        () => {
          expect(screen.getByTestId('navigate')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should not require auth when requiresAuth is false', () => {
      renderProtectedRoute({ requiresAuth: false });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not show loader when showLoader is false', () => {
      (authApiMock.checkAuthStatus as any).mockReturnValue(new Promise(() => {}));

      renderProtectedRoute({ showLoader: false });

      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
  });
});
