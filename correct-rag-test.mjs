/**
 * RAG Integration Test - Correct Interface
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
        const hasCreateNode = typeof ragManager.createNode === 'function';
        const hasGetNode = typeof ragManager.getNode === 'function';
        const hasUpdateNode = typeof ragManager.updateNode === 'function';
        const hasDeleteNode = typeof ragManager.deleteNode === 'function';
        const hasSearch = typeof ragManager.searchNodes === 'function';
        const hasHealth = typeof ragManager.healthCheck === 'function';

        console.log(`   - Create node: ${hasCreateNode ? '✅' : '❌'}`);
        console.log(`   - Get node: ${hasGetNode ? '✅' : '❌'}`);
        console.log(`   - Update node: ${hasUpdateNode ? '✅' : '❌'}`);
        console.log(`   - Delete node: ${hasDeleteNode ? '✅' : '❌'}`);
        console.log(`   - Search nodes: ${hasSearch ? '✅' : '❌'}`);
        console.log(`   - Health check: ${hasHealth ? '✅' : '❌'}`);

        // Test health check
        console.log('3. Testing health check...');
        const health = await ragManager.healthCheck();
        console.log(`   - Healthy: ${health.healthy ? '✅' : '❌'}`);
        if (!health.healthy) {
            console.log(`   - Details: ${JSON.stringify(health.details, null, 2)}`);
        }

        // Test basic node operations
        console.log('4. Testing node CRUD operations...');

        const nodeData = {
            type: 'character',
            content: {
                name: 'Test Character',
                description: 'A test character for validation',
                occupation: 'Test Subject'
            },
            metadata: {
                universeId: 'test-universe',
                title: 'Test Character',
                description: 'Character for testing RAG functionality',
                tags: ['test', 'character'],
                sensitivity: 'low'
            },
            timeline: {
                startDate: '2025-01-01',
                era: 'Test Era'
            }
        };

        // Create node
        console.log('   Creating node...');
        const createdNode = await ragManager.createNode(nodeData);
        console.log(`   ✅ Node created with ID: ${createdNode.id}`);

        // Get node
        console.log('   Retrieving node...');
        const retrievedNode = await ragManager.getNode(createdNode.id);
        if (!retrievedNode) {
            throw new Error('Failed to retrieve created node');
        }
        console.log(`   ✅ Node retrieved: ${retrievedNode.metadata.title}`);

        // Update node
        console.log('   Updating node...');
        const updatedNode = await ragManager.updateNode(createdNode.id, {
            content: {
                ...retrievedNode.content,
                description: 'Updated test character description'
            }
        });
        console.log(`   ✅ Node updated at: ${updatedNode.timestamps.modified}`);

        // Test search if available
        if (hasSearch) {
            console.log('   Testing search...');
            const searchResults = await ragManager.searchNodes('test', {
                universeId: 'test-universe'
            });
            console.log(`   ✅ Search completed (${searchResults.length} results)`);
        }

        // Test relationships if available
        if (typeof ragManager.createRelationship === 'function') {
            console.log('5. Testing relationship operations...');

            // Create a second node for relationship testing
            const secondNodeData = {
                type: 'location',
                content: {
                    name: 'Test Location',
                    description: 'A test location'
                },
                metadata: {
                    universeId: 'test-universe',
                    title: 'Test Location',
                    tags: ['test', 'location'],
                    sensitivity: 'low'
                }
            };

            const secondNode = await ragManager.createNode(secondNodeData);
            console.log(`   ✅ Second node created: ${secondNode.id}`);

            // Create relationship
            const relationshipData = {
                sourceNodeId: createdNode.id,
                targetNodeId: secondNode.id,
                type: 'located_at',
                properties: {
                    strength: 0.8,
                    description: 'Character is located at this place'
                },
                metadata: {
                    universeId: 'test-universe',
                    title: 'Character Location Relationship',
                    tags: ['test', 'relationship'],
                    sensitivity: 'low'
                }
            };

            const relationship = await ragManager.createRelationship(relationshipData);
            console.log(`   ✅ Relationship created: ${relationship.id}`);

            // Clean up relationship and second node
            await ragManager.deleteRelationship(relationship.id);
            await ragManager.deleteNode(secondNode.id);
            console.log('   ✅ Relationship and second node cleaned up');
        }

        // Cleanup main test node
        console.log('6. Cleaning up...');
        await ragManager.deleteNode(createdNode.id);
        console.log('✅ Test node cleaned up');

        console.log('\n=== RAG Integration Test PASSED ===');
        console.log('✅ All core RAG functionality is working correctly');

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
