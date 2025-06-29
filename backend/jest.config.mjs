/**
 * Backend Jest Configuration
 * Standalone configuration for running backend tests independently
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  displayName: 'backend',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  
  moduleNameMapper: {
    // Handle JS imports without extensions
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Handle TypeScript imports
    '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^tests/(.*)$': '<rootDir>/tests/$1',
    '^backend/(.*)$': '<rootDir>/$1',
  },
  
  testMatch: [
    '<rootDir>/tests/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  setupFilesAfterEnv: ['<rootDir>/tests/jest.env.mjs', '<rootDir>/tests/jest.setup.backend.ts'],
  
  // Test execution configuration
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  testTimeout: 15000,
  
  // ESM configuration
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-is)/)'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/*.test.{ts,tsx}',
    '!<rootDir>/src/**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Additional ESM config
  resolver: undefined, // Let Node.js handle module resolution
};
