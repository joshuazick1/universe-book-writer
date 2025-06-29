/**
 * Packages Core Jest Configuration
 * Standalone configuration for running packages core tests independently
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  displayName: 'packages-core',
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
  
  testMatch: [
    '<rootDir>/**/*.test.{ts,js}',
    '<rootDir>/**/__tests__/**/*.{ts,js}'
  ],
  
  setupFilesAfterEnv: ['../../jest.setup.ts'],
  
  // Test execution configuration
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  testTimeout: 15000,
  
  transformIgnorePatterns: ['/node_modules/(?!(@?mongodb.*|bson)/)'],
  
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
};
