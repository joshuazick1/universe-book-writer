/**
 * OpenAI API compatibility layer
 * Re-exports all OpenAI-specific handlers and utilities
 */

// Core API handlers
export * from './models.js';
export * from './chat.js';
export * from './embeddings.js';

// OpenAI compatibility handlers
export * from './completions.js';
export * from './chatCompletions.js';
export * from './files.js';
export * from './assistants.js';
export * from './threads.js';
export * from './fineTuningJobs.js';
export * from './audio.js';
export * from './images.js';
export * from './moderations.js';

// Re-export specific handlers for easy access
export { handleListModels, handleGetModel } from './models.js';
export { handleChatCompletions, handleCompletions } from './chat.js';
export { handleEmbeddings } from './embeddings.js';
