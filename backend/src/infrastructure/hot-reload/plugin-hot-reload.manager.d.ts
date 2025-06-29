/**
 * Plugin hot reload manager - Orchestrates plugin watching and reload operations
 */
/// <reference types="node" resolution-mode="require"/>
import { EventEmitter } from 'node:events';
import type { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';
import { type WatchConfig } from './plugin-watcher.js';
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
export declare class PluginHotReloadManager extends EventEmitter {
    private pluginUseCase;
    private watcher;
    private config;
    private reloadQueue;
    private batchTimer?;
    private retryQueues;
    private reloadMetrics;
    private reloadTimes;
    constructor(pluginUseCase: PluginUseCase, config?: HotReloadConfig);
    /**
     * Enable hot reload
     */
    enable(): void;
    /**
     * Disable hot reload
     */
    disable(): void;
    /**
     * Check if hot reload is enabled
     */
    isEnabled(): boolean;
    /**
     * Start watching a plugin
     */
    startWatching(pluginName: string): Promise<void>;
    /**
     * Stop watching a plugin
     */
    stopWatching(pluginName: string): Promise<void>;
    /**
     * Start watching all registered plugins
     */
    startWatchingAll(): Promise<void>;
    /**
     * Stop watching all plugins
     */
    stopWatchingAll(): Promise<void>;
    /**
     * Manually reload a plugin
     */
    reloadPlugin(pluginName: string): Promise<void>;
    /**
     * Reload multiple plugins
     */
    reloadPlugins(pluginNames: string[]): Promise<void>;
    /**
     * Get watched plugins
     */
    getWatchedPlugins(): string[];
    /**
     * Get hot reload metrics
     */
    getMetrics(): HotReloadMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<HotReloadConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): HotReloadConfig;
    /**
     * Setup watcher event handlers
     */
    private setupWatcherEvents;
    /**
     * Handle successful plugin reload
     */
    private handlePluginReloaded;
    /**
     * Handle reload error
     */
    private handleReloadError;
    /**
     * Schedule a retry for failed reload
     */
    private scheduleRetry;
    /**
     * Cancel retries for a plugin
     */
    private cancelRetries;
    /**
     * Queue dependent plugins for reload
     */
    private queueDependentReloads;
    /**
     * Process batched reloads
     */
    private processBatchedReloads;
    /**
     * Reload dependent plugins immediately
     */
    private reloadDependents;
    /**
     * Find plugins that depend on the given plugin
     */
    private findDependentPlugins;
    /**
     * Update average reload time
     */
    private updateAverageReloadTime;
    /**
     * Update metrics
     */
    private updateMetrics;
    /**
     * Clear batch timer
     */
    private clearBatchTimer;
    /**
     * Clear all retry timers
     */
    private clearRetryTimers;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}
//# sourceMappingURL=plugin-hot-reload.manager.d.ts.map