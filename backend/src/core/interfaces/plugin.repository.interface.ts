/**
 * Plugin repository interface - Core domain repository
 */

import type { PluginRegistryEntry, PluginState, PluginType } from '@universe-book-writer/core';

/**
 * Repository interface for plugin persistence
 */
export interface PluginRepository {
  /**
   * Find a plugin by name
   */
  findByName(name: string): Promise<PluginRegistryEntry | null>;

  /**
   * Find plugins by type
   */
  findByType(type: PluginType): Promise<PluginRegistryEntry[]>;

  /**
   * Find plugins by state
   */
  findByState(state: PluginState): Promise<PluginRegistryEntry[]>;

  /**
   * Find all plugins
   */
  findAll(): Promise<PluginRegistryEntry[]>;

  /**
   * Save a plugin registry entry
   */
  save(entry: PluginRegistryEntry): Promise<PluginRegistryEntry>;

  /**
   * Update a plugin registry entry
   */
  update(id: string, updates: Partial<PluginRegistryEntry>): Promise<PluginRegistryEntry | null>;

  /**
   * Delete a plugin registry entry
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if a plugin exists
   */
  exists(name: string): Promise<boolean>;

  /**
   * Find plugins that depend on the given plugin
   */
  findDependents(pluginName: string): Promise<PluginRegistryEntry[]>;

  /**
   * Find plugins that the given plugin depends on
   */
  findDependencies(pluginName: string): Promise<PluginRegistryEntry[]>;
}
