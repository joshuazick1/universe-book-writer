/**
 * Plugin domain service - Core business logic for plugin management
 */

import {
  type Plugin,
  type PluginMetadata,
  type PluginRegistryEntry,
  type PluginConfig,
  PluginState,
  PluginType,
} from '@universe-book-writer/core';
import type { PluginRepository } from '../interfaces/plugin.repository.interface.js';

/**
 * Domain service for plugin business logic
 */
export class PluginDomainService {
  constructor(private pluginRepository: PluginRepository) { }

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
    canReplace: boolean;
    existingPlugin?: any;
  }> {
    const conflicts: string[] = [];
    let canReplace = false;
    let existingPlugin: any = undefined;

    // Check if plugin with same name already exists
    const existing = await this.pluginRepository.findByName(metadata.name);
    if (existing) {
      existingPlugin = existing;

      // Compare versions to determine if this is an update
      const existingVersion = String(existing.metadata?.version || '0.0.0');
      const newVersion = String(metadata.version || '0.0.0');

      // If it's the same version, allow replacement (reload scenario)
      if (existingVersion === newVersion) {
        canReplace = true;
        console.log(`🔄 Plugin '${metadata.name}' v${newVersion} already exists - will be replaced`);
      }
      // If it's a newer version, allow upgrade
      else if (this.compareVersions(newVersion, existingVersion) > 0) {
        canReplace = true;
        console.log(`⬆️ Plugin '${metadata.name}' upgrading from v${existingVersion} to v${newVersion}`);
      }
      // If it's an older version, warn but allow replacement in development
      else if (this.compareVersions(newVersion, existingVersion) < 0) {
        canReplace = process.env.NODE_ENV === 'development';
        if (canReplace) {
          console.warn(`⬇️ Plugin '${metadata.name}' downgrading from v${existingVersion} to v${newVersion} (development mode)`);
        } else {
          conflicts.push(`Plugin '${metadata.name}' v${existingVersion} already exists (newer than v${newVersion})`);
        }
      }

      // If we can't replace, it's a conflict
      if (!canReplace) {
        conflicts.push(`Plugin with name '${metadata.name}' already exists (v${existingVersion})`);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      canReplace,
      existingPlugin,
    };
  }

  /**
   * Compare semantic versions (simple implementation)
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(n => parseInt(n) || 0);
    const v2Parts = version2.split('.').map(n => parseInt(n) || 0);

    // Pad arrays to same length
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);

    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }

    return 0; // Equal
  }

  /**
   * Generate plugin registry entry
   */
  createRegistryEntry(
    metadata: PluginMetadata,
    loadPath: string,
    config?: PluginConfig
  ): PluginRegistryEntry {
    const now = new Date();

    const pluginConfig: PluginConfig = config || { enabled: true, settings: {} };

    return {
      id: `plugin-${metadata.name}-${Date.now()}`,
      pluginMetadata: metadata,
      config: pluginConfig,
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
