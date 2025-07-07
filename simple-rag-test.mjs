/**
 * Simple RAG Test
 */

console.log('Starting RAG test...');

try {
    console.log('Testing import...');
    const { getRAGServiceManager } = await import('./ai-server/dist/ai-server/src/rag/instance.js');
    console.log('✅ Import successful');

    console.log('Creating RAG manager...');
    const manager = await getRAGServiceManager();
    console.log('✅ RAG manager created');

    console.log('RAG integration test completed successfully');
} catch (error) {
    console.error('❌ RAG test failed:', error.message);
}
