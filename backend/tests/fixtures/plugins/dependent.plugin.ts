/**
 * Plugin with Dependenc  public config = {
    enabled: true,
    settings: {
      useBaseFunctionality: true,
      enhancedMode: false
    }
  }; Example implementation
 */

import {
  type Plugin,
  PluginState,
  PluginType,
  type PluginConfig,
} from '@verseforge/core';

export const metadata = {
  name: 'dependent-plugin',
  version: '1.0.0',
  description: 'A plugin that depends on other plugins',
  author: 'Test Author',
  license: 'MIT',
  keywords: ['test', 'dependencies'],
  type: PluginType.CORE,
  dependencies: {
    'simple-core-plugin': '^1.0.0',
  },
  engines: {
    node: '>=18.0.0',
  },
};

/**
 * Dependent Plugin Implementation
 */
export default class DependentPlugin implements Plugin {
  public readonly metadata = metadata;
  public state: PluginState = PluginState.UNLOADED;
  public config = {
    enabled: true,
    settings: {
      useBaseFunctionality: true,
      enhancedMode: false,
    },
  };

  private dependencyPlugin?: Plugin;

  /**
   * Validate plugin configuration
   */
  async validateConfig(config: PluginConfig): Promise<boolean> {
    if (typeof config.enabled !== 'boolean') {
      return false;
    }
    if (!config.settings || typeof config.settings !== 'object') {
      return false;
    }
    const settings = config.settings as Record<string, unknown>;
    if (
      typeof settings.useBaseFunctionality !== 'boolean' ||
      typeof settings.enhancedMode !== 'boolean'
    ) {
      return false;
    }
    return true;
  }

  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
    console.log('Initializing Dependent Plugin...');

    // Check if dependency is available
    // Note: In a real implementation, this would use the plugin manager
    // to get the dependency plugin instance
    console.log('Checking dependencies...');

    this.state = PluginState.INITIALIZED;
    console.log('Dependent Plugin initialized successfully');
  }

  /**
   * Activate the plugin
   */
  async activate(): Promise<void> {
    if (!this.canActivate()) {
      throw new Error('Dependent Plugin cannot be activated in current state');
    }

    console.log('Activating Dependent Plugin...');

    // Activate enhanced functionality if dependency is available
    if (this.config.settings.useBaseFunctionality && this.dependencyPlugin) {
      console.log('Using base plugin functionality');
    }

    this.state = PluginState.ACTIVE;
    console.log('Dependent Plugin activated');
  }

  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    if (!this.canDeactivate()) {
      throw new Error('Dependent Plugin cannot be deactivated in current state');
    }

    console.log('Deactivating Dependent Plugin...');

    this.state = PluginState.INITIALIZED;
    console.log('Dependent Plugin deactivated');
  }

  /**
   * Destroy the plugin
   */
  async destroy(): Promise<void> {
    console.log('Destroying Dependent Plugin...');

    // Clean up dependency references
    this.dependencyPlugin = undefined;

    this.state = PluginState.UNLOADED;
    console.log('Dependent Plugin destroyed');
  }

  /**
   * Check if plugin can be activated
   */
  canActivate(): boolean {
    return this.state === PluginState.INITIALIZED;
  }

  /**
   * Check if plugin can be deactivated
   */
  canDeactivate(): boolean {
    return this.state === PluginState.ACTIVE;
  }

  /**
   * Update plugin configuration
   */
  async updateConfig(newConfig: Partial<typeof this.config>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    console.log('Dependent Plugin configuration updated:', { oldConfig, newConfig });
  }

  /**
   * Set dependency plugin reference
   */
  setDependencyPlugin(plugin: Plugin): void {
    if (plugin.metadata.name === 'simple-core-plugin') {
      this.dependencyPlugin = plugin;
      console.log('Dependency plugin reference set');
    }
  }

  /**
   * Use functionality from dependency plugin
   */
  useDependencyFeature(input: string): string {
    if (!this.dependencyPlugin) {
      throw new Error('Dependency plugin not available');
    }

    // In a real implementation, this would call methods on the dependency plugin
    console.log('Using dependency plugin feature');
    return `Enhanced: ${input}`;
  }
}
