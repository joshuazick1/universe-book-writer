import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';

export interface HealthMetrics {
  timestamp: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  totalConnections: number;
  eventsProcessed: number;
  eventsPerSecond: number;
  errorRate: number;
  lastError?: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface HealthCheckOptions {
  interval: number;
  memoryThreshold: number;
  cpuThreshold: number;
  errorRateThreshold: number;
  connectionThreshold: number;
}

export interface HealthMonitorEvents {
  'health-check': (metrics: HealthMetrics) => void;
  'status-change': (oldStatus: string, newStatus: string, metrics: HealthMetrics) => void;
  'threshold-exceeded': (threshold: string, value: number, limit: number) => void;
  error: (error: Error) => void;
}

export class HealthMonitor extends EventEmitter {
  private readonly logger = Logger.getInstance();
  private readonly options: HealthCheckOptions;
  private interval?: NodeJS.Timeout;
  private startTime: number;
  private lastMetrics?: HealthMetrics;
  private eventCount = 0;
  private errorCount = 0;
  private lastEventReset = Date.now();
  private lastErrorReset = Date.now();

  constructor(options: Partial<HealthCheckOptions> = {}) {
    super();
    this.startTime = Date.now();
    this.options = {
      interval: options.interval ?? 30000, // 30 seconds
      memoryThreshold: options.memoryThreshold ?? 500 * 1024 * 1024, // 500MB
      cpuThreshold: options.cpuThreshold ?? 80, // 80%
      errorRateThreshold: options.errorRateThreshold ?? 5, // 5 errors per minute
      connectionThreshold: options.connectionThreshold ?? 1000,
    };
  }

  public start(): void {
    if (this.interval) {
      this.logger.warn('Health monitor already started');
      return;
    }

    this.logger.info('Starting health monitor', {
      interval: this.options.interval,
      thresholds: this.options,
    });

    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.options.interval);

    // Perform initial health check
    this.performHealthCheck();
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
      this.logger.info('Health monitor stopped');
    }
  }

  public incrementEventCount(): void {
    this.eventCount++;
  }

  public incrementErrorCount(error?: string): void {
    this.errorCount++;
    if (this.lastMetrics && error) {
      this.lastMetrics.lastError = error;
    }
  }

  public getLastMetrics(): HealthMetrics | undefined {
    return this.lastMetrics;
  }

  public updateConnectionCount(activeConnections: number, totalConnections: number): void {
    if (this.lastMetrics) {
      this.lastMetrics.activeConnections = activeConnections;
      this.lastMetrics.totalConnections = totalConnections;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const now = Date.now();
      const uptime = now - this.startTime;

      // Calculate events per second
      const timeSinceLastReset = now - this.lastEventReset;
      const eventsPerSecond =
        timeSinceLastReset > 0 ? (this.eventCount / timeSinceLastReset) * 1000 : 0;

      // Calculate error rate (errors per minute)
      const timeSinceErrorReset = now - this.lastErrorReset;
      const errorRate =
        timeSinceErrorReset > 0 ? (this.errorCount / timeSinceErrorReset) * 60000 : 0;

      // Reset counters every minute
      if (timeSinceLastReset >= 60000) {
        this.eventCount = 0;
        this.lastEventReset = now;
      }

      if (timeSinceErrorReset >= 60000) {
        this.errorCount = 0;
        this.lastErrorReset = now;
      }

      const memoryUsage = process.memoryUsage();
      const cpuUsage = await this.getCpuUsage();

      const metrics: HealthMetrics = {
        timestamp: now,
        uptime,
        memoryUsage,
        cpuUsage,
        activeConnections: this.lastMetrics?.activeConnections ?? 0,
        totalConnections: this.lastMetrics?.totalConnections ?? 0,
        eventsProcessed: this.eventCount,
        eventsPerSecond,
        errorRate,
        lastError: this.lastMetrics?.lastError,
        status: this.calculateStatus(memoryUsage, cpuUsage, errorRate),
      };

      // Check for status changes
      if (this.lastMetrics && this.lastMetrics.status !== metrics.status) {
        this.emit('status-change', this.lastMetrics.status, metrics.status, metrics);
        this.logger.warn('Health status changed', {
          from: this.lastMetrics.status,
          to: metrics.status,
          metrics,
        });
      }

      // Check thresholds
      this.checkThresholds(metrics);

      this.lastMetrics = metrics;
      this.emit('health-check', metrics);

      this.logger.debug('Health check completed', { metrics });
    } catch (error) {
      this.logger.error('Health check failed', { error });
      this.emit('error', error as Error);
    }
  }

  private calculateStatus(
    memoryUsage: NodeJS.MemoryUsage,
    cpuUsage: number,
    errorRate: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const memoryUsed = memoryUsage.heapUsed;

    // Unhealthy conditions
    if (
      memoryUsed > this.options.memoryThreshold * 1.5 ||
      cpuUsage > this.options.cpuThreshold * 1.2 ||
      errorRate > this.options.errorRateThreshold * 2
    ) {
      return 'unhealthy';
    }

    // Degraded conditions
    if (
      memoryUsed > this.options.memoryThreshold ||
      cpuUsage > this.options.cpuThreshold ||
      errorRate > this.options.errorRateThreshold
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private checkThresholds(metrics: HealthMetrics): void {
    if (metrics.memoryUsage.heapUsed > this.options.memoryThreshold) {
      this.emit(
        'threshold-exceeded',
        'memory',
        metrics.memoryUsage.heapUsed,
        this.options.memoryThreshold
      );
    }

    if (metrics.cpuUsage > this.options.cpuThreshold) {
      this.emit('threshold-exceeded', 'cpu', metrics.cpuUsage, this.options.cpuThreshold);
    }

    if (metrics.errorRate > this.options.errorRateThreshold) {
      this.emit(
        'threshold-exceeded',
        'errorRate',
        metrics.errorRate,
        this.options.errorRateThreshold
      );
    }

    if (metrics.activeConnections > this.options.connectionThreshold) {
      this.emit(
        'threshold-exceeded',
        'connections',
        metrics.activeConnections,
        this.options.connectionThreshold
      );
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise(resolve => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);

        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000;
        const cpuTime = endUsage.user + endUsage.system;
        const cpuPercent = (cpuTime / totalTime) * 100;

        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }
}
