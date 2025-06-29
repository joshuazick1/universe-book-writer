/**
 * Centralized Mock System for Backend Tests
 * 
 * This file provides a centralized mock system that can be used across all backend tests.
 * It includes mocks for MongoDB, Express, file system operations, and other common dependencies.
 */

import { jest } from '@jest/globals';

// Mock MongoDB
export const mockMongoClient = {
  connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  db: jest.fn<() => any>().mockReturnValue({
    collection: jest.fn<() => any>().mockReturnValue({
      findOne: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      find: jest.fn<() => any>().mockReturnValue({
        toArray: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
      }),
      insertOne: jest.fn<() => Promise<{ insertedId: string }>>().mockResolvedValue({ insertedId: 'mock-id' }),
      updateOne: jest.fn<() => Promise<{ modifiedCount: number }>>().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn<() => Promise<{ deletedCount: number }>>().mockResolvedValue({ deletedCount: 1 }),
      createIndex: jest.fn<() => Promise<string>>().mockResolvedValue('mock-index'),
    }),
    admin: jest.fn<() => any>().mockReturnValue({
      ping: jest.fn<() => Promise<{}>>().mockResolvedValue({}),
    }),
  }),
  close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
};

// Mock Express App
export const mockExpressApp = {
  use: jest.fn<() => void>(),
  get: jest.fn<() => void>(),
  post: jest.fn<() => void>(),
  put: jest.fn<() => void>(),
  delete: jest.fn<() => void>(),
  listen: jest.fn<(port: number, callback?: () => void) => any>((port, callback) => {
    if (callback) callback();
    return {
      close: jest.fn<(cb?: () => void) => void>((cb) => cb && cb()),
      address: jest.fn<() => { port: number }>().mockReturnValue({ port }),
    };
  }),
  set: jest.fn<() => void>(),
  locals: {},
};

// Mock Express Router
export const mockExpressRouter = {
  get: jest.fn<() => void>(),
  post: jest.fn<() => void>(),
  put: jest.fn<() => void>(),
  delete: jest.fn<() => void>(),
  use: jest.fn<() => void>(),
};

// Mock Request/Response objects
export const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ...overrides,
});

export const mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    locals: {},
  };
  return res;
};

export const mockNext = jest.fn();

