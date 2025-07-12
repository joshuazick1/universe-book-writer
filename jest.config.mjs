/**
 * Root Jest Configuration
 * Multi-project Jest configuration for the VerseForge monorepo
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // Global teardown
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
            tsconfig: '<rootDir>/frontend/test/tsconfig.json',
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
    // Backend project
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/backend/tests/**/*.test.[jt]s?(x)',
        '<rootDir>/backend/src/**/__tests__/**/*.[jt]s?(x)',
        '<rootDir>/backend/**/?(*.)+(spec|test).[jt]s?(x)'
      ],
      setupFilesAfterEnv: ['<rootDir>/backend/tests/jest.env.mjs'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^(\\.{1,2}/.*)\\.ts$': '$1',
        '^src/(.*)$': '<rootDir>/backend/src/$1',
        '^tests/(.*)$': '<rootDir>/backend/tests/$1',
        '^backend/(.*)$': '<rootDir>/backend/$1',
        '^\\.\\./(.*)\\.js$': '<rootDir>/backend/tests/$1',
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
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      extensionsToTreatAsEsm: ['.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!(react-is)/)'
      ],
    },
    // AI Server
    {
      displayName: 'ai-server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/ai-server/**/*.test.(ts|js)', '<rootDir>/ai-server/**/__tests__/**/*.(ts|js)'],
      setupFilesAfterEnv: ['<rootDir>/ai-server/tests/setup.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
        '^@/(.*)$': '<rootDir>/ai-server/src/$1',
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
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
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
        '^@/(.*)$': '<rootDir>/collaboration-server/src/$1',
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
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      extensionsToTreatAsEsm: ['.ts'],
    },
    // Shared (new shared utilities and types)
    {
      displayName: 'shared',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/shared/**/*.test.ts',
        '<rootDir>/shared/**/__tests__/**/*.test.ts'
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
      },
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/tsconfig.json',
          },
        ],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      extensionsToTreatAsEsm: ['.ts'],
      transformIgnorePatterns: ['/node_modules/'],
    },
    {
      displayName: 'packages',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/**/*.test.(ts|js)', '<rootDir>/packages/**/__tests__/**/*.(ts|js)'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1',
        '^@/(.*)$': '<rootDir>/packages/src/$1',
      },
      transform: {
        '^.+\\.(ts)$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/tsconfig.json',
          },
        ],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      extensionsToTreatAsEsm: ['.ts'],
      transformIgnorePatterns: ['/node_modules/(?!(@?mongodb.*|bson)/)'],
    }
  ],

  // Global configuration for all projects - these apply to all projects
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  testTimeout: 15000,

  // Global coverage configuration
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
