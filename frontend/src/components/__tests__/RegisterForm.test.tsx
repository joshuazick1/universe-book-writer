/**
 * Register Form Component Tests
 * Comprehensive tests for the user registration form
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../../auth/components/RegisterForm';
import { renderWithProviders, mockUser, cleanupMocks } from '../../test/utils';
import * as authHooks from '../../auth/hooks';

// Mock the auth hooks
jest.mock('../../auth/hooks', () => ({
  useAuth: jest.fn(),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

describe('RegisterForm', () => {
  const mockRegister = jest.fn();
  const mockClearError = jest.fn();
  
  const defaultAuthState = {
    register: mockRegister,
    isLoading: false,
    error: null,
    clearError: mockClearError,
    isAuthenticated: false,
    user: null,
  };

  const validRegistrationData = {
    email: 'newuser@example.com',
    firstName: 'New',
    lastName: 'User',
    username: 'newuser',
    password: 'password123',
    confirmPassword: 'password123',
  };

  beforeEach(() => {
    jest.mocked(authHooks.useAuth).mockReturnValue(defaultAuthState);
    mockRegister.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanupMocks();
    mockNavigate.mockClear();
    mockClearError.mockClear();
  });

  describe('Rendering', () => {
    it('should render registration form with all required fields', () => {
      renderWithProviders(<RegisterForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/already have.*account/i)).toBeInTheDocument();
    });

    it('should render password toggle buttons', () => {
      renderWithProviders(<RegisterForm />);
      
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      
      expect(passwordField).toHaveAttribute('type', 'password');
      expect(confirmPasswordField).toHaveAttribute('type', 'password');
      expect(toggleButtons).toHaveLength(2);
    });

    it('should apply custom className', () => {
      const { container } = renderWithProviders(<RegisterForm className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const emailField = screen.getByLabelText(/email/i);
      await user.type(emailField, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const passwordField = screen.getByLabelText(/^password$/i);
      await user.type(passwordField, '123');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for password mismatch', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordField, 'password123');
      await user.type(confirmPasswordField, 'differentpassword');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid username', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const usernameField = screen.getByLabelText(/username/i);
      await user.type(usernameField, 'ab'); // Too short
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for username with invalid characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const usernameField = screen.getByLabelText(/username/i);
      await user.type(usernameField, 'user@name!');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username can only contain letters, numbers, and underscores/i)).toBeInTheDocument();
      });
    });

    it('should not show validation errors for valid input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const emailField = screen.getByLabelText(/email/i);
      const firstNameField = screen.getByLabelText(/first name/i);
      const lastNameField = screen.getByLabelText(/last name/i);
      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailField, validRegistrationData.email);
      await user.type(firstNameField, validRegistrationData.firstName);
      await user.type(lastNameField, validRegistrationData.lastName);
      await user.type(usernameField, validRegistrationData.username);
      await user.type(passwordField, validRegistrationData.password);
      await user.type(confirmPasswordField, validRegistrationData.confirmPassword);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      // Should not show validation errors
      expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const passwordField = screen.getByLabelText(/^password$/i);
      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      const passwordToggle = toggleButtons[0];
      
      expect(passwordField).toHaveAttribute('type', 'password');
      
      await user.click(passwordToggle);
      
      expect(passwordField).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
      
      await user.click(passwordToggle);
      
      expect(passwordField).toHaveAttribute('type', 'password');
    });

    it('should toggle confirm password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      const toggleButtons = screen.getAllByRole('button', { name: /show password/i });
      const confirmPasswordToggle = toggleButtons[1];
      
      expect(confirmPasswordField).toHaveAttribute('type', 'password');
      
      await user.click(confirmPasswordToggle);
      
      expect(confirmPasswordField).toHaveAttribute('type', 'text');
    });

    it('should clear errors when typing in fields', async () => {
      const user = userEvent.setup();
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        error: 'Previous error message',
      });
      
      renderWithProviders(<RegisterForm />);
      
      const emailField = screen.getByLabelText(/email/i);
      await user.type(emailField, 'a');
      
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid credentials', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const emailField = screen.getByLabelText(/email/i);
      const firstNameField = screen.getByLabelText(/first name/i);
      const lastNameField = screen.getByLabelText(/last name/i);
      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailField, validRegistrationData.email);
      await user.type(firstNameField, validRegistrationData.firstName);
      await user.type(lastNameField, validRegistrationData.lastName);
      await user.type(usernameField, validRegistrationData.username);
      await user.type(passwordField, validRegistrationData.password);
      await user.type(confirmPasswordField, validRegistrationData.confirmPassword);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      expect(mockRegister).toHaveBeenCalledWith({
        email: validRegistrationData.email,
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        username: validRegistrationData.username,
        password: validRegistrationData.password,
      });
    });

    it('should navigate to dashboard after successful registration', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      // Fill form
      const emailField = screen.getByLabelText(/email/i);
      const firstNameField = screen.getByLabelText(/first name/i);
      const lastNameField = screen.getByLabelText(/last name/i);
      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailField, validRegistrationData.email);
      await user.type(firstNameField, validRegistrationData.firstName);
      await user.type(lastNameField, validRegistrationData.lastName);
      await user.type(usernameField, validRegistrationData.username);
      await user.type(passwordField, validRegistrationData.password);
      await user.type(confirmPasswordField, validRegistrationData.confirmPassword);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should navigate to custom redirect route', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm redirectTo="/custom-route" />);
      
      // Fill form
      const emailField = screen.getByLabelText(/email/i);
      const firstNameField = screen.getByLabelText(/first name/i);
      const lastNameField = screen.getByLabelText(/last name/i);
      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailField, validRegistrationData.email);
      await user.type(firstNameField, validRegistrationData.firstName);
      await user.type(lastNameField, validRegistrationData.lastName);
      await user.type(usernameField, validRegistrationData.username);
      await user.type(passwordField, validRegistrationData.password);
      await user.type(confirmPasswordField, validRegistrationData.confirmPassword);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/custom-route');
      });
    });

    it('should call onSuccess callback after successful registration', async () => {
      const mockOnSuccess = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm onSuccess={mockOnSuccess} />);
      
      // Fill form
      const emailField = screen.getByLabelText(/email/i);
      const firstNameField = screen.getByLabelText(/first name/i);
      const lastNameField = screen.getByLabelText(/last name/i);
      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailField, validRegistrationData.email);
      await user.type(firstNameField, validRegistrationData.firstName);
      await user.type(lastNameField, validRegistrationData.lastName);
      await user.type(usernameField, validRegistrationData.username);
      await user.type(passwordField, validRegistrationData.password);
      await user.type(confirmPasswordField, validRegistrationData.confirmPassword);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });
      
      renderWithProviders(<RegisterForm />);
      
      const submitButton = screen.getByRole('button', { name: /creating account/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable form fields during loading', () => {
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        isLoading: true,
      });
      
      renderWithProviders(<RegisterForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/first name/i)).toBeDisabled();
      expect(screen.getByLabelText(/last name/i)).toBeDisabled();
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display authentication error', () => {
      const errorMessage = 'User already exists';
      jest.mocked(authHooks.useAuth).mockReturnValue({
        ...defaultAuthState,
        error: errorMessage,
      });
      
      renderWithProviders(<RegisterForm />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle registration failure', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Registration failed';
      mockRegister.mockRejectedValue(new Error(errorMessage));
      
      renderWithProviders(<RegisterForm />);
      
      // Fill form
      const emailField = screen.getByLabelText(/email/i);
      const firstNameField = screen.getByLabelText(/first name/i);
      const lastNameField = screen.getByLabelText(/last name/i);
      const usernameField = screen.getByLabelText(/username/i);
      const passwordField = screen.getByLabelText(/^password$/i);
      const confirmPasswordField = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailField, validRegistrationData.email);
      await user.type(firstNameField, validRegistrationData.firstName);
      await user.type(lastNameField, validRegistrationData.lastName);
      await user.type(usernameField, validRegistrationData.username);
      await user.type(passwordField, validRegistrationData.password);
      await user.type(confirmPasswordField, validRegistrationData.confirmPassword);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      expect(mockRegister).toHaveBeenCalled();
      // The component should handle the error through the useAuth hook
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<RegisterForm />);
      
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RegisterForm />);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorElements = screen.getAllByRole('alert');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });
});
