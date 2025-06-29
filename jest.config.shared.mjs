/**
 * Shared Jest Configuration
 * Base configuration used across all projects in the monorepo
 */

/**
 * Creates a standardized Jest configuration for different project types
 * @param {Object} options - Configuration options
 * @param {string} options.displayName - Name for the test project
 * @param {string} options.testEnvironment - Jest test environment ('node' | 'jsdom')
 * @param {string} options.rootDir - Root directory for the project
 * @param {string[]} options.testMatch - Test file patterns
 * @param {string[]} options.setupFiles - Setup files to run before tests
 * @param {Object} options.moduleNameMapper - Module name mappings
 * @param {Object} options.transform - Transform configurations
 * @param {string[]} options.collectCoverageFrom - Coverage collection patterns
 * @param {Object} options.additionalConfig - Additional Jest configuration
 * @returns {Object} Jest configuration object
 */
export function createJestConfig({
  displayName,
  testEnvironment = 'node',
  rootDir = '.',
  testMatch = [],
  setupFiles = [],
  moduleNameMapper = {},
  transform = {},
  collectCoverageFrom = [],
  additionalConfig = {}
}) {
  // Base configuration shared across all projects
  const baseConfig = {
    // Display name for multi-project configurations
    ...(displayName && { displayName }),
    
    // Test environment
    testEnvironment,
    
    // ESM support
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    
    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    
    // Base transform configuration - use relative path for tsconfig when rootDir is relative
    transform: {
      '^.+\\.(ts|tsx)$': [
        'ts-jest',
        {
          useESM: true,
          tsconfig: rootDir.startsWith('<rootDir>') ? 
            `${rootDir}/tsconfig.json` : 
            `${rootDir}/tsconfig.json`,
          ...(testEnvironment === 'jsdom' && { jsx: 'react-jsx' })
        }
      ],
      ...transform
    },
      // Base module name mapping
    moduleNameMapper: {
      // Handle Vite-generated files and imports
      '^.*\\.(css|less|sass|scss)$': 'identity-obj-proxy',
      '^.*\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-stub',
      // Handle JS imports without extensions
      '^(\\.{1,2}/.*)\\.js$': '$1',
      // Handle TypeScript imports (more specific pattern)
      '^(\\.{1,2}/.*)\\.(ts|tsx)$': '$1',
      '^(\\.{1,2}/.*)\\.(mjs)$': '$1',
      // Handle node_modules ES imports
      '^(\\.{1,2}/.*)\\.mjs$': '$1',
      // Path alias for source files
      '^@/(.*)$': `${rootDir}/src/$1`,
      // Handle Vite's virtual modules and generated files
      '\\?.*$': 'jest-transform-stub',
      '^virtual:.*$': 'jest-transform-stub',
      ...moduleNameMapper
    },
    
    // Test file patterns
    testMatch: testMatch.length > 0 ? testMatch : [
      `${rootDir}/**/__tests__/**/*.{ts,tsx,js,jsx}`,
      `${rootDir}/**/?(*.)+(spec|test).{ts,tsx,js,jsx}`
    ],
    
    // Setup files
    ...(setupFiles.length > 0 && { setupFilesAfterEnv: setupFiles }),
    
    // Root directory
    rootDir,
    
    // Coverage collection (project-specific)
    ...(collectCoverageFrom.length > 0 && {
      collectCoverageFrom: [
        `${rootDir}/src/**/*.{ts,tsx}`,
        `!${rootDir}/src/**/*.d.ts`,
        `!${rootDir}/src/**/*.test.{ts,tsx}`,
        `!${rootDir}/src/**/*.spec.{ts,tsx}`,
        `!**/node_modules/**`,
        `!**/dist/**`,
        ...collectCoverageFrom
      ]
    }),
    
    // Additional configuration
    ...additionalConfig
  };
  
  return baseConfig;
}

/**
 * Frontend-specific Jest configuration
 */
