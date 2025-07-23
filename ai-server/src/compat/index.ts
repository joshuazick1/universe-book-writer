/**
 * AI API Compatibility Layer
 * Main entry point for all AI provider compatibility modules
 */

// Shared utilities and types
export * as Shared from './shared/index.js';

// Ollama compatibility
export * as Ollama from './ollama/index.js';

// OpenAI compatibility  
export * as OpenAI from './openai/index.js';

// Re-export commonly used utilities for convenience
export {
    handleCompatibilityError,
    sendErrorResponse,
    validateRequiredFields,
    getOrchestrator,
    getCachedTags,
    findAvailableServers,
    selectBestServer,
    setupStreamingHeaders,
    setupSSEHeaders,
    writeSSEChunk,
    writeNDJSONChunk,
    parseNDJSONStream,
    collectStreamChunks,
    generateChatCompletionId,
    generateCompletionId,
    generateEmbeddingId,
    calculateUsage,
    estimateTokenCount,
    extractJsonOrText,
    composePromptFromMessages
} from './shared/index.js';
