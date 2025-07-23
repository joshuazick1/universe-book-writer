/**
 * Plugin entity - Core domain model for plugins
 */

import {
  type Plugin,
  type PluginConfig,
  type PluginMetadata,
  PluginState,
} from '@verseforge/core';

/**
 * Plugin entity representing a loaded plugin instance
 */
export class PluginEntity implements Plugin {
  private _state: PluginState = PluginState.UNLOADED;
  private _config: PluginConfig;
  private _loadPath?: string;
  private _lastError?: string;

  constructor(
    public readonly metadata: PluginMetadata,
    config?: Partial<PluginConfig>
  ) {
    this._config = {
      enabled: true,
      settings: {},
      ...config,
    };
  }

  get state(): PluginState {
    return this._state;
  }

  get config(): PluginConfig {
    return { ...this._config };
  }

  get loadPath(): string | undefined {
    return this._loadPath;
  }

  get lastError(): string | undefined {
    return this._lastError;
  }

  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
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
  async activate(): Promise<void> {
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
  async deactivate(): Promise<void> {
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
  async destroy(): Promise<void> {
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
  async validateConfig(config: PluginConfig): Promise<boolean> {
    try {
      return await this.onValidateConfig(config);
    } catch (error) {
      return false;
    }
  }

  /**
   * Update plugin configuration
   */
  async updateConfig(config: Partial<PluginConfig>): Promise<void> {
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
  setLoadPath(path: string): void {
    this._loadPath = path;
  }

  /**
   * Check if plugin can be activated
   */
  canActivate(): boolean {
    return this._state === PluginState.INITIALIZED && this._config.enabled;
  }

  /**
   * Check if plugin can be deactivated
   */
  canDeactivate(): boolean {
    return this._state === PluginState.ACTIVE;
  }

  // Protected methods for subclasses to override

  /**
   * Override in subclasses to provide initialization logic
   */
  protected async onInitialize(): Promise<void> {
    // Default implementation - no-op
  }

  /**
   * Override in subclasses to provide activation logic
   */
  protected async onActivate(): Promise<void> {
    // Default implementation - no-op
  }

  /**
   * Override in subclasses to provide deactivation logic
   */
  protected async onDeactivate(): Promise<void> {
    // Default implementation - no-op
  }

  /**
   * Override in subclasses to provide destruction logic
   */
  protected async onDestroy(): Promise<void> {
    // Default implementation - no-op
  }

  /**
   * Override in subclasses to provide configuration validation
   */
  protected async onValidateConfig(_config: PluginConfig): Promise<boolean> {
    // Default implementation - always valid
    return true;
  }

  /**
   * Override in subclasses to handle configuration updates
   */
  protected async onConfigUpdate(_config: PluginConfig): Promise<void> {
    // Default implementation - no-op
  }
}
