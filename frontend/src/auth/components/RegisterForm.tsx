/**
 * Registration form component with validation and error handling
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import type { RegisterCredentials } from '../types';

// Validation schema
const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .trim(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be less than 30 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:,.<>?])/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

interface RegisterFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  redirectTo = '/dashboard',
  className = '',
}) => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    clearErrors,
  } = useForm<RegisterCredentials>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const password = watch('password');

  // Watch form values for changes
  const watchedValues = watch();

  // Store previous form values for comparison
  const prevFormValues = React.useRef(watchedValues);

  // Clear error when user starts typing
  React.useEffect(() => {
    if (
      (error && error.field) ||
      (errors.root && JSON.stringify(prevFormValues.current) !== JSON.stringify(watchedValues))
    ) {
      clearError();
      clearErrors('root'); // Clear form level errors
      prevFormValues.current = watchedValues;
    }
  }, [watchedValues, error, clearError, errors.root, clearErrors]);

  const onSubmit = async (data: RegisterCredentials) => {
    try {
      clearError();
      await registerUser(data);

      // Success callback
      if (onSuccess) {
        onSuccess();
      }

      // Navigate to intended destination
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      // Handle field-specific errors
      if (err && typeof err === 'object' && 'field' in err) {
        const fieldError = err as { field: string; message: string };
        setError(fieldError.field as keyof RegisterCredentials, {
          type: 'server',
          message: fieldError.message,
        });
      } else {
        // Handle network errors or general errors
        const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
        setError('root', {
          type: 'network',
          message: errorMessage,
        });
      }
    }
  };
  const calculatePasswordStrength = (
    password: string
  ): { strength: number; label: string; color: string } => {
    if (!password) {
      return { strength: 0, label: 'None', color: 'gray' };
    }

    // Calculate base strength criteria
    let score = 0;
    const criteria = {
      length: password.length >= 8,
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password),
    };

    score = Object.values(criteria).filter(Boolean).length;

    // Check for common patterns that reduce strength
    const patterns = [
      /abc/i, // Sequential letters like "abc"
      /123/, // Sequential numbers like "123"
      /qwerty/i, // Keyboard patterns
      /password/i, // Common words
      /admin/i, // Common words
      /(.)\1{2,}/, // Repeated characters like "aaa"
    ];

    const hasCommonPatterns = patterns.some(pattern => {
      const match = pattern.test(password);
      return match;
    });

    let result;
    if (password.length < 8) {
      // Short passwords are always weak regardless of score
      result = { strength: 1, label: 'Weak', color: 'red' };
    } else if (score < 4) {
      // Missing basic requirements = weak
      result = { strength: 1, label: 'Weak', color: 'red' };
    } else if (hasCommonPatterns || password.length <= 10) {
      // Has common patterns OR is relatively short = medium
      result = { strength: 2, label: 'Medium', color: 'orange' };
    } else {
      // Long password with all criteria and no obvious common patterns = strong
      result = { strength: 3, label: 'Strong', color: 'green' };
    }

    return result;
  };

  const passwordStrength = calculatePasswordStrength(password || '');

  // Helper function for consistent input styling
  const getInputStyles = (hasError: boolean) => ({
    backgroundColor: 'var(--color-universe-surface)',
    borderColor: hasError ? 'rgba(239, 68, 68, 0.5)' : 'var(--color-universe-primary)',
    color: 'var(--color-universe-text)',
    '--placeholder-color': 'rgba(var(--color-universe-text-rgb), 0.5)'
  } as React.CSSProperties);

  const getLabelStyles = () => ({
    color: 'var(--color-universe-text)',
    opacity: 0.8
  });

  const getErrorStyles = () => ({
    color: 'rgba(239, 68, 68, 0.9)'
  });

  // Render form
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold" style={{ color: 'var(--color-universe-text)' }}>Create Account</h2>
          <p className="mt-2" style={{ color: 'var(--color-universe-text)', opacity: 0.7 }}>Join Universe Book Writer today</p>
        </div>

        <form
          className="space-y-6"
          onSubmit={handleSubmit(onSubmit)}
          aria-label="Registration Form"
          role="form"
          data-testid="register-form"
          noValidate
        >
          {/* Error Messages */}
          {(error?.message || errors.root) && (
            <div
              className="mb-6 p-4 rounded-md border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--color-universe-text)'
              }}
              role="alert"
              aria-live="polite"
              data-testid="error-message"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5" style={{ color: 'rgba(239, 68, 68, 0.8)' }} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm" style={{ color: 'rgba(239, 68, 68, 0.9)' }} data-testid="error-message-text">
                    {error?.message || errors.root?.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Field components with error handling */}
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1">
              <input
                {...register('email')}
                type="email"
                id="email"
                data-testid="email-input"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Enter your email"
                style={getInputStyles(!!errors.email)}
              />
              {errors.email && (
                <p
                  className="mt-2 text-sm text-red-600"
                  role="alert"
                  aria-live="assertive"
                  id="email-error"
                >
                  {String(errors.email.message || 'Invalid email')}
                </p>
              )}
            </div>
          </div>

          {/* First Name and Last Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <div className="mt-1">
                <input
                  {...register('firstName')}
                  type="text"
                  id="firstName"
                  autoComplete="given-name"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="First name"
                  style={getInputStyles(!!errors.firstName)}
                />
                {errors.firstName && (
                  <p className="mt-2 text-sm text-red-600">
                    {String(errors.firstName.message || 'Invalid first name')}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <div className="mt-1">
                <input
                  {...register('lastName')}
                  type="text"
                  id="lastName"
                  autoComplete="family-name"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Last name"
                  style={getInputStyles(!!errors.lastName)}
                />
                {errors.lastName && (
                  <p className="mt-2 text-sm text-red-600">
                    {String(errors.lastName.message || 'Invalid last name')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="mt-1">
              <input
                {...register('username')}
                type="text"
                id="username"
                autoComplete="username"
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Choose a username"
                style={getInputStyles(!!errors.username)}
              />
              {errors.username && (
                <p className="mt-2 text-sm text-red-600">
                  {String(errors.username.message || 'Invalid username')}
                </p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                data-testid="password-input"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                autoComplete="new-password"
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Create a password"
                style={getInputStyles(!!errors.password)}
              />
              <button
                type="button"
                data-testid="password-toggle"
                aria-label="Toggle password visibility"
                aria-controls="password"
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            <div
              className="mt-2"
              role="status"
              aria-live="polite"
              aria-label="Password strength"
              data-testid="password-strength-indicator"
            >
              <div className="flex items-center">
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${passwordStrength.color === 'red'
                        ? 'bg-red-500'
                        : passwordStrength.color === 'orange'
                          ? 'bg-yellow-500'
                          : passwordStrength.color === 'green'
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                      }`}
                    style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                  />
                </div>
                <span className="ml-2 text-sm text-gray-600" data-testid="strength-label">
                  {passwordStrength.label}
                </span>
              </div>
            </div>

            {errors.password && (
              <p
                className="mt-2 text-sm text-red-600"
                role="alert"
                aria-live="assertive"
                id="password-error"
              >
                {String(errors.password.message || 'Invalid password')}
              </p>
            )}
          </div>

          {/* Confirm Password field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="mt-1 relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                data-testid="confirm-password-input"
                aria-label="Confirm Password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                autoComplete="new-password"
                placeholder="Confirm your password"
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                style={getInputStyles(!!errors.confirmPassword)}
              />
              <button
                type="button"
                data-testid="confirm-password-toggle"
                aria-label="Toggle confirm password visibility"
                aria-controls="confirmPassword"
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                className="mt-2 text-sm text-red-600"
                role="alert"
                aria-live="assertive"
                id="confirm-password-error"
              >
                {String(errors.confirmPassword.message || 'Passwords do not match')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              data-testid="submit-button"
              aria-busy={isLoading}
              className="w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: isLoading
                  ? 'rgba(var(--color-universe-primary-rgb), 0.4)'
                  : 'var(--color-universe-primary)',
                color: 'var(--color-universe-background)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'rgba(var(--color-universe-primary-rgb), 0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-universe-primary)';
                }
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
