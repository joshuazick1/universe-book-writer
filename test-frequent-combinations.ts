/**
 * Test script to demonstrate the new frequent model/server combination tracking
 */

import { ModelPerformanceRAGService, getModelPerformanceRAGService } from '../ai-server/src/services/modelPerformanceRAG.service.js';
import { AIOrchestrator } from '../ai-server/src/orchestrator.js';
import { logInfo, logError } from '../ai-server/src/logger.js';

async function testFrequentCombinations() {
    try {
        console.log('🚀 Testing Model/Server Combination Tracking...\n');

        // Create a minimal orchestrator for testing
        const orchestrator = new AIOrchestrator();

        // Get the performance RAG service
        const performanceService = await getModelPerformanceRAGService(orchestrator);

        console.log('📊 Getting most frequent model/server combinations...');
        const frequentCombos = await performanceService.getFrequentModelServerCombinations({
            limit: 10,
            includeMetrics: true,
            minUsageCount: 2
        });

        console.log(`\n✅ Found ${frequentCombos.length} frequent combinations:\n`);

        frequentCombos.forEach((combo, index) => {
            const serverUrl = performanceService.decodeServerId ?
                performanceService.decodeServerId(combo.serverId) : combo.serverId;

            console.log(`${index + 1}. ${combo.modelName} on ${serverUrl}`);
            console.log(`   Usage Count: ${combo.usageCount}`);
            console.log(`   Last Used: ${combo.lastUsed?.toISOString() || 'Unknown'}`);
            if (combo.averageLatency) {
                console.log(`   Avg Latency: ${combo.averageLatency.toFixed(1)}ms`);
            }
            if (combo.averageThroughput) {
                console.log(`   Avg Throughput: ${combo.averageThroughput.toFixed(2)} req/s`);
            }
            console.log('');
        });

        console.log('📈 Getting deployment statistics...');
        const stats = await performanceService.getModelDeploymentStats();

        console.log(`\n📋 Deployment Overview:`);
        console.log(`   Total Combinations: ${stats.totalCombinations}`);
        console.log(`   Unique Models: ${stats.uniqueModels}`);
        console.log(`   Unique Servers: ${stats.uniqueServers}`);

        console.log(`\n🏆 Top 5 Most Used Models:`);
        stats.mostUsedModels.slice(0, 5).forEach((model, index) => {
            console.log(`   ${index + 1}. ${model.modelName}: ${model.serverCount} servers, ${model.totalUsage} total usage`);
        });

        console.log(`\n🖥️ Top 3 Most Active Servers:`);
        stats.mostActiveServers.slice(0, 3).forEach((server, index) => {
            const serverUrl = performanceService.decodeServerId ?
                performanceService.decodeServerId(server.serverId) : server.serverId;
            console.log(`   ${index + 1}. ${serverUrl}: ${server.modelCount} models, ${server.totalUsage} total usage`);
        });

        console.log('\n📝 Generating usage report...');
        const report = await performanceService.generateUsageReport();

        console.log('\n📄 Usage Report Generated:');
        console.log('═'.repeat(50));
        console.log(report);
        console.log('═'.repeat(50));

        console.log('\n✅ Test completed successfully!');

        // Demonstrate usage tracking
        console.log('\n🔄 Testing usage tracking...');
        await performanceService.trackModelUsage(
            'srv-aHR0cDovLzM1LjEzMi4xNDguMTI4OjExNDM0',
            'qwen3',
            {
                latencyMs: 250,
                throughput: 3.5,
                timestamp: new Date()
            }
        );
        console.log('✅ Usage tracked successfully!');

        // Clean shutdown
        await performanceService.shutdown();

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Add helper method to decode server IDs
async function decodeServerIds() {
    console.log('\n🔍 Decoding server IDs...');

    const encodedIds = [
        'srv-aHR0cDovLzE3My41Ni4zMi41MzoxMTQzNA',
        'srv-aHR0cDovLzEzNi42MC4yMS4yMjY6MTE0MzQ',
        'srv-aHR0cDovLzM1LjEzMi4xNDguMTI4OjExNDM0'
    ];

    encodedIds.forEach(id => {
        try {
            const base64Part = id.substring(4);
            const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
            console.log(`${id} → ${decoded}`);
        } catch (error) {
            console.log(`${id} → [decode failed]`);
        }
    });
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    decodeServerIds().then(() => {
        return testFrequentCombinations();
    }).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

export { testFrequentCombinations, decodeServerIds };
