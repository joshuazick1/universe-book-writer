/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  passWithNoTests: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1
};
