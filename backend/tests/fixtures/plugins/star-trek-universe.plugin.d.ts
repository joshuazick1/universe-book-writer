/**
 * Star Trek Universe Plugin - Test Fixture Implementation
 */
import {
  PluginState,
  PluginType,
  type UniverseAIPrompts,
  type UniversePlugin,
  type UniverseUIComponents,
  type UniverseValidation,
  type PluginConfig,
} from '@universe-book-writer/core';
export declare const metadata: {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  license: string;
  keywords: string[];
  type: PluginType;
  dependencies: Record<string, never>;
  engines: {
    node: string;
  };
};
/**
 * Star Trek Universe Plugin Implementation
 */
export default class StarTrekUniversePlugin implements UniversePlugin {
  readonly metadata: {
    name: string;
    version: string;
    description: string;
    author: string;
    homepage: string;
    license: string;
    keywords: string[];
    type: PluginType;
    dependencies: Record<string, never>;
    engines: {
      node: string;
    };
  };
  state: PluginState;
  config: PluginConfig;
  readonly universeType = 'star-trek';
  readonly validation: UniverseValidation;
  readonly ui: UniverseUIComponents;
  readonly ai: UniverseAIPrompts;
  /**
   * Validate plugin configuration
   */
  validateConfig(config: PluginConfig): Promise<boolean>;
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
   * Update plugin configuration
   */
  updateConfig(newConfig: Partial<PluginConfig>): Promise<void>;
}
//# sourceMappingURL=star-trek-universe.plugin.d.ts.map
