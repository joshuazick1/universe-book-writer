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
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle imports of .ts files without extension
    '^(\\.\\.?/.*)\\.js$': '$1',
    // Handle CSS and image imports
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-stub',
  },
  
  // Transform configuration for TypeScript and JSX using ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        useESM: true,
        jsx: 'react-jsx',
      }
    ],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test file patterns - look in centralized test directory
  testMatch: [
    '<rootDir>/test/**/*.test.(ts|tsx)'
  ],
  
  // Verbose output
  verbose: true,
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  
  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
