/**
 * Ollama Health Monitor Tests
 */

import { OllamaHealthMonitor } from '../health/health-monitor';
import { OllamaServerConfig } from '../config/ollama.config';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');

describe('OllamaHealthMonitor', () => {
  let healthMonitor: OllamaHealthMonitor;
  const mockServer: OllamaServerConfig = {
    id: 'test-server',
    name: 'Test Server',
    url: 'http://localhost:11434',
    isActive: true,
    priority: 50,
    maxConcurrentRequests: 2,
    models: ['llama3.2:1b'],
    healthCheckPath: '/api/tags',
    timeout: 5000,
  };

  beforeEach(() => {
    healthMonitor = new OllamaHealthMonitor({
      timeout: 5000,
      interval: 10000,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 60000,
    });
  });

  afterEach(() => {
    healthMonitor.destroy();
  });

  describe('Server Monitoring', () => {
    it('should initialize server health status', () => {
      healthMonitor.startMonitoring(mockServer);
      
      const health = healthMonitor.getServerHealth(mockServer.id);
      expect(health).toBeDefined();
      expect(health?.serverId).toBe(mockServer.id);
      expect(health?.circuitBreakerState).toBe('CLOSED');
    });

    it('should stop monitoring when requested', () => {
      healthMonitor.startMonitoring(mockServer);
      healthMonitor.stopMonitoring(mockServer.id);
      
      const health = healthMonitor.getServerHealth(mockServer.id);
      expect(health).toBeUndefined();
    });

    it('should track server availability', () => {
      healthMonitor.startMonitoring(mockServer);
      
      // Initially should not be available (health check hasn't run)
      expect(healthMonitor.isServerAvailable(mockServer.id)).toBe(false);
    });
  });
  describe('Success/Failure Recording', () => {
    beforeEach(() => {
      // Mock axios to prevent automatic health check failure
      const mockedAxios = jest.mocked(axios);
      mockedAxios.get = jest.fn().mockResolvedValue({
        status: 200,
        data: { models: [] }
      });
      
      healthMonitor.startMonitoring(mockServer);
    });

    it('should record successful requests', () => {
      healthMonitor.recordSuccess(mockServer.id, 100);
      
      const health = healthMonitor.getServerHealth(mockServer.id);
      expect(health?.consecutiveFailures).toBe(0);
      expect(health?.responseTime).toBe(100);
    });

    it('should record failed requests', () => {
      healthMonitor.recordFailure(mockServer.id, 'Connection error');
      
      const health = healthMonitor.getServerHealth(mockServer.id);
      expect(health?.consecutiveFailures).toBe(1);
      expect(health?.errorCount).toBe(1);
      expect(health?.lastError).toBe('Connection error');
    });

    it('should open circuit breaker after threshold failures', () => {
      const threshold = 3;
      
      for (let i = 0; i < threshold; i++) {
        healthMonitor.recordFailure(mockServer.id, 'Error');
      }
      
      const health = healthMonitor.getServerHealth(mockServer.id);
      expect(health?.circuitBreakerState).toBe('OPEN');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockServer);
    });

    it('should emit circuit breaker events', (done) => {
      healthMonitor.on('circuitBreakerOpened', (serverId) => {
        expect(serverId).toBe(mockServer.id);
        done();
      });

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        healthMonitor.recordFailure(mockServer.id, 'Error');
      }
    });

    it('should transition to half-open state after timeout', (done) => {
      // Use shorter timeout for testing
      const fastHealthMonitor = new OllamaHealthMonitor({
        timeout: 5000,
        interval: 10000,
        circuitBreakerThreshold: 1,
        circuitBreakerTimeout: 100, // 100ms
      });

      fastHealthMonitor.startMonitoring(mockServer);

      fastHealthMonitor.on('circuitBreakerHalfOpen', (serverId) => {
        expect(serverId).toBe(mockServer.id);
        fastHealthMonitor.destroy();
        done();
      });

      // Trigger circuit breaker
      fastHealthMonitor.recordFailure(mockServer.id, 'Error');
    }, 200);
  });

  describe('Health Status Aggregation', () => {
    it('should return all server health status', () => {
      const server2: OllamaServerConfig = { ...mockServer, id: 'test-server-2' };
      
      healthMonitor.startMonitoring(mockServer);
      healthMonitor.startMonitoring(server2);
      
      const allHealth = healthMonitor.getAllServerHealth();
      expect(allHealth.size).toBe(2);
      expect(allHealth.has(mockServer.id)).toBe(true);
      expect(allHealth.has(server2.id)).toBe(true);
    });
  });
});
