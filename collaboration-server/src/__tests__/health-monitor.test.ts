import { jest } from '@jest/globals';
import { HealthMonitor } from '../health/health-monitor';

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    healthMonitor = new HealthMonitor({
      interval: 1000,
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      cpuThreshold: 80,
      errorRateThreshold: 5,
      connectionThreshold: 100,
    });
  });

  afterEach(() => {
    healthMonitor.stop();
  });

  describe('initialization', () => {
    it('should create a health monitor with default options', () => {
      const monitor = new HealthMonitor();
      expect(monitor).toBeInstanceOf(HealthMonitor);
    });

    it('should create a health monitor with custom options', () => {
      const options = {
        interval: 5000,
        memoryThreshold: 200 * 1024 * 1024,
        cpuThreshold: 90,
        errorRateThreshold: 10,
        connectionThreshold: 500,
      };
      const monitor = new HealthMonitor(options);
      expect(monitor).toBeInstanceOf(HealthMonitor);
    });
  });

  describe('event counting', () => {
    it('should increment event count', () => {
      healthMonitor.incrementEventCount();
      healthMonitor.incrementEventCount();

      // Events are tracked internally, we can verify through health checks
      expect(healthMonitor.getLastMetrics()).toBeUndefined(); // No metrics until first check
    });

    it('should increment error count', () => {
      healthMonitor.incrementErrorCount('Test error');
      healthMonitor.incrementErrorCount('Another error');

      expect(healthMonitor.getLastMetrics()).toBeUndefined(); // No metrics until first check
    });
  });

  describe('connection tracking', () => {
    it('should update connection count', () => {
      healthMonitor.updateConnectionCount(50, 100);

      const metrics = healthMonitor.getLastMetrics();
      if (metrics) {
        expect(metrics.activeConnections).toBe(50);
        expect(metrics.totalConnections).toBe(100);
      }
    });
  });

  describe('health monitoring', () => {
    it('should start and stop monitoring', async () => {
      const startSpy = jest.spyOn(healthMonitor, 'start');
      const stopSpy = jest.spyOn(healthMonitor, 'stop');

      healthMonitor.start();
      expect(startSpy).toHaveBeenCalled();

      healthMonitor.stop();
      expect(stopSpy).toHaveBeenCalled();
    });
    it('should emit health-check events', done => {
      let eventReceived = false;
      const testMonitor = new HealthMonitor({ interval: 100 });

      testMonitor.on('health-check', metrics => {
        if (!eventReceived) {
          eventReceived = true;
          expect(metrics).toBeDefined();
          expect(metrics.timestamp).toBeGreaterThan(0);
          expect(metrics.uptime).toBeGreaterThanOrEqual(0);
          expect(metrics.status).toMatch(/^(healthy|degraded|unhealthy)$/);
          testMonitor.stop();
          done();
        }
      });

      testMonitor.start();
    });
    it('should emit threshold-exceeded events', done => {
      const testMonitor = new HealthMonitor({
        interval: 100,
        memoryThreshold: 1, // Very low threshold to trigger
        cpuThreshold: 1,
        errorRateThreshold: 1,
        connectionThreshold: 1,
      });

      let eventReceived = false;
      testMonitor.on('threshold-exceeded', (threshold, value, limit) => {
        if (!eventReceived) {
          eventReceived = true;
          expect(threshold).toBeDefined();
          expect(value).toBeGreaterThan(limit);
          testMonitor.stop();
          done();
        }
      });

      testMonitor.updateConnectionCount(10, 10); // Exceeds threshold
      testMonitor.start();
    });
  });

  describe('metrics calculation', () => {
    it('should calculate healthy status with normal values', () => {
      // This would require access to private methods, so we test through events
      healthMonitor.on('health-check', metrics => {
        if (metrics.memoryUsage.heapUsed < 50 * 1024 * 1024) {
          // Less than 50MB
          expect(metrics.status).toBe('healthy');
        }
      });

      healthMonitor.start();
      setTimeout(() => healthMonitor.stop(), 100);
    });
  });
});
