/**
 * Plugin system interfaces and types for the Multi-Universe Book Series Writing Assistant
 */

import type { BaseEntity } from '../../shared/index.js';

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADED = 'loaded',
  INITIALIZED = 'initialized',
  ACTIVE = 'active',
  ERROR = 'error',
}

/**
 * Plugin types that can be registered
 */
export enum PluginType {
  UNIVERSE = 'universe',
  THEME = 'theme',
  AI = 'ai',
  CORE = 'core',
}

/**
 * Plugin metadata information
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  type: PluginType;
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
}

/**
 * Plugin configuration options
 */
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

/**
 * Base plugin interface that all plugins must implement
 */
export interface Plugin {
  readonly metadata: PluginMetadata;
  readonly state: PluginState;
  readonly config: PluginConfig;

  /**
   * Initialize the plugin (load resources, validate dependencies)
   */
  initialize(): Promise<void>;

  /**
   * Activate the plugin (start services, register components)
   */
  activate(): Promise<void>;

  /**
   * Deactivate the plugin (cleanup resources, unregister components)
   */
  deactivate(): Promise<void>;

  /**
   * Cleanup and unload the plugin
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
   * Check if plugin can be activated
   */
  canActivate(): boolean;

  /**
   * Check if plugin can be deactivated
   */
  canDeactivate(): boolean;
}

/**
 * Universe plugin interface for universe-specific functionality
 */
export interface UniversePlugin extends Plugin {
  readonly universeType: string;
  readonly validation: UniverseValidation;
  readonly ui: UniverseUIComponents;
  readonly ai: UniverseAIPrompts;
}

/**
 * Theme plugin interface for UI theming
 */
export interface ThemePlugin extends Plugin {
  readonly themeName: string;
  readonly baseTheme: string;
  readonly components: ThemeComponents;
  readonly styles: ThemeStyles;
}

/**
 * AI plugin interface for AI model extensions
 */
export interface AIPlugin extends Plugin {
  readonly models: PluginAIModelConfig[];
  readonly prompts: AIPromptTemplates;
  readonly validators: AIValidators;
}

/**
 * Universe validation rules
 */
export interface UniverseValidation {
  validateCharacter(character: unknown): Promise<boolean>;
  validateLocation(location: unknown): Promise<boolean>;
  validateTimeline(timeline: unknown): Promise<boolean>;
  validateStory(story: unknown): Promise<boolean>;
}

/**
 * Universe UI components
 */
export interface UniverseUIComponents {
  CharacterForm: ComponentType;
  LocationForm: ComponentType;
  TimelineView: ComponentType;
  ThemeProvider: ComponentType;
}

/**
 * Universe AI prompts
 */
export interface UniverseAIPrompts {
  characterCreation: string[];
  worldBuilding: string[];
  storyGeneration: string[];
  consistency: string[];
}

/**
 * Theme components override
 */
export interface ThemeComponents {
  Button?: ComponentType;
  Input?: ComponentType;
  Modal?: ComponentType;
  [key: string]: ComponentType | undefined;
}

/**
 * Generic component type interface
 */
export interface ComponentType {
  name: string;
  props?: Record<string, unknown>;
  render?: (props: any) => unknown;
}

/**
 * Theme styles configuration
 */
export interface ThemeStyles {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  animations: Record<string, string>;
}

/**
 * AI model configuration for plugins
 */
export interface PluginAIModelConfig {
  name: string;
  type: string;
  parameters: Record<string, unknown>;
}

/**
 * AI prompt templates
 */
export interface AIPromptTemplates {
  system: string[];
  user: string[];
  assistant: string[];
}

/**
 * AI validators
 */
export interface AIValidators {
  validatePrompt(prompt: string): Promise<boolean>;
  validateResponse(response: string): Promise<boolean>;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry extends BaseEntity {
  pluginMetadata: PluginMetadata;
  config: PluginConfig;
  state: PluginState;
  loadPath: string;
  lastError?: string;
  dependents: string[];
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /**
   * Register a plugin instance
   */
  register(plugin: Plugin): Promise<void>;

  /**
   * Unregister a plugin by name
   */
  unregister(pluginName: string): Promise<void>;

  /**
   * Get a plugin instance by name
   */
  getPlugin(pluginName: string): Plugin | undefined;

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[];

  /**
   * Get plugins by type
   */
  getPluginsByType(type: PluginType): Plugin[];

  /**
   * Check if a plugin is registered
   */
  isRegistered(pluginName: string): boolean;

  /**
   * Load plugin from file path
   */
  loadPlugin(pluginPath: string): Promise<Plugin>;

  /**
   * Validate plugin dependencies
   */
  validateDependencies(plugin: Plugin): Promise<boolean>;

  /**
   * Get plugin dependency graph
   */
  getDependencyGraph(): Promise<Map<string, string[]>>;

  /**
   * Resolve plugin load order based on dependencies
   */
  resolveLoadOrder(plugins: Plugin[]): Plugin[];
}
