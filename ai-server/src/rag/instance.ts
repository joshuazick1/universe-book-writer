import { RAGServiceManager, type RAGServiceConfig } from './manager.js';
import { DEFAULT_CONFIGS } from './adapters/index.js';
import { logInfo, logError } from '../logger.js';

/**
 * Singleton RAG service manager instance
 */
let ragServiceManager: RAGServiceManager | null = null;

/**
 * Get or create the RAG service manager singleton
 */
export async function getRAGServiceManager(): Promise<RAGServiceManager> {
    if (!ragServiceManager) {
        ragServiceManager = await createRAGServiceManager();
    }
    return ragServiceManager;
}

/**
 * Create and initialize a new RAG service manager
 */
async function createRAGServiceManager(): Promise<RAGServiceManager> {
    try {
        logInfo('Creating RAG Service Manager');

        // Determine configuration based on environment
        const environment = process.env.NODE_ENV || 'development';
        const config: RAGServiceConfig = {
            storage: environment === 'production'
                ? DEFAULT_CONFIGS.PRODUCTION
                : DEFAULT_CONFIGS.DEVELOPMENT
        };

        const manager = new RAGServiceManager(config);
        await manager.initialize();

        logInfo('RAG Service Manager created and initialized');
        return manager;
    } catch (error) {
        logError(`Failed to create RAG Service Manager: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Cleanup the RAG service manager
 */
export async function cleanupRAGServiceManager(): Promise<void> {
    if (ragServiceManager) {
        await ragServiceManager.disconnect();
        ragServiceManager = null;
        logInfo('RAG Service Manager cleaned up');
    }
}

/**
 * Health check for the RAG service
 */
export async function ragHealthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
        if (!ragServiceManager) {
            return {
                healthy: false,
                details: { error: 'RAG service not initialized' }
            };
        }

        return await ragServiceManager.healthCheck();
    } catch (error) {
        return {
            healthy: false,
            details: {
                error: error instanceof Error ? error.message : String(error)
            }
        };
    }
}
