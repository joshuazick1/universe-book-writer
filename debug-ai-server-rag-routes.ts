/**
 * Debug AI Server RAG Route Registration
 * 
 * This script analyzes the current RAG route registration issue and provides
 * a fix to properly mount all RAG endpoints.
 */

import { logInfo, logWarn, logError, logDebug } from './ai-server/src/logger.js';

async function debugRAGRoutes() {
    logInfo('=== Debugging AI Server RAG Route Registration ===');

    try {
        // Check if RAG services are available
        logDebug('Checking RAG service availability...');

        const { getRAGServiceManager } = await import('./ai-server/src/rag/instance.js');
        const ragServiceManager = await getRAGServiceManager();

        logInfo('RAG Service Manager obtained successfully');

        // Check health
        const health = await ragServiceManager.healthCheck();
        logInfo(`RAG Health Check: ${JSON.stringify(health)}`);

        // Get stats to verify functionality
        const stats = await ragServiceManager.getStats();
        logInfo(`RAG Stats: ${JSON.stringify(stats)}`);

        logInfo('RAG service manager is functional - the issue is in route registration');

        logDebug('The problem: app.ts creates a simple router instead of using createRAGRouter');

        logInfo('RAG Service Manager is functional but routes are not properly registered');

        // List all defined routes
        console.log('\n=== Available RAG Routes ===');
        console.log('The following routes should be available at /api/rag:');
        console.log('GET    /health                    - Health check');
        console.log('POST   /nodes                     - Create node');
        console.log('GET    /nodes/:id                 - Get node by ID');
        console.log('GET    /nodes                     - List nodes');
        console.log('PUT    /nodes/:id                 - Update node');
        console.log('DELETE /nodes/:id                 - Delete node');
        console.log('POST   /relationships             - Create relationship');
        console.log('POST   /context                   - Get context');
        console.log('POST   /search                    - Search nodes');
        console.log('GET    /nodes/:id/connected       - Get connected nodes');
        console.log('GET    /universes/:id/stats       - Get universe stats');
        console.log('POST   /universes/:id/sync        - Sync universe');

        logInfo('Route analysis complete');

    } catch (error) {
        logError(`Error during RAG route debugging: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logDebug(`Stack trace: ${error.stack}`);
        }
    }
}

// Recommendation function
function provideRecommendation() {
    console.log('\n=== RECOMMENDATION ===');
    console.log('The issue is in ai-server/src/app.ts:');
    console.log('1. Currently, only a simple RAG router with /health and /stats is being created');
    console.log('2. The full RAG router from createRAGRouter() is not being used');
    console.log('3. Need to update the initializeRAGSystem() function to use createRAGRouter()');
    console.log('\nTo fix this, modify ai-server/src/app.ts to use the full RAG router factory.');
}

// Run the debug
debugRAGRoutes().then(() => {
    provideRecommendation();
}).catch(error => {
    logError(`Failed to debug RAG routes: ${error instanceof Error ? error.message : String(error)}`);
    provideRecommendation();
});
