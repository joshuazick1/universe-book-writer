/**
 * Plugin entity - Core domain model for plugins
 */
import {
  type Plugin,
  type PluginConfig,
  type PluginMetadata,
  PluginState,
} from '@universe-book-writer/core';
/**
 * Plugin entity representing a loaded plugin instance
 */
export declare class PluginEntity implements Plugin {
  readonly metadata: PluginMetadata;
  private _state;
  private _config;
  private _loadPath?;
  private _lastError?;
  constructor(metadata: PluginMetadata, config?: Partial<PluginConfig>);
  get state(): PluginState;
  get config(): PluginConfig;
  get loadPath(): string | undefined;
  get lastError(): string | undefined;
  /**
   * Initialize the plugin
   */
  initialize(): Promise<void>;
  /**
   * Activate the plugin
   */
  activate(): Promise<void>;
  /**
   * Deactivate the plugin
   */
  deactivate(): Promise<void>;
  /**
   * Destroy and cleanup the plugin
   */
  destroy(): Promise<void>;
  /**
   * Validate plugin configuration
   */
  validateConfig(config: PluginConfig): Promise<boolean>;
  /**
   * Update plugin configuration
   */
  updateConfig(config: Partial<PluginConfig>): Promise<void>;
  /**
   * Set the load path for the plugin
   */
  setLoadPath(path: string): void;
  /**
   * Check if plugin can be activated
   */
  canActivate(): boolean;
  /**
   * Check if plugin can be deactivated
   */
  canDeactivate(): boolean;
  /**
   * Override in subclasses to provide initialization logic
   */
  protected onInitialize(): Promise<void>;
  /**
   * Override in subclasses to provide activation logic
   */
  protected onActivate(): Promise<void>;
  /**
   * Override in subclasses to provide deactivation logic
   */
  protected onDeactivate(): Promise<void>;
  /**
   * Override in subclasses to provide destruction logic
   */
  protected onDestroy(): Promise<void>;
  /**
   * Override in subclasses to provide configuration validation
   */
  protected onValidateConfig(config: PluginConfig): Promise<boolean>;
  /**
   * Override in subclasses to handle configuration updates
   */
  protected onConfigUpdate(config: PluginConfig): Promise<void>;
}
//# sourceMappingURL=plugin.entity.d.ts.map
