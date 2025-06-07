/**
 * Plugin domain service - Core business logic for plugin management
 */

import {
  type Plugin,
  type PluginMetadata,
  type PluginRegistryEntry,
  PluginState,
  PluginType,
} from '@universe-book-writer/core';
import type { PluginRepository } from '../interfaces/plugin.repository.interface.js';

/**
 * Domain service for plugin business logic
 */
export class PluginDomainService {
  constructor(private pluginRepository: PluginRepository) {}

  /**
   * Validate plugin dependencies
   */
  async validateDependencies(plugin: Plugin): Promise<{
    valid: boolean;
    missing: string[];
    conflicts: string[];
  }> {
    const missing: string[] = [];
    const conflicts: string[] = [];

    // Check each dependency
    for (const [depName, depVersion] of Object.entries(plugin.metadata.dependencies)) {
      const existingPlugin = await this.pluginRepository.findByName(depName);

      if (!existingPlugin) {
        missing.push(`${depName}@${depVersion}`);
        continue;
      }

      // Simple version check (could be enhanced with semver)
      if (existingPlugin.pluginMetadata.version !== depVersion) {
        conflicts.push(
          `${depName}: required ${depVersion}, found ${existingPlugin.pluginMetadata.version}`
        );
      }
    }

    return {
      valid: missing.length === 0 && conflicts.length === 0,
      missing,
      conflicts,
    };
  }

  /**
   * Get plugin dependency graph
   */
  async getDependencyGraph(): Promise<Map<string, string[]>> {
    const allPlugins = await this.pluginRepository.findAll();
    const graph = new Map<string, string[]>();

    for (const plugin of allPlugins) {
      const dependencies = Object.keys(plugin.pluginMetadata.dependencies);
      graph.set(plugin.pluginMetadata.name, dependencies);
    }

    return graph;
  }

  /**
   * Resolve plugin load order based on dependencies
   */
  async resolveLoadOrder(pluginNames: string[]): Promise<string[]> {
    const graph = await this.getDependencyGraph();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (pluginName: string): void => {
      if (visited.has(pluginName)) {
        return;
      }

      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving plugin: ${pluginName}`);
      }

      visiting.add(pluginName);

      const dependencies = graph.get(pluginName) || [];
      for (const dep of dependencies) {
        if (pluginNames.includes(dep)) {
          visit(dep);
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      result.push(pluginName);
    };

    for (const pluginName of pluginNames) {
      visit(pluginName);
    }

    return result;
  }

  /**
   * Check if a plugin can be safely unloaded
   */
  async canUnload(pluginName: string): Promise<{
    canUnload: boolean;
    dependents: string[];
  }> {
    const dependents = await this.pluginRepository.findDependents(pluginName);
    const activeDependents = dependents.filter(
      p => p.state === PluginState.ACTIVE || p.state === PluginState.INITIALIZED
    );

    return {
      canUnload: activeDependents.length === 0,
      dependents: activeDependents.map(p => p.pluginMetadata.name),
    };
  }

  /**
   * Validate plugin metadata
   */
  validateMetadata(metadata: PluginMetadata): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Plugin name is required');
    }

    if (!metadata.version || metadata.version.trim().length === 0) {
      errors.push('Plugin version is required');
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      errors.push('Plugin description is required');
    }

    if (!metadata.author || metadata.author.trim().length === 0) {
      errors.push('Plugin author is required');
    }

    if (!Object.values(PluginType).includes(metadata.type)) {
      errors.push(`Invalid plugin type: ${metadata.type}`);
    }

    // Name format validation
    if (metadata.name && !/^[a-z0-9-]+$/.test(metadata.name)) {
      errors.push('Plugin name must contain only lowercase letters, numbers, and hyphens');
    }

    // Version format validation (basic semver)
    if (metadata.version && !/^\d+\.\d+\.\d+(-.*)?$/.test(metadata.version)) {
      errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for plugin conflicts
   */
  async checkConflicts(metadata: PluginMetadata): Promise<{
    hasConflicts: boolean;
    conflicts: string[];
  }> {
    const conflicts: string[] = [];

    // Check if plugin with same name already exists
    const existingPlugin = await this.pluginRepository.findByName(metadata.name);
    if (existingPlugin) {
      conflicts.push(`Plugin with name '${metadata.name}' already exists`);
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Generate plugin registry entry
   */
  createRegistryEntry(
    metadata: PluginMetadata,
    loadPath: string,
    config?: any
  ): PluginRegistryEntry {
    const now = new Date();

    return {
      id: `plugin-${metadata.name}-${Date.now()}`,
      pluginMetadata: metadata,
      config: config || { enabled: true, settings: {} },
      state: PluginState.UNLOADED,
      loadPath,
      dependents: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        createdBy: 'system',
        tags: metadata.keywords || [],
      },
    };
  }
}
