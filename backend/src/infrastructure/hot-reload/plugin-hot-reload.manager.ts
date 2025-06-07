/**
 * Plugin hot reload manager - Orchestrates plugin watching and reload operations
 */

import { EventEmitter } from 'events';
import { PluginWatcher, PluginReloadEvent, ReloadReason, WatchConfig } from './plugin-watcher.js';
import { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';
import { Plugin, PluginState } from '@universe-book-writer/core';

/**
 * Hot reload configuration
 */
export interface HotReloadConfig {
  enabled: boolean;
  watchConfig?: WatchConfig;
  autoWatch?: boolean;
  batchReloads?: boolean;
  batchDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
  preserveState?: boolean;
}

/**
 * Plugin dependency reload event
 */
interface DependencyReloadEvent {
  plugins: string[];
  reason: ReloadReason;
  timestamp: Date;
}

/**
 * Hot reload metrics
 */
export interface HotReloadMetrics {
  totalReloads: number;
  successfulReloads: number;
  failedReloads: number;
  averageReloadTime: number;
  lastReloadTime?: Date;
  watchedPlugins: number;
}

/**
 * Plugin hot reload manager
 */
export class PluginHotReloadManager extends EventEmitter {
  private watcher: PluginWatcher;
  private config: Required<HotReloadConfig>;
  private reloadQueue: Set<string> = new Set();
  private batchTimer?: NodeJS.Timeout;
  private retryQueues: Map<string, NodeJS.Timeout> = new Map();
  private reloadMetrics: HotReloadMetrics = {
    totalReloads: 0,
    successfulReloads: 0,
    failedReloads: 0,
    averageReloadTime: 0,
    watchedPlugins: 0
  };
  private reloadTimes: number[] = [];

  constructor(
    private pluginUseCase: PluginUseCase,
    config: HotReloadConfig = { enabled: true }
  ) {
    super();    this.config = {
      enabled: config.enabled ?? true,
      watchConfig: config.watchConfig || {
        ignored: ['node_modules/**', 'dist/**'],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        }
      },
      autoWatch: config.autoWatch ?? true,
      batchReloads: config.batchReloads ?? true,
      batchDelay: config.batchDelay ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 2000,
      preserveState: config.preserveState ?? true
    };

    this.watcher = new PluginWatcher(pluginUseCase, this.config.watchConfig);
    this.setupWatcherEvents();
  }

  /**
   * Enable hot reload
   */
  enable(): void {
    this.config.enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable hot reload
   */
  disable(): void {
    this.config.enabled = false;
    this.clearBatchTimer();
    this.clearRetryTimers();
    this.emit('disabled');
  }

  /**
   * Check if hot reload is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Start watching a plugin
   */
  async startWatching(pluginName: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Hot reload is disabled');
    }

    const plugin = this.pluginUseCase.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    const pluginPath = (plugin as any).loadPath;
    if (!pluginPath) {
      throw new Error(`Plugin ${pluginName} has no load path`);
    }

    await this.watcher.watchPlugin(pluginName, pluginPath);
    this.updateMetrics();
  }

  /**
   * Stop watching a plugin
   */
  async stopWatching(pluginName: string): Promise<void> {
    await this.watcher.unwatchPlugin(pluginName);
    this.cancelRetries(pluginName);
    this.updateMetrics();
  }

  /**
   * Start watching all registered plugins
   */
  async startWatchingAll(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Hot reload is disabled');
    }

    const plugins = this.pluginUseCase.getAllPlugins();
    const watchPromises = plugins
      .filter(plugin => (plugin as any).loadPath)
      .map(plugin => this.startWatching(plugin.metadata.name));

    await Promise.allSettled(watchPromises);
  }

  /**
   * Stop watching all plugins
   */
  async stopWatchingAll(): Promise<void> {
    await this.watcher.unwatchAll();
    this.clearBatchTimer();
    this.clearRetryTimers();
    this.updateMetrics();
  }

  /**
   * Manually reload a plugin
   */
  async reloadPlugin(pluginName: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Hot reload is disabled');
    }

    await this.watcher.reloadPlugin(pluginName);
  }

  /**
   * Reload multiple plugins
   */
  async reloadPlugins(pluginNames: string[]): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Hot reload is disabled');
    }

    const reloadPromises = pluginNames.map(name => this.watcher.reloadPlugin(name));
    await Promise.allSettled(reloadPromises);
  }

  /**
   * Get watched plugins
   */
  getWatchedPlugins(): string[] {
    return this.watcher.getWatchedPlugins();
  }

  /**
   * Get hot reload metrics
   */
  getMetrics(): HotReloadMetrics {
    return { ...this.reloadMetrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.reloadMetrics = {
      totalReloads: 0,
      successfulReloads: 0,
      failedReloads: 0,
      averageReloadTime: 0,
      watchedPlugins: this.watcher.getWatchedPlugins().length
    };
    this.reloadTimes = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HotReloadConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (!this.config.enabled) {
      this.disable();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): HotReloadConfig {
    return { ...this.config };
  }

  /**
   * Setup watcher event handlers
   */
  private setupWatcherEvents(): void {
    this.watcher.on('pluginReloaded', (event: PluginReloadEvent) => {
      this.handlePluginReloaded(event);
    });

    this.watcher.on('reloadError', ({ pluginName, error }) => {
      this.handleReloadError(pluginName, error);
    });

    this.watcher.on('watchStarted', ({ pluginName }) => {
      this.emit('watchStarted', { pluginName });
    });

    this.watcher.on('watchStopped', ({ pluginName }) => {
      this.emit('watchStopped', { pluginName });
    });

    this.watcher.on('watchError', ({ pluginName, error }) => {
      this.emit('watchError', { pluginName, error });
    });

    this.watcher.on('recoveryAttempt', ({ pluginName, error }) => {
      this.emit('recoveryAttempt', { pluginName, error });
    });

    this.watcher.on('recoverySuccess', ({ pluginName }) => {
      this.emit('recoverySuccess', { pluginName });
    });

    this.watcher.on('recoveryFailed', ({ pluginName, originalError, recoveryError }) => {
      this.emit('recoveryFailed', { pluginName, originalError, recoveryError });
    });
  }

  /**
   * Handle successful plugin reload
   */
  private handlePluginReloaded(event: PluginReloadEvent): void {
    const reloadTime = Date.now() - event.timestamp.getTime();
    
    this.reloadMetrics.totalReloads++;
    this.reloadMetrics.successfulReloads++;
    this.reloadMetrics.lastReloadTime = event.timestamp;
    
    this.reloadTimes.push(reloadTime);
    this.updateAverageReloadTime();

    // Handle dependency reloads
    if (this.config.batchReloads) {
      this.queueDependentReloads(event.pluginName);
    } else {
      this.reloadDependents(event.pluginName);
    }

    this.emit('pluginReloaded', event);
  }

  /**
   * Handle reload error
   */
  private handleReloadError(pluginName: string, error: Error): void {
    this.reloadMetrics.totalReloads++;
    this.reloadMetrics.failedReloads++;

    // Schedule retry if configured
    if (this.config.maxRetries > 0) {
      this.scheduleRetry(pluginName);
    }

    this.emit('reloadError', { pluginName, error });
  }

  /**
   * Schedule a retry for failed reload
   */
  private scheduleRetry(pluginName: string): void {
    // Cancel existing retry
    this.cancelRetries(pluginName);

    let retryCount = 0;
    const retry = async () => {
      if (retryCount >= this.config.maxRetries) {
        this.emit('maxRetriesExceeded', { pluginName, retryCount });
        return;
      }

      try {
        retryCount++;
        await this.watcher.reloadPlugin(pluginName);
      } catch (error) {
        if (retryCount < this.config.maxRetries) {
          const timer = setTimeout(retry, this.config.retryDelay);
          this.retryQueues.set(pluginName, timer);
        } else {
          this.emit('maxRetriesExceeded', { pluginName, retryCount });
        }
      }
    };

    const timer = setTimeout(retry, this.config.retryDelay);
    this.retryQueues.set(pluginName, timer);
  }

  /**
   * Cancel retries for a plugin
   */
  private cancelRetries(pluginName: string): void {
    const timer = this.retryQueues.get(pluginName);
    if (timer) {
      clearTimeout(timer);
      this.retryQueues.delete(pluginName);
    }
  }

  /**
   * Queue dependent plugins for reload
   */
  private queueDependentReloads(pluginName: string): void {
    const dependents = this.findDependentPlugins(pluginName);
    
    dependents.forEach(dependent => {
      this.reloadQueue.add(dependent);
    });

    if (this.reloadQueue.size > 0 && !this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchedReloads();
      }, this.config.batchDelay);
    }
  }

  /**
   * Process batched reloads
   */
  private async processBatchedReloads(): Promise<void> {
    const pluginsToReload = Array.from(this.reloadQueue);
    this.reloadQueue.clear();
    this.batchTimer = undefined;

    if (pluginsToReload.length > 0) {
      const dependencyEvent: DependencyReloadEvent = {
        plugins: pluginsToReload,
        reason: ReloadReason.DEPENDENCY_UPDATED,
        timestamp: new Date()
      };

      try {
        await this.reloadPlugins(pluginsToReload);
        this.emit('dependencyReload', dependencyEvent);
      } catch (error) {
        this.emit('batchReloadError', { plugins: pluginsToReload, error });
      }
    }
  }

  /**
   * Reload dependent plugins immediately
   */
  private async reloadDependents(pluginName: string): Promise<void> {
    const dependents = this.findDependentPlugins(pluginName);
    
    if (dependents.length > 0) {
      try {
        await this.reloadPlugins(dependents);
        
        const dependencyEvent: DependencyReloadEvent = {
          plugins: dependents,
          reason: ReloadReason.DEPENDENCY_UPDATED,
          timestamp: new Date()
        };
        
        this.emit('dependencyReload', dependencyEvent);
      } catch (error) {
        this.emit('dependencyReloadError', { plugins: dependents, error });
      }
    }
  }

  /**
   * Find plugins that depend on the given plugin
   */
  private findDependentPlugins(pluginName: string): string[] {
    const allPlugins = this.pluginUseCase.getAllPlugins();
    const dependents: string[] = [];

    allPlugins.forEach(plugin => {
      const dependencies = plugin.metadata.dependencies || {};
      if (dependencies[pluginName] || plugin.metadata.peerDependencies?.[pluginName]) {
        dependents.push(plugin.metadata.name);
      }
    });

    return dependents;
  }

  /**
   * Update average reload time
   */
  private updateAverageReloadTime(): void {
    if (this.reloadTimes.length > 0) {
      const sum = this.reloadTimes.reduce((a, b) => a + b, 0);
      this.reloadMetrics.averageReloadTime = sum / this.reloadTimes.length;

      // Keep only last 100 measurements
      if (this.reloadTimes.length > 100) {
        this.reloadTimes = this.reloadTimes.slice(-100);
      }
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.reloadMetrics.watchedPlugins = this.watcher.getWatchedPlugins().length;
  }

  /**
   * Clear batch timer
   */
  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    this.reloadQueue.clear();
  }

  /**
   * Clear all retry timers
   */
  private clearRetryTimers(): void {
    this.retryQueues.forEach(timer => clearTimeout(timer));
    this.retryQueues.clear();
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.disable();
    await this.watcher.destroy();
    this.removeAllListeners();
  }
}
