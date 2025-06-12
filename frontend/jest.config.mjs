/**
 * Frontend Jest Configuration
 * Extends the root Jest configuration with frontend-specific settings
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  // Extend root configuration
  preset: 'ts-jest',
  
  // Test environment for DOM testing
  testEnvironment: 'jsdom',
    // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Transform configuration for TypeScript and JSX
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': 'jest-transform-stub',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    // Test file patterns - look in centralized test directory
  testMatch: [
    '<rootDir>/test/**/*.test.(ts|tsx)',
    '<rootDir>/test/**/*.spec.(ts|tsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Max workers for better performance
  maxWorkers: 1,
};
