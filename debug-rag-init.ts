/**
 * RAG Initialization Debug Test
 * 
 * Tests the exact RAG initialization sequence to find any errors
 */

async function debugRAGInitialization(): Promise<void> {
    console.log('🔍 Debugging RAG Initialization...\n');

    try {
        console.log('1. Testing RAG service imports...');

        // Test individual imports
        const { RAGIntegrationService } = await import('./backend/src/services/rag-integration.service.js');
        console.log('✅ RAGIntegrationService imported');

        const { createRAGRoutes } = await import('./backend/src/routes/rag.routes.js');
        console.log('✅ createRAGRoutes imported');

        console.log('\n2. Testing RAG service initialization...');

        // Try to create the exact same configuration as the backend
        const config = {
            aiServerUrl: 'http://localhost:5100',
            databaseUrl: 'mongodb://localhost:27017',
            databaseName: 'universe_book_writer',
            syncInterval: 300000,
            batchSize: 100,
            aiServerApiKey: undefined
        };

        console.log('📋 Configuration:', config);

        // Try to create the service
        console.log('\n3. Creating RAG integration service...');
        const ragIntegrationService = new RAGIntegrationService(config);
        console.log('✅ RAGIntegrationService created');

        // Try to initialize it
        console.log('\n4. Initializing RAG service...');
        await ragIntegrationService.initialize();
        console.log('✅ RAG service initialized successfully');

        // Try to create routes
        console.log('\n5. Creating RAG routes...');
        const router = createRAGRoutes(ragIntegrationService);
        console.log('✅ RAG routes created successfully');

        console.log('\n🎉 RAG Initialization Debug PASSED!');
        console.log('✅ All RAG components initialize correctly');
        console.log('\n📋 This means the issue is likely:');
        console.log('   - Backend server hasn\'t been restarted since the AI server URL change');
        console.log('   - There\'s a different error during backend startup');
        console.log('   - The try/catch in backend is silently catching an error');

        // Test a simple API call to AI server
        console.log('\n6. Testing AI server connectivity...');
        try {
            const response = await fetch('http://localhost:5100/api/health');
            if (response.ok) {
                console.log('✅ AI server is reachable from Node.js');
            } else {
                console.log('❌ AI server returned:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('❌ Failed to reach AI server:', error);
        }

    } catch (error) {
        console.error('❌ RAG Initialization Debug FAILED:', error);
        console.error('\n🔧 Error details:');
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
    }
}

// Run the debug test
debugRAGInitialization().catch(console.error);

export { debugRAGInitialization };
