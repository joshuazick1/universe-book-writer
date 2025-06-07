// Core package master barrel file
// Re-export all domain functionality

export * from './domains/ai/index.js';
export * from './domains/universe/index.js';
export * from './domains/story/index.js';
export * from './domains/plugin/index.js';
export * from './shared/index.js';
export * from './constants/index.js';

// Version export
export const VERSION = '0.1.0';

// Type-only exports
export type {
  AIConfig,
  UniverseConfig,
  StoryConfig,
  UniversePluginConfig,
} from './domains/types.js';
