/**
 * Quick Server Status Check
 * 
 * Tests all available endpoints on the backend to see what's working
 */

async function checkServerStatus(): Promise<void> {
    console.log('🔍 Checking Backend Server Status...\n');

    const baseUrl = 'http://localhost:5000';

    // List of known endpoints to test
    const endpoints = [
        '/api/health',
        '/api/auth',
        '/api/users',
        '/api/universes',
        '/api/plugins',
        '/api/monitoring',
        '/api/rag',
        '/api/rag/nodes',
        '/api/rag/universes'
    ];

    console.log('Testing available endpoints:\n');

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });

            const status = response.status;
            const statusText = response.statusText;

            if (status === 200) {
                console.log(`✅ ${endpoint} - ${status} ${statusText}`);
            } else if (status === 401 || status === 403) {
                console.log(`🔐 ${endpoint} - ${status} ${statusText} (needs auth)`);
            } else if (status === 404) {
                console.log(`❌ ${endpoint} - ${status} ${statusText} (not found)`);
            } else {
                console.log(`⚠️  ${endpoint} - ${status} ${statusText}`);
            }

        } catch (error) {
            console.log(`💥 ${endpoint} - Connection failed`);
        }
    }

    console.log('\n🔍 Testing AI Server Status...\n'); const aiServerUrls = [
        'http://localhost:5100',
        'http://localhost:3001',
        'http://localhost:3000'
    ];

    for (const url of aiServerUrls) {
        try {
            const response = await fetch(`${url}/api/health`);
            if (response.ok) {
                console.log(`✅ AI Server found at ${url}`);
                break;
            }
        } catch (error) {
            console.log(`❌ AI Server not found at ${url}`);
        }
    }

    console.log('\n📋 Summary:');
    console.log('   - If /api/rag endpoints show 404, RAG routes failed to initialize');
    console.log('   - If other endpoints work but RAG doesn\'t, there\'s a RAG-specific issue');
    console.log('   - Check backend server logs for RAG initialization errors');
}

// Run the check
checkServerStatus().catch(console.error);

export { checkServerStatus };
