#!/usr/bin/env tsx
/**
 * Comprehensive Model Benchmarking Script
 * Tests all specified models with all available benchmark types
 * Queues jobs intelligently to avoid server overload
 */

import { BenchmarkType } from '../shared/types/aiQualityBenchmark.js';

// Models to test
const MODELS = [
    'llama3.1:8b-instruct-q4_K_M',
    'starcoder2:15b',
    'deepseek-r1:latest',
    'smollm2:135m',
    'mattw/pygmalion:latest',
    'mario:latest',
    'llama3.2:latest',
    'llama3:latest',
    'huihui_ai/deepseek-r1-abliterated:latest'
];

// Server to test against
const SERVER_URL = 'http://159.89.92.29:11434';

// All available benchmark types
const ALL_BENCHMARK_TYPES: BenchmarkType[] = [
    // Core benchmarks
    'task-planning',
    'json-assembly',
    'creative-writing',
    'typescript-quality',
    'dialogue-generation',
    'fact-extraction',
    'summarization',
    'content-moderation',
    'permissive-content',
    'style-transfer',
    'advanced-code-generation',
    'node-graph-construction',
    'long-form-generation',
    'protocol-compliance',

    // Book writing benchmarks
    'character-consistency',
    'plot-coherence',
    'world-building',
    'emotional-depth',
    'pacing-rhythm',
    'genre-adherence',
    'conflict-resolution',
    'narrative-voice',
    'scene-transitions',
    'thematic-consistency',

    // Code quality benchmarks
    'code-style-consistency',
    'variable-naming',
    'comment-quality',
    'error-handling',
    'performance-awareness',
    'security-consciousness',
    'maintainability',

    // Embedding benchmarks (will auto-detect and skip for non-embedding models)
    'embedding-quality',
    'embedding-speed',
    'vector-similarity',
    'embedding-dimensions',
    'embedding-clustering'
];

interface BenchmarkRequest {
    serverIdOrUrl: string;
    modelId: string;
    benchmarkTypes: BenchmarkType[];
}

interface BenchmarkResult {
    model: string;
    success: boolean;
    error?: string;
    duration?: number;
    benchmarkCount?: number;
}

/**
 * Execute benchmark request via HTTP API
 */
async function executeBenchmark(request: BenchmarkRequest): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
        console.log(`🚀 Starting benchmarks for ${request.modelId} (${request.benchmarkTypes.length} types)`);

        const response = await fetch('http://localhost:5100/api/manual/benchmark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const duration = Date.now() - startTime;

        if (result.success) {
            console.log(`✅ Completed benchmarks for ${request.modelId} in ${duration}ms`);
            console.log(`   Benchmark scores:`, Object.keys(result.results?.benchmarks || {}));
            return {
                model: request.modelId,
                success: true,
                duration,
                benchmarkCount: Object.keys(result.results?.benchmarks || {}).length
            };
        } else {
            throw new Error(result.error || 'Unknown benchmark failure');
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Failed benchmarks for ${request.modelId}: ${error}`);
        return {
            model: request.modelId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration
        };
    }
}

/**
 * Add delay between requests to prevent server overload
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main benchmarking execution
 */
async function runComprehensiveBenchmarks(): Promise<void> {
    console.log(`🎯 Starting comprehensive benchmarks`);
    console.log(`📊 Models: ${MODELS.length}`);
    console.log(`🧪 Benchmark types: ${ALL_BENCHMARK_TYPES.length}`);
    console.log(`🖥️  Server: ${SERVER_URL}`);
    console.log(`⏱️  Estimated time: ${Math.ceil(MODELS.length * 15)} minutes\n`);

    const results: BenchmarkResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < MODELS.length; i++) {
        const model = MODELS[i];

        console.log(`\n📋 [${i + 1}/${MODELS.length}] Processing model: ${model}`);

        const request: BenchmarkRequest = {
            serverIdOrUrl: SERVER_URL,
            modelId: model,
            benchmarkTypes: ALL_BENCHMARK_TYPES
        };

        const result = await executeBenchmark(request);
        results.push(result);

        if (result.success) {
            successCount++;
        } else {
            failureCount++;
        }

        // Add delay between models to prevent server overload
        if (i < MODELS.length - 1) {
            console.log(`⏳ Waiting 30 seconds before next model...`);
            await delay(30000);
        }
    }

    // Final summary
    console.log(`\n🎉 Comprehensive benchmarking complete!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Total models tested: ${MODELS.length}`);

    // Detailed results
    console.log(`\n📋 Detailed Results:`);
    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration ? `${Math.round(result.duration / 1000)}s` : 'N/A';
        const benchmarks = result.benchmarkCount ? `${result.benchmarkCount} benchmarks` : '';
        console.log(`${status} ${result.model} (${duration}) ${benchmarks}`);
        if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
    });

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `comprehensive-benchmark-results-${timestamp}.json`;

    try {
        const fs = await import('fs/promises');
        await fs.writeFile(resultsFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            serverUrl: SERVER_URL,
            models: MODELS,
            benchmarkTypes: ALL_BENCHMARK_TYPES,
            results,
            summary: {
                total: MODELS.length,
                successful: successCount,
                failed: failureCount,
                successRate: Math.round((successCount / MODELS.length) * 100)
            }
        }, null, 2));

        console.log(`\n💾 Results saved to: ${resultsFile}`);
    } catch (error) {
        console.error(`❌ Failed to save results: ${error}`);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runComprehensiveBenchmarks()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { runComprehensiveBenchmarks, MODELS, ALL_BENCHMARK_TYPES };
