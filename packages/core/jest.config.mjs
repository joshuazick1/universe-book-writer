/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  rootDir: '.',
  setupFilesAfterEnv: ['../../jest.setup.ts'],
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.(m?js|ts|tsx)$': '$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@?mongodb.*|bson)/)'
  ]
};
