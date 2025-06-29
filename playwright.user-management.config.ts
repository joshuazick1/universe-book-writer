import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for User Management E2E tests
 * Optimized for testing the admin user management functionality
 */

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false, // Run tests sequentially to avoid conflicts
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1, // Single worker to prevent test interference
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/user-management-results.json' }],
        ['list']
    ],
    use: {
        baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10000,
        navigationTimeout: 15000,
    },
    projects: [
        {
            name: 'user-management-core',
            testMatch: 'user-management-core.spec.ts',
            use: {
                headless: true,
                viewport: { width: 1280, height: 720 },
            },
        },
        {
            name: 'user-management-comprehensive',
            testMatch: 'user-management-comprehensive.spec.ts',
            use: {
                headless: false, // Run with browser visible for comprehensive tests
                viewport: { width: 1280, height: 720 },
            },
        },
        {
            name: 'user-management-mobile',
            testMatch: 'user-management-*.spec.ts',
            use: {
                headless: true,
                ...require('@playwright/test').devices['iPhone 12'],
            },
        },
    ],
    webServer: [
        {
            command: 'npm run dev',
            port: 5173,
            cwd: './frontend',
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
        },
        {
            command: 'npm run dev',
            port: 5000,
            cwd: './backend',
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
        },
    ], globalSetup: './e2e/setup/user-management-setup.ts',
});
