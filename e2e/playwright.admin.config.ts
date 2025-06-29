import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Admin Component Tests
 * Optimized for testing frontend admin components
 */

export default defineConfig({
    testDir: './',

    // Test file patterns for admin components
    testMatch: [
        '**/admin-components*.spec.ts',
        '**/admin-*.spec.ts'
    ],
    // Test execution settings - reduced parallelization to avoid rate limiting
    fullyParallel: false, // Disable parallel execution to avoid rate limiting
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1, // Retry failed tests once
    workers: 1, // Use only 1 worker to avoid concurrent auth attempts

    // Timeout settings
    timeout: 60000, // 60 seconds per test
    expect: {
        timeout: 15000, // 15 seconds for assertions
    },    // Reporter configuration - optimized for CI/development
    reporter: process.env.CI
        ? [
            ['github'], // GitHub Actions integration
            ['json', { outputFile: 'test-results/admin-components/results.json' }],
            ['junit', { outputFile: 'test-results/admin-components/junit.xml' }]
        ]
        : [
            ['line'], // Clean line output for development
            ['json', { outputFile: 'test-results/admin-components/results.json' }]
        ],

    // Global test configuration
    use: {
        // Base URL for the application
        baseURL: process.env.BASE_URL || 'http://localhost:5173',

        // Browser settings
        headless: process.env.CI ? true : false,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,

        // Video and screenshot settings
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',

        // Tracing for debugging
        trace: 'retain-on-failure',

        // Action timeout
        actionTimeout: 10000,
        navigationTimeout: 30000,

        // Context options
        contextOptions: {
            permissions: ['clipboard-read', 'clipboard-write']
        }
    },
    // Test environment setup - disabled for now
    // globalSetup: './setup/global-setup.ts',
    // globalTeardown: './setup/global-teardown.ts',    // Browser projects
    projects: [
        // Desktop Chrome
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Admin-specific context
                contextOptions: {
                    permissions: ['clipboard-read', 'clipboard-write'],
                    colorScheme: 'light'
                }
            }
        },

        // Desktop Firefox
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                contextOptions: {
                    // Firefox doesn't support clipboard permissions, so we exclude them
                    colorScheme: 'light'
                }
            }
        },

        // Desktop Safari
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                contextOptions: {
                    colorScheme: 'light'
                }
            }
        },        // Mobile Chrome
        {
            name: 'Mobile Chrome',
            use: {
                ...devices['Pixel 5'],
                contextOptions: {
                    permissions: ['clipboard-read', 'clipboard-write'],
                    colorScheme: 'light'
                }
            }
        },

        // Mobile Safari
        {
            name: 'Mobile Safari',
            use: {
                ...devices['iPhone 12'],
                contextOptions: {
                    colorScheme: 'light'
                }
            }
        },

        // Tablet
        {
            name: 'Tablet',
            use: {
                ...devices['iPad Pro'],
                contextOptions: {
                    permissions: ['clipboard-read', 'clipboard-write'],
                    colorScheme: 'light'
                }
            }
        }
    ],    // Development server
    webServer: {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    },
    // Output directories
    outputDir: 'test-results/admin-components/artifacts'
});
