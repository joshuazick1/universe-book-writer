/**
 * Plugin entity - Core domain model for plugins
 */
import { PluginState } from '@universe-book-writer/core';
/**
 * Plugin entity representing a loaded plugin instance
 */
export class PluginEntity {
  metadata;
  _state = PluginState.UNLOADED;
  _config;
  _loadPath;
  _lastError;
  constructor(metadata, config) {
    this.metadata = metadata;
    this._config = {
      enabled: true,
      settings: {},
      ...config,
    };
  }
  get state() {
    return this._state;
  }
  get config() {
    return { ...this._config };
  }
  get loadPath() {
    return this._loadPath;
  }
  get lastError() {
    return this._lastError;
  }
  /**
   * Initialize the plugin
   */
  async initialize() {
    try {
      this._state = PluginState.LOADED;
      await this.onInitialize();
      this._state = PluginState.INITIALIZED;
      this._lastError = undefined;
    } catch (error) {
      this._state = PluginState.ERROR;
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  /**
   * Activate the plugin
   */
  async activate() {
    if (this._state !== PluginState.INITIALIZED) {
      throw new Error(`Cannot activate plugin in state: ${this._state}`);
    }
    try {
      await this.onActivate();
      this._state = PluginState.ACTIVE;
      this._lastError = undefined;
    } catch (error) {
      this._state = PluginState.ERROR;
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  /**
   * Deactivate the plugin
   */
  async deactivate() {
    if (this._state !== PluginState.ACTIVE) {
      throw new Error(`Cannot deactivate plugin in state: ${this._state}`);
    }
    try {
      await this.onDeactivate();
      this._state = PluginState.INITIALIZED;
      this._lastError = undefined;
    } catch (error) {
      this._state = PluginState.ERROR;
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  /**
   * Destroy and cleanup the plugin
   */
  async destroy() {
    try {
      if (this._state === PluginState.ACTIVE) {
        await this.deactivate();
      }
      await this.onDestroy();
      this._state = PluginState.UNLOADED;
      this._lastError = undefined;
    } catch (error) {
      this._state = PluginState.ERROR;
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  /**
   * Validate plugin configuration
   */
  async validateConfig(config) {
    try {
      return await this.onValidateConfig(config);
    } catch (error) {
      return false;
    }
  }
  /**
   * Update plugin configuration
   */
  async updateConfig(config) {
    const newConfig = { ...this._config, ...config };
    if (await this.validateConfig(newConfig)) {
      this._config = newConfig;
      await this.onConfigUpdate(newConfig);
    } else {
      throw new Error('Invalid plugin configuration');
    }
  }
  /**
   * Set the load path for the plugin
   */
  setLoadPath(path) {
    this._loadPath = path;
  }
  /**
   * Check if plugin can be activated
   */
  canActivate() {
    return this._state === PluginState.INITIALIZED && this._config.enabled;
  }
  /**
   * Check if plugin can be deactivated
   */
  canDeactivate() {
    return this._state === PluginState.ACTIVE;
  }
  // Protected methods for subclasses to override
  /**
   * Override in subclasses to provide initialization logic
   */
  async onInitialize() {
    // Default implementation - no-op
  }
  /**
   * Override in subclasses to provide activation logic
   */
  async onActivate() {
    // Default implementation - no-op
  }
  /**
   * Override in subclasses to provide deactivation logic
   */
  async onDeactivate() {
    // Default implementation - no-op
  }
  /**
   * Override in subclasses to provide destruction logic
   */
  async onDestroy() {
    // Default implementation - no-op
  }
  /**
   * Override in subclasses to provide configuration validation
   */
  async onValidateConfig(_config) {
    // Default implementation - always valid
    return true;
  }
  /**
   * Override in subclasses to handle configuration updates
   */
  async onConfigUpdate(_config) {
    // Default implementation - no-op
  }
}
//# sourceMappingURL=plugin.entity.js.map
