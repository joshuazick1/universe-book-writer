/**
 * Plugin hot reload system - File watching and state preservation
 */

import { EventEmitter } from 'node:events';
import path from 'node:path';
import { type Plugin, PluginState } from '@universe-book-writer/core';
import { type FSWatcher, watch } from 'chokidar';
import type { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';

/**
 * Plugin reload event data
 */
export interface PluginReloadEvent {
  pluginName: string;
  oldPlugin: Plugin;
  newPlugin: Plugin;
  reloadReason: ReloadReason;
  timestamp: Date;
}

/**
 * Reasons for plugin reload
 */
export enum ReloadReason {
  FILE_CHANGED = 'file_changed',
  DEPENDENCY_UPDATED = 'dependency_updated',
  CONFIGURATION_CHANGED = 'configuration_changed',
  MANUAL_RELOAD = 'manual_reload',
}

/**
 * Plugin state snapshot for preservation
 */
interface PluginStateSnapshot {
  pluginName: string;
  state: PluginState;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  customData?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Watch configuration
 */
export interface WatchConfig {
  ignored?: string | string[] | ((path: string) => boolean);
  persistent?: boolean;
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  depth?: number;
  awaitWriteFinish?:
    | boolean
    | {
        stabilityThreshold?: number;
        pollInterval?: number;
      };
}

/**
 * Plugin hot reload watcher
 */
export class PluginWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private pluginPaths: Map<string, string> = new Map();
  private stateSnapshots: Map<string, PluginStateSnapshot> = new Map();
  private reloadDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly debounceDelay = 500; // 500ms debounce

  constructor(
    private pluginUseCase: PluginUseCase,
    private watchConfig: WatchConfig = {}
  ) {
    super();
    this.setupDefaultWatchConfig();
  }

  /**
   * Start watching a plugin directory or file
   */
  async watchPlugin(pluginName: string, pluginPath: string): Promise<void> {
    // Stop existing watcher if any
    await this.unwatchPlugin(pluginName);

    try {
      // Create state snapshot before watching
      const plugin = this.pluginUseCase.getPlugin(pluginName);
      if (plugin) {
        await this.createStateSnapshot(plugin);
      }

      // Set up file watcher
      const watcher = watch(pluginPath, {
        ...this.watchConfig,
        ignoreInitial: true,
      });

      // Set up event handlers
      watcher
        .on('change', filePath => this.handleFileChange(pluginName, filePath))
        .on('add', filePath => this.handleFileChange(pluginName, filePath))
        .on('unlink', filePath => this.handleFileChange(pluginName, filePath))
        .on('error', error => this.handleWatchError(pluginName, error));

      this.watchers.set(pluginName, watcher);
      this.pluginPaths.set(pluginName, pluginPath);

      this.emit('watchStarted', { pluginName, pluginPath });
    } catch (error) {
      this.emit('watchError', { pluginName, error });
      throw error;
    }
  }

  /**
   * Stop watching a plugin
   */
  async unwatchPlugin(pluginName: string): Promise<void> {
    const watcher = this.watchers.get(pluginName);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(pluginName);
      this.pluginPaths.delete(pluginName);
      this.clearDebounceTimer(pluginName);

      this.emit('watchStopped', { pluginName });
    }
  }

  /**
   * Stop watching all plugins
   */
  async unwatchAll(): Promise<void> {
    const unwatchPromises = Array.from(this.watchers.keys()).map(pluginName =>
      this.unwatchPlugin(pluginName)
    );
    await Promise.all(unwatchPromises);
  }

  /**
   * Get watched plugins
   */
  getWatchedPlugins(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Check if a plugin is being watched
   */
  isWatching(pluginName: string): boolean {
    return this.watchers.has(pluginName);
  }

  /**
   * Manually trigger a plugin reload
   */
  async reloadPlugin(pluginName: string): Promise<void> {
    try {
      await this.performPluginReload(pluginName, ReloadReason.MANUAL_RELOAD);
    } catch (error) {
      this.emit('reloadError', { pluginName, error });
      throw error;
    }
  }

  /**
   * Get state snapshot for a plugin
   */
  getStateSnapshot(pluginName: string): PluginStateSnapshot | undefined {
    return this.stateSnapshots.get(pluginName);
  }

  /**
   * Create state snapshot
   */
  private async createStateSnapshot(plugin: Plugin): Promise<void> {
    const snapshot: PluginStateSnapshot = {
      pluginName: plugin.metadata.name,
      state: plugin.state,
      config: { ...plugin.config },
      metadata: { ...plugin.metadata },
      timestamp: new Date(),
    };

    // Allow plugins to provide custom state data
    if (
      typeof (plugin as unknown as { getStateData?: () => Promise<unknown> }).getStateData ===
      'function'
    ) {
      try {
        snapshot.customData = await (
          plugin as unknown as { getStateData: () => Promise<Record<string, unknown>> }
        ).getStateData();
      } catch (error) {
        console.warn(`Failed to get custom state data for plugin ${plugin.metadata.name}:`, error);
      }
    }

    this.stateSnapshots.set(plugin.metadata.name, snapshot);
  }

  /**
   * Restore state from snapshot
   */
  private async restoreStateFromSnapshot(plugin: Plugin): Promise<void> {
    const snapshot = this.stateSnapshots.get(plugin.metadata.name);
    if (!snapshot) {
      return;
    }

    try {
      // Restore configuration
      if (snapshot.config) {
        await plugin.updateConfig(snapshot.config);
      }

      // Restore custom state data
      if (
        snapshot.customData &&
        typeof (plugin as unknown as { setStateData?: (data: unknown) => Promise<void> })
          .setStateData === 'function'
      ) {
        await (
          plugin as unknown as { setStateData: (data: Record<string, unknown>) => Promise<void> }
        ).setStateData(snapshot.customData);
      }

      // Restore plugin state
      if (snapshot.state === PluginState.ACTIVE && plugin.state === PluginState.INITIALIZED) {
        await plugin.activate();
      }
    } catch (error) {
      console.warn(`Failed to restore state for plugin ${plugin.metadata.name}:`, error);
    }
  }

  /**
   * Handle file change events
   */
  private handleFileChange(pluginName: string, filePath: string): void {
    // Clear existing debounce timer
    this.clearDebounceTimer(pluginName);

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        await this.performPluginReload(pluginName, ReloadReason.FILE_CHANGED);
      } catch (error) {
        this.emit('reloadError', { pluginName, filePath, error });
      }
    }, this.debounceDelay);

    this.reloadDebounceTimers.set(pluginName, timer);
  }

  /**
   * Handle watch errors
   */
  private handleWatchError(pluginName: string, error: Error): void {
    this.emit('watchError', { pluginName, error });
  }

  /**
   * Perform plugin reload
   */
  private async performPluginReload(pluginName: string, reason: ReloadReason): Promise<void> {
    const pluginPath = this.pluginPaths.get(pluginName);
    if (!pluginPath) {
      throw new Error(`Plugin path not found for ${pluginName}`);
    }

    try {
      // Get current plugin
      const oldPlugin = this.pluginUseCase.getPlugin(pluginName);
      if (!oldPlugin) {
        throw new Error(`Plugin ${pluginName} not found`);
      }

      // Create state snapshot
      await this.createStateSnapshot(oldPlugin);

      // Unload current plugin
      await this.pluginUseCase.unregister(pluginName);

      // Clear module cache to ensure fresh load
      this.clearModuleCache(pluginPath);

      // Load new plugin
      const newPlugin = await this.pluginUseCase.loadPlugin(pluginPath);

      // Restore state
      await this.restoreStateFromSnapshot(newPlugin);

      // Emit reload event
      const reloadEvent: PluginReloadEvent = {
        pluginName,
        oldPlugin,
        newPlugin,
        reloadReason: reason,
        timestamp: new Date(),
      };

      this.emit('pluginReloaded', reloadEvent);
    } catch (error) {
      // Attempt recovery
      await this.attemptRecovery(
        pluginName,
        pluginPath,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Clear module cache for a plugin
   */
  private clearModuleCache(pluginPath: string): void {
    const resolvedPath = path.resolve(pluginPath);

    // Clear from require cache
    for (const key of Object.keys(require.cache)) {
      if (key.startsWith(resolvedPath)) {
        delete require.cache[key];
      }
    }
  }

  /**
   * Attempt to recover from reload failure
   */
  private async attemptRecovery(
    pluginName: string,
    pluginPath: string,
    error: Error
  ): Promise<void> {
    this.emit('recoveryAttempt', { pluginName, error });

    try {
      // Try to restore from snapshot
      const snapshot = this.stateSnapshots.get(pluginName);
      if (snapshot) {
        // Try to reload the old version
        await this.pluginUseCase.loadPlugin(pluginPath);
        this.emit('recoverySuccess', { pluginName });
      }
    } catch (recoveryError) {
      this.emit('recoveryFailed', { pluginName, originalError: error, recoveryError });
    }
  }

  /**
   * Clear debounce timer
   */
  private clearDebounceTimer(pluginName: string): void {
    const timer = this.reloadDebounceTimers.get(pluginName);
    if (timer) {
      clearTimeout(timer);
      this.reloadDebounceTimers.delete(pluginName);
    }
  }

  /**
   * Setup default watch configuration
   */
  private setupDefaultWatchConfig(): void {
    this.watchConfig = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log',
        '**/*.tmp',
        '**/.DS_Store',
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
      ...this.watchConfig,
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.unwatchAll();
    this.stateSnapshots.clear();
    this.reloadDebounceTimers.clear();
    this.removeAllListeners();
  }
}
