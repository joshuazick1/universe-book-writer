/**
 * RAG System Module Exports
 * 
 * Central export file for the RAG (Retrieval-Augmented Generation) system.
 */

// Core types and interfaces
export * from './core/types.js';
export * from './core/node.js';
export * from './core/relationship.js';

// Encryption services
export * from './encryption/base-encryption.service.js';
export * from './encryption/rag-encryption.service.js';
export * from './encryption/rag-update-encryption.service.js';

// Storage and retrieval services
export * from './services/storage.service.js';
export * from './services/context-assembly.service.js';
export * from './services/update-storage.service.js';

// API routes
export * from './routes/rag.routes.js';
export * from './routes/update.routes.js';

/**
 * RAG System Factory
 * 
 * Creates a fully configured RAG system with all dependencies.
 */
export class RAGSystemFactory {
    /**
     * Create a complete RAG system configuration
     */

    static async createRAGSystem(config: {
        database: any;
        vectorDb?: {
            type: 'faiss' | 'pinecone' | 'weaviate';
            config: Record<string, any>;
        };
        encryption?: {
            enabled: boolean;
            masterKey?: string;
            keyDerivationSalt?: string;
        };
        plugins?: any[];
    }) {
        // Example: Compose all services and return a configured RAG system object
        // You must provide both ragBackend and dbIndex to RAGStorageService
        const { ragBackend, dbIndex, updateStorage, updateEncryption, nodeEncryptionService, relationshipEncryptionService } = config.database;
        const storageService = new (await import('./services/storage.service.js')).RAGStorageService(
            ragBackend,
            dbIndex,
            updateStorage,
            updateEncryption
        );
        const contextService = new (await import('./services/context-assembly.service.js')).RAGContextAssemblyService(
            storageService,
            nodeEncryptionService,
            relationshipEncryptionService
        );
        const updateService = new (await import('./services/update-storage.service.js')).RAGUpdateStorageService(
            updateStorage,
            dbIndex,
            updateEncryption
        );
        // Optionally configure vector DB, encryption, plugins, etc.
        // ...
        return {
            storageService,
            contextService,
            updateService,
            plugins: config.plugins || [],
            version: RAG_SYSTEM_VERSION,
            metadata: RAG_SYSTEM_METADATA,
        };
    }

    /**
     * Create development/testing RAG system with mock backends
     */
    static createMockRAGSystem() {
        // Simple in-memory mock for testing/CI
        const storageService = {
            // Implement minimal mock methods as needed for tests
            get: async () => ({}),
            put: async () => ({}),
            delete: async () => ({}),
        };
        const contextService = {
            // Mock context assembly
            assemble: async () => ({}),
        };
        const updateService = {
            // Mock update logic
            update: async () => ({}),
        };
        return {
            storageService,
            contextService,
            updateService,
            plugins: [],
            version: RAG_SYSTEM_VERSION,
            metadata: RAG_SYSTEM_METADATA,
        };
    }
}

/**
 * RAG System Version and Metadata
 */
export const RAG_SYSTEM_VERSION = '1.0.0-alpha';
export const RAG_SYSTEM_METADATA = {
    version: RAG_SYSTEM_VERSION,
    name: 'Universe Book Writer RAG System',
    description: 'Knowledge graph and context assembly system for multi-universe storytelling',
    features: [
        'Multi-layer context assembly',
        'Encrypted knowledge graphs',
        'Plugin-extensible architecture',
        'Hybrid RAG+database storage',
        'Real-time collaboration support',
        'Timeline-aware context',
        'Universe-partitioned data'
    ],
    status: 'alpha',
    lastUpdated: new Date('2025-07-01')
};
