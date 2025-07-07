/**
 * Ollama API compatibility layer
 * Re-exports all Ollama-specific handlers and utilities
 */

export * from './models.js';
export * from './info.js';
export * from './embed.js';
export * from './embeddings.js';
export * from './blobs.js';
export * from './copy.js';
export * from './delete.js';
export * from './pull.js';
export * from './push.js';

// Re-export specific handlers for easy access
export {
    handleCreate,
    handleConvert,
    handleStop
} from './models.js';

export {
    handleVersion,
    handlePs,
    handleTags,
    handleShowGet,
    handleShow
} from './info.js';

export {
    handleChat,
    handleGenerate
} from './chat.js';

// Individual endpoint handlers
export { embedHandlerParallel as handleEmbed } from './embed-parallel.js';
export { embeddingsHandler as handleEmbeddings } from './embeddings.js';
export { blobHeadHandler as handleBlobHead, blobPostHandler as handleBlobPost } from './blobs.js';
export { copyHandler as handleCopy } from './copy.js';
export { deleteHandler as handleDelete } from './delete.js';
export { pullHandler as handlePull } from './pull.js';
export { pushHandler as handlePush } from './push.js';
