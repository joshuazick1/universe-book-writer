/**
 * Universe API Test Script using Node.js HTTP
 * 
 * Comprehensive testing of all universe management endpoints
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testUniverse = {
    name: 'Test Star Trek Universe',
    description: 'A test universe for API validation',
    plugin_id: 'star-trek-universe',
    plugin_version: '1.0.0',
    sub_universe: 'Prime',
    canon_compliance: 'flexible',
    theme_config: {
        theme_id: 'star-trek-classic',
        variant: 'dark'
    },
    settings: {
        is_private: false,
        allow_collaboration: true
    }
};

// Helper function to make HTTP requests
function makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}${endpoint}`);
        const requestModule = url.protocol === 'https:' ? https : http;

        const requestOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer mock-token-test-user-123`,
                ...options.headers
            }
        };

        console.log(`\n🔄 ${requestOptions.method} ${BASE_URL}${endpoint}`);

        const req = requestModule.request(requestOptions, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);

                let jsonData;
                try {
                    jsonData = JSON.parse(data);
                } catch {
                    jsonData = data;
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('   ✅ Success');
                    console.log('   Response:', JSON.stringify(jsonData, null, 2).substring(0, 300) + '...');
                } else {
                    console.log('   ❌ Error');
                    console.log('   Response:', jsonData);
                }

                resolve({
                    statusCode: res.statusCode,
                    data: jsonData,
                    ok: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', (error) => {
            console.log('   ❌ Network Error:', error.message);
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Test functions
async function testHealthCheck() {
    console.log('\n📋 Testing Health Check...');
    return await makeRequest('/health');
}

async function testCreateUniverse() {
    console.log('\n📋 Testing Create Universe...');
    return await makeRequest('/universes', {
        method: 'POST',
        body: JSON.stringify(testUniverse)
    });
}

async function testListUniverses() {
    console.log('\n📋 Testing List Universes...');
    return await makeRequest('/universes');
}

async function testGetUniverse(universeId) {
    console.log('\n📋 Testing Get Universe...');
    return await makeRequest(`/universes/${universeId}`);
}

// Main test runner
async function runBasicTests() {
    console.log('🚀 Starting Universe API Tests...\n');
    console.log('='.repeat(50));

    try {
        // Basic health check
        const healthResult = await testHealthCheck();

        // Create universe
        const createResult = await testCreateUniverse();

        if (createResult.ok && createResult.data && createResult.data.id) {
            const universeId = createResult.data.id;
            console.log(`\n🎯 Created test universe with ID: ${universeId}`);

            // Test basic operations
            await testListUniverses();
            await testGetUniverse(universeId);

            console.log(`\n🧹 Cleaning up test universe ${universeId}...`);
            await makeRequest(`/universes/${universeId}`, { method: 'DELETE' });
        } else {
            console.log('\n⚠️  Universe creation response:', createResult);
        }

    } catch (error) {
        console.log('\n💥 Test execution error:', error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Basic Universe API Tests Completed');
}

// Run the tests
runBasicTests().catch(console.error);
