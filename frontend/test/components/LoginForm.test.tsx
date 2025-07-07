/**
 * LoginForm Component Tests - Using Successful Auth Store Test Pattern
 * Mocks the authApi directly like the working auth.store.test.ts and RegisterForm.test.tsx
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { userEvent } from '@testing-library/user-event';
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

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

// Create API mock object - matches auth store test pattern
const loginFormMockApi = {
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
  authApi: loginFormMockApi,
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

describe('LoginForm - Using Working Mock Pattern', () => {
  let LoginForm: any;
  const user = userEvent.setup();

  beforeAll(async () => {
    // Import LoginForm after mocks are set up - SAME AS AUTH STORE TEST
    const module = await import('../../src/auth/components/LoginForm.js');
    LoginForm = module.LoginForm;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Set up successful mock response - SAME PATTERN AS AUTH STORE TEST
    (loginFormMockApi.login as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser, message: 'Login successful' },
        message: 'Login successful',
      },
    });
  });

  const renderForm = (props = {}) => {
    return render(
      <BrowserRouter>
        <LoginForm {...props} />
      </BrowserRouter>
    );
  };

  const validLogin = {
    email: 'test@example.com',
    password: 'Test123!@#',
  };
  describe('Form Submission', () => {
    it('should handle successful login', async () => {
      renderForm();

      // Fill out the form using IDs (LoginForm doesn't have testids)
      await user.type(document.getElementById('email')!, validLogin.email);
      await user.type(document.getElementById('password')!, validLogin.password);

      // Submit the form (find button by role)
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for the API to be called
      await waitFor(
        () => {
          expect(loginFormMockApi.login).toHaveBeenCalledTimes(1);
        },
        { timeout: 5000 }
      );

      // Check that the API was called with correct data
      expect(loginFormMockApi.login).toHaveBeenCalledWith(validLogin);

      // Check navigation was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    }, 10000);

    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials';
      (loginFormMockApi.login as any).mockRejectedValueOnce(new Error(errorMessage));

      renderForm();

      // Fill out the form using IDs
      await user.type(document.getElementById('email')!, validLogin.email);
      await user.type(document.getElementById('password')!, validLogin.password);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for the API to be called
      await waitFor(
        () => {
          expect(loginFormMockApi.login).toHaveBeenCalledWith(validLogin);
        },
        { timeout: 5000 }
      );
    }, 10000);
  });

  describe('Rendering', () => {
    it('should render login form with all required fields', () => {
      renderForm();

      expect(document.getElementById('email')).toBeInTheDocument();
      expect(document.getElementById('password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
