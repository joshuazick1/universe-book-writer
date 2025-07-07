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
        /** MongoDB connection string or database instance */
        database: any;

        /** Vector database configuration */
        vectorDb?: {
            type: 'faiss' | 'pinecone' | 'weaviate';
            config: Record<string, any>;
        };

        /** Encryption configuration */
        encryption?: {
            enabled: boolean;
            masterKey?: string;
            keyDerivationSalt?: string;
        };

        /** Plugin system hooks */
        plugins?: any[];
    }) {
        // TODO: Implement RAG system factory
        // This will be implemented in the next phase once we have:
        // 1. Database adapters for MongoDB and vector databases
        // 2. Complete storage backend implementations
        // 3. Plugin system integration

        throw new Error('RAG System Factory not yet implemented - awaiting storage backend completion');
    }

    /**
     * Create development/testing RAG system with mock backends
     */
    static createMockRAGSystem() {
        // TODO: Implement mock RAG system for testing
        throw new Error('Mock RAG System not yet implemented');
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
