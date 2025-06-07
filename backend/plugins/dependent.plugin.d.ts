/**
 * Plugin with Dependencies - Example implementation
 */
import {
  type Plugin,
  PluginState,
  PluginType,
  type PluginConfig,
} from '@universe-book-writer/core';
export declare const metadata: {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  keywords: string[];
  type: PluginType;
  dependencies: {
    'simple-core-plugin': string;
  };
  engines: {
    node: string;
  };
};
/**
 * Dependent Plugin Implementation
 */
export default class DependentPlugin implements Plugin {
  readonly metadata: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    keywords: string[];
    type: PluginType;
    dependencies: {
      'simple-core-plugin': string;
    };
    engines: {
      node: string;
    };
  };
  state: PluginState;
  config: {
    enabled: boolean;
    settings: {
      useBaseFunctionality: boolean;
      enhancedMode: boolean;
    };
  };
  private dependencyPlugin?;
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
   * Destroy the plugin
   */
  destroy(): Promise<void>;
  /**
   * Check if plugin can be activated
   */
  canActivate(): boolean;
  /**
   * Check if plugin can be deactivated
   */
  canDeactivate(): boolean;
  /**
   * Validate plugin configuration
   */
  validateConfig(config: PluginConfig): Promise<boolean>;
  /**
   * Update plugin configuration
   */
  updateConfig(newConfig: Partial<typeof this.config>): Promise<void>;
  /**
   * Set dependency plugin reference
   */
  setDependencyPlugin(plugin: Plugin): void;
  /**
   * Use functionality from dependency plugin
   */
  useDependencyFeature(input: string): string;
}
//# sourceMappingURL=dependent.plugin.d.ts.map
