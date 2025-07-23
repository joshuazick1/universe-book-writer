/**
 * Plugin loader - Infrastructure layer for loading plugins from files
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  type Plugin,
  type PluginMetadata,
  type PluginConfig,
  PluginType,
} from '@verseforge/core';
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
 * Plugin module interface
 */
interface PluginModule {
  default?: new (metadata?: PluginMetadata) => Plugin;
  Plugin?: new (metadata?: PluginMetadata) => Plugin;
  metadata?: PluginMetadata;
  [key: string]: unknown;
}

/**
 * File system plugin loader implementation
 */
export class FileSystemPluginLoader implements PluginLoader {
  private readonly supportedExtensions = ['.js', '.mjs', '.ts'];

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

    // If the plugin is not already a PluginEntity, wrap it
    let entityPlugin: PluginEntity;
    if (plugin instanceof PluginEntity) {
      entityPlugin = plugin;
    } else {
      entityPlugin = new PluginEntityWrapper(plugin);
    }

    entityPlugin.setLoadPath(pluginPath);
    return entityPlugin;
  }

  /**
   * Load all plugins from a directory
   */
  async loadFromDirectory(directory: string): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    try {
      console.log(`🔍 Looking for plugins in directory: ${directory}`);
      const entries = await fs.readdir(directory, { withFileTypes: true });
      console.log(`📁 Found ${entries.length} entries in plugin directory`);

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(directory, entry.name);
          console.log(`🔌 Attempting to load plugin from: ${pluginPath}`);

          try {
            const plugin = await this.loadFromPath(pluginPath);
            plugins.push(plugin);
            console.log(`✅ Successfully loaded plugin: ${plugin.metadata.name}`);
          } catch (error) {
            console.warn(`❌ Failed to load plugin from ${pluginPath}:`, error);
          }
        } else {
          console.log(`⏭️ Skipping non-directory entry: ${entry.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to read plugin directory ${directory}:`, error);
      throw new Error(`Failed to read plugin directory ${directory}: ${error}`);
    }

    console.log(`🎉 Loaded ${plugins.length} plugins successfully`);
    return plugins;
  }

  /**
   * Validate plugin directory structure
   */
  async validatePluginStructure(pluginPath: string): Promise<boolean> {
    try {
      console.log(`🔍 Validating plugin structure for: ${pluginPath}`);
      const stat = await fs.stat(pluginPath);

      if (stat.isFile()) {
        // Single file plugin
        const extension = path.extname(pluginPath);
        const isSupported = this.supportedExtensions.includes(extension);
        console.log(`📄 Single file plugin with extension ${extension}, supported: ${isSupported}`);
        return isSupported;
      }

      if (stat.isDirectory()) {
        // Directory plugin - check for package.json and main file
        const packageJsonPath = path.join(pluginPath, 'package.json');
        const packageJsonExists = await this.fileExists(packageJsonPath);
        console.log(`📦 Package.json exists: ${packageJsonExists}`);

        if (!packageJsonExists) {
          console.log(`❌ No package.json found at ${packageJsonPath}`);
          return false;
        }

        // Check if main file exists
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const mainFile = packageJson.main || 'index.js';
        const mainFilePath = path.join(pluginPath, mainFile);
        const mainFileExists = await this.fileExists(mainFilePath);

        console.log(`📄 Main file: ${mainFile}, exists: ${mainFileExists}`);
        console.log(`📍 Full main file path: ${mainFilePath}`);

        return mainFileExists;
      }

      console.log(`❌ Plugin path is neither file nor directory`);
      return false;
    } catch (error) {
      console.error(`❌ Error validating plugin structure:`, error);
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
   */ private async loadPluginModule(pluginPath: string): Promise<PluginModule> {
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

      // Convert absolute path to file URL for ES modules
      const fileUrl = pathToFileURL(path.resolve(mainFilePath)).href;
      return await import(fileUrl);
    }

    throw new Error('Invalid plugin path');
  }

  /**
   * Create plugin instance from metadata and module
   */
  private createPluginInstance(metadata: PluginMetadata, module: PluginModule): Plugin {
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
  private extractMetadataFromPackageJson(packageJson: Record<string, unknown>): PluginMetadata {
    const verseforge =
      (packageJson['verseforge'] as Record<string, unknown>) || {};

    return {
      name: packageJson.name as string,
      version: packageJson.version as string,
      description: (packageJson.description as string) || '',
      author: (packageJson.author as string) || '',
      homepage: packageJson.homepage as string | undefined,
      repository:
        (packageJson.repository as { url?: string })?.url || (packageJson.repository as string),
      license: packageJson.license as string | undefined,
      keywords: (packageJson.keywords as string[]) || [],
      type: (verseforge.type as PluginType) || PluginType.CORE,
      dependencies: (packageJson.dependencies as Record<string, string>) || {},
      peerDependencies: packageJson.peerDependencies as Record<string, string> | undefined,
      engines: packageJson.engines as { node?: string; npm?: string } | undefined,
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
    private module: PluginModule
  ) {
    super(metadata);
  }

  protected override async onInitialize(): Promise<void> {
    if (this.module.initialize && typeof this.module.initialize === 'function') {
      await this.module.initialize();
    }
  }

  protected override async onActivate(): Promise<void> {
    if (this.module.activate && typeof this.module.activate === 'function') {
      await this.module.activate();
    }
  }

  protected override async onDeactivate(): Promise<void> {
    if (this.module.deactivate && typeof this.module.deactivate === 'function') {
      await this.module.deactivate();
    }
  }

  protected override async onDestroy(): Promise<void> {
    if (this.module.destroy && typeof this.module.destroy === 'function') {
      await this.module.destroy();
    }
  }
}

/**
 * Wrapper to convert Plugin interface implementations to PluginEntity
 */
class PluginEntityWrapper extends PluginEntity {
  constructor(private wrappedPlugin: Plugin) {
    super(wrappedPlugin.metadata, wrappedPlugin.config);
  }

  protected override async onInitialize(): Promise<void> {
    await this.wrappedPlugin.initialize();
  }

  protected override async onActivate(): Promise<void> {
    await this.wrappedPlugin.activate();
  }

  protected override async onDeactivate(): Promise<void> {
    await this.wrappedPlugin.deactivate();
  }

  protected override async onDestroy(): Promise<void> {
    await this.wrappedPlugin.destroy();
  }

  override async validateConfig(config: PluginConfig): Promise<boolean> {
    return await this.wrappedPlugin.validateConfig(config);
  }

  override async updateConfig(config: Partial<PluginConfig>): Promise<void> {
    await this.wrappedPlugin.updateConfig(config);
  }

  override canActivate(): boolean {
    return this.wrappedPlugin.canActivate();
  }

  override canDeactivate(): boolean {
    return this.wrappedPlugin.canDeactivate();
  }

  /**
   * Get the wrapped plugin instance for accessing custom methods
   */
  getWrappedPlugin(): Plugin {
    return this.wrappedPlugin;
  }

  /**
   * Proxy method calls to the wrapped plugin for universe-specific functionality
   */
  getSubUniverses?(): any {
    if (typeof (this.wrappedPlugin as any).getSubUniverses === 'function') {
      return (this.wrappedPlugin as any).getSubUniverses();
    }
    return undefined;
  }

  validateSubUniverse?(subUniverseId: string): boolean {
    if (typeof (this.wrappedPlugin as any).validateSubUniverse === 'function') {
      return (this.wrappedPlugin as any).validateSubUniverse(subUniverseId);
    }
    return false;
  }

  getSubUniverseConfig?(subUniverseId: string): Record<string, unknown> | null {
    if (typeof (this.wrappedPlugin as any).getSubUniverseConfig === 'function') {
      return (this.wrappedPlugin as any).getSubUniverseConfig(subUniverseId);
    }
    return null;
  }
}
