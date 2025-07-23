/**
 * Type definitions for core domain configurations
 */

export interface AIConfig {
  models: string[];
  server: string;
  apiKey?: string;
}

export interface UniverseConfig {
  name: string;
  description: string;
  plugins: string[];
}

export interface StoryConfig {
  title: string;
  universe: string;
  synopsis?: string;
}

export interface UniversePluginConfig {
  name: string;
  version: string;
  universeType: string;
  dependencies?: string[];
}
