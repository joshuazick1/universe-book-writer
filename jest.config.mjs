/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Default to node environment, but allow per-project override
  testEnvironment: 'node',
  globalTeardown: '<rootDir>/jest.teardown.global.mjs',
  // Project-specific configurations
  projects: [
    // Frontend project with jsdom environment
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/test/**/*.test.(ts|tsx)'],
      setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '^(\\.\\.?/.*)\\.js$': '$1',
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-stub',
      },
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/frontend/tsconfig.json',
            jsx: 'react-jsx',
            isolatedModules: true,
          },
        ],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-hook-form|@hookform|@testing-library)/)'
      ],
    },
    // Backend and other projects with node environment
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/**/*.test.(ts|js)', '<rootDir>/backend/**/__tests__/**/*.(ts|js)'],
      setupFiles: ['<rootDir>/backend/tests/jest.env.mjs'],
      // Don't use global setup for backend, it has its own setup
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
        '^(\\.{1,2}/.*)\\.(m?js|ts)$': '$1',
      },
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/backend/tsconfig.json',
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
    },
    // AI Server
    {
      displayName: 'ai-server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/ai-server/**/*.test.(ts|js)', '<rootDir>/ai-server/**/__tests__/**/*.(ts|js)'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
      },
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/ai-server/tsconfig.json',
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
    },
    // Collaboration Server
    {
      displayName: 'collaboration-server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/collaboration-server/**/*.test.(ts|js)', '<rootDir>/collaboration-server/**/__tests__/**/*.(ts|js)'],
      setupFilesAfterEnv: ['<rootDir>/collaboration-server/jest.setup.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
      },
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/collaboration-server/tsconfig.json',
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
    },
    // Packages
    {
      displayName: 'packages',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/**/*.test.(ts|js)', '<rootDir>/packages/**/__tests__/**/*.(ts|js)'],
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/tsconfig.json',
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
    }
  ],
  // Global configuration for all projects
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'frontend/src/**/*.{ts,tsx}',
    'backend/src/**/*.ts',
    'ai-server/src/**/*.ts',
    'collaboration-server/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '/test/',
    '/*.config.js',
    '/*.setup.ts',
  ],
};
