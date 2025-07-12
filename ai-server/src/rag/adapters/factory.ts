import type { RAGStorageBackend } from '../services/storage.service.js';
import { InMemoryRagAdapter } from './memory.adapter.js';
import { MongoDBRagAdapter, MongoDBStorageConfig } from './mongodb.adapter.js';
import { logger } from '../../../../shared/logging/logger.js';

/**
 * Storage adapter types
 */
export type StorageAdapterType = 'memory' | 'mongodb' | 'hybrid';

/**
 * Configuration for different storage adapters
 */
export interface StorageAdapterConfig {
    type: StorageAdapterType;
    mongodb?: MongoDBStorageConfig;
    memory?: {}; // Memory adapter doesn't need configuration
    hybrid?: {
        primary: StorageAdapterConfig;
        cache: StorageAdapterConfig;
    };
}

/**
 * Factory for creating storage adapters
 */
export class StorageAdapterFactory {
    /**
     * Create a storage adapter based on configuration
     */
    static async createAdapter(config: StorageAdapterConfig): Promise<RAGStorageBackend> {
        logger.info(`Creating storage adapter of type: ${config.type}`);

        switch (config.type) {
            case 'memory':
                return this.createMemoryAdapter();

            case 'mongodb':
                if (!config.mongodb) {
                    throw new Error('MongoDB configuration is required for mongodb adapter');
                }
                return this.createMongoDBAdapter(config.mongodb);

            case 'hybrid':
                if (!config.hybrid) {
                    throw new Error('Hybrid configuration is required for hybrid adapter');
                }
                return this.createHybridAdapter(config.hybrid);

            default:
                throw new Error(`Unknown storage adapter type: ${config.type}`);
        }
    }

    /**
     * Create an in-memory storage adapter
     */
    private static async createMemoryAdapter(): Promise<RAGStorageBackend> {
        const adapter = new InMemoryRagAdapter();
        await adapter.initialize();
        return adapter;
    }

    /**
     * Create a MongoDB storage adapter
     */
    private static async createMongoDBAdapter(config: MongoDBStorageConfig): Promise<RAGStorageBackend> {
        const adapter = new MongoDBRagAdapter(config);
        await adapter.initialize();
        return adapter;
    }

    /**
     * Create a hybrid storage adapter (cache + persistent)
     */
    private static async createHybridAdapter(config: {
        primary: StorageAdapterConfig;
        cache: StorageAdapterConfig;
    }): Promise<RAGStorageBackend> {
        // For now, just return the primary adapter
        // In the future, we can implement a true hybrid adapter that uses cache for reads
        logger.info('Creating hybrid adapter - using primary storage for now');
        return this.createAdapter(config.primary);
    }

    /**
     * Create adapter from environment variables
     */
    static async createFromEnvironment(): Promise<RAGStorageBackend> {
        const adapterType = (process.env.RAG_STORAGE_TYPE || 'memory') as StorageAdapterType;

        const config: StorageAdapterConfig = {
            type: adapterType
        };

        switch (adapterType) {
            case 'mongodb':
                config.mongodb = {
                    connectionString: process.env.RAG_MONGODB_URI || 'mongodb://localhost:27017',
                    database: process.env.RAG_MONGODB_DB || 'verseforge_rag',
                    options: {
                        retryWrites: true,
                        w: 'majority'
                    }
                };
                break;

            case 'memory':
                config.memory = {};
                break;

            case 'hybrid':
                // Default hybrid setup: MongoDB primary + Memory cache
                config.hybrid = {
                    primary: {
                        type: 'mongodb',
                        mongodb: {
                            connectionString: process.env.RAG_MONGODB_URI || 'mongodb://localhost:27017',
                            database: process.env.RAG_MONGODB_DB || 'verseforge_rag'
                        }
                    },
                    cache: {
                        type: 'memory',
                        memory: {}
                    }
                };
                break;
        }

        try {
            const adapter = await this.createAdapter(config);
            logger.info(`Successfully created ${adapterType} storage adapter`);
            return adapter;
        } catch (error) {
            logger.error(`Failed to create ${adapterType} adapter: ${error instanceof Error ? error.message : String(error)}`);

            // Fallback to memory adapter if primary fails
            if (adapterType !== 'memory') {
                logger.info('Falling back to memory storage adapter');
                return this.createMemoryAdapter();
            }

            throw error;
        }
    }

    /**
     * Get recommended configuration for different environments
     */
    static getRecommendedConfig(environment: 'development' | 'testing' | 'production'): StorageAdapterConfig {
        switch (environment) {
            case 'development':
                return {
                    type: 'memory',
                    memory: {}
                };

            case 'testing':
                return {
                    type: 'memory',
                    memory: {}
                };

            case 'production':
                return {
                    type: 'mongodb',
                    mongodb: {
                        connectionString: process.env.RAG_MONGODB_URI || 'mongodb://localhost:27017',
                        database: process.env.RAG_MONGODB_DB || 'verseforge_rag',
                        options: {
                            retryWrites: true,
                            w: 'majority',
                            readPreference: 'secondaryPreferred'
                        }
                    }
                };

            default:
                throw new Error(`Unknown environment: ${environment}`);
        }
    }
}

/**
 * Validate storage adapter configuration
 */
export function validateStorageConfig(config: StorageAdapterConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type) {
        errors.push('Storage adapter type is required');
    }

    switch (config.type) {
        case 'mongodb':
            if (!config.mongodb) {
                errors.push('MongoDB configuration is required');
            } else {
                if (!config.mongodb.connectionString) {
                    errors.push('MongoDB connection string is required');
                }
            }
            break;

        case 'hybrid':
            if (!config.hybrid) {
                errors.push('Hybrid configuration is required');
            } else {
                const primaryValidation = validateStorageConfig(config.hybrid.primary);
                const cacheValidation = validateStorageConfig(config.hybrid.cache);

                errors.push(...primaryValidation.errors.map(e => `Primary storage: ${e}`));
                errors.push(...cacheValidation.errors.map(e => `Cache storage: ${e}`));
            }
            break;

        case 'memory':
            // Memory adapter doesn't need additional validation
            break;

        default:
            errors.push(`Unknown storage adapter type: ${config.type}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
