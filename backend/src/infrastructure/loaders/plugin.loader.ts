/**
 * Plugin loader - Infrastructure layer for loading plugins from files
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Plugin, type PluginMetadata, PluginType } from '@universe-book-writer/core';
import { PluginEntity } from '../../core/entities/plugin.entity.js';

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  loadFromPath(pluginPath: string): Promise<Plugin>;
  loadFromDirectory(directory: string): Promise<Plugin[]>;
  validatePluginStructure(pluginPath: string): Promise<boolean>;
}

/**
 * File system plugin loader implementation
 */
export class FileSystemPluginLoader implements PluginLoader {
  private readonly supportedExtensions = ['.js', '.mjs'];

  /**
   * Load a plugin from a file path
   */
  async loadFromPath(pluginPath: string): Promise<Plugin> {
    // Validate plugin structure
    if (!(await this.validatePluginStructure(pluginPath))) {
      throw new Error(`Invalid plugin structure at: ${pluginPath}`);
    }

    // Load plugin metadata
    const metadata = await this.loadPluginMetadata(pluginPath);

    // Load plugin implementation
    const pluginModule = await this.loadPluginModule(pluginPath);

    // Create plugin instance
    const plugin = this.createPluginInstance(metadata, pluginModule);
    plugin.setLoadPath(pluginPath);

    return plugin;
  }

  /**
   * Load all plugins from a directory
   */
  async loadFromDirectory(directory: string): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(directory, entry.name);

          try {
            const plugin = await this.loadFromPath(pluginPath);
            plugins.push(plugin);
          } catch (error) {
            console.warn(`Failed to load plugin from ${pluginPath}:`, error);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to read plugin directory ${directory}: ${error}`);
    }

    return plugins;
  }

  /**
   * Validate plugin directory structure
   */
  async validatePluginStructure(pluginPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(pluginPath);

      if (stat.isFile()) {
        // Single file plugin
        return this.supportedExtensions.includes(path.extname(pluginPath));
      }

      if (stat.isDirectory()) {
        // Directory plugin - check for package.json and main file
        const packageJsonPath = path.join(pluginPath, 'package.json');
        const packageJsonExists = await this.fileExists(packageJsonPath);

        if (!packageJsonExists) {
          return false;
        }

        // Check if main file exists
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const mainFile = packageJson.main || 'index.js';
        const mainFilePath = path.join(pluginPath, mainFile);

        return await this.fileExists(mainFilePath);
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load plugin metadata from package.json or plugin manifest
   */
  private async loadPluginMetadata(pluginPath: string): Promise<PluginMetadata> {
    const stat = await fs.stat(pluginPath);
    if (stat.isFile()) {
      // Single file plugin - metadata should be exported
      const fileUrl = pathToFileURL(path.resolve(pluginPath)).href;
      const module = await import(fileUrl);
      if (module.metadata) {
        return module.metadata;
      }
      throw new Error('Plugin metadata not found in module exports');
    }

    if (stat.isDirectory()) {
      // Directory plugin - read from package.json
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      return this.extractMetadataFromPackageJson(packageJson);
    }

    throw new Error('Invalid plugin path');
  }

  /**
   * Load plugin module
   */ private async loadPluginModule(pluginPath: string): Promise<any> {
    const stat = await fs.stat(pluginPath);

    if (stat.isFile()) {
      // Convert absolute path to file URL for ES modules
      const fileUrl = pathToFileURL(path.resolve(pluginPath)).href;
      return await import(fileUrl);
    }

    if (stat.isDirectory()) {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const mainFile = packageJson.main || 'index.js';
      const mainFilePath = path.join(pluginPath, mainFile);

      return await import(mainFilePath);
    }

    throw new Error('Invalid plugin path');
  }

  /**
   * Create plugin instance from metadata and module
   */
  private createPluginInstance(metadata: PluginMetadata, module: any): PluginEntity {
    // Check if module exports a plugin class
    if (module.default && typeof module.default === 'function') {
      // Plugin class constructor
      return new module.default(metadata);
    }

    if (module.Plugin && typeof module.Plugin === 'function') {
      // Named plugin class export
      return new module.Plugin(metadata);
    }

    // Create a generic plugin wrapper
    return new GenericPluginWrapper(metadata, module);
  }

  /**
   * Extract metadata from package.json
   */
  private extractMetadataFromPackageJson(packageJson: any): PluginMetadata {
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
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generic plugin wrapper for modules that don't export a plugin class
 */
class GenericPluginWrapper extends PluginEntity {
  constructor(
    metadata: PluginMetadata,
    private module: any
  ) {
    super(metadata);
  }

  protected async onInitialize(): Promise<void> {
    if (this.module.initialize && typeof this.module.initialize === 'function') {
      await this.module.initialize();
    }
  }

  protected async onActivate(): Promise<void> {
    if (this.module.activate && typeof this.module.activate === 'function') {
      await this.module.activate();
    }
  }

  protected async onDeactivate(): Promise<void> {
    if (this.module.deactivate && typeof this.module.deactivate === 'function') {
      await this.module.deactivate();
    }
  }

  protected async onDestroy(): Promise<void> {
    if (this.module.destroy && typeof this.module.destroy === 'function') {
      await this.module.destroy();
    }
  }
}
