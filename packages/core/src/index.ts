// Core package master barrel file
// Re-export all domain functionality

export * from './domains/ai';
export * from './domains/universe';
export * from './domains/story';
export * from './domains/plugin';
export * from './shared';
export * from './constants';

// Version export
export const VERSION = '0.1.0';

// Type-only exports
export type {
  AIConfig,
  UniverseConfig,
  StoryConfig,
  PluginConfig,
} from './domains/types';
