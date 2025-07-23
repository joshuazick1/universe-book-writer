/**
 * Plugin discovery system - Automatically discovers and catalogs available plugins
 */
/// <reference types="node" resolution-mode="require"/>
import { EventEmitter } from 'node:events';
import { type PluginMetadata, PluginType } from '@universe-book-writer/core';
/**
 * Plugin discovery entry
 */
export interface PluginDiscoveryEntry {
    name: string;
    path: string;
    metadata: PluginMetadata;
    isValid: boolean;
    lastScanned: Date;
    size: number;
    checksum: string;
}
/**
 * Discovery scan result
 */
export interface DiscoveryScanResult {
    totalFound: number;
    validPlugins: number;
    invalidPlugins: number;
    newPlugins: number;
    updatedPlugins: number;
    removedPlugins: number;
    scanDuration: number;
    timestamp: Date;
    plugins: PluginDiscoveryEntry[];
}
/**
 * Discovery configuration
 */
export interface DiscoveryConfig {
    searchPaths: string[];
    recursive: boolean;
    maxDepth: number;
    excludePatterns: string[];
    includeDotFiles: boolean;
    followSymlinks: boolean;
    autoScan: boolean;
    scanInterval: number;
    cacheResults: boolean;
    validateOnDiscovery: boolean;
}
/**
 * Plugin filter criteria
 */
export interface PluginFilter {
    type?: PluginType | PluginType[];
    namePattern?: RegExp;
    author?: string;
    version?: string;
    minVersion?: string;
    maxVersion?: string;
    hasKeywords?: string[];
    isValid?: boolean;
}
/**
 * Plugin discovery service
 */
export declare class PluginDiscoveryService extends EventEmitter {
    private config;
    private loader;
    private discoveredPlugins;
    private scanInterval?;
    private isScanning;
    constructor(config?: Partial<DiscoveryConfig>);
    /**
     * Discover plugins in configured search paths
     */
    discoverPlugins(): Promise<DiscoveryScanResult>;
    /**
     * Find plugins matching filter criteria
     */
    findPlugins(filter?: PluginFilter): PluginDiscoveryEntry[];
    /**
     * Get plugin by name
     */
    getPlugin(name: string): PluginDiscoveryEntry | undefined;
    /**
     * Get all discovered plugins
     */
    getAllPlugins(): PluginDiscoveryEntry[];
    /**
     * Get plugins by type
     */
    getPluginsByType(type: PluginType): PluginDiscoveryEntry[];
    /**
     * Start automatic scanning
     */
    startAutoScan(): void;
    /**
     * Stop automatic scanning
     */
    stopAutoScan(): void;
    /**
     * Update discovery configuration
     */
    updateConfig(config: Partial<DiscoveryConfig>): void;
    /**
     * Clear discovery cache
     */
    clearCache(): void;
    /**
     * Get discovery statistics
     */
    getStatistics(): {
        totalPlugins: number;
        validPlugins: number;
        invalidPlugins: number;
        pluginsByType: Record<PluginType, number>;
        lastScanTime?: Date;
    };
    /**
     * Scan a specific path for plugins
     */
    private scanPath;
    /**
     * Check if directory contains a plugin
     */
    private checkDirectoryForPlugin;
    /**
     * Check if file is a plugin
     */
    private checkFileForPlugin;
    /**
     * Check if symlink points to a plugin
     */
    private checkSymlinkForPlugin;
    /**
     * Create discovery entry from package.json
     */
    private createDiscoveryEntry;
    /**
     * Create discovery entry from loaded plugin
     */
    private createDiscoveryEntryFromPlugin;
    /**
     * Extract metadata from package.json
     */
    private extractMetadataFromPackageJson;
    /**
     * Check if path is excluded by patterns
     */
    private isExcluded;
    /**
     * Check if path exists
     */
    private pathExists;
    /**
     * Calculate directory size recursively
     */
    private calculateDirectorySize;
    /**
     * Calculate checksum for file or directory
     */
    private calculateChecksum;
    /**
     * Calculate scan result statistics
     */
    private calculateScanResult;
    /**
     * Compare semantic versions
     */
    private compareVersions;
    /**
     * Cleanup resources
     */
    destroy(): void;
}
//# sourceMappingURL=plugin-discovery.service.d.ts.map