/**
 * Benchmark Storage Integration Test
 * 
 * This test validates that the benchmarking system properly integrates
 * with the new benchmark storage architecture (model-performance nodes → aggregation → ai-model/ai-server nodes).
 */

import { ModelAggregationService } from '../../src/services/model-aggregation.service.js';
import { ServerAggregationService } from '../../src/services/server-aggregation.service.js';
import { BenchmarkGapAnalyzerService } from '../../src/services/benchmark-gap-analyzer.service.js';
import { AggregationSchedulerService } from '../../src/services/aggregation-scheduler.service.js';
import { ensureNode, queryNodesByType } from '../../../shared/node/nodeService.js';

/**
 * Test the complete flow:
 * 1. Create mock model-performance nodes
 * 2. Trigger aggregation
 * 3. Verify ai-model and ai-server nodes are created
 * 4. Test gap analysis integration
 */
export async function testBenchmarkStorageIntegration(): Promise<void> {
    console.log('🧪 Starting benchmark storage integration test...');

    try {
        // 1. Create mock model-performance nodes
        await createMockPerformanceData();

        // 2. Test model aggregation
        const modelAggregationService = new ModelAggregationService();
        await modelAggregationService.aggregateModelPerformance('test-model-llama3');
        console.log('✅ Model aggregation completed');

        // 3. Test server aggregation
        const serverAggregationService = new ServerAggregationService();
        await serverAggregationService.aggregateServerPerformance('http://localhost:11434');
        console.log('✅ Server aggregation completed');

        // 4. Verify aggregated nodes exist
        await verifyAggregatedNodes();

        // 5. Test batch aggregation
        await modelAggregationService.aggregateAllModels();
        await serverAggregationService.aggregateAllServers();
        console.log('✅ Batch aggregation completed');

        // 6. Test aggregation scheduler
        const scheduler = new AggregationSchedulerService();
        await scheduler.triggerImmediateAggregation(['test-model-llama3'], ['http://localhost:11434']);
        console.log('✅ Immediate aggregation trigger completed');

        // 7. Test gap analyzer integration
        const gapAnalyzer = new BenchmarkGapAnalyzerService();
        const gaps = await gapAnalyzer.analyzeBenchmarkGaps();
        console.log(`✅ Gap analysis completed, found ${gaps.length} gaps`);

        console.log('🎉 Benchmark storage integration test completed successfully!');

    } catch (error) {
        console.error('❌ Benchmark storage integration test failed:', error);
        throw error;
    }
}

/**
 * Create mock model-performance nodes for testing
 */
async function createMockPerformanceData(): Promise<void> {
    const mockPerformanceNodes = [
        {
            type: 'model-performance' as const,
            title: 'test-model-llama3-localhost',
            metadata: {
                modelId: 'test-model-llama3',
                serverId: 'http://localhost:11434',
                lastBenchmarked: new Date().toISOString(),
                benchmarkingStrategy: 'integration-test'
            },
            qualityResults: {
                'creative-writing': { score: 0.85 },
                'character-consistency': { score: 0.78 },
                'dialogue-generation': { score: 0.82 },
                'json-assembly': { score: 0.90 }
            },
            coldLatency: 2500, // 2.5 seconds
            warmLatencies: [800, 750, 820, 780] // ~800ms average
        },
        {
            type: 'model-performance' as const,
            title: 'test-model-llama3-server2',
            metadata: {
                modelId: 'test-model-llama3',
                serverId: 'http://server2:11434',
                lastBenchmarked: new Date().toISOString(),
                benchmarkingStrategy: 'integration-test'
            },
            qualityResults: {
                'creative-writing': { score: 0.80 },
                'character-consistency': { score: 0.75 },
                'dialogue-generation': { score: 0.79 },
                'json-assembly': { score: 0.88 }
            },
            coldLatency: 3200, // 3.2 seconds
            warmLatencies: [950, 920, 980, 940] // ~950ms average
        }
    ];

    for (const node of mockPerformanceNodes) {
        await ensureNode(node);
    }

    console.log(`✅ Created ${mockPerformanceNodes.length} mock model-performance nodes`);
}

/**
 * Verify that aggregated ai-model and ai-server nodes were created
 */
async function verifyAggregatedNodes(): Promise<void> {
    // Check for ai-model nodes
    const aiModelNodes = await queryNodesByType('ai-model');
    const testModelNode = aiModelNodes.find((node: any) => node.title === 'test-model-llama3');

    if (!testModelNode) {
        throw new Error('Expected ai-model node was not created');
    }
    console.log('✅ Found aggregated ai-model node:', testModelNode.title);

    // Check for ai-server nodes
    const aiServerNodes = await queryNodesByType('ai-server');
    const testServerNode = aiServerNodes.find((node: any) => node.title === 'http://localhost:11434');

    if (!testServerNode) {
        throw new Error('Expected ai-server node was not created');
    }
    console.log('✅ Found aggregated ai-server node:', testServerNode.title);
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(): Promise<void> {
    // This would remove test nodes if needed
    console.log('🧹 Test cleanup would happen here (nodes can remain for inspection)');
}

// Export for use in test suites
export default {
    testBenchmarkStorageIntegration,
    cleanupTestData
};
