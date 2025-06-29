/**
 * Collaboration Server Jest Configuration
 * Standalone configuration for running collaboration server tests independently
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  displayName: 'collaboration-server',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      }
    ]
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
    '<rootDir>/src/**/__tests__/**/*.test.ts', 
    '<rootDir>/**/?(*.)+(spec|test).ts'
  ],
  
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
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
    '!<rootDir>/src/__tests__/**/*'
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
