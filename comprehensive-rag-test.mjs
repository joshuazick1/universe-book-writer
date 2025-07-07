/**
 * Comprehensive RAG Integration Test
 */

import { getRAGServiceManager } from './ai-server/dist/ai-server/src/rag/instance.js';

async function testRAGIntegration() {
    console.log('=== RAG Integration Test ===');

    try {
        // Initialize RAG service
        console.log('1. Initializing RAG service...');
        const ragManager = await getRAGServiceManager();
        console.log('✅ RAG service initialized');

        // Check if manager has expected methods
        console.log('2. Checking RAG manager interface...');
        const hasStorage = typeof ragManager.getStorageService === 'function';
        const hasContext = typeof ragManager.getContextAssemblyService === 'function';
        const hasHealth = typeof ragManager.healthCheck === 'function';

        console.log(`   - Storage service: ${hasStorage ? '✅' : '❌'}`);
        console.log(`   - Context service: ${hasContext ? '✅' : '❌'}`);
        console.log(`   - Health check: ${hasHealth ? '✅' : '❌'}`);

        // Test health check
        console.log('3. Testing health check...');
        const health = await ragManager.healthCheck();
        console.log(`   - Healthy: ${health.healthy ? '✅' : '❌'}`);
        if (!health.healthy) {
            console.log(`   - Details: ${JSON.stringify(health.details, null, 2)}`);
        }

        // Test storage service
        console.log('4. Testing storage service...');
        const storageService = ragManager.getStorageService();
        if (!storageService) {
            throw new Error('Storage service not available');
        }
        console.log('✅ Storage service available');

        // Test context assembly service
        console.log('5. Testing context assembly service...');
        const contextService = ragManager.getContextAssemblyService();
        if (!contextService) {
            throw new Error('Context assembly service not available');
        }
        console.log('✅ Context assembly service available');

        // Test basic operations with minimal data
        console.log('6. Testing basic node operations...');

        const testNode = {
            id: 'test-node-001',
            type: 'character',
            content: {
                name: 'Test Character',
                description: 'A test character for validation'
            },
            metadata: {
                universeId: 'test-universe',
                title: 'Test Character',
                tags: ['test'],
                sensitivity: 'low'
            }
        };

        // Store node
        await storageService.storeNode(testNode);
        console.log('✅ Node stored successfully');

        // Retrieve node
        const retrieved = await storageService.retrieveNode('test-node-001');
        if (!retrieved) {
            throw new Error('Failed to retrieve node');
        }
        console.log('✅ Node retrieved successfully');

        // Test search
        const searchResults = await storageService.searchNodes({
            universeId: 'test-universe',
            query: 'test',
            limit: 5
        });
        console.log(`✅ Search completed (${searchResults.nodes.length} results)`);

        // Cleanup
        await storageService.deleteNode('test-node-001');
        console.log('✅ Node cleaned up');

        console.log('\n=== RAG Integration Test PASSED ===');
        console.log('✅ All core RAG functionality is working');

        return true;

    } catch (error) {
        console.error('\n❌ RAG Integration Test FAILED:');
        console.error('Error:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        return false;
    }
}

// Run the test
testRAGIntegration()
    .then(success => {
        console.log(`\n🎯 Test result: ${success ? 'SUCCESS' : 'FAILURE'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
