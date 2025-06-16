/**
 * Authentication End-to-End Tests
 * Tests complete authentication flows from browser perspective
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test data
const validUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

const adminUser = {
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  firstName: 'Admin',
  lastName: 'User',
};

test.describe('Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session data
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Login Flow', () => {
    test('should complete full login flow', async ({ page }) => {
      // Navigate to login page
      await page.goto(BASE_URL);

      // Should redirect to login if not authenticated
      await expect(page).toHaveURL(/.*\/login/);

      // Verify login form is visible
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();

      // Fill in login form
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard after successful login
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Verify user is logged in
      await expect(page.getByText(/welcome/i)).toBeVisible();
      await expect(page.getByText(validUser.firstName)).toBeVisible();
    });

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid email or password/i)).toBeVisible();

      // Should stay on login page
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should validate form fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Try to submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show validation errors
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();

      // Fill invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show email format error
      await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
    });

    test('should remember user session', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Login with remember me checked
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByLabel(/remember me/i).check();
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for successful login
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Reload page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.getByText(validUser.firstName)).toBeVisible();
    });
  });

  test.describe('Admin Panel Access', () => {
    test('should access admin panel after admin login', async ({ page }) => {
      // Login as admin
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(adminUser.email);
      await page.getByLabel(/password/i).fill(adminUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Navigate to admin panel
      await page.goto(`${BASE_URL}/admin`);

      // Should be able to access admin panel
      await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible();
      await expect(page.getByText(/user management/i)).toBeVisible();
    });

    test('should deny regular user access to admin panel', async ({ page }) => {
      // Login as regular user
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Try to navigate to admin panel
      await page.goto(`${BASE_URL}/admin`);

      // Should be redirected to unauthorized page
      await expect(page).toHaveURL(/.*\/unauthorized/);
      await expect(page.getByText(/you don't have permission/i)).toBeVisible();
    });

    test('should load real data in admin panel', async ({ page }) => {
      // Login as admin
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(adminUser.email);
      await page.getByLabel(/password/i).fill(adminUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Navigate to admin panel
      await page.goto(`${BASE_URL}/admin/users`);

      // Should load user data
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByText(validUser.email)).toBeVisible();
      await expect(page.getByText(adminUser.email)).toBeVisible();

      // Should have functioning controls
      await expect(page.getByRole('button', { name: /add user/i })).toBeVisible();
      await expect(page.getByRole('searchbox')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should handle session expiration gracefully', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page).toHaveURL(/.*\/dashboard/);

      // Simulate token expiration by clearing auth cookies
      await page.context().clearCookies();

      // Try to navigate to a protected route
      await page.goto(`${BASE_URL}/profile`);

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.getByText(/session expired/i)).toBeVisible();
    });

    test('should refresh tokens automatically', async ({ page }) => {
      // Setup request interception to monitor token refresh
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let _refreshRequests = 0;

      page.route(`${API_URL}/api/auth/refresh`, route => {
        _refreshRequests++;
        route.continue();
      });

      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page).toHaveURL(/.*\/dashboard/);

      // Navigate around the app to trigger token refresh
      await page.goto(`${BASE_URL}/profile`);
      await page.goto(`${BASE_URL}/settings`);
      await page.goto(`${BASE_URL}/dashboard`);

      // Wait a bit for any background token refresh
      await page.waitForTimeout(2000);

      // Should still be authenticated
      await expect(page.getByText(validUser.firstName)).toBeVisible();
    });

    test('should logout and clear session', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page).toHaveURL(/.*\/dashboard/);

      // Find and click logout button
      await page.getByRole('button', { name: /logout/i }).click();

      // Should redirect to login page
      await expect(page).toHaveURL(/.*\/login/);

      // Try to navigate to protected route
      await page.goto(`${BASE_URL}/dashboard`);

      // Should be redirected back to login
      await expect(page).toHaveURL(/.*\/login/);

      // Verify session data is cleared
      const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
      expect(localStorage).not.toContain('auth');

      // Verify cookies are cleared
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(
        cookie => cookie.name.includes('token') || cookie.name.includes('auth')
      );
      expect(authCookies).toHaveLength(0);
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should handle forgot password flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Click forgot password link
      await page.getByText(/forgot password/i).click();

      // Should navigate to forgot password page
      await expect(page).toHaveURL(/.*\/forgot-password/);
      await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();

      // Fill in email
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByRole('button', { name: /send reset link/i }).click();

      // Should show success message
      await expect(page.getByText(/reset link sent/i)).toBeVisible();
    });

    test('should validate forgot password form', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Try to submit empty form
      await page.getByRole('button', { name: /send reset link/i }).click();

      // Should show validation error
      await expect(page.getByText(/email is required/i)).toBeVisible();

      // Fill invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /send reset link/i }).click();

      // Should show email format error
      await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
    });
  });

  test.describe('Registration Flow', () => {
    test('should handle new user registration', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Click sign up link
      await page.getByText(/sign up/i).click();

      // Should navigate to registration page
      await expect(page).toHaveURL(/.*\/register/);
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

      // Fill in registration form
      const newUser = {
        firstName: 'New',
        lastName: 'User',
        email: `newuser+${Date.now()}@example.com`,
        password: 'NewPassword123!',
      };

      await page.getByLabel(/first name/i).fill(newUser.firstName);
      await page.getByLabel(/last name/i).fill(newUser.lastName);
      await page.getByLabel(/email/i).fill(newUser.email);
      await page.getByLabel(/^password$/i).fill(newUser.password);
      await page.getByLabel(/confirm password/i).fill(newUser.password);

      // Submit form
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show success message
      await expect(page.getByText(/account created/i)).toBeVisible();
      await expect(page.getByText(/verification email sent/i)).toBeVisible();
    });

    test('should validate registration form', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      // Try to submit empty form
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show validation errors
      await expect(page.getByText(/first name is required/i)).toBeVisible();
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });
  });

  test.describe('Navigation and Protected Routes', () => {
    test('should protect routes requiring authentication', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = ['/dashboard', '/profile', '/settings', '/admin'];

      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/);
      }
    });

    test('should allow navigation after authentication', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Test navigation to different routes
      const routes = [
        { path: '/dashboard', text: /dashboard/i },
        { path: '/profile', text: /profile/i },
        { path: '/settings', text: /settings/i },
      ];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route.path}`);
        await expect(page).toHaveURL(new RegExp(`.*${route.path}`));
        await expect(page.getByText(route.text)).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle server errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route(`${API_URL}/api/auth/login`, route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            success: false,
            message: 'Internal server error',
          }),
        });
      });

      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message
      await expect(page.getByText(/something went wrong/i)).toBeVisible();
    });

    test('should handle network errors', async ({ page }) => {
      // Mock network error
      await page.route(`${API_URL}/api/auth/login`, route => {
        route.abort('failed');
      });

      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill(validUser.email);
      await page.getByLabel(/password/i).fill(validUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show network error message
      await expect(page.getByText(/network error|connection failed/i)).toBeVisible();
    });
  });
});
