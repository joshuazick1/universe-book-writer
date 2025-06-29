import { test, expect } from '@playwright/test';

/**
 * Universe Book Writer - Comprehensive Application Test
 * 
 * This test suite explores the main functionality of the Universe Book Writer application,
 * covering authentication, admin panel access, and universe management features.
 * 
 * Test Credentials:
 * - Admin User: admin@universe-writer.com / WriteTheStars2025!
 */

test.describe('Universe Book Writer - Application Exploration', () => {
    const baseURL = 'http://localhost:5173';

    // Admin credentials found in the E2E test file
    const adminCredentials = {
        email: 'admin@universe-writer.com',
        password: 'WriteTheStars2025!'
    };

    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto(baseURL);
    });

    test('should successfully login as admin and explore dashboard', async ({ page }) => {
        // Verify we start at the login page
        await expect(page.getByText('Universe Book Writer')).toBeVisible();
        await expect(page.getByText('Sign in to access your writing universe')).toBeVisible();

        // Login with admin credentials
        await page.getByRole('textbox', { name: /email/i }).fill(adminCredentials.email);
        await page.getByRole('textbox', { name: /password/i }).fill(adminCredentials.password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Verify successful login by checking dashboard elements
        await expect(page.getByText('Dashboard')).toBeVisible();
        await expect(page.getByText('Phase A.1 Authentication Complete')).toBeVisible();

        // Verify admin panel access is available
        await expect(page.getByText('🛡️ Admin Panel')).toBeVisible();
        await expect(page.getByText('Manage users, system settings, and security configurations.')).toBeVisible();

        // Verify universe management section is visible
        await expect(page.getByText('📚 Universe Management')).toBeVisible();
        await expect(page.getByText('Create and manage your fictional universes')).toBeVisible();

        // Check system status indicators
        await expect(page.getByText('🔐 Authentication System')).toBeVisible();
        await expect(page.getByText('Fully Operational')).toBeVisible();
        await expect(page.getByText('🚀 Backend API')).toBeVisible();
        await expect(page.getByText('Online')).toBeVisible();
    });

    test('should access and explore admin panel functionality', async ({ page }) => {
        // Login as admin
        await page.getByRole('textbox', { name: /email/i }).fill(adminCredentials.email);
        await page.getByRole('textbox', { name: /password/i }).fill(adminCredentials.password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Access admin panel
        await page.getByText('Open Admin Panel').click();

        // Verify admin panel interface
        await expect(page.getByText('Admin Panel')).toBeVisible();
        await expect(page.getByText('Welcome, admin@universe-writer.com')).toBeVisible();

        // Check admin dashboard metrics
        await expect(page.getByText('👥 User Management')).toBeVisible();
        await expect(page.getByText('Total').and(page.locator('text=4'))).toBeVisible();
        await expect(page.getByText('Active').and(page.locator('text=4'))).toBeVisible();

        // Verify quick actions are available
        await expect(page.getByText('⚙️ System Settings')).toBeVisible();
        await expect(page.getByText('🔍 Security Logs')).toBeVisible();
        await expect(page.getByText('📊 System Health')).toBeVisible();
        await expect(page.getByText('💾 Backup & Export')).toBeVisible();

        // Check system status information
        await expect(page.getByText('Email Verification').and(page.locator('text=Disabled'))).toBeVisible();
        await expect(page.getByText('User Registration').and(page.locator('text=Closed'))).toBeVisible();
        await expect(page.getByText('Database').and(page.locator('text=Connected'))).toBeVisible();
    });

    test('should access user management and view user list', async ({ page }) => {
        // Login as admin
        await page.getByRole('textbox', { name: /email/i }).fill(adminCredentials.email);
        await page.getByRole('textbox', { name: /password/i }).fill(adminCredentials.password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Navigate directly to user management
        await page.goto(`${baseURL}/admin/users`);

        // Verify user management interface
        await expect(page.getByText('User Management')).toBeVisible();
        await expect(page.getByText('Manage users, roles, and permissions')).toBeVisible();

        // Check user management controls
        await expect(page.getByText('Create User')).toBeVisible();
        await expect(page.getByPlaceholder('Search')).toBeVisible();

        // Verify filter options
        await expect(page.getByText('Role').and(page.locator('select'))).toBeVisible();
        await expect(page.getByText('Status').and(page.locator('select'))).toBeVisible();
        await expect(page.getByText('Email Verified').and(page.locator('select'))).toBeVisible();

        // Check that users are displayed in the table
        await expect(page.getByText('Test Collaboration')).toBeVisible();
        await expect(page.getByText('testcollab@example.com')).toBeVisible();
        await expect(page.getByText('Joshua Zick')).toBeVisible();
        await expect(page.getByText('admin@universe-writer.com')).toBeVisible();

        // Verify user roles and statuses
        await expect(page.getByText('admin').first()).toBeVisible();
        await expect(page.getByText('user').first()).toBeVisible();
        await expect(page.getByText('moderator').first()).toBeVisible();
        await expect(page.getByText('active').first()).toBeVisible();
    });

    test('should explore universe management and plugin system', async ({ page }) => {
        // Login as admin
        await page.getByRole('textbox', { name: /email/i }).fill(adminCredentials.email);
        await page.getByRole('textbox', { name: /password/i }).fill(adminCredentials.password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Access universe management
        await page.getByText('Manage Universes').click();

        // Verify universe management interface
        await expect(page.getByText('📚 Universe Management')).toBeVisible();
        await expect(page.getByText('Create and manage your fictional universes')).toBeVisible();

        // Check create universe button
        await expect(page.getByText('➕ Create Universe')).toBeVisible();

        // Verify plugin universe templates are loaded
        await expect(page.getByText('Harry Potter Universe')).toBeVisible();
        await expect(page.getByText('Official Harry Potter Universe plugin with magical systems')).toBeVisible();

        await expect(page.getByText('Lord of the Rings Universe')).toBeVisible();
        await expect(page.getByText('Official Lord of the Rings Universe plugin with Age-based timeline')).toBeVisible();

        await expect(page.getByText('Star Trek Universe')).toBeVisible();
        await expect(page.getByText('Official Star Trek Universe plugin with LCARS theme')).toBeVisible();

        await expect(page.getByText('Star Wars Universe')).toBeVisible();
        await expect(page.getByText('Official Star Wars Universe plugin with faction-based architecture')).toBeVisible();

        // Check Star Trek sub-universe options
        await expect(page.getByText('Prime Timeline')).toBeVisible();
        await expect(page.getByText('Kelvin Timeline')).toBeVisible();
        await expect(page.getByText('Mirror Universe')).toBeVisible();
        await expect(page.getByText('Custom Timeline')).toBeVisible();

        // Check Star Wars sub-universe options
        await expect(page.getByText('Galactic Canon')).toBeVisible();
        await expect(page.getByText('Expanded Universe (Legends)')).toBeVisible();
        await expect(page.getByText('Old Republic Era')).toBeVisible();
        await expect(page.getByText('Custom Galaxy')).toBeVisible();

        // Verify plugin system status
        await expect(page.getByText('🔌 Dynamic Plugin System')).toBeVisible();
        await expect(page.getByText('Loaded 4 plugins from the backend')).toBeVisible();

        // Check existing user universe
        await expect(page.getByText('📚 Your Universes')).toBeVisible();
        await expect(page.getByText('Test Universe')).toBeVisible();
        await expect(page.getByText('A test universe created via API')).toBeVisible();
    });

    test('should verify complete application flow from login to universe management', async ({ page }) => {
        // Complete application exploration flow

        // 1. Start at login page
        await expect(page.getByText('Universe Book Writer').first()).toBeVisible();

        // 2. Login as admin
        await page.getByRole('textbox', { name: /email/i }).fill(adminCredentials.email);
        await page.getByRole('textbox', { name: /password/i }).fill(adminCredentials.password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // 3. Verify dashboard access
        await expect(page.getByText('Dashboard')).toBeVisible();

        // 4. Check admin capabilities
        await expect(page.getByText('🛡️ Admin Panel')).toBeVisible();

        // 5. Access universe management
        await page.getByText('Manage Universes').click();
        await expect(page.getByText('📚 Universe Management')).toBeVisible();

        // 6. Verify plugin system is operational
        await expect(page.getByText('🔌 Dynamic Plugin System')).toBeVisible();
        await expect(page.getByText('Harry Potter Universe')).toBeVisible();
        await expect(page.getByText('Star Trek Universe')).toBeVisible();
        await expect(page.getByText('Star Wars Universe')).toBeVisible();
        await expect(page.getByText('Lord of the Rings Universe')).toBeVisible();

        // 7. Verify user can see existing universes
        await expect(page.getByText('📚 Your Universes')).toBeVisible();

        // Application exploration complete - all key functionality verified
    });
});
