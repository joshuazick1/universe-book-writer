/**
 * RAG Storage Adapters
 * 
 * This module provides different storage backends for the RAG system,
 * including in-memory, MongoDB, and hybrid adapters.
 */

export { InMemoryRagAdapter } from './memory.adapter.js';
export { MongoDBRagAdapter, type MongoDBStorageConfig } from './mongodb.adapter.js';
export {
    StorageAdapterFactory,
    validateStorageConfig,
    type StorageAdapterType,
    type StorageAdapterConfig
} from './factory.js';

/**
 * Default adapter configurations for different use cases
 */
export const DEFAULT_CONFIGS = {
    /**
     * MongoDB storage for development (persistent across restarts)
     */
    DEVELOPMENT: {
        type: 'mongodb' as const,
        mongodb: {
            connectionString: process.env.RAG_MONGODB_URI || 'mongodb://localhost:27017',
            database: 'verseforge_rag_dev',
            options: {
                retryWrites: true,
                w: 'majority' as const
            }
        }
    },

    /**
     * MongoDB storage for production use
     */
    PRODUCTION: {
        type: 'mongodb' as const,
        mongodb: {
            connectionString: process.env.RAG_MONGODB_URI || 'mongodb://localhost:27017',
            database: 'verseforge_rag',
            options: {
                retryWrites: true,
                w: 'majority' as const
            }
        }
    },

    /**
     * Fast in-memory storage for testing (data not persisted)
     */
    TESTING: {
        type: 'memory' as const,
        memory: {}
    },

    /**
     * Hybrid storage with MongoDB primary and memory cache
     */
    HYBRID: {
        type: 'hybrid' as const,
        hybrid: {
            primary: {
                type: 'mongodb' as const,
                mongodb: {
                    connectionString: process.env.RAG_MONGODB_URI || 'mongodb://localhost:27017',
                    database: 'verseforge_rag'
                }
            },
            cache: {
                type: 'memory' as const,
                memory: {}
            }
        }
    }
} as const;
