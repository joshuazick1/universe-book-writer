/**
 * AI Server Test Helpers
 * Common utilities and mocks for AI server testing
 *
 * NOTE: This file is the single source of truth for orchestrator/server/model mocking in AI server tests.
 * All test suites must use these helpers to ensure orchestrator state is shared and test isolation is maintained.
 * See ai-server/tests/README.md for usage examples and best practices.
 */

import { jest } from '@jest/globals';
import { AIOrchestrator, AIServer } from '../../src/orchestrator.js';

/**
 * Mock Ollama client responses
 */
export const createMockOllamaClient = () => ({
  generate: jest.fn(),
  chat: jest.fn(),
  embeddings: jest.fn(),
  list: jest.fn(),
  show: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  pull: jest.fn(),
  push: jest.fn(),
});

/**
 * Mock health monitor
 */
export const createMockHealthMonitor = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  getStatus: jest.fn(),
  registerService: jest.fn(),
  unregisterService: jest.fn(),
});

/**
 * Mock load balancer
 */
export const createMockLoadBalancer = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  addServer: jest.fn(),
  removeServer: jest.fn(),
  getNextServer: jest.fn(),
  getServerStatus: jest.fn(),
});

/**
 * Mock server manager
 */
export const createMockServerManager = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  restart: jest.fn(),
  getStatus: jest.fn(),
  scaleUp: jest.fn(),
  scaleDown: jest.fn(),
});

/**
 * Mock configuration service
 */
export const createMockConfigService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  validate: jest.fn(),
  reload: jest.fn(),
});

/**
 * Create mock Express app
 */
export const createMockExpressApp = () => ({
  listen: jest.fn((port: number, callback?: () => void) => {
    if (callback) callback();
    return { close: jest.fn() };
  }),
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  close: jest.fn(),
});

/**
 * Create mock HTTP server
 */
export const createMockHttpServer = () => ({
  listen: jest.fn((port: number, callback?: () => void) => {
    if (callback) callback();
  }),
  close: jest.fn((callback?: () => void) => {
    if (callback) callback();
  }),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
});

/**
 * Wait for async operations in tests
 */
export const waitFor = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create test configuration
 */
export const createTestConfig = (overrides: Record<string, any> = {}) => ({
  server: {
    port: 3002,
    host: 'localhost',
    ...overrides.server,
  },
  ollama: {
    host: 'http://localhost:11434',
    timeout: 30000,
    retries: 3,
    ...overrides.ollama,
  },
  health: {
    interval: 5000,
    timeout: 10000,
    retries: 3,
    ...overrides.health,
  },
  loadBalancer: {
    strategy: 'round-robin',
    healthCheck: true,
    ...overrides.loadBalancer,
  },
  logging: {
    level: 'error',
    ...overrides.logging,
  },
  ...overrides,
});



export function getOrchestrator(): AIOrchestrator {
  throw new Error('getOrchestrator() is not supported in isolated test mode. Pass orchestrator explicitly.');
}

export function resetOrchestrator() {
  // No-op in isolated test mode
}

export interface MockServerOptions {
  id: string;
  url: string;
  type?: string;
  healthy?: boolean;
  models?: string[];
  tags?: any[];
  latencyMs?: number;
  maxConcurrency?: number;
  inFlight?: number;
  failOn?: string[];
}




export function setServerHealth(orchestrator: AIOrchestrator, serverId: string, healthy: boolean): void {
  const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId);
  if (server) server.healthy = healthy;
}


export function setServerModels(orchestrator: AIOrchestrator, serverId: string, models: string[]): void {
  const server = orchestrator.getServers().find(s => s.id === serverId);
  if (server) {
    server.models = models;
  }
}


export function setServerTags(orchestrator: AIOrchestrator, serverId: string, tags: any[]): void {
  const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId);
  if (server) (server as any).tags = tags;
}


export function simulateServerFailure(orchestrator: AIOrchestrator, serverId: string, endpoint: string): void {
  const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId) as Record<string, any>;
  if (server) {
    if (!server.failOn) server.failOn = [];
    server.failOn.push(endpoint);
  }
}


export function setServerLatency(orchestrator: AIOrchestrator, serverId: string, latencyMs: number): void {
  const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId) as Record<string, any>;
  if (server) server.latencyMs = latencyMs;
}


export function setServerConcurrency(orchestrator: AIOrchestrator, serverId: string, maxConcurrency: number): void {
  const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId) as Record<string, any>;
  if (server) server.maxConcurrency = maxConcurrency;
}


export function setServerInFlight(orchestrator: AIOrchestrator, serverId: string, inFlight: number): void {
  const server = orchestrator.getServers().find((s: AIServer) => s.id === serverId) as Record<string, any>;
  if (server) server.inFlight = inFlight;
}

/**
 * Permanently ban a server/model pair for routing (until reset)
 */
export function banServerModel(orchestrator: AIOrchestrator, serverId: string, model: string): void {
  (orchestrator as any)['permanentBan'].add(`${serverId}:${model}`);
}


export function clearBansAndCooldowns(orchestrator: AIOrchestrator): void {
  orchestrator['failureCooldown'].clear();
  orchestrator['permanentBan'].clear();
}

export function mockNDJSONStream(res: any, chunks: any[], delayMs = 10): void {
  let i = 0;
  function sendNext() {
    if (i < chunks.length) {
      res.write(JSON.stringify(chunks[i]) + '\n');
      i++;
      setTimeout(sendNext, delayMs);
    } else {
      res.end();
    }
  }
  sendNext();
}

