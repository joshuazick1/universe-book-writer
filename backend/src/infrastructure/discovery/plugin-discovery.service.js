/**
 * Plugin discovery system - Automatically discovers and catalogs available plugins
 */
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PluginType } from '@universe-book-writer/core';
import { FileSystemPluginLoader } from '../loaders/plugin.loader.js';
/**
 * Plugin discovery service
 */
export class PluginDiscoveryService extends EventEmitter {
  config;
  loader;
  discoveredPlugins = new Map();
  scanInterval;
  isScanning = false;
  constructor(config = {}) {
    super();
    this.config = {
      searchPaths: ['./plugins', './node_modules'],
      recursive: true,
      maxDepth: 3,
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      includeDotFiles: false,
      followSymlinks: false,
      autoScan: false,
      scanInterval: 60000, // 1 minute
      cacheResults: true,
      validateOnDiscovery: true,
      ...config,
    };
    this.loader = new FileSystemPluginLoader();
    if (this.config.autoScan) {
      this.startAutoScan();
    }
  }
  /**
   * Discover plugins in configured search paths
   */
  async discoverPlugins() {
    if (this.isScanning) {
      throw new Error('Discovery scan already in progress');
    }
    this.isScanning = true;
    const startTime = Date.now();
    try {
      this.emit('scanStarted');
      const previousPlugins = new Map(this.discoveredPlugins);
      const currentPlugins = new Map();
      // Scan each search path
      for (const searchPath of this.config.searchPaths) {
        try {
          const plugins = await this.scanPath(searchPath);
          for (const plugin of plugins) {
            currentPlugins.set(plugin.name, plugin);
          }
        } catch (error) {
          this.emit('scanError', { path: searchPath, error });
        }
      }
      // Calculate scan statistics
      const result = this.calculateScanResult(previousPlugins, currentPlugins, startTime);
      // Update cached results if enabled
      if (this.config.cacheResults) {
        this.discoveredPlugins = currentPlugins;
      }
      this.emit('scanCompleted', result);
      return result;
    } finally {
      this.isScanning = false;
    }
  }
  /**
   * Find plugins matching filter criteria
   */
  findPlugins(filter = {}) {
    const plugins = Array.from(this.discoveredPlugins.values());
    return plugins.filter(plugin => {
      // Type filter
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(plugin.metadata.type)) {
          return false;
        }
      }
      // Name pattern filter
      if (filter.namePattern && !filter.namePattern.test(plugin.name)) {
        return false;
      }
      // Author filter
      if (filter.author && plugin.metadata.author !== filter.author) {
        return false;
      }
      // Version filters
      if (filter.version && plugin.metadata.version !== filter.version) {
        return false;
      }
      if (
        filter.minVersion &&
        this.compareVersions(plugin.metadata.version, filter.minVersion) < 0
      ) {
        return false;
      }
      if (
        filter.maxVersion &&
        this.compareVersions(plugin.metadata.version, filter.maxVersion) > 0
      ) {
        return false;
      }
      // Keywords filter
      if (filter.hasKeywords) {
        const pluginKeywords = plugin.metadata.keywords || [];
        if (!filter.hasKeywords.every(keyword => pluginKeywords.includes(keyword))) {
          return false;
        }
      }
      // Validity filter
      if (filter.isValid !== undefined && plugin.isValid !== filter.isValid) {
        return false;
      }
      return true;
    });
  }
  /**
   * Get plugin by name
   */
  getPlugin(name) {
    return this.discoveredPlugins.get(name);
  }
  /**
   * Get all discovered plugins
   */
  getAllPlugins() {
    return Array.from(this.discoveredPlugins.values());
  }
  /**
   * Get plugins by type
   */
  getPluginsByType(type) {
    return this.findPlugins({ type });
  }
  /**
   * Start automatic scanning
   */
  startAutoScan() {
    if (this.scanInterval) {
      return; // Already running
    }
    this.scanInterval = setInterval(async () => {
      try {
        await this.discoverPlugins();
      } catch (error) {
        this.emit('autoScanError', error);
      }
    }, this.config.scanInterval);
    this.emit('autoScanStarted');
  }
  /**
   * Stop automatic scanning
   */
  stopAutoScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
      this.emit('autoScanStopped');
    }
  }
  /**
   * Update discovery configuration
   */
  updateConfig(config) {
    const wasAutoScanning = this.config.autoScan;
    this.config = { ...this.config, ...config };
    // Handle auto-scan configuration changes
    if (!wasAutoScanning && this.config.autoScan) {
      this.startAutoScan();
    } else if (wasAutoScanning && !this.config.autoScan) {
      this.stopAutoScan();
    }
  }
  /**
   * Clear discovery cache
   */
  clearCache() {
    this.discoveredPlugins.clear();
    this.emit('cacheCleared');
  }
  /**
   * Get discovery statistics
   */
  getStatistics() {
    const plugins = Array.from(this.discoveredPlugins.values());
    const validPlugins = plugins.filter(p => p.isValid);
    const invalidPlugins = plugins.filter(p => !p.isValid);
    const pluginsByType = Object.values(PluginType).reduce((acc, type) => {
      acc[type] = plugins.filter(p => p.metadata.type === type).length;
      return acc;
    }, {});
    const lastScanTime =
      plugins.length > 0
        ? new Date(Math.max(...plugins.map(p => p.lastScanned.getTime())))
        : undefined;
    return {
      totalPlugins: plugins.length,
      validPlugins: validPlugins.length,
      invalidPlugins: invalidPlugins.length,
      pluginsByType,
      lastScanTime,
    };
  }
  /**
   * Scan a specific path for plugins
   */
  async scanPath(searchPath, currentDepth = 0) {
    const plugins = [];
    try {
      // Check if path exists
      const pathExists = await this.pathExists(searchPath);
      if (!pathExists) {
        return plugins;
      }
      const entries = await fs.readdir(searchPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(searchPath, entry.name);
        // Skip excluded patterns
        if (this.isExcluded(fullPath)) {
          continue;
        }
        // Skip dot files if not included
        if (!this.config.includeDotFiles && entry.name.startsWith('.')) {
          continue;
        }
        if (entry.isDirectory()) {
          // Check if directory contains a plugin
          const pluginEntry = await this.checkDirectoryForPlugin(fullPath);
          if (pluginEntry) {
            plugins.push(pluginEntry);
          }
          // Recursively scan subdirectories if enabled and within depth limit
          if (this.config.recursive && currentDepth < this.config.maxDepth) {
            const subPlugins = await this.scanPath(fullPath, currentDepth + 1);
            plugins.push(...subPlugins);
          }
        } else if (entry.isFile()) {
          // Check if file is a plugin
          const pluginEntry = await this.checkFileForPlugin(fullPath);
          if (pluginEntry) {
            plugins.push(pluginEntry);
          }
        } else if (entry.isSymbolicLink() && this.config.followSymlinks) {
          // Follow symbolic links if enabled
          const symlinkEntry = await this.checkSymlinkForPlugin(fullPath);
          if (symlinkEntry) {
            plugins.push(symlinkEntry);
          }
        }
      }
    } catch (error) {
      this.emit('scanPathError', { path: searchPath, error });
    }
    return plugins;
  }
  /**
   * Check if directory contains a plugin
   */
  async checkDirectoryForPlugin(dirPath) {
    try {
      // Look for package.json with plugin metadata
      const packageJsonPath = path.join(dirPath, 'package.json');
      const packageJsonExists = await this.pathExists(packageJsonPath);
      if (packageJsonExists) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        // Check if it's a valid plugin package
        if (
          packageJson['universe-book-writer'] ||
          packageJson.keywords?.includes('universe-book-writer-plugin')
        ) {
          return await this.createDiscoveryEntry(dirPath, packageJson);
        }
      }
    } catch (error) {
      // Not a valid plugin directory
    }
    return null;
  }
  /**
   * Check if file is a plugin
   */
  async checkFileForPlugin(filePath) {
    try {
      // Check file extension
      const ext = path.extname(filePath);
      if (!['.js', '.mjs', '.cjs'].includes(ext)) {
        return null;
      }
      // Try to load and validate as plugin
      if (await this.loader.validatePluginStructure(filePath)) {
        const plugin = await this.loader.loadFromPath(filePath);
        return await this.createDiscoveryEntryFromPlugin(filePath, plugin);
      }
    } catch (error) {
      // Not a valid plugin file
    }
    return null;
  }
  /**
   * Check if symlink points to a plugin
   */
  async checkSymlinkForPlugin(symlinkPath) {
    try {
      const realPath = await fs.realpath(symlinkPath);
      const stats = await fs.stat(realPath);
      if (stats.isDirectory()) {
        return await this.checkDirectoryForPlugin(realPath);
      }
      if (stats.isFile()) {
        return await this.checkFileForPlugin(realPath);
      }
    } catch (error) {
      // Invalid symlink
    }
    return null;
  }
  /**
   * Create discovery entry from package.json
   */
  async createDiscoveryEntry(pluginPath, packageJson) {
    const stats = await fs.stat(pluginPath);
    const metadata = this.extractMetadataFromPackageJson(packageJson);
    let isValid = true;
    if (this.config.validateOnDiscovery) {
      try {
        isValid = await this.loader.validatePluginStructure(pluginPath);
      } catch {
        isValid = false;
      }
    }
    return {
      name: metadata.name,
      path: pluginPath,
      metadata,
      isValid,
      lastScanned: new Date(),
      size: await this.calculateDirectorySize(pluginPath),
      checksum: await this.calculateChecksum(pluginPath),
    };
  }
  /**
   * Create discovery entry from loaded plugin
   */
  async createDiscoveryEntryFromPlugin(pluginPath, plugin) {
    const stats = await fs.stat(pluginPath);
    return {
      name: plugin.metadata.name,
      path: pluginPath,
      metadata: plugin.metadata,
      isValid: true,
      lastScanned: new Date(),
      size: stats.size,
      checksum: await this.calculateChecksum(pluginPath),
    };
  }
  /**
   * Extract metadata from package.json
   */
  extractMetadataFromPackageJson(packageJson) {
    const universeBookWriter = packageJson['universe-book-writer'] || {};
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || '',
      author: packageJson.author || '',
      homepage: packageJson.homepage,
      repository: packageJson.repository?.url || packageJson.repository,
      license: packageJson.license,
      keywords: packageJson.keywords || [],
      type: universeBookWriter.type || PluginType.CORE,
      dependencies: packageJson.dependencies || {},
      peerDependencies: packageJson.peerDependencies,
      engines: packageJson.engines,
    };
  }
  /**
   * Check if path is excluded by patterns
   */
  isExcluded(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    return this.config.excludePatterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(relativePath);
    });
  }
  /**
   * Check if path exists
   */
  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Calculate directory size recursively
   */
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        } else if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
    return totalSize;
  }
  /**
   * Calculate checksum for file or directory
   */
  async calculateChecksum(filePath) {
    const crypto = await import('node:crypto');
    const hash = crypto.createHash('sha256');
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        const content = await fs.readFile(filePath);
        hash.update(content);
      } else if (stats.isDirectory()) {
        // For directories, hash the package.json if it exists
        const packageJsonPath = path.join(filePath, 'package.json');
        if (await this.pathExists(packageJsonPath)) {
          const content = await fs.readFile(packageJsonPath);
          hash.update(content);
        }
      }
    } catch {
      // Use path as fallback
      hash.update(filePath);
    }
    return hash.digest('hex');
  }
  /**
   * Calculate scan result statistics
   */
  calculateScanResult(previous, current, startTime) {
    const currentPlugins = Array.from(current.values());
    const validPlugins = currentPlugins.filter(p => p.isValid);
    const invalidPlugins = currentPlugins.filter(p => !p.isValid);
    // Calculate changes
    let newPlugins = 0;
    let updatedPlugins = 0;
    for (const [name, plugin] of current) {
      const previousPlugin = previous.get(name);
      if (!previousPlugin) {
        newPlugins++;
      } else if (previousPlugin.checksum !== plugin.checksum) {
        updatedPlugins++;
      }
    }
    const removedPlugins = previous.size - (current.size - newPlugins);
    return {
      totalFound: currentPlugins.length,
      validPlugins: validPlugins.length,
      invalidPlugins: invalidPlugins.length,
      newPlugins,
      updatedPlugins,
      removedPlugins: Math.max(0, removedPlugins),
      scanDuration: Date.now() - startTime,
      timestamp: new Date(),
      plugins: currentPlugins,
    };
  }
  /**
   * Compare semantic versions
   */
  compareVersions(a, b) {
    const parseVersion = version => {
      const parts = version.split('.').map(n => Number.parseInt(n, 10));
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };
    const versionA = parseVersion(a);
    const versionB = parseVersion(b);
    if (versionA.major !== versionB.major) {
      return versionA.major - versionB.major;
    }
    if (versionA.minor !== versionB.minor) {
      return versionA.minor - versionB.minor;
    }
    return versionA.patch - versionB.patch;
  }
  /**
   * Cleanup resources
   */
  destroy() {
    this.stopAutoScan();
    this.clearCache();
    this.removeAllListeners();
  }
}
//# sourceMappingURL=plugin-discovery.service.js.map
