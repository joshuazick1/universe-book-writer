/**
 * Frontend Jest Configuration
 * Standalone configuration for running frontend tests independently
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  displayName: 'frontend',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],

  // Module resolution
  resolver: undefined, // Use default Jest resolver
  modulePaths: ['<rootDir>/src'],

  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
        jsx: 'react-jsx',
        isolatedModules: true,
      },
    ],
    // Handle JS/MJS files
    '^.+\\.(js|mjs)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

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
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    // Handle Vite's virtual modules and generated files
    '\\?.*$': 'jest-transform-stub',
    '^virtual:.*$': 'jest-transform-stub',
  },

  testMatch: [
    '<rootDir>/test/**/*.test.(ts|tsx)',
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/**/?(*.)+(spec|test).{ts,tsx}'
  ],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Test execution configuration
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  testTimeout: 15000,

  transformIgnorePatterns: [
    'node_modules/(?!(react-hook-form|@hookform|@testing-library)/)'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/*.test.{ts,tsx}',
    '!<rootDir>/src/**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
