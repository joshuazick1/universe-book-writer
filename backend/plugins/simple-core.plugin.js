/**
 * Simple Core Plugin - Example implementation
 */
import { PluginState, PluginType } from '@universe-book-writer/core';
export const metadata = {
  name: 'simple-core-plugin',
  version: '1.0.0',
  description: 'A simple core plugin for testing basic functionality',
  author: 'Test Author',
  license: 'MIT',
  keywords: ['test', 'core', 'simple'],
  type: PluginType.CORE,
  dependencies: {},
  engines: {
    node: '>=18.0.0',
  },
};
/**
 * Simple Core Plugin Implementation
 */
export default class SimpleCorePlugin {
  metadata = metadata;
  state = PluginState.UNLOADED;
  config = {
    enabled: true,
    settings: {
      debugMode: false,
      timeout: 5000,
    },
  };
  initializationTime = 0;
  activationCount = 0;
  /**
   * Initialize the plugin
   */
  async initialize() {
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
  async activate() {
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
  async deactivate() {
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
  async destroy() {
    console.log('Destroying Simple Core Plugin...');
    // Clean up any resources
    await this.cleanup();
    this.state = PluginState.UNLOADED;
    console.log('Simple Core Plugin destroyed');
  }
  /**
   * Check if plugin can be activated
   */
  canActivate() {
    return this.state === PluginState.INITIALIZED;
  }
  /**
   * Check if plugin can be deactivated
   */
  canDeactivate() {
    return this.state === PluginState.ACTIVE;
  }
  /**
   * Validate plugin configuration
   */
  async validateConfig(config) {
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
      const { debugMode, timeout } = config.settings;
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
  async updateConfig(newConfig) {
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
  getStats() {
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
  testMethod(input) {
    return `Plugin processed: ${input}`;
  }
  // Private helper methods
  async simulateAsyncWork(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  async cleanup() {
    // Clean up any resources
    console.log('Cleaning up Simple Core Plugin resources...');
    // Reset counters
    this.initializationTime = 0;
    this.activationCount = 0;
  }
}
//# sourceMappingURL=simple-core.plugin.js.map
