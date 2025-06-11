/**
 * Login Form Component Tests
 * Tests form validation, submission, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../components/auth/LoginForm';
import { authStore } from '../../stores/auth.store';

// Mock the auth store
vi.mock('../../stores/auth.store', () => ({
  authStore: {
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock the auth API
vi.mock('../../auth/utils', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

import { authApi } from '../../auth/utils';

const mockAuthStore = vi.mocked(authStore);
const mockAuthApi = vi.mocked(authApi);

// Test wrapper with router
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth store state
    mockAuthStore.getState.mockReturnValue({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshTokens: vi.fn(),
      setError: vi.fn(),
      setLoading: vi.fn(),
      handleTokenExpiration: vi.fn(),
      isTokenExpired: vi.fn().mockReturnValue(false),
    });

    // Mock subscribe to return an unsubscribe function
    mockAuthStore.subscribe.mockReturnValue(() => {});
  });

  describe('form rendering', () => {
    it('should render login form with all required fields', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it('should show loading state during authentication', () => {
      mockAuthStore.getState.mockReturnValue({
        ...mockAuthStore.getState(),
        isLoading: true,
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });

    it('should display authentication errors', () => {
      const errorMessage = 'Invalid email or password';
      
      mockAuthStore.getState.mockReturnValue({
        ...mockAuthStore.getState(),
        error: errorMessage,
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should validate required fields', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate password length', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user types', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation error
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('should submit valid form data', async () => {
      const mockLoginResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'user',
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-123',
          },
        },
      };

      mockAuthApi.login.mockResolvedValue(mockLoginResponse);

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
      });
    });

    it('should handle remember me option', async () => {
      const mockLoginResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'user',
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-123',
          },
        },
      };

      mockAuthApi.login.mockResolvedValue(mockLoginResponse);

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        });
      });
    });

    it('should handle login errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthApi.login.mockRejectedValue(new Error(errorMessage));

      const mockSetError = vi.fn();
      mockAuthStore.getState.mockReturnValue({
        ...mockAuthStore.getState(),
        setError: mockSetError,
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith(errorMessage);
      });
    });

    it('should handle network errors', async () => {
      mockAuthApi.login.mockRejectedValue(new Error('Network error'));

      const mockSetError = vi.fn();
      mockAuthStore.getState.mockReturnValue({
        ...mockAuthStore.getState(),
        setError: mockSetError,
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and attributes', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveAttribute('type', 'submit');
    });

    it('should associate error messages with form fields', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const emailError = screen.getByText(/email is required/i);
        
        expect(emailInput).toHaveAttribute('aria-describedby');
        expect(emailError).toHaveAttribute('id');
      });
    });

    it('should focus on first invalid field after validation', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveFocus();
      });
    });
  });
});
