/**
 * Isolated Jest Configuration for Auth Store Tests
 * 
 * This configuration ensures complete isolation of auth store tests
 * from other test files to prevent mock conflicts.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const config = {
  // Use the same base configuration but with isolation
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Only run auth store tests
  testMatch: [
    '<rootDir>/test/stores/auth.store.test.ts'
  ],
  
  // Force isolated modules
  isolatedModules: true,
  clearMocks: true,
  resetMocks: true,
  resetModules: true,
  restoreMocks: true,
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../jest.setup.ts',
    '<rootDir>/test/setup/auth-store-isolated.setup.ts'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        moduleResolution: 'node',
        allowImportingTsExtensions: false,
        module: 'es2022',
        target: 'es2022',
      }
    }]
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/auth/stores/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Force exit to prevent hanging
  forceExit: true,
  detectOpenHandles: true,
  
  // Run tests serially to prevent conflicts
  maxWorkers: 1,

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>'],
  
  // Global setup
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

export default config;
