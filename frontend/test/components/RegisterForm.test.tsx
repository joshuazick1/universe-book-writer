/**
 * RegisterForm Component Tests - Using Successful Auth Store Test Pattern
 * Mocks the authApi directly like the working auth.store.test.ts
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

describe('RegisterForm - Using Working Mock Pattern', () => {
  let RegisterForm: any;
  const user = userEvent.setup();

  beforeAll(async () => {
    // Import RegisterForm after mocks are set up - SAME AS AUTH STORE TEST
    const module = await import('../../src/auth/components/RegisterForm.js');
    RegisterForm = module.RegisterForm;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Set up successful mock response - SAME PATTERN AS AUTH STORE TEST
    (authApiMock.register as any).mockResolvedValue({
      data: {
        success: true,
        data: { user: mockUser, message: 'Registration successful' },
        message: 'Registration successful',
      },
    });
  });

  const renderForm = (props = {}) => {
    return render(
      <BrowserRouter>
        <RegisterForm {...props} />
      </BrowserRouter>
    );
  };

  const validRegistration = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    password: 'Test123!@#',
    confirmPassword: 'Test123!@#',
  };
  describe('Form Submission', () => {
    it('should handle successful registration', async () => {
      renderForm();

      // Fill out the form
      await user.type(screen.getByTestId('email-input'), validRegistration.email);
      await user.type(document.getElementById('firstName')!, validRegistration.firstName);
      await user.type(document.getElementById('lastName')!, validRegistration.lastName);
      await user.type(document.getElementById('username')!, validRegistration.username);
      await user.type(screen.getByTestId('password-input'), validRegistration.password);
      await user.type(
        screen.getByTestId('confirm-password-input'),
        validRegistration.confirmPassword
      );

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      // Wait for the API to be called
      await waitFor(
        () => {
          expect(authApiMock.register).toHaveBeenCalledTimes(1);
        },
        { timeout: 5000 }
      );

      // Check that the API was called with correct data
      expect(authApiMock.register).toHaveBeenCalledWith(validRegistration);

      // Check navigation was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    }, 10000);

    it('should handle registration errors', async () => {
      const errorMessage = 'Email already exists';
      (authApiMock.register as any).mockRejectedValueOnce(new Error(errorMessage));

      renderForm();

      // Fill out the form
      await user.type(screen.getByTestId('email-input'), validRegistration.email);
      await user.type(document.getElementById('firstName')!, validRegistration.firstName);
      await user.type(document.getElementById('lastName')!, validRegistration.lastName);
      await user.type(document.getElementById('username')!, validRegistration.username);
      await user.type(screen.getByTestId('password-input'), validRegistration.password);
      await user.type(
        screen.getByTestId('confirm-password-input'),
        validRegistration.confirmPassword
      );

      // Submit the form
      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      // Wait for the API to be called
      await waitFor(
        () => {
          expect(authApiMock.register).toHaveBeenCalledWith(validRegistration);
        },
        { timeout: 5000 }
      );
    }, 10000);
  });

  describe('Rendering', () => {
    it('should render registration form with all required fields', () => {
      renderForm();

      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(document.getElementById('firstName')).toBeInTheDocument();
      expect(document.getElementById('lastName')).toBeInTheDocument();
      expect(document.getElementById('username')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });
  });
});