export function createFrontendConfig(rootDir = '<rootDir>/frontend') {
  return createJestConfig({
    displayName: 'frontend',
    testEnvironment: 'jsdom',
    rootDir,
    testMatch: [
      `${rootDir}/test/**/*.test.{ts,tsx}`,
      `${rootDir}/src/**/__tests__/**/*.{ts,tsx}`,
      `${rootDir}/**/?(*.)+(spec|test).{ts,tsx}`
    ],    setupFiles: [`${rootDir}/jest.setup.ts`],
    moduleNameMapper: {
      // Frontend-specific mappings for Vite compatibility
      '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
      '\\.(jpg|jpeg|png|gif|svg|ico|webp|avif)$': 'jest-transform-stub',
      // Handle Vite HMR and virtual imports
      '\\?.*$': 'jest-transform-stub',
      '^virtual:.*$': 'jest-transform-stub',
      // Handle React imports
      '^react$': 'react',
      '^react-dom$': 'react-dom',
      '^react-router-dom$': 'react-router-dom',
    },
    transform: {
      '^.+\\.(ts|tsx)$': [
        'ts-jest',
        {
          useESM: true,
          tsconfig: `${rootDir}/tsconfig.json`,
          jsx: 'react-jsx',
          isolatedModules: true,
        },
      ],
      // Handle JS/MJS files for Vite compatibility
      '^.+\\.(js|mjs)$': [
        'ts-jest',
        {
          useESM: true,
        },
      ],
    },    additionalConfig: {
      transformIgnorePatterns: [
        'node_modules/(?!(react-hook-form|@hookform|@testing-library|@vitejs|vite)/)'
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
      resolver: undefined, // Use default Jest resolver
      modulePaths: [`${rootDir}/src`],
    }
  });
}

/**
 * Backend-specific Jest configuration
 */
export function createBackendConfig(rootDir = '<rootDir>/backend') {
  return createJestConfig({
    displayName: 'backend',
    testEnvironment: 'node',
    rootDir,
    testMatch: [
      `${rootDir}/tests/**/*.test.{ts,js}`,
      `${rootDir}/src/**/__tests__/**/*.{ts,js}`,
      `${rootDir}/**/?(*.)+(spec|test).{ts,js}`
    ],
    setupFiles: [`${rootDir}/tests/jest.env.mjs`],
    moduleNameMapper: {
      // Backend-specific path mappings
      '^src/(.*)$': `${rootDir}/src/$1`,
      '^tests/(.*)$': `${rootDir}/tests/$1`,
      '^backend/(.*)$': `${rootDir}/$1`,
    },
    additionalConfig: {
      // ESM configuration
      roots: [`${rootDir}`],
      modulePaths: [`${rootDir}`],
      transformIgnorePatterns: [
        'node_modules/(?!(react-is)/)'
      ],
      // Additional ESM config
      resolver: undefined, // Let Node.js handle module resolution
    }
  });
}

/**
 * AI Server-specific Jest configuration
 */
export function createAIServerConfig(rootDir = '<rootDir>/ai-server') {
  return createJestConfig({
    displayName: 'ai-server',
    testEnvironment: 'node',
    rootDir,
    testMatch: [
      `${rootDir}/tests/**/*.+(ts|js)`, 
      `${rootDir}/**/?(*.)+(spec|test).+(ts|js)`
    ],
    setupFiles: [`${rootDir}/tests/setup.ts`],
    collectCoverageFrom: [
      `!${rootDir}/src/**/*.test.ts`,
      `!${rootDir}/src/**/*.spec.ts`,
    ]
  });
}

/**
 * Collaboration Server-specific Jest configuration
 */
export function createCollaborationServerConfig(rootDir = '<rootDir>/collaboration-server') {
  return createJestConfig({
    displayName: 'collaboration-server',
    testEnvironment: 'node',
    rootDir,
    testMatch: [
      `${rootDir}/src/**/__tests__/**/*.test.ts`, 
      `${rootDir}/**/?(*.)+(spec|test).ts`
    ],
    setupFiles: [`${rootDir}/jest.setup.ts`],
    collectCoverageFrom: [
      `!${rootDir}/src/__tests__/**/*`
    ]
  });
}

/**
 * Packages-specific Jest configuration
 */
export function createPackagesConfig(rootDir = '<rootDir>/packages') {
  return createJestConfig({
    displayName: 'packages',
    testEnvironment: 'node',
    rootDir,
    testMatch: [
      `${rootDir}/**/*.test.{ts,js}`,
      `${rootDir}/**/__tests__/**/*.{ts,js}`
    ],
    setupFiles: ['<rootDir>/jest.setup.ts'],
    additionalConfig: {
      transformIgnorePatterns: ['/node_modules/(?!(@?mongodb.*|bson)/)'],
    }
  });
}
