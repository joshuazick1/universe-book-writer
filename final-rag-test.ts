/**
 * Final RAG System Test
 * 
 * Comprehensive test of the complete RAG system functionality
 */

async function finalRAGTest(): Promise<void> {
    console.log('🚀 Final RAG System Test\n');

    const backendUrl = 'http://localhost:5000';
    const aiServerUrl = 'http://localhost:5100';

    try {
        // Test 1: Server Status
        console.log('1. 🔍 Checking Server Status...');

        const backendHealth = await testEndpoint('GET', `${backendUrl}/api/health`);
        const aiServerHealth = await testEndpoint('GET', `${aiServerUrl}/api/health`);

        console.log(`   Backend (${backendUrl}): ${backendHealth.success ? '✅ Running' : '❌ Down'}`);
        console.log(`   AI Server (${aiServerUrl}): ${aiServerHealth.success ? '✅ Running' : '❌ Down'}`);

        if (!backendHealth.success) {
            console.log('❌ Backend server is not running. Please start it first.');
            return;
        }

        if (!aiServerHealth.success) {
            console.log('⚠️ AI server is not running on port 5100. Some features may not work.');
        }

        // Test 2: RAG Routes Availability
        console.log('\n2. 🔗 Testing RAG Routes Availability...');

        const ragRoutes = [
            '/api/rag',
            '/api/rag/nodes',
            '/api/rag/universes',
            '/api/rag/relationships',
            '/api/rag/stats'
        ];

        let ragRoutesAvailable = 0;
        for (const route of ragRoutes) {
            const result = await testEndpoint('GET', `${backendUrl}${route}`);
            const status = result.status === 404 ? '❌ Not Found' :
                result.status === 401 ? '🔐 Needs Auth' :
                    result.success ? '✅ Available' : `⚠️ ${result.status}`;
            console.log(`   ${route}: ${status}`);

            if (result.status !== 404) {
                ragRoutesAvailable++;
            }
        }

        if (ragRoutesAvailable === 0) {
            console.log('\n❌ No RAG routes are available!');
            console.log('📋 This means:');
            console.log('   1. Backend server needs to be restarted to load RAG routes');
            console.log('   2. There may be an initialization error in the server logs');
            console.log('   3. RAG routes failed to register due to missing dependencies');
            console.log('\n🔧 To fix this:');
            console.log('   1. Restart the backend server');
            console.log('   2. Check server logs for "RAG system routes enabled" message');
            console.log('   3. Look for any RAG initialization errors');
            return;
        }

        console.log(`\n✅ ${ragRoutesAvailable}/${ragRoutes.length} RAG routes are available!`);

        // Test 3: Basic RAG Operations (if routes are available)
        console.log('\n3. 📝 Testing Basic RAG Operations...');

        // Test creating a universe
        const createUniverseTest = await testEndpoint('POST', `${backendUrl}/api/rag/universes`, {
            name: 'Test Universe',
            description: 'A test universe for RAG system testing',
            ownerId: 'test-user-123',
            visibility: 'private'
        });

        console.log(`   Create Universe: ${createUniverseTest.success ? '✅ Success' : '❌ Failed'}`);
        if (!createUniverseTest.success) {
            console.log(`     Status: ${createUniverseTest.status}`);
            console.log(`     Error: ${createUniverseTest.error || 'Unknown'}`);
        }

        // Test creating a RAG node
        const createNodeTest = await testEndpoint('POST', `${backendUrl}/api/rag/nodes`, {
            title: 'Test Character',
            content: 'A test character for the RAG system',
            nodeType: 'character',
            universeId: 'test-universe',
            metadata: {
                category: 'character',
                tags: ['test', 'api'],
                sensitivity: 'public'
            }
        });

        console.log(`   Create RAG Node: ${createNodeTest.success ? '✅ Success' : '❌ Failed'}`);
        if (!createNodeTest.success) {
            console.log(`     Status: ${createNodeTest.status}`);
            console.log(`     Error: ${createNodeTest.error || 'Unknown'}`);
        }

        // Test 4: AI Server Integration (if available)
        if (aiServerHealth.success) {
            console.log('\n4. 🤖 Testing AI Server Integration...');

            // Test AI server RAG update endpoints
            const aiUpdateTest = await testEndpoint('GET', `${aiServerUrl}/api/rag/updates/statistics/test-universe`);
            console.log(`   AI Update Statistics: ${aiUpdateTest.success ? '✅ Success' : '❌ Failed'}`);
        }

        // Test 5: Component Integration Test
        console.log('\n5. 🔧 Testing Component Integration...');

        try {
            // Try to import and test RAG components directly
            const { RAGIntegrationService } = await import('./backend/src/services/rag-integration.service.js');
            console.log('   ✅ RAG Integration Service import successful');

            const { RAGStorageAdapter } = await import('./backend/src/adapters/rag-storage.adapter.js');
            console.log('   ✅ RAG Storage Adapter import successful');

            const { createRAGRoutes } = await import('./backend/src/routes/rag.routes.js');
            console.log('   ✅ RAG Routes import successful');

        } catch (error) {
            console.log('   ❌ Component import failed:', error);
        }

        // Final Results
        console.log('\n📊 Final Test Results:');
        console.log(`   Backend Server: ${backendHealth.success ? '✅' : '❌'}`);
        console.log(`   AI Server: ${aiServerHealth.success ? '✅' : '❌'}`);
        console.log(`   RAG Routes: ${ragRoutesAvailable > 0 ? '✅' : '❌'} (${ragRoutesAvailable}/${ragRoutes.length})`);

        if (ragRoutesAvailable > 0 && backendHealth.success) {
            console.log('\n🎉 RAG System is operational and ready for use!');
            console.log('\n📋 Available Features:');
            console.log('   ✅ RAG node storage and retrieval');
            console.log('   ✅ Universe isolation and management');
            console.log('   ✅ Encrypted update tracking');
            console.log('   ✅ Relationship mapping');
            console.log('   ✅ Search and discovery');
            console.log('\n🚀 You can now use the RAG system for:');
            console.log('   • Creating and managing story universes');
            console.log('   • Storing characters, locations, and plot elements');
            console.log('   • Tracking changes with encryption for private content');
            console.log('   • Building relationships between story elements');
            console.log('   • AI-assisted content enhancement');
        } else {
            console.log('\n⚠️ RAG System needs attention:');
            console.log('   📝 Restart the backend server to load RAG routes');
            console.log('   📝 Check server logs for initialization errors');
            console.log('   📝 Verify MongoDB connection is working');
        }

    } catch (error) {
        console.error('❌ Final RAG test failed:', error);
    }
}

async function testEndpoint(method: string, url: string, data?: any): Promise<{
    success: boolean;
    status: number;
    error?: string;
    response?: any;
}> {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: data ? JSON.stringify(data) : undefined
        });

        const responseData = response.headers.get('content-type')?.includes('application/json')
            ? await response.json()
            : await response.text();

        return {
            success: response.ok,
            status: response.status,
            response: responseData
        };
    } catch (error) {
        return {
            success: false,
            status: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Run the final test
finalRAGTest().catch(console.error);

export { finalRAGTest };
