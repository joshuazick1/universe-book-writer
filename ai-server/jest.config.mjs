/**
 * AI Server Jest Configuration
 * Standalone configuration for running AI server tests independently
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  displayName: 'ai-server',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
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
  },

  testMatch: ['<rootDir>/tests/**/*.(spec|test).ts'],

  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testPathIgnorePatterns: [
    '<rootDir>/../frontend/',
    '<rootDir>/../backend/',
    '<rootDir>/../collaboration-server/',
    '<rootDir>/../packages/',
    '<rootDir>/../e2e/',
    '<rootDir>/../tests/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/../frontend/',
    '<rootDir>/../backend/',
    '<rootDir>/../collaboration-server/',
    '<rootDir>/../packages/',
    '<rootDir>/../e2e/',
    '<rootDir>/../tests/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
  ],

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test execution configuration
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  testTimeout: 15000,

  // Coverage configuration
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/*.test.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!<rootDir>/../frontend/**',
    '!<rootDir>/../backend/**',
    '!<rootDir>/../collaboration-server/**',
    '!<rootDir>/../packages/**',
    '!<rootDir>/../e2e/**',
    '!<rootDir>/../tests/**',
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
};
