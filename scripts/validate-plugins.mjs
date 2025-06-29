#!/usr/bin/env node
/**
 * Plugin System Validation Test
 * Verifies all four universe plugins are operational
 */

const BASE_URL = 'http://localhost:5000/api';

async function testPluginEndpoint(pluginName) {
    try {
        const response = await fetch(`${BASE_URL}/plugins/${pluginName}`);
        const data = await response.json();

        if (data.success && data.data.state === 'initialized') {
            console.log(`✅ ${pluginName}: OPERATIONAL (v${data.data.version || 'unknown'})`);
            return true;
        } else {
            console.log(`❌ ${pluginName}: ERROR - ${data.error || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${pluginName}: NETWORK ERROR - ${error.message}`);
        return false;
    }
}

async function runValidationTests() {
    console.log('🔌 Plugin System Validation Test');
    console.log('================================');

    const plugins = [
        'star-trek-universe',
        'star-wars-universe',
        'lotr-universe',
        'harry-potter-universe'
    ];

    let successCount = 0;

    for (const plugin of plugins) {
        const success = await testPluginEndpoint(plugin);
        if (success) successCount++;
    }

    console.log('================================');
    console.log(`Results: ${successCount}/${plugins.length} plugins operational`);

    if (successCount === plugins.length) {
        console.log('🎉 ALL PLUGINS OPERATIONAL - MISSION COMPLETE!');
        process.exit(0);
    } else {
        console.log('⚠️  Some plugins failed - check backend logs');
        process.exit(1);
    }
}

// Check if backend is running
async function checkBackend() {
    try {
        const response = await fetch(`${BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ Backend server is running');
            return true;
        }
    } catch (error) {
        console.log('❌ Backend server is not running. Please start it with: cd backend && npm run dev');
        return false;
    }
}

async function main() {
    const backendRunning = await checkBackend();
    if (backendRunning) {
        await runValidationTests();
    } else {
        process.exit(1);
    }
}

main();
