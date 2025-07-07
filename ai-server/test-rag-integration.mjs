#!/usr/bin/env node

/**
 * RAG Integration Test Script
 * Tests the core RAG functionality end-to-end
 */

import { getRAGServiceManager } from './dist/ai-server/src/rag/instance.js';

async function testRAGIntegration() {
    console.log('=== RAG Integration Test ===');

    try {
        // Initialize RAG service
        console.log('1. Initializing RAG service...');
        const ragManager = await getRAGServiceManager();
        console.log('✅ RAG service initialized');

        // Test storage service
        console.log('2. Testing storage service...');
        const storageService = ragManager.getStorageService();
        if (!storageService) {
            throw new Error('Storage service not available');
        }
        console.log('✅ Storage service available');

        // Test context assembly service
        console.log('3. Testing context assembly service...');
        const contextService = ragManager.getContextAssemblyService();
        if (!contextService) {
            throw new Error('Context assembly service not available');
        }
        console.log('✅ Context assembly service available');

        // Test basic node creation
        console.log('4. Testing node creation...');
        const testNode = {
            id: 'test-character-001',
            type: 'character',
            content: {
                name: 'Captain Jean-Luc Picard',
                description: 'Captain of the USS Enterprise',
                occupation: 'Starfleet Captain',
                species: 'Human'
            },
            metadata: {
                universeId: 'star-trek-tng',
                title: 'Jean-Luc Picard',
                description: 'Captain of the USS Enterprise-D',
                tags: ['starfleet', 'captain', 'enterprise', 'human'],
                sensitivity: 'low'
            },
            timeline: {
                startDate: '2305-07-13',
                era: '24th Century'
            }
        };

        await storageService.storeNode(testNode);
        console.log('✅ Test node stored successfully');

        // Test node retrieval
        console.log('5. Testing node retrieval...');
        const retrievedNode = await storageService.retrieveNode('test-character-001');
        if (!retrievedNode) {
            throw new Error('Failed to retrieve test node');
        }
        console.log('✅ Test node retrieved successfully');
        console.log('   Retrieved:', retrievedNode.metadata.title);

        // Test basic search
        console.log('6. Testing basic search...');
        const searchResults = await storageService.searchNodes({
            universeId: 'star-trek-tng',
            query: 'captain',
            limit: 10
        });
        console.log('✅ Search completed');
        console.log(`   Found ${searchResults.nodes.length} results`);

        // Test context assembly
        console.log('7. Testing context assembly...');
        const contextResult = await contextService.assembleContext({
            focusNodeId: 'test-character-001',
            contextDepth: 2,
            maxTokens: 1000,
            includeRelationships: true
        });

        if (!contextResult.success) {
            throw new Error(`Context assembly failed: ${contextResult.error}`);
        }

        console.log('✅ Context assembly successful');
        console.log(`   Context layers: ${contextResult.context?.layers.length || 0}`);
        console.log(`   Token count: ${contextResult.context?.tokenCount || 0}`);

        // Test cleanup
        console.log('8. Testing cleanup...');
        await storageService.deleteNode('test-character-001');
        console.log('✅ Test node deleted');

        console.log('\n=== RAG Integration Test PASSED ===');
        return true;

    } catch (error) {
        console.error('\n❌ RAG Integration Test FAILED:');
        console.error(error);
        return false;
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testRAGIntegration()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

export { testRAGIntegration };
