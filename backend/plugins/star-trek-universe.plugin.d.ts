/**
 * Star Trek Universe Plugin - Example implementation
 */
import {
  PluginState,
  PluginType,
  type PluginConfig,
  type UniversePlugin,
  type UniverseValidation,
  type UniverseUIComponents,
  type UniverseAIPrompts,
} from '@universe-book-writer/core';
export declare const metadata: {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage: string;
  license: string;
  keywords: string[];    type: PluginType;
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
  config: {
    enabled: boolean;
    settings: {
      theme: string;
      era: string;
      useStarfleetProtocols: boolean;
      enableTechnicalValidation: boolean;
      defaultShipClass: string;
    };
  };
  readonly universeType = 'star-trek';
  readonly validation: UniverseValidation;
  readonly ui: UniverseUIComponents;
  readonly ai: UniverseAIPrompts;
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
   * Get universe-specific validation for content
   */
  validateContent(content: any): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
  };
  /**
   * Get universe-specific AI prompts
   */
  getAIPrompts(context: string): string[];
  /**
   * Get theme configuration
   */
  getThemeConfig(): any;
  private loadStarTrekDatabase;
  private initializeLCARSTheme;
  private setupValidationRules;
  private registerUIComponents;
  private applyLCARSTheme;
  private initializeStarTrekAI;
  private unregisterUIComponents;
  private revertTheme;
  private cleanup;
  private updateEraSettings;
  private isValidSpecies;
  private isValidStarfleetRank;
}
//# sourceMappingURL=star-trek-universe.plugin.d.ts.map
