/**
 * Load Balancer Tests
 */

import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { OllamaLoadBalancer, PriorityStrategy, RoundRobinStrategy, LeastConnectionsStrategy } from '../load-balancer/load-balancer.js';
import { OllamaHealthMonitor } from '../health/health-monitor.js';
import { OllamaServerConfig } from '../config/ollama.config.js';

describe('OllamaLoadBalancer', () => {
  let loadBalancer: OllamaLoadBalancer;
  let healthMonitor: OllamaHealthMonitor;
  
  const mockServer1: OllamaServerConfig = {
    id: 'server-1',
    name: 'Server 1',
    url: 'http://localhost:11434',
    isActive: true,
    priority: 80,
    maxConcurrentRequests: 2,
    models: ['llama3.2:1b'],
  };

  const mockServer2: OllamaServerConfig = {
    id: 'server-2',
    name: 'Server 2',
    url: 'http://localhost:11435',
    isActive: true,
    priority: 60,
    maxConcurrentRequests: 4,
    models: ['llama3.2:1b', 'llama3.2:3b'],
  };

  beforeEach(() => {
    healthMonitor = new OllamaHealthMonitor({
      timeout: 5000,
      interval: 10000,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 60000,
    });
    
    loadBalancer = new OllamaLoadBalancer(new PriorityStrategy(), healthMonitor);
  });

  afterEach(() => {
    loadBalancer.destroy();
    healthMonitor.destroy();
  });

  describe('Server Management', () => {
    it('should add servers', () => {
      loadBalancer.addServer(mockServer1);
      
      const servers = loadBalancer.getServers();
      expect(servers.has(mockServer1.id)).toBe(true);
      expect(servers.get(mockServer1.id)).toEqual(mockServer1);
    });

    it('should remove servers', () => {
      loadBalancer.addServer(mockServer1);
      loadBalancer.removeServer(mockServer1.id);
      
      const servers = loadBalancer.getServers();
      expect(servers.has(mockServer1.id)).toBe(false);
    });

    it('should update servers', () => {
      loadBalancer.addServer(mockServer1);
      
      const updatedServer = { ...mockServer1, name: 'Updated Server' };
      loadBalancer.updateServer(updatedServer);
      
      const servers = loadBalancer.getServers();
      expect(servers.get(mockServer1.id)?.name).toBe('Updated Server');
    });
  });

  describe('Request Metrics', () => {
    beforeEach(() => {
      loadBalancer.addServer(mockServer1);
    });

    it('should track request start', () => {
      loadBalancer.recordRequestStart(mockServer1.id);
      
      const metrics = loadBalancer.getMetrics();
      const serverMetrics = metrics.get(mockServer1.id);
      
      expect(serverMetrics?.activeRequests).toBe(1);
      expect(serverMetrics?.requestCount).toBe(1);
    });

    it('should track request completion', () => {
      loadBalancer.recordRequestStart(mockServer1.id);
      loadBalancer.recordRequestComplete(mockServer1.id, 100, true);
      
      const metrics = loadBalancer.getMetrics();
      const serverMetrics = metrics.get(mockServer1.id);
      
      expect(serverMetrics?.activeRequests).toBe(0);
      expect(serverMetrics?.averageResponseTime).toBeGreaterThan(0);
    });

    it('should not allow negative active requests', () => {
      loadBalancer.recordRequestComplete(mockServer1.id, 100, true);
      
      const metrics = loadBalancer.getMetrics();
      const serverMetrics = metrics.get(mockServer1.id);
      
      expect(serverMetrics?.activeRequests).toBe(0);
    });
  });

  describe('Load Balancing Strategies', () => {
    beforeEach(() => {
      // Setup health monitor to show servers as healthy
      healthMonitor.startMonitoring(mockServer1);
      healthMonitor.startMonitoring(mockServer2);
      
      // Mock servers as healthy
      jest.spyOn(healthMonitor, 'isServerAvailable').mockReturnValue(true);
      
      loadBalancer.addServer(mockServer1);
      loadBalancer.addServer(mockServer2);
    });

    describe('Priority Strategy', () => {
      it('should select highest priority server', () => {
        loadBalancer.setStrategy(new PriorityStrategy());
        
        const selected = loadBalancer.selectServer();
        expect(selected?.id).toBe(mockServer1.id); // Higher priority (80 vs 60)
      });
    });

    describe('Round Robin Strategy', () => {
      it('should rotate between servers', () => {
        loadBalancer.setStrategy(new RoundRobinStrategy());
        
        const first = loadBalancer.selectServer();
        const second = loadBalancer.selectServer();
        
        expect(first?.id).not.toBe(second?.id);
      });
    });

    describe('Least Connections Strategy', () => {
      it('should select server with fewer active requests', () => {
        loadBalancer.setStrategy(new LeastConnectionsStrategy());
        
        // Add load to server1
        loadBalancer.recordRequestStart(mockServer1.id);
        
        const selected = loadBalancer.selectServer();
        expect(selected?.id).toBe(mockServer2.id); // Should pick server with no load
      });
    });
  });

  describe('Server Selection Filtering', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockServer1);
      healthMonitor.startMonitoring(mockServer2);
      loadBalancer.addServer(mockServer1);
      loadBalancer.addServer(mockServer2);
    });

    it('should filter by required model', () => {
      jest.spyOn(healthMonitor, 'isServerAvailable').mockReturnValue(true);
      
      const selected = loadBalancer.selectServer('llama3.2:3b');
      expect(selected?.id).toBe(mockServer2.id); // Only server2 has this model
    });

    it('should return null if no model available', () => {
      jest.spyOn(healthMonitor, 'isServerAvailable').mockReturnValue(true);
      
      const selected = loadBalancer.selectServer('nonexistent-model');
      expect(selected).toBeNull();
    });

    it('should filter by server capacity', () => {
      jest.spyOn(healthMonitor, 'isServerAvailable').mockReturnValue(true);
      
      // Fill server1 to capacity
      loadBalancer.recordRequestStart(mockServer1.id);
      loadBalancer.recordRequestStart(mockServer1.id);
      
      const selected = loadBalancer.selectServer();
      expect(selected?.id).toBe(mockServer2.id); // server1 at capacity
    });

    it('should filter out inactive servers', () => {
      const inactiveServer = { ...mockServer1, isActive: false };
      loadBalancer.updateServer(inactiveServer);
      
      jest.spyOn(healthMonitor, 'isServerAvailable').mockReturnValue(true);
      
      const selected = loadBalancer.selectServer();
      expect(selected?.id).toBe(mockServer2.id);
    });

    it('should filter out unhealthy servers', () => {
      jest.spyOn(healthMonitor, 'isServerAvailable')
        .mockImplementation((serverId) => serverId !== mockServer1.id);
      
      const selected = loadBalancer.selectServer();
      expect(selected?.id).toBe(mockServer2.id);
    });
  });

  describe('Utilization Statistics', () => {
    beforeEach(() => {
      healthMonitor.startMonitoring(mockServer1);
      loadBalancer.addServer(mockServer1);
    });

    it('should calculate server utilization', () => {
      jest.spyOn(healthMonitor, 'getServerHealth').mockReturnValue({
        serverId: mockServer1.id,
        isHealthy: true,
        lastCheck: new Date(),
        errorCount: 0,
        consecutiveFailures: 0,
        circuitBreakerState: 'CLOSED',
      });

      loadBalancer.recordRequestStart(mockServer1.id);
      
      const utilization = loadBalancer.getServerUtilization();
      const serverUtil = utilization.find(u => u.serverId === mockServer1.id);
      
      expect(serverUtil?.utilization).toBe(50); // 1 out of 2 max requests
      expect(serverUtil?.isHealthy).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit server management events', (done) => {
      let eventCount = 0;
      
      loadBalancer.on('serverAdded', (serverId) => {
        expect(serverId).toBe(mockServer1.id);
        eventCount++;
      });
      
      loadBalancer.on('serverRemoved', (serverId) => {
        expect(serverId).toBe(mockServer1.id);
        eventCount++;
        
        if (eventCount === 2) done();
      });
      
      loadBalancer.addServer(mockServer1);
      loadBalancer.removeServer(mockServer1.id);
    });

    it('should emit no servers available event', (done) => {
      jest.spyOn(healthMonitor, 'isServerAvailable').mockReturnValue(false);
      
      loadBalancer.on('noServersAvailable', (requiredModel) => {
        expect(requiredModel).toBe('test-model');
        done();
      });
      
      loadBalancer.addServer(mockServer1);
      loadBalancer.selectServer('test-model');
    });
  });
});