// Mock File System
export const mockFs = {
  promises: {
    readFile: jest.fn<() => Promise<string>>().mockResolvedValue('mock file content'),
    writeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    mkdir: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    readdir: jest.fn<() => Promise<string[]>>().mockResolvedValue([]),
    stat: jest.fn<() => Promise<{ isDirectory: () => boolean; isFile: () => boolean }>>().mockResolvedValue({
      isDirectory: jest.fn<() => boolean>().mockReturnValue(false),
      isFile: jest.fn<() => boolean>().mockReturnValue(true),
    }),
    access: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
  existsSync: jest.fn<() => boolean>().mockReturnValue(true),
  readFileSync: jest.fn<() => string>().mockReturnValue('mock file content'),
  writeFileSync: jest.fn<() => void>(),
  mkdirSync: jest.fn<() => void>(),
};

// Mock Path
export const mockPath = {
  join: jest.fn<(...args: string[]) => string>((...args) => args.join('/')),
  resolve: jest.fn<(...args: string[]) => string>((...args) => '/' + args.join('/')),
  dirname: jest.fn<(path: string) => string>((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn<(path: string) => string | undefined>((path) => path.split('/').pop()),
  extname: jest.fn<(path: string) => string>((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
};

// Mock Container (DI system)
export const mockContainer = {
  get: jest.fn<(token: any) => any>(),
  set: jest.fn<() => void>(),
  has: jest.fn<() => boolean>().mockReturnValue(true),
  resolve: jest.fn<() => any>(),
  register: jest.fn<() => void>(),
  bind: jest.fn<() => void>(),
  singleton: jest.fn<() => void>(),
  TOKENS: {
    MONGO_CLIENT: 'MONGO_CLIENT',
    EXPRESS_APP: 'EXPRESS_APP',
    CONFIG: 'CONFIG',
    LOGGER: 'LOGGER',
    AUTH_SERVICE: 'AUTH_SERVICE',
    USER_SERVICE: 'USER_SERVICE',
    TOKEN_SERVICE: 'TOKEN_SERVICE',
    AUTH_CONTROLLER: 'AUTH_CONTROLLER',
    USER_CONTROLLER: 'USER_CONTROLLER',
    ADMIN_CONTROLLER: 'ADMIN_CONTROLLER',
    PLUGIN_CONTROLLER: 'PLUGIN_CONTROLLER',
    AUTH_MIDDLEWARE: 'AUTH_MIDDLEWARE',
    VALIDATION_MIDDLEWARE: 'VALIDATION_MIDDLEWARE',
    ERROR_HANDLER: 'ERROR_HANDLER',
  },
};

// Mock Logger
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

// Mock Config
export const mockConfig = {
  mongodb: {
    uri: 'mongodb://localhost:27017/test',
    dbName: 'test-db',
  },
  server: {
    port: 3001, // Use different port for tests
    host: 'localhost',
  },
  jwt: {
    secret: 'test-secret',
    expiresIn: '1h',
  },
  plugins: {
    enabled: true,
    directory: './plugins',
  },
};

// Mock Services
export const mockAuthService = {
  login: jest.fn<() => Promise<{ token: string; user: { id: string; username: string } }>>().mockResolvedValue({ token: 'mock-token', user: { id: '1', username: 'test' } }),
  register: jest.fn<() => Promise<{ id: string; username: string }>>().mockResolvedValue({ id: '1', username: 'test' }),
  validateToken: jest.fn<() => Promise<{ id: string; username: string }>>().mockResolvedValue({ id: '1', username: 'test' }),
  logout: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
};

export const mockUserService = {
  findById: jest.fn<() => Promise<{ id: string; username: string }>>().mockResolvedValue({ id: '1', username: 'test' }),
  findByUsername: jest.fn<() => Promise<{ id: string; username: string }>>().mockResolvedValue({ id: '1', username: 'test' }),
  create: jest.fn<() => Promise<{ id: string; username: string }>>().mockResolvedValue({ id: '1', username: 'test' }),
  update: jest.fn<() => Promise<{ id: string; username: string }>>().mockResolvedValue({ id: '1', username: 'test' }),
  delete: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
};

export const mockTokenService = {
  generate: jest.fn<() => string>().mockReturnValue('mock-token'),
  verify: jest.fn<() => { id: string; username: string }>().mockReturnValue({ id: '1', username: 'test' }),
  decode: jest.fn<() => { id: string; username: string }>().mockReturnValue({ id: '1', username: 'test' }),
};

// Mock Plugin System
export const mockPluginSystem = {
  loadPlugins: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
  getPlugin: jest.fn<() => null>().mockReturnValue(null),
  enablePlugin: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  disablePlugin: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  getAllPlugins: jest.fn<() => any[]>().mockReturnValue([]),
};

// Helper function to setup common mocks
export const setupCommonMocks = () => {
  // Mock container to return appropriate mocks
  mockContainer.get.mockImplementation((token) => {
    switch (token) {
      case mockContainer.TOKENS.MONGO_CLIENT:
        return mockMongoClient;
      case mockContainer.TOKENS.EXPRESS_APP:
        return mockExpressApp;
      case mockContainer.TOKENS.CONFIG:
        return mockConfig;
      case mockContainer.TOKENS.LOGGER:
        return mockLogger;
      case mockContainer.TOKENS.AUTH_SERVICE:
        return mockAuthService;
      case mockContainer.TOKENS.USER_SERVICE:
        return mockUserService;
      case mockContainer.TOKENS.TOKEN_SERVICE:
        return mockTokenService;
      default:
        return {};
    }
  });

  // Reset all mocks
  jest.clearAllMocks();
};

// Helper function to create module mocks
export const createModuleMocks = () => ({
  'mongodb': {
    MongoClient: jest.fn().mockImplementation(() => mockMongoClient),
  },
  'express': {
    default: jest.fn(() => mockExpressApp),
    Router: jest.fn(() => mockExpressRouter),
  },
  'fs': mockFs,
  'path': mockPath,
  '../src/infrastructure/container': {
    container: mockContainer,
  },
  '../src/config/app.config': {
    config: mockConfig,
  },
  '../src/infrastructure/logger': {
    logger: mockLogger,
  },
});

// Export everything as default for easy importing
export default {
  mockMongoClient,
  mockExpressApp,
  mockExpressRouter,
  mockRequest,
  mockResponse,
  mockNext,
  mockFs,
  mockPath,
  mockContainer,
  mockLogger,
  mockConfig,
  mockAuthService,
  mockUserService,
  mockTokenService,
  mockPluginSystem,
  setupCommonMocks,
  createModuleMocks,
};
