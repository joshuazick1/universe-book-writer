/**
 * Star Trek Plugin API Verification
 * Tests the modular component system through API endpoints
 */

const API_BASE = 'http://localhost:5000/api';
const FRONTEND_BASE = 'http://localhost:5173';

// Test configuration
const testConfig = {
    universe: {
        name: `Test Star Trek Universe ${Date.now()}`,
        description: 'API verification test universe',
        type: 'star-trek',
        settings: {
            theme: 'lcars',
            era: 'tng',
            subUniverse: 'prime'
        }
    },
    entity: {
        name: 'USS Enterprise NCC-1701-D',
        type: 'vessel',
        classification: 'Galaxy-class',
        registry: 'NCC-1701-D',
        captain: 'Jean-Luc Picard'
    }
};

// Utility functions
async function makeRequest(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : null,
        error: !response.ok ? await response.text() : null
    };
}

function logTest(testName, status, details = '') {
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${emoji} ${testName}${details ? ': ' + details : ''}`);
}

// Test functions
async function testBackendHealth() {
    console.log('\n🔍 Testing Backend Health...');

    try {
        const result = await makeRequest(`${API_BASE}/health`);

        if (result.ok) {
            logTest('Backend Health Check', 'pass', 'Server is running');
            return true;
        } else {
            logTest('Backend Health Check', 'fail', `Status ${result.status}`);
            return false;
        }
    } catch (error) {
        logTest('Backend Health Check', 'fail', error.message);
        return false;
    }
}

async function testPluginRegistration() {
    console.log('\n🔍 Testing Plugin Registration...');

    try {
        const result = await makeRequest(`${API_BASE}/plugins`);

        if (result.ok && result.data) {
            const starTrekPlugin = result.data.find(p =>
                p.name === 'star-trek-universe-plugin' ||
                p.type === 'star-trek'
            );

            if (starTrekPlugin) {
                logTest('Plugin Registration', 'pass', `Found: ${starTrekPlugin.name}`);
                return starTrekPlugin;
            } else {
                logTest('Plugin Registration', 'warn', 'Star Trek plugin not found');
                return null;
            }
        } else {
            logTest('Plugin Registration', 'fail', `Status ${result.status}`);
            return null;
        }
    } catch (error) {
        logTest('Plugin Registration', 'fail', error.message);
        return null;
    }
}

async function testUniverseCreation() {
    console.log('\n🔍 Testing Universe Creation...');

    try {
        const result = await makeRequest(`${API_BASE}/universes`, {
            method: 'POST',
            body: JSON.stringify(testConfig.universe)
        });

        if (result.ok && result.data) {
            logTest('Universe Creation', 'pass', `Created: ${result.data.name}`);
            return result.data;
        } else {
            logTest('Universe Creation', 'fail', `Status ${result.status}`);
            console.log('Error:', result.error);
            return null;
        }
    } catch (error) {
        logTest('Universe Creation', 'fail', error.message);
        return null;
    }
}

async function testThemeValidation(universeId) {
    console.log('\n🔍 Testing Theme Validation...');

    // Test invalid Starfleet registry format
    const invalidEntity = {
        name: 'Invalid Ship',
        type: 'vessel',
        registry: 'INVALID-FORMAT', // Should be NCC-XXXX
        classification: 'NonExistentClass'
    };

    try {
        const result = await makeRequest(`${API_BASE}/universes/${universeId}/entities`, {
            method: 'POST',
            body: JSON.stringify(invalidEntity)
        });

        if (result.status === 400) {
            logTest('Theme Validation', 'pass', 'Correctly rejected invalid data');
            return true;
        } else if (result.ok) {
            logTest('Theme Validation', 'warn', 'Accepted invalid data (validation may be disabled)');
            return false;
        } else {
            logTest('Theme Validation', 'fail', `Unexpected status ${result.status}`);
            return false;
        }
    } catch (error) {
        logTest('Theme Validation', 'fail', error.message);
        return false;
    }
}

async function testEntityCreation(universeId) {
    console.log('\n🔍 Testing Entity Creation...');

    try {
        const result = await makeRequest(`${API_BASE}/universes/${universeId}/entities`, {
            method: 'POST',
            body: JSON.stringify(testConfig.entity)
        });

        if (result.ok && result.data) {
            logTest('Entity Creation', 'pass', `Created: ${result.data.name}`);
            return result.data;
        } else {
            logTest('Entity Creation', 'fail', `Status ${result.status}`);
            console.log('Error:', result.error);
            return null;
        }
    } catch (error) {
        logTest('Entity Creation', 'fail', error.message);
        return null;
    }
}

async function testFrontendAccessibility() {
    console.log('\n🔍 Testing Frontend Accessibility...');

    try {
        const response = await fetch(FRONTEND_BASE);

        if (response.ok) {
            logTest('Frontend Accessibility', 'pass', 'Frontend is accessible');

            // Test developer showcase
            const showcaseResponse = await fetch(`${FRONTEND_BASE}/developer`);
            if (showcaseResponse.ok) {
                logTest('Developer Showcase', 'pass', 'Showcase page accessible');
            } else {
                logTest('Developer Showcase', 'warn', 'Showcase page not accessible');
            }

            return true;
        } else {
            logTest('Frontend Accessibility', 'fail', `Status ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Frontend Accessibility', 'fail', error.message);
        return false;
    }
}

async function cleanupTestData(universeId) {
    console.log('\n🧹 Cleaning up test data...');

    try {
        const result = await makeRequest(`${API_BASE}/universes/${universeId}`, {
            method: 'DELETE'
        });

        if (result.ok || result.status === 204) {
            logTest('Cleanup', 'pass', 'Test universe deleted');
            return true;
        } else {
            logTest('Cleanup', 'warn', `Cleanup status ${result.status}`);
            return false;
        }
    } catch (error) {
        logTest('Cleanup', 'warn', error.message);
        return false;
    }
}

// Main verification function
async function verifyStarTrekPlugin() {
    console.log('🚀 Starting Star Trek Plugin API Verification');
    console.log('='.repeat(50));

    const results = {
        backendHealth: false,
        pluginRegistration: false,
        universeCreation: false,
        themeValidation: false,
        entityCreation: false,
        frontendAccessibility: false,
        cleanup: false
    };

    let testUniverse = null;

    try {
        // Run tests in sequence
        results.backendHealth = await testBackendHealth();

        if (results.backendHealth) {
            results.pluginRegistration = await testPluginRegistration();
            testUniverse = await testUniverseCreation();
            results.universeCreation = !!testUniverse;

            if (testUniverse) {
                results.themeValidation = await testThemeValidation(testUniverse.id);
                results.entityCreation = await testEntityCreation(testUniverse.id);
            }
        }

        results.frontendAccessibility = await testFrontendAccessibility();

        // Cleanup
        if (testUniverse) {
            results.cleanup = await cleanupTestData(testUniverse.id);
        }

    } catch (error) {
        console.error('\n💥 Verification failed with error:', error);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Verification Summary:');

    Object.entries(results).forEach(([test, passed]) => {
        const emoji = passed ? '✅' : '❌';
        const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`   ${emoji} ${testName}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 Score: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🌟 All tests passed! Star Trek plugin is working correctly.');
    } else if (passedTests >= totalTests * 0.7) {
        console.log('⚠️  Most tests passed. Check failed tests for minor issues.');
    } else {
        console.log('❌ Many tests failed. Plugin may need attention.');
    }

    return results;
}

// Run verification if called directly
if (typeof window === 'undefined') {
    verifyStarTrekPlugin().catch(console.error);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { verifyStarTrekPlugin };
}
