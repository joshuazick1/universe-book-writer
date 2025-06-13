// Jest setup file for collaboration server tests

// Mock console methods to reduce test output noise
// Jest setup file - console methods are intentionally mocked here
/* eslint-disable no-console */
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Set shorter timeout for tests - check if jest is available
if (typeof jest !== 'undefined') {
  jest.setTimeout(15000);
}

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
});

// Global test cleanup
afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Configure fake timers per test - check if jest is available
beforeEach(() => {
  if (typeof jest !== 'undefined') {
    jest.useFakeTimers({
      advanceTimers: true,
      doNotFake: ['nextTick', 'setImmediate'],
    });
  }
});

afterEach(() => {
  if (typeof jest !== 'undefined') {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global test utilities
const testUtils = {
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create test configuration
  createTestConfig: () => ({
    port: 0,
    environment: 'test' as const,
    websocket: {
      enabled: true,
      socketIO: {
        cors: { origin: ['http://localhost:3000'], credentials: true },
        transports: ['websocket'],
        pingTimeout: 60000,
        pingInterval: 25000,
      },
      maxConnections: 100,
      rateLimiting: {
        enabled: false, // Disable for tests
        maxMessagesPerSecond: 100,
        burstSize: 200,
      },
    },
    connection: {
      maxConnectionsPerUser: 5,
      connectionTimeout: 30000,
      heartbeatInterval: 30000,
      maxIdleTime: 300000,
      enablePooling: true,
      poolSize: 100,
    },
    events: {
      maxQueueSize: 1000,
      processingTimeout: 5000,
      enablePersistence: false,
      retentionPeriod: 86400000,
      batching: { enabled: true, maxBatchSize: 100, batchTimeout: 1000 },
    },
    auth: {
      enabled: true,
      jwtSecret: 'test-secret-key',
      tokenExpiration: '1h',
      enableSessions: true,
      sessionTimeout: 3600000,
    },
    health: {
      interval: 5000,
      memoryThreshold: 100 * 1024 * 1024,
      cpuThreshold: 80,
      errorRateThreshold: 5,
      connectionThreshold: 100,
    },
    reliability: {
      maxQueueSize: 500,
      maxRetries: 3,
      retryDelay: 100, // Faster for tests
      maxRetryDelay: 1000,
      reconnectAttempts: 3,
      reconnectDelay: 100,
      messageExpiration: 30000, // Shorter for tests
      queueCleanupInterval: 5000,
    },
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  }),
};

// Assign to global for access in tests
(global as any).testUtils = testUtils;
