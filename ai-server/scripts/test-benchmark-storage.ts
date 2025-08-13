/**
 * Comprehensive Benchmark Storage Architecture Test
 * 
 * This script tests the complete flow:
 * 1. Creates mock model-performance nodes
 * 2. Triggers aggregation services
 * 3. Verifies ai-model and ai-server nodes are created
 * 4. Tests the performance analytics API
 * 5. Tests gap analysis integration
 */

import { ModelAggregationService } from '../src/services/model-aggregation.service.js';
import { ServerAggregationService } from '../src/services/server-aggregation.service.js';
import { IntelligentModelSelectionService } from '../src/services/intelligent-model-selection.service.js';
import { AggregationSchedulerService } from '../src/services/aggregation-scheduler.service.js';
import { ensureNode, queryNodesByType } from '../../shared/node/nodeService.js';

async function runComprehensiveTest(): Promise<void> {
    console.log('🚀 Starting comprehensive benchmark storage architecture test...\n');

    try {
        // Step 1: Create mock performance data
        console.log('📊 Step 1: Creating mock model-performance nodes...');
        await createMockPerformanceData();
        console.log('✅ Mock data created successfully\n');

        // Step 2: Test individual model aggregation
        console.log('🔄 Step 2: Testing model aggregation...');
        const modelAggregationService = new ModelAggregationService();
        await modelAggregationService.aggregateModelPerformance('llama3:latest');
        await modelAggregationService.aggregateModelPerformance('codellama:7b');
        console.log('✅ Model aggregation completed\n');

        // Step 3: Test individual server aggregation
        console.log('🖥️ Step 3: Testing server aggregation...');
        const serverAggregationService = new ServerAggregationService();
        await serverAggregationService.aggregateServerPerformance('http://localhost:11434');
        await serverAggregationService.aggregateServerPerformance('http://server2:11434');
        console.log('✅ Server aggregation completed\n');

        // Step 4: Verify aggregated nodes exist
        console.log('🔍 Step 4: Verifying aggregated nodes...');
        await verifyAggregatedNodes();
        console.log('✅ Node verification completed\n');

        // Step 5: Test batch aggregation
        console.log('📦 Step 5: Testing batch aggregation...');
        await modelAggregationService.aggregateAllModels();
        await serverAggregationService.aggregateAllServers();
        console.log('✅ Batch aggregation completed\n');

        // Step 6: Test intelligent model selection
        console.log('🧠 Step 6: Testing intelligent model selection...');
        await testIntelligentModelSelection();
        console.log('✅ Intelligent model selection tested\n');

        // Step 7: Test aggregation scheduler
        console.log('⏰ Step 7: Testing aggregation scheduler...');
        await testAggregationScheduler();
        console.log('✅ Aggregation scheduler tested\n');

        // Step 8: Display final results
        console.log('📈 Step 8: Displaying final results...');
        await displayFinalResults();

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

async function createMockPerformanceData(): Promise<void> {
    const mockNodes = [
        // llama3:latest on localhost
        {
            type: 'model-performance' as const,
            title: 'llama3:latest-localhost',
            metadata: {
                modelId: 'llama3:latest',
                serverId: 'http://localhost:11434',
                lastBenchmarked: new Date().toISOString(),
                benchmarkingStrategy: 'comprehensive-test'
            },
            qualityResults: {
                'creative-writing': { score: 0.87 },
                'character-consistency': { score: 0.82 },
                'dialogue-generation': { score: 0.85 },
                'json-assembly': { score: 0.93 },
                'typescript-quality': { score: 0.78 },
                'task-planning': { score: 0.81 }
            },
            coldLatency: 2200, // 2.2 seconds
            warmLatencies: [720, 680, 750, 710, 690] // ~710ms average
        },
        // llama3:latest on server2
        {
            type: 'model-performance' as const,
            title: 'llama3:latest-server2',
            metadata: {
                modelId: 'llama3:latest',
                serverId: 'http://server2:11434',
                lastBenchmarked: new Date().toISOString(),
                benchmarkingStrategy: 'comprehensive-test'
            },
            qualityResults: {
                'creative-writing': { score: 0.84 },
                'character-consistency': { score: 0.79 },
                'dialogue-generation': { score: 0.82 },
                'json-assembly': { score: 0.91 },
                'typescript-quality': { score: 0.75 },
                'task-planning': { score: 0.78 }
            },
            coldLatency: 2800, // 2.8 seconds
            warmLatencies: [920, 880, 950, 910, 890] // ~910ms average
        },
        // codellama:7b on localhost
        {
            type: 'model-performance' as const,
            title: 'codellama:7b-localhost',
            metadata: {
                modelId: 'codellama:7b',
                serverId: 'http://localhost:11434',
                lastBenchmarked: new Date().toISOString(),
                benchmarkingStrategy: 'comprehensive-test'
            },
            qualityResults: {
                'typescript-quality': { score: 0.92 },
                'json-assembly': { score: 0.89 },
                'task-planning': { score: 0.85 },
                'creative-writing': { score: 0.65 }, // Lower for code model
                'character-consistency': { score: 0.62 },
                'dialogue-generation': { score: 0.58 }
            },
            coldLatency: 1800, // 1.8 seconds (faster)
            warmLatencies: [550, 520, 580, 540, 560] // ~550ms average
        },
        // codellama:7b on server2
        {
            type: 'model-performance' as const,
            title: 'codellama:7b-server2',
            metadata: {
                modelId: 'codellama:7b',
                serverId: 'http://server2:11434',
                lastBenchmarked: new Date().toISOString(),
                benchmarkingStrategy: 'comprehensive-test'
            },
            qualityResults: {
                'typescript-quality': { score: 0.89 },
                'json-assembly': { score: 0.86 },
                'task-planning': { score: 0.82 },
                'creative-writing': { score: 0.62 },
                'character-consistency': { score: 0.59 },
                'dialogue-generation': { score: 0.55 }
            },
            coldLatency: 2100, // 2.1 seconds
            warmLatencies: [650, 620, 680, 640, 660] // ~650ms average
        }
    ];

    const createPromises = mockNodes.map(node => ensureNode(node));
    await Promise.all(createPromises);
    console.log(`   Created ${mockNodes.length} model-performance nodes`);
}

async function verifyAggregatedNodes(): Promise<void> {
    // Check ai-model nodes
    const aiModelNodes = await queryNodesByType('ai-model');
    console.log(`   Found ${aiModelNodes.length} ai-model nodes:`);

    aiModelNodes.forEach((node: any) => {
        console.log(`     - ${node.title} (servers: ${node.metadata?.serverCount || 0}, quality: ${node.avgQualityScore?.toFixed(2) || 'N/A'})`);
    });

    // Check ai-server nodes
    const aiServerNodes = await queryNodesByType('ai-server');
    console.log(`   Found ${aiServerNodes.length} ai-server nodes:`);

    aiServerNodes.forEach((node: any) => {
        const health = node.serverHealth?.healthScore || 'N/A';
        const models = node.metadata?.modelCount || 0;
        console.log(`     - ${node.title} (models: ${models}, health: ${typeof health === 'number' ? health.toFixed(1) : health})`);
    });
}

async function testIntelligentModelSelection(): Promise<void> {
    const selectionService = new IntelligentModelSelectionService();

    // Test getting all models
    const allModels = await selectionService.getAllModels();
    console.log(`   Retrieved ${allModels.length} models from intelligent selection service`);

    // Test model selection for creative writing
    const creativeWritingSelection = await selectionService.selectBestModelForTask('creative-writing', {
        taskType: 'creative-writing',
        minQualityScore: 0.8
    });
    console.log(`   Best model for creative writing: ${creativeWritingSelection.modelId} (confidence: ${creativeWritingSelection.confidence.toFixed(2)})`);

    // Test model selection for code generation
    const codeSelection = await selectionService.selectBestModelForTask('code-generation', {
        taskType: 'code-generation',
        minQualityScore: 0.85
    });
    console.log(`   Best model for code generation: ${codeSelection.modelId} (confidence: ${codeSelection.confidence.toFixed(2)})`);
}

async function testAggregationScheduler(): Promise<void> {
    const scheduler = new AggregationSchedulerService();

    // Test immediate aggregation
    await scheduler.triggerImmediateAggregation(['llama3:latest'], ['http://localhost:11434']);
    console.log('   Triggered immediate aggregation for specific model and server');

    // Test status
    const status = scheduler.getStatus();
    console.log(`   Scheduler status: running=${status.isRunning}, interval=${status.intervalMs}ms`);
}

async function displayFinalResults(): Promise<void> {
    console.log('   📊 Final Results Summary:');

    // Get all performance nodes
    const performanceNodes = await queryNodesByType('model-performance');
    console.log(`     • ${performanceNodes.length} model-performance nodes (raw data)`);

    // Get all aggregated nodes
    const aiModelNodes = await queryNodesByType('ai-model');
    const aiServerNodes = await queryNodesByType('ai-server');
    console.log(`     • ${aiModelNodes.length} ai-model nodes (aggregated)`);
    console.log(`     • ${aiServerNodes.length} ai-server nodes (aggregated)`);

    // Show model rankings
    console.log('\n   🏆 Model Quality Rankings:');
    const rankedModels = aiModelNodes
        .map((node: any) => ({
            modelId: node.title,
            avgQuality: node.avgQualityScore || 0,
            avgColdLatency: node.performanceProfile?.avgColdLatency || 0,
            serverCount: node.metadata?.serverCount || 0
        }))
        .sort((a, b) => b.avgQuality - a.avgQuality);

    rankedModels.forEach((model, index) => {
        console.log(`     ${index + 1}. ${model.modelId} - Quality: ${model.avgQuality.toFixed(2)}, Latency: ${model.avgColdLatency.toFixed(0)}ms, Servers: ${model.serverCount}`);
    });

    // Show server health
    console.log('\n   🖥️ Server Health Status:');
    const rankedServers = aiServerNodes
        .map((node: any) => ({
            serverId: node.title,
            healthScore: node.serverHealth?.healthScore || 0,
            modelCount: node.metadata?.modelCount || 0,
            avgLatency: node.serverHealth?.endpointLatency || 0
        }))
        .sort((a, b) => b.healthScore - a.healthScore);

    rankedServers.forEach((server, index) => {
        console.log(`     ${index + 1}. ${server.serverId} - Health: ${server.healthScore.toFixed(1)}, Models: ${server.modelCount}, Latency: ${server.avgLatency.toFixed(0)}ms`);
    });
}

// Run the test
console.log('Starting benchmark storage architecture test...\n');
runComprehensiveTest()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
