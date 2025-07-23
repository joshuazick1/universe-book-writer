/**
 * Simple Core Plugin - Example implementation
 */

import {
  type Plugin,
  PluginState,
  PluginType,
  type PluginConfig,
} from '@verseforge/core';

export const metadata = {
  name: 'simple-core-plugin',
  version: '1.0.0',
  description: 'A simple core plugin for testing basic functionality',
  author: 'Test Author',
  license: 'MIT',
  keywords: ['test', 'core', 'simple'],
  type: PluginType.CORE,
  dependencies: {} as Record<string, string>,
  engines: {
    node: '>=18.0.0',
  },
};

/**
 * Simple Core Plugin Implementation
 */
export default class SimpleCorePlugin implements Plugin {
  public readonly metadata = metadata;
  public state: PluginState = PluginState.UNLOADED;
  public config = {
    enabled: true,
    settings: {
      debugMode: false,
      timeout: 5000,
    },
  };

  private initializationTime = 0;
  private activationCount = 0;

  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
    console.log('Initializing Simple Core Plugin...');

    const startTime = Date.now();

    // Simulate initialization work
    await this.simulateAsyncWork(100);

    this.initializationTime = Date.now() - startTime;
    this.state = PluginState.INITIALIZED;

    console.log(`Simple Core Plugin initialized in ${this.initializationTime}ms`);
  }

  /**
   * Activate the plugin
   */
  async activate(): Promise<void> {
    if (!this.canActivate()) {
      throw new Error('Simple Core Plugin cannot be activated in current state');
    }

    console.log('Activating Simple Core Plugin...');

    // Simulate activation work
    await this.simulateAsyncWork(50);

    this.activationCount++;
    this.state = PluginState.ACTIVE;

    console.log(`Simple Core Plugin activated (activation #${this.activationCount})`);
  }

  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    if (!this.canDeactivate()) {
      throw new Error('Simple Core Plugin cannot be deactivated in current state');
    }

    console.log('Deactivating Simple Core Plugin...');

    // Simulate deactivation work
    await this.simulateAsyncWork(25);

    this.state = PluginState.INITIALIZED;

    console.log('Simple Core Plugin deactivated');
  }

  /**
   * Destroy the plugin
   */
  async destroy(): Promise<void> {
    console.log('Destroying Simple Core Plugin...');

    // Clean up any resources
    await this.cleanup();

    this.state = PluginState.UNLOADED;

    console.log('Simple Core Plugin destroyed');
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
   * Validate plugin configuration
   */
  async validateConfig(config: PluginConfig): Promise<boolean> {
    try {
      // Basic validation for the config structure
      if (!config || typeof config !== 'object') {
        return false;
      }

      // Check if enabled is a boolean
      if (typeof config.enabled !== 'boolean') {
        return false;
      }

      // Check if settings exist and is an object
      if (!config.settings || typeof config.settings !== 'object') {
        return false;
      }

      // Validate settings structure for this plugin
      const settings = config.settings as Record<string, unknown>;
      const { debugMode, timeout } = settings;
      if (typeof debugMode !== 'boolean' || typeof timeout !== 'number') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Config validation error:', error);
      return false;
    }
  }

  /**
   * Update plugin configuration
   */
  async updateConfig(newConfig: Partial<typeof this.config>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    console.log('Simple Core Plugin configuration updated:', { oldConfig, newConfig });

    // Handle debug mode changes
    if (
      newConfig.settings?.debugMode !== undefined &&
      newConfig.settings.debugMode !== oldConfig.settings.debugMode
    ) {
      console.log(`Debug mode ${newConfig.settings.debugMode ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    initializationTime: number;
    activationCount: number;
    state: PluginState;
    uptime: number;
  } {
    return {
      initializationTime: this.initializationTime,
      activationCount: this.activationCount,
      state: this.state,
      uptime: this.state === PluginState.ACTIVE ? Date.now() : 0,
    };
  }

  /**
   * Test method for validation
   */
  testMethod(input: string): string {
    return `Plugin processed: ${input}`;
  }

  // Private helper methods
  private async simulateAsyncWork(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async cleanup(): Promise<void> {
    // Clean up any resources
    console.log('Cleaning up Simple Core Plugin resources...');

    // Reset counters
    this.initializationTime = 0;
    this.activationCount = 0;
  }
}
