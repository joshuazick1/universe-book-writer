/**
 * Plugin use cases - Application layer for plugin management
 */

import {
  type Plugin,
  type PluginConfig,
  type PluginManager,
  PluginMetadata,
  type PluginRegistryEntry,
  PluginState,
  type PluginType,
} from '@universe-book-writer/core';
import type { PluginRepository } from '../../core/interfaces/plugin.repository.interface.js';
import type { PluginDomainService } from '../../core/services/plugin.domain.service.js';
import type { PluginLoader } from '../../infrastructure/loaders/plugin.loader.js';

/**
 * Plugin management use cases
 */
export class PluginUseCase implements PluginManager {
  private readonly loadedPlugins = new Map<string, Plugin>();

  constructor(
    private readonly pluginRepository: PluginRepository,
    private readonly pluginDomainService: PluginDomainService,
    private readonly pluginLoader: PluginLoader
  ) {}

  /**
   * Register a plugin instance
   */
  async register(plugin: Plugin): Promise<void> {
    // Validate metadata
    const metadataValidation = this.pluginDomainService.validateMetadata(plugin.metadata);
    if (!metadataValidation.valid) {
      throw new Error(`Invalid plugin metadata: ${metadataValidation.errors.join(', ')}`);
    }

    // Check for conflicts
    const conflicts = await this.pluginDomainService.checkConflicts(plugin.metadata);
    if (conflicts.hasConflicts) {
      throw new Error(`Plugin conflicts: ${conflicts.conflicts.join(', ')}`);
    }

    // Validate dependencies
    const depValidation = await this.pluginDomainService.validateDependencies(plugin);
    if (!depValidation.valid) {
      throw new Error(
        `Plugin dependency validation failed. Missing: ${depValidation.missing.join(', ')}. Conflicts: ${depValidation.conflicts.join(', ')}`
      );
    }

    // Initialize plugin
    await plugin.initialize();

    // Store in memory and persist
    this.loadedPlugins.set(plugin.metadata.name, plugin);

    const registryEntry = this.pluginDomainService.createRegistryEntry(
      plugin.metadata,
      '', // Load path will be set by loader
      plugin.config
    );

    await this.pluginRepository.save(registryEntry);
  }

  /**
   * Unregister a plugin by name
   */
  async unregister(pluginName: string): Promise<void> {
    // Check if plugin can be safely unloaded
    const canUnload = await this.pluginDomainService.canUnload(pluginName);
    if (!canUnload.canUnload) {
      throw new Error(
        `Cannot unload plugin '${pluginName}'. Active dependents: ${canUnload.dependents.join(', ')}`
      );
    }

    const plugin = this.loadedPlugins.get(pluginName);
    if (plugin) {
      // Deactivate and destroy plugin
      if (plugin.state === PluginState.ACTIVE) {
        await plugin.deactivate();
      }
      await plugin.destroy();

      // Remove from memory
      this.loadedPlugins.delete(pluginName);
    }

    // Remove from persistence
    const registryEntry = await this.pluginRepository.findByName(pluginName);
    if (registryEntry) {
      await this.pluginRepository.delete(registryEntry.id);
    }
  }

  /**
   * Get a plugin instance by name
   */
  getPlugin(pluginName: string): Plugin | undefined {
    return this.loadedPlugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: PluginType): Plugin[] {
    return this.getAllPlugins().filter(plugin => plugin.metadata.type === type);
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(pluginName: string): boolean {
    return this.loadedPlugins.has(pluginName);
  }

  /**
   * Load plugin from file path
   */
  async loadPlugin(pluginPath: string): Promise<Plugin> {
    const plugin = await this.pluginLoader.loadFromPath(pluginPath);
    await this.register(plugin);
    return plugin;
  }

  /**
   * Validate plugin dependencies
   */
  async validateDependencies(plugin: Plugin): Promise<boolean> {
    const validation = await this.pluginDomainService.validateDependencies(plugin);
    return validation.valid;
  }

  /**
   * Get plugin dependency graph
   */
  async getDependencyGraph(): Promise<Map<string, string[]>> {
    return await this.pluginDomainService.getDependencyGraph();
  }

  /**
   * Resolve plugin load order based on dependencies
   */
  resolveLoadOrder(plugins: Plugin[]): Plugin[] {
    // This would typically be async, but interface requires sync
    // For now, return in original order - this should be enhanced
    return plugins;
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginName: string): Promise<void> {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    if (!plugin.canActivate()) {
      throw new Error(
        `Plugin '${pluginName}' cannot be activated in current state: ${plugin.state}`
      );
    }

    await plugin.activate();

    // Update registry
    const registryEntry = await this.pluginRepository.findByName(pluginName);
    if (registryEntry) {
      await this.pluginRepository.update(registryEntry.id, {
        state: PluginState.ACTIVE,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginName: string): Promise<void> {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    if (!plugin.canDeactivate()) {
      throw new Error(
        `Plugin '${pluginName}' cannot be deactivated in current state: ${plugin.state}`
      );
    }

    await plugin.deactivate();

    // Update registry
    const registryEntry = await this.pluginRepository.findByName(pluginName);
    if (registryEntry) {
      await this.pluginRepository.update(registryEntry.id, {
        state: PluginState.INITIALIZED,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get plugin status information
   */
  async getPluginStatus(pluginName: string): Promise<{
    name: string;
    state: PluginState;
    config: PluginConfig;
    dependencies: string[];
    dependents: string[];
    lastError?: string;
  } | null> {
    const plugin = this.getPlugin(pluginName);
    const registryEntry = await this.pluginRepository.findByName(pluginName);

    if (!plugin || !registryEntry) {
      return null;
    }

    const dependents = await this.pluginRepository.findDependents(pluginName);

    return {
      name: plugin.metadata.name,
      state: plugin.state,
      config: plugin.config,
      dependencies: Object.keys(plugin.metadata.dependencies),
      dependents: dependents.map(d => d.pluginMetadata.name),
      lastError: registryEntry.lastError,
    };
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginName: string, config: Partial<PluginConfig>): Promise<void> {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    await plugin.updateConfig(config);

    // Update registry
    const registryEntry = await this.pluginRepository.findByName(pluginName);
    if (registryEntry) {
      await this.pluginRepository.update(registryEntry.id, {
        config: plugin.config,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get all available plugins (including inactive ones)
   */
  async getAllAvailablePlugins(): Promise<PluginRegistryEntry[]> {
    return await this.pluginRepository.findAll();
  }

  /**
   * Load all plugins from registry
   */
  async loadAllPlugins(): Promise<void> {
    const registryEntries = await this.pluginRepository.findAll();
    const enabledEntries = registryEntries.filter(entry => entry.config.enabled);

    // Resolve load order
    const pluginNames = enabledEntries.map(entry => entry.pluginMetadata.name);
    const loadOrder = await this.pluginDomainService.resolveLoadOrder(pluginNames);

    // Load plugins in dependency order
    for (const pluginName of loadOrder) {
      const entry = enabledEntries.find(e => e.pluginMetadata.name === pluginName);
      if (entry?.loadPath) {
        try {
          await this.loadPlugin(entry.loadPath);
        } catch (error) {
          console.error(`Failed to load plugin '${pluginName}':`, error);
          // Update registry with error
          await this.pluginRepository.update(entry.id, {
            state: PluginState.ERROR,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          });
        }
      }
    }
  }
}