export function mockSlowResponse(res: any, ms: number): void {
  setTimeout(() => res.end(), ms);
}

export function mockErrorResponse(res: any, status: number, error: string): void {
  res.status(status).json({ error });
}

/**
 * Get a mock server by ID (for assertions)
 * @param serverId - The server's unique ID
 * @returns The AIServer instance or undefined
 */

export function getMockServer(orchestrator: AIOrchestrator, serverId: string): AIServer | undefined {
  return orchestrator.getServers().find((s: AIServer) => s.id === serverId);
}

/**
 * Get all mock servers (for assertions)
 * @returns Array of AIServer instances
 */

export function getAllMockServers(orchestrator: AIOrchestrator): AIServer[] {
  return orchestrator.getServers();
}

/**
 * Get all models across all servers (for aggregation assertions)
 * @returns Array of model names (strings)
 */

export function getAllMockModels(orchestrator: AIOrchestrator): string[] {
  return getAllMockServers(orchestrator).flatMap(s => s.models || []);
}

/**
 * Reset all server fields to defaults (for test isolation)
 * @remarks Useful for clearing test-specific fields between tests
 */

export function resetAllMockServers(orchestrator: AIOrchestrator): void {
  getAllMockServers(orchestrator).forEach(server => {
    server.healthy = true;
    server.models = [];
    (server as any).tags = [];
    (server as any).maxConcurrency = 4;
    (server as any).inFlight = 0;
    (server as any).failOn = [];
    server.lastResponseTime = 100;
    delete (server as any).latencyMs;
  });
}

/**
 * Ensure a set of mock orchestrator servers are initialized, healthy, and have expected models/tags.
 * Use this in test setup to guarantee all required servers are present and reachable.
 * @param servers Array of server configs: { id, url, models, tags }
 */
export function ensureMockServersInitialized(
  orchestrator: AIOrchestrator,
  servers: Array<{
    id: string;
    url: string;
    models?: string[];
    tags?: any[];
    healthy?: boolean;
  }>
) {
  for (const s of servers) {
    // Remove any existing server with the same id to guarantee a fresh add
    const existing = orchestrator.getServers().find(server => server.id === s.id);
    if (existing) orchestrator.removeServer(s.id);
    orchestrator.addServer({ id: s.id, url: s.url, type: 'ollama' });
    const server = orchestrator.getServers().find(server => server.id === s.id);
    if (!server) throw new Error(`ensureMockServersInitialized: Server with id '${s.id}' was not found after addServer.`);
    server.healthy = s.healthy !== false;
    server.models = s.models || [];
    (server as any).tags = s.tags || [];
    server.lastResponseTime = 100;
    (server as any).maxConcurrency = 4;
    (server as any).inFlight = 0;
    (server as any).failOn = [];
  }
}


/**
 * Install a global fetch mock that simulates Ollama server endpoints for all orchestrator health/model checks.
 * Supports /api/tags, /api/generate, /api/chat, /api/embeddings, /api/list, /api/show, /api/create, /api/delete, /api/pull, /api/push.
 * Reads from the orchestrator's mock server state for dynamic responses.
 * Call this in test setup before any orchestrator config POSTs.
 *
 * @remarks
 * The mock is idempotent and will not re-install if already present.
 * The mock function is typed to match the global fetch signature and is compatible with Jest.
 * @param orchestrator The orchestrator instance to use for server state
 */
export function installOllamaServerFetchMock(orchestrator: AIOrchestrator) {
  // Type assertion to allow custom marker property
  if (typeof global.fetch === 'function' && (global.fetch as any)._isOllamaMock) return; // Idempotent
  const handler = async (url: string, options: any = {}) => {
    // Find the mock server by URL
    const server = orchestrator.getServers().find((s: AIServer) => url.startsWith(s.url));
    if (!server) {
      return { ok: false, status: 404, json: async () => ({ error: 'Server not found' }) };
    }
    // Simulate endpoint responses
    if (url.endsWith('/api/tags')) {
      // Allow tags to be any array (including malformed/partial objects) for edge case testing
      return {
        ok: true,
        status: 200,
        json: async () => ({ models: (server as any).tags ?? [] })
      };
    }
    if (url.endsWith('/api/generate')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: 'mocked generation', input: options.body })
      };
    }
    if (url.endsWith('/api/chat')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ role: 'assistant', content: 'mocked chat response' }] })
      };
    }
    if (url.endsWith('/api/embeddings')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ embeddings: [0.1, 0.2, 0.3] })
      };
    }
    if (url.endsWith('/api/list')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ models: server.models || [] })
      };
    }
    if (url.endsWith('/api/show')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ model: server.models?.[0] || 'mock-model', details: {} })
      };
    }
    if (url.endsWith('/api/create')) {
      return {
        ok: true,
        status: 201,
        json: async () => ({ created: true })
      };
    }
    if (url.endsWith('/api/delete')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ deleted: true })
      };
    }
    if (url.endsWith('/api/pull')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ pulled: true })
      };
    }
    if (url.endsWith('/api/push')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ pushed: true })
      };
    }
    // Default: 404
    return { ok: false, status: 404, json: async () => ({ error: 'Not implemented in mock' }) };
  };
  const fetchMock = jest.fn(handler) as any;
  fetchMock._isOllamaMock = true;
  global.fetch = fetchMock as any;
}


// No default export. Use named imports only. All helpers now require explicit orchestrator instances where relevant.
