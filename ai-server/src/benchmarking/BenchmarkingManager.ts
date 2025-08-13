// ai-server/benchmarking/BenchmarkingManager.ts
/**
 * BenchmarkingManager
 * Queue-based benchmarking system with intelligent model selection and dependency management.
 *
 * @module BenchmarkingManager
 */

import {
    ModelQualityBenchmarks,
    BenchmarkType,
    QualityBenchmarkScore,
    ServerLatencyMetrics,
    ColdPerformanceMetrics,
    WarmPerformanceMetrics,
    LatencyMetrics // Legacy support
} from 'shared/types/aiQualityBenchmark.js';
import { scheduleNextQualityBenchmark, NextBenchmarkSchedule } from './scheduleNextQualityBenchmark.js';
import { ensureNode, getNode } from 'shared/node/nodeService.js';
import {
    measureServerLatencies,
    measureServerThroughput,
    measureSimpleServerLatency,
    runQualityBenchmarks,
    selectSlowestServer,
    callModelAPI,
    safeBleu,
    safeRouge
    // Removed hardcoded benchmark function imports - now using dynamic loading
} from './benchmarkUtils.js';

// Queue system imports
import { UniversalQueueService } from '../services/universal-queue.service.js';
import { JobBuilder } from '../utils/job-builder.js';
import { UniversalJob, JobType, JobCategory, JobConstraints } from 'shared/types/universal-job.js';
import { TaskType, JobPriority, OutputFormat } from 'shared/types/model-selection.js';
import { ServerId } from 'shared/types/server.js';

const MANUAL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes for CPU inference
const AUTO_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes for CPU inference

// Benchmark prompts for different test types
const BENCHMARK_PROMPTS = {
    // Performance test prompts
    'cold-performance': 'Generate a simple "Hello, world!" message.',
    'warm-performance': 'Generate a simple "Hello, world!" message.',

    // Quality test prompts (for warmup and assessment)
    'json-assembly': 'Generate a JSON object with user information including name, age, and email.',
    'jsonAssembly': 'Generate a JSON object with user information including name, age, and email.',
    'creative-writing': 'Write a short creative story about a robot learning to paint.',
    'creativeWriting': 'Write a short creative story about a robot learning to paint.',
    'typescript-quality': 'Write a TypeScript function that sorts an array of objects by a specified property.',
    'typescriptQuality': 'Write a TypeScript function that sorts an array of objects by a specified property.',
    'task-planning': 'Plan the steps to deploy a new server instance, including configuration, monitoring, and scaling.',
    'taskPlanning': 'Plan the steps to deploy a new server instance, including configuration, monitoring, and scaling.',

    // Book writing specific prompts
    'character-consistency': 'You are writing a chapter featuring Captain Elena Vasquez, a 42-year-old former engineer turned starship captain. She is known for being methodical, compassionate but decisive, and has a habit of tapping her fingers when thinking. She also speaks with slight technical jargon due to her engineering background. Write two scenes: First, Elena making a difficult command decision about whether to help a stranded alien ship. Second, Elena having a casual conversation with her crew in the mess hall. Ensure her personality, speech patterns, and mannerisms remain consistent between both scenes.',
    'characterConsistency': 'You are writing a chapter featuring Captain Elena Vasquez, a 42-year-old former engineer turned starship captain. She is known for being methodical, compassionate but decisive, and has a habit of tapping her fingers when thinking. She also speaks with slight technical jargon due to her engineering background. Write two scenes: First, Elena making a difficult command decision about whether to help a stranded alien ship. Second, Elena having a casual conversation with her crew in the mess hall. Ensure her personality, speech patterns, and mannerisms remain consistent between both scenes.',
    'plot-coherence': 'Continue a story with logical progression and cause-and-effect relationships.',
    'plotCoherence': 'Continue a story with logical progression and cause-and-effect relationships.',
    'world-building': 'Create a detailed fictional world with consistent rules, geography, and culture.',
    'worldBuilding': 'Create a detailed fictional world with consistent rules, geography, and culture.',
    'emotional-depth': 'Write a scene showing character growth through internal conflict and resolution.',
    'emotionalDepth': 'Write a scene showing character growth through internal conflict and resolution.',
    'dialogue-generation': 'Write realistic dialogue between two characters with distinct voices and motivations.',
    'dialogueGeneration': 'Write realistic dialogue between two characters with distinct voices and motivations.',
    'fact-extraction': 'Extract key facts and information from the following text passage.',
    'summarization': 'Summarize the following content concisely while preserving key information.',
    'content-moderation': 'Evaluate the following content for appropriateness and safety.',
    'permissive-content': 'Generate creative content that pushes boundaries while staying appropriate.',
    'style-transfer': 'Rewrite the following text in a different literary style.',
    'advanced-code-generation': 'Write a TypeScript class for a Starship plugin with the following requirements: 1. Implement a SpaceVessel interface with required methods 2. Use generic types for cargo and crew management 3. Include comprehensive JSDoc with @param and @returns 4. Add proper error handling and validation 5. Follow plugin-first architecture patterns 6. Include methods for warp travel, impulse engines, and docking',
    'advancedCodeGeneration': 'Write a TypeScript class for a Starship plugin with the following requirements: 1. Implement a SpaceVessel interface with required methods 2. Use generic types for cargo and crew management 3. Include comprehensive JSDoc with @param and @returns 4. Add proper error handling and validation 5. Follow plugin-first architecture patterns 6. Include methods for warp travel, impulse engines, and docking',
    'node-graph-construction': 'Design a node-based data structure representing relationships between entities.',
    'long-form-generation': 'Write an extended narrative or article of at least 1000 words.',
    'protocol-compliance': 'Demonstrate adherence to specific formatting or protocol requirements.',

    // Additional narrative benchmarks
    'genre-adherence': 'Write content that strictly follows specific genre conventions.',
    'pacing-rhythm': 'Create content with varied pacing and narrative rhythm.',
    'conflict-resolution': 'Develop and resolve story tensions effectively.',
    'narrative-voice': 'Maintain consistent narrator perspective throughout.',
    'scene-transitions': 'Create smooth transitions between scenes or chapters.',
    'thematic-consistency': 'Maintain story themes throughout the narrative.',

    // Vibe coding benchmarks
    'code-style-consistency': 'Write code following consistent style guidelines.',
    'variable-naming': 'Create code with clear and meaningful variable names.',
    'comment-quality': 'Write well-documented code with helpful comments.',
    'error-handling': 'Implement robust error handling patterns.',
    'performance-awareness': 'Write efficient and optimized code.',
    'security-consciousness': 'Implement secure coding practices.',
    'maintainability': 'Write code that is easy to modify and extend.',

    // Embedding model benchmarks
    'embedding-quality': 'Generate high-quality semantic embeddings.',
    'embedding-speed': 'Optimize embedding generation performance.',
    'vector-similarity': 'Calculate accurate similarity between vectors.',
    'embedding-dimensions': 'Maintain consistent vector dimensions.',
    'embedding-clustering': 'Group similar embeddings effectively.',

    // Legacy prompts for backward compatibility
    'latency': 'Say hello.',
};

// Server infrastructure endpoints for latency testing
const SERVER_ENDPOINTS = {
    TAGS: '/api/tags',
    VERSION: '/api/version',
    PS: '/api/ps',
    MODELS: '/api/models'
};

export interface IBenchmarkingManager {
    getAllModelBenchmarks(): Promise<readonly ModelQualityBenchmarks[]>;
    runBenchmarksForModel(modelId: string, types: readonly BenchmarkType[]): Promise<ModelQualityBenchmarks>;
    runManualBenchmarksForServer(serverId: string, modelId: string, types: readonly BenchmarkType[]): Promise<ModelQualityBenchmarks>;
}

import { logger } from 'shared/logging/logger.js';
import Ajv from 'ajv';

import { getModelBenchmarks, saveModelBenchmarks } from './db/modelBenchmarksDb.js';

async function fetchModelBenchmarksFromDB(): Promise<ModelQualityBenchmarks[]> {
    return getModelBenchmarks();
}

async function saveModelBenchmarkToDB(benchmark: ModelQualityBenchmarks): Promise<void> {
    await saveModelBenchmarks(benchmark);
}

import { getServersForModel, getServerLatency } from '../../orchestrator/serverDiscovery.js';

function decodeIfBase64(str: string): string {
    console.log(`[decodeIfBase64] Input: ${str}`);

    // If already a valid URL, return as-is
    if (/^https?:\/\//.test(str)) {
        console.log(`[decodeIfBase64] Already a URL, returning: ${str}`);
        return str;
    }

    // Handle srv- prefixed base64 encoded strings
    let base64Part = str;
    if (str.startsWith('srv-')) {
        base64Part = str.substring(4); // Remove 'srv-' prefix
        console.log(`[decodeIfBase64] Removed 'srv-' prefix, base64 part: ${base64Part}`);
    }

    // If the string looks like base64 (letters, numbers, +, /, =), try to decode it
    if (/^[A-Za-z0-9+/=]+$/.test(base64Part)) {
        try {
            const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
            console.log(`[decodeIfBase64] Decoded: ${decoded}`);
            if (/^https?:\/\//.test(decoded)) {
                console.log(`[decodeIfBase64] Valid URL decoded, returning: ${decoded}`);
                return decoded;
            }
        } catch (error) {
            console.warn(`[decodeIfBase64] Failed to decode base64: ${error}`);
        }
    }

    console.log(`[decodeIfBase64] No decoding needed, returning original: ${str}`);
    return str;
}

async function discoverServersForModel(modelId: string): Promise<string[]> {
    const servers = await getServersForModel(modelId);
    return servers.map(decodeIfBase64);
}

async function measureServerLatency(serverId: string, modelId: string): Promise<number> {
    return getServerLatency(decodeIfBase64(serverId), modelId);
}

/**
 * Measure server infrastructure latency by testing actual HTTP endpoints
 */
async function measureServerInfrastructureLatency(serverUrl: string): Promise<ServerLatencyMetrics> {
    const decodedUrl = decodeIfBase64(serverUrl);
    const results: Partial<ServerLatencyMetrics> = {};

    // Test each endpoint and measure response time
    for (const [name, endpoint] of Object.entries(SERVER_ENDPOINTS)) {
        try {
            const startTime = Date.now();
            const response = await fetch(`${decodedUrl}${endpoint}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            const endTime = Date.now();

            if (response.ok) {
                const latency = endTime - startTime;
                switch (name) {
                    case 'TAGS':
                        results.tagsLatency = latency;
                        break;
                    case 'VERSION':
                        results.versionLatency = latency;
                        break;
                    case 'PS':
                        results.psLatency = latency;
                        break;
                }
            }
        } catch (error) {
            console.warn(`[ServerLatency] Failed to test ${endpoint} on ${decodedUrl}:`, error);
            // Set high latency for failed requests
            switch (name) {
                case 'TAGS':
                    results.tagsLatency = 9999;
                    break;
                case 'VERSION':
                    results.versionLatency = 9999;
                    break;
                case 'PS':
                    results.psLatency = 9999;
                    break;
            }
        }
    }

    // Calculate health score based on response times
    const avgLatency = [
        results.tagsLatency || 9999,
        results.versionLatency || 9999,
        results.psLatency || 9999
    ].reduce((a, b) => a + b, 0) / 3;

    // Health score: 1.0 for < 100ms, 0.5 for < 500ms, 0.1 for < 2000ms, 0.0 for >= 2000ms
    let healthScore = 0.0;
    if (avgLatency < 100) healthScore = 1.0;
    else if (avgLatency < 500) healthScore = 0.8;
    else if (avgLatency < 1000) healthScore = 0.5;
    else if (avgLatency < 2000) healthScore = 0.2;
    else healthScore = 0.1;

    return {
        tagsLatency: results.tagsLatency || 9999,
        versionLatency: results.versionLatency || 9999,
        psLatency: results.psLatency || 9999,
        healthScore
    };
}


export class BenchmarkingManager implements IBenchmarkingManager {
    constructor(
        private readonly queueService: UniversalQueueService,
        private readonly jobBuilder: JobBuilder
    ) { }

    async measureServerLatencies(serverId: string, modelId: string, prompt: string, timeoutMs: number = MANUAL_TIMEOUT_MS): Promise<{ cold: number, warmAvg: number, warmup: number, warmAll: number[] }> {
        const decodedServerId = decodeIfBase64(serverId); // Ensure server ID is decoded
        console.log(`[BenchmarkingManager] Measuring server latencies for decoded server ID: ${decodedServerId}, model: ${modelId}`);
        return measureServerLatencies(
            decodedServerId,
            modelId,
            prompt,
            (sid, mid, p, t) => callModelAPI(decodeIfBase64(sid), mid, p, 3, 500, t),
            timeoutMs
        );
    }

    async measureServerThroughput(serverId: string, modelId: string, prompt: string, parallel: number = 5, timeoutMs: number = MANUAL_TIMEOUT_MS): Promise<{ average: number, all: number[] }> {
        const decodedServerId = decodeIfBase64(serverId); // Ensure server ID is decoded
        console.log(`[BenchmarkingManager] Measuring server throughput for decoded server ID: ${decodedServerId}, model: ${modelId}`);
        return measureServerThroughput(
            decodedServerId,
            modelId,
            prompt,
            (sid, mid, p, t) => callModelAPI(decodeIfBase64(sid), mid, p, 3, 500, t),
            parallel,
            timeoutMs
        );
    }

    async measureServerInfrastructure(serverId: string): Promise<ServerLatencyMetrics> {
        const decodedServerId = decodeIfBase64(serverId); // Ensure server ID is decoded
        console.log(`[BenchmarkingManager] Measuring server infrastructure for decoded server ID: ${decodedServerId}`);
        return measureServerInfrastructureLatency(decodedServerId);
    }

    async getAllModelBenchmarks(): Promise<readonly ModelQualityBenchmarks[]> {
        console.log('[BenchmarkingManager] Fetching all model benchmarks...');
        const results = await fetchModelBenchmarksFromDB();
        console.log(`[BenchmarkingManager] Fetched ${results.length} model benchmarks.`);
        return results;
    }

    async runBenchmarksForModel(
        modelId: string,
        types: readonly BenchmarkType[],
        opts?: { auto?: boolean }
    ): Promise<ModelQualityBenchmarks> {
        console.log(`[BenchmarkingManager Debug] Starting queue-based benchmarks for model: ${modelId}`);
        console.log(`[BenchmarkingManager Debug] Benchmark types requested: ${types.join(', ')}`);
        console.log(`[BenchmarkingManager Debug] Options: ${JSON.stringify(opts)}`);

        try {
            // Create benchmark workflow with dependencies
            console.log(`[BenchmarkingManager Debug] Creating benchmark workflow...`);
            const jobs = await this.createBenchmarkWorkflow(modelId, types);
            console.log(`[BenchmarkingManager Debug] Created ${jobs.length} workflow jobs`);

            // Submit workflow to queue
            console.log(`[BenchmarkingManager Debug] Submitting workflow to queue system`);
            const results = await this.queueService.submitWorkflow(jobs);
            console.log(`[BenchmarkingManager Debug] Queue submission completed`);

            // Wait for completion and aggregate results
            console.log(`[BenchmarkingManager Debug] Aggregating results...`);
            const benchmarkResult = await this.aggregateResults(modelId, results);
            console.log(`[BenchmarkingManager Debug] Results aggregated successfully`);

            // Save to persistent storage
            console.log(`[BenchmarkingManager Debug] Saving to persistent storage...`);
            await saveModelBenchmarkToDB(benchmarkResult);
            console.log(`[BenchmarkingManager Debug] Benchmark saved to persistent storage`);

            // Update RAG system
            console.log(`[BenchmarkingManager Debug] Updating RAG system...`);
            await this.updateRAGSystem(benchmarkResult);
            console.log(`[BenchmarkingManager Debug] RAG system updated successfully`);

            return benchmarkResult;

        } catch (error) {
            console.error(`[BenchmarkingManager Debug] Queue-based benchmark failed:`, error);
            console.log(`[BenchmarkingManager Debug] Falling back to legacy implementation`);
            // Fallback to legacy implementation for now
            return await this.runLegacyBenchmarks(modelId, types, opts);
        }
    }

    /**
     * Run benchmarks for a specific server and model - used for manual testing
     * @param serverId - The server ID or URL to test
     * @param modelId - The model to benchmark
     * @param types - Types of benchmarks to run
     * @returns Promise resolving to benchmark results
     */
    async runManualBenchmarksForServer(
        serverId: string,
        modelId: string,
        types: readonly BenchmarkType[]
    ): Promise<ModelQualityBenchmarks> {
        const decodedServerId = decodeIfBase64(serverId);
        console.log(`[BenchmarkingManager Debug] Starting manual benchmarks for server: ${decodedServerId}`);
        console.log(`[BenchmarkingManager Debug] Model: ${modelId}, Types: ${types.join(', ')}`);
        console.log(`[BenchmarkingManager Debug] Original serverId: ${serverId}, Decoded: ${decodedServerId}`);
        console.log(`[BenchmarkingManager] Running manual benchmarks for server: ${decodedServerId}, model: ${modelId}, types: ${types.join(', ')}`);

        try {
            // Initialize mutable result structure
            const benchmarks: Record<string, QualityBenchmarkScore> = {};
            const serverLatencyMetrics: Record<string, ServerLatencyMetrics> = {};
            const serverColdPerformance: Record<string, ColdPerformanceMetrics> = {};
            const serverWarmPerformance: Record<string, WarmPerformanceMetrics> = {};
            const serverLatencies: Record<string, number> = {};
            const serverLatencyDetails: Record<string, LatencyMetrics> = {};
            const serverThroughput: Record<string, any> = {};

            // Step 1: Always test server infrastructure latency (health check)
            console.log(`[BenchmarkingManager Debug] Testing server infrastructure latency for ${decodedServerId}`);
            const serverLatency = await this.measureServerInfrastructure(decodedServerId);
            serverLatencyMetrics[decodedServerId] = serverLatency;
            console.log(`[BenchmarkingManager Debug] Server latency metrics:`, serverLatency);

            // All requested types are quality benchmarks - performance tests are not in BenchmarkType
            // We only run quality benchmarks that were explicitly requested
            const qualityTypes = types; // All types are quality benchmarks

            console.log(`[BenchmarkingManager Debug] Quality tests requested: ${qualityTypes.join(', ')}`);

            // Skip automatic performance tests - only run what was requested
            console.log(`[BenchmarkingManager Debug] Skipping automatic performance tests - only running requested quality benchmarks`);

            // Step 2: Intelligent warmup and quality benchmark execution
            if (qualityTypes.length > 0) {
                console.log(`[BenchmarkingManager Debug] Running intelligent warmup and quality benchmarks for ${modelId} on ${decodedServerId}`);

                let warmupResults: Array<{ type: BenchmarkType, scores: number[], rubrics: string[] }> = [];

                if (qualityTypes.length === 1) {
                    // Single quality test: run it 3 times during warmup
                    const singleType = qualityTypes[0];
                    console.log(`[BenchmarkingManager Debug] Single quality test detected: running ${singleType} 3 times for warmup`);

                    const scores: number[] = [];
                    const rubrics: string[] = [];

                    for (let i = 0; i < 3; i++) {
                        try {
                            console.log(`[BenchmarkingManager Debug] Warmup run ${i + 1}/3 for ${singleType}`);
                            const result = await runQualityBenchmarks(modelId, decodedServerId, [singleType]);
                            console.log(`[BenchmarkingManager Debug] Warmup run ${i + 1} result:`, result[singleType]);
                            if (result[singleType]) {
                                scores.push(result[singleType].score);
                                rubrics.push(result[singleType].rubric || '');
                            }
                        } catch (error) {
                            console.warn(`[BenchmarkingManager Debug] Warmup run ${i + 1} failed for ${singleType}:`, error);
                            scores.push(0);
                            rubrics.push(`Warmup run ${i + 1} failed: ${error}`);
                        }
                    }

                    warmupResults.push({ type: singleType, scores, rubrics });
                    console.log(`[BenchmarkingManager Debug] Single test warmup completed with ${scores.length} scores`);
                } else {
                    // Multiple quality tests: prioritize and run top 3 for warmup
                    const prioritizedTypes = this.prioritizeBenchmarkTypes(qualityTypes);
                    const warmupTypes = prioritizedTypes.slice(0, 3);
                    const remainingTypes = prioritizedTypes.slice(3);

                    console.log(`[BenchmarkingManager Debug] Multiple quality tests: running warmup with ${warmupTypes.join(', ')}`);
                    if (remainingTypes.length > 0) {
                        console.log(`[BenchmarkingManager Debug] Remaining tests after warmup: ${remainingTypes.join(', ')}`);
                    }

                    // Run warmup tests (1 run each)
                    for (const warmupType of warmupTypes) {
                        try {
                            console.log(`[BenchmarkingManager Debug] Running warmup test: ${warmupType}`);
                            const result = await runQualityBenchmarks(modelId, decodedServerId, [warmupType]);
                            console.log(`[BenchmarkingManager Debug] Warmup test ${warmupType} result:`, result[warmupType]);
                            if (result[warmupType]) {
                                warmupResults.push({
                                    type: warmupType,
                                    scores: [result[warmupType].score],
                                    rubrics: [result[warmupType].rubric || '']
                                });
                            }
                        } catch (error) {
                            console.warn(`[BenchmarkingManager Debug] Warmup test failed for ${warmupType}:`, error);
                            warmupResults.push({
                                type: warmupType,
                                scores: [0],
                                rubrics: [`Warmup failed: ${error}`]
                            });
                        }
                    }

                    // Run remaining quality tests
                    if (remainingTypes.length > 0) {
                        console.log(`[BenchmarkingManager] Running remaining quality tests: ${remainingTypes.join(', ')}`);
                        try {
                            const remainingResults = await runQualityBenchmarks(modelId, decodedServerId, remainingTypes);
                            for (const [type, result] of Object.entries(remainingResults)) {
                                warmupResults.push({
                                    type: type as BenchmarkType,
                                    scores: [result.score],
                                    rubrics: [result.rubric || '']
                                });
                            }
                        } catch (error) {
                            console.error(`[BenchmarkingManager] Failed to run remaining quality tests:`, error);
                            for (const type of remainingTypes) {
                                warmupResults.push({
                                    type,
                                    scores: [0],
                                    rubrics: [`Failed: ${error}`]
                                });
                            }
                        }
                    }
                }

                // Aggregate warmup results into final benchmarks
                for (const warmupResult of warmupResults) {
                    const { type, scores, rubrics } = warmupResult;
                    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                    const aggregatedRubric = scores.length > 1
                        ? `Averaged from ${scores.length} runs. Scores: [${scores.join(', ')}]. Best rubric: ${rubrics[0] || ''}`
                        : rubrics[0] || '';

                    benchmarks[type] = {
                        type,
                        score: avgScore,
                        rubric: aggregatedRubric,
                        timestamp: new Date().toISOString()
                    };

                    console.log(`[BenchmarkingManager] ${type}: score=${avgScore.toFixed(3)} (from ${scores.length} run${scores.length > 1 ? 's' : ''})`);
                }
            }

            // Create final result object
            const result: ModelQualityBenchmarks = {
                modelId,
                benchmarks: benchmarks as Record<BenchmarkType, QualityBenchmarkScore>,
                serverLatencyMetrics,
                serverColdPerformance,
                serverWarmPerformance,
                serverLatencies,
                serverLatencyDetails,
                serverThroughput
            };

            // Save to persistent storage
            await saveModelBenchmarkToDB(result);
            console.log('[BenchmarkingManager] Manual benchmark saved to persistent storage.');

            // Update RAG system
            await this.updateRAGSystem(result);

            return result;

        } catch (error) {
            console.error('[BenchmarkingManager] Manual benchmark failed:', error);
            throw error;
        }
    }

    /**
     * Calculate consistency score based on response time variance
     */
    private calculateConsistencyScore(responseTimes: number[]): number {
        if (responseTimes.length < 2) return 1.0;

        const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
        const stdDev = Math.sqrt(variance);

        // Lower variance means higher consistency (0-1 scale)
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
        return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
    }

    /**
     * Run queue-based benchmarks for a specific server and model - used for manual testing
     * @param serverId - The server ID or URL to test
     * @param modelId - The model to benchmark
     * @param types - Types of benchmarks to run
     * @returns Promise resolving to benchmark results
     */
    async runQueueBasedManualBenchmarks(
        serverId: string,
        modelId: string,
        types: readonly BenchmarkType[]
    ): Promise<ModelQualityBenchmarks> {
        const decodedServerId = decodeIfBase64(serverId);
        console.log(`[BenchmarkingManager] Running queue-based manual benchmarks for server: ${decodedServerId}, model: ${modelId}, types: ${types.join(', ')}`);

        try {
            // Create manual benchmark workflow for the specific server
            const jobs = await this.createManualBenchmarkWorkflow(decodedServerId, modelId, types);

            // Submit workflow to queue and wait for completion
            console.log(`[BenchmarkingManager] Submitting ${jobs.length} manual benchmark jobs to queue system`);
            const results = await this.queueService.submitAndWaitForWorkflow(jobs, MANUAL_TIMEOUT_MS);

            // Aggregate results from completed jobs
            const benchmarkResult = await this.aggregateResultsFromExecutions(modelId, results);

            // Save to persistent storage
            await saveModelBenchmarkToDB(benchmarkResult);
            console.log('[BenchmarkingManager] Manual benchmark saved to persistent storage.');

            // Update RAG system
            await this.updateRAGSystem(benchmarkResult);

            return benchmarkResult;

        } catch (error) {
            console.error('[BenchmarkingManager] Queue-based manual benchmark failed:', error);
            // Fallback to legacy implementation
            return await this.runManualBenchmarksForServer(serverId, modelId, types);
        }
    }

    private async createBenchmarkWorkflow(
        modelId: string,
        types: readonly BenchmarkType[]
    ): Promise<UniversalJob[]> {
        const jobs: UniversalJob[] = [];
        const workflowId = `benchmark-${modelId}-${Date.now()}`;

        // Get available servers for this model
        const servers = await discoverServersForModel(modelId);
        console.log(`[BenchmarkingManager] Creating workflow for servers: ${servers.join(', ')}`);

        for (const serverId of servers) {
            const serverJobs = await this.createServerBenchmarkChain(
                workflowId, serverId, modelId, types
            );
            jobs.push(...serverJobs);
        }

        console.log(`[BenchmarkingManager] Created workflow with ${jobs.length} jobs`);
        return jobs;
    }

    private async createManualBenchmarkWorkflow(
        serverId: string,
        modelId: string,
        types: readonly BenchmarkType[]
    ): Promise<UniversalJob[]> {
        const workflowId = `manual-benchmark-${modelId}-${Date.now()}`;
        console.log(`[BenchmarkingManager] Creating manual workflow for server: ${serverId}, model: ${modelId}`);

        // Create benchmark chain for the specific server
        const jobs = await this.createServerBenchmarkChain(
            workflowId, serverId as ServerId, modelId, types
        );

        console.log(`[BenchmarkingManager] Created manual workflow with ${jobs.length} jobs`);
        return jobs;
    }

    private async createServerBenchmarkChain(
        workflowId: string,
        serverId: ServerId,
        modelId: string,
        types: readonly BenchmarkType[]
    ): Promise<UniversalJob[]> {
        const jobs: UniversalJob[] = [];

        // Check if this is an embedding-only benchmark workflow
        const embeddingBenchmarkTypes = ['embedding-quality', 'embedding-speed', 'vector-similarity', 'embedding-dimensions', 'embedding-clustering'];
        const isEmbeddingOnlyWorkflow = types.every(type => embeddingBenchmarkTypes.includes(type));

        // Step 1: Server Latency Test (model-agnostic infrastructure test) - always run
        const serverLatencyJob = new JobBuilder(JobType.SERVER_LATENCY, {
            serverId,
            endpoints: [
                SERVER_ENDPOINTS.TAGS,
                SERVER_ENDPOINTS.VERSION,
                SERVER_ENDPOINTS.PS,
                SERVER_ENDPOINTS.MODELS
            ]
        })
            .withTaskType(TaskType.SYSTEM_MONITORING)
            .withPriority(JobPriority.HIGH)
            .withDependencies([])
            .withConstraints({
                serverAffinity: serverId,
                canSteal: false,
                stealable: false
            })
            .withMetadata({
                workflowId,
                serverId,
                benchmarkType: 'server-latency'
            })
            .build();

        jobs.push(serverLatencyJob);

        // Skip performance tests for embedding models as they will fail with 400 errors
        if (!isEmbeddingOnlyWorkflow) {
            // Step 2: Cold Performance Test (model loading + initial performance)
            const coldPerformanceJob = new JobBuilder(JobType.COLD_PERFORMANCE, {
                modelId,
                prompt: BENCHMARK_PROMPTS['cold-performance']
            })
                .withTaskType(TaskType.QUESTION_ANSWERING)
                .withModel(modelId)
                .withPriority(JobPriority.HIGH)
                .withDependencies([serverLatencyJob.id])
                .withConstraints({
                    serverAffinity: serverId,
                    requiresModel: modelId,
                    canSteal: false,
                    stealable: false
                })
                .withMetadata({
                    workflowId,
                    serverId,
                    benchmarkType: 'cold-performance'
                })
                .build();

            jobs.push(coldPerformanceJob);

            // Step 3: Warmup Tests (3 quality benchmarks to prepare the model)
            // Intelligently select the 3 most important benchmark types
            const prioritizedTypes = this.prioritizeBenchmarkTypes(types);
            const warmupTypes = prioritizedTypes.slice(0, 3);

            const warmupJobs: UniversalJob[] = [];
            for (const benchmarkType of warmupTypes) {
                const promptKey = benchmarkType;
                // Try both original key and normalized kebab-case for prompt lookup
                const normalizedKey = benchmarkType.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
                const specificPrompt = (BENCHMARK_PROMPTS as any)[promptKey] || (BENCHMARK_PROMPTS as any)[normalizedKey];
                const fallbackPrompt = BENCHMARK_PROMPTS['creative-writing'];
                const finalPrompt = specificPrompt || fallbackPrompt;

                console.log(`[BenchmarkingManager] Creating warmup job for ${benchmarkType}:`);
                console.log(`[BenchmarkingManager]   Prompt key: ${promptKey}`);
                console.log(`[BenchmarkingManager]   Normalized key: ${normalizedKey}`);
                console.log(`[BenchmarkingManager]   Specific prompt: ${specificPrompt ? 'FOUND' : 'NOT FOUND'}`);
                console.log(`[BenchmarkingManager]   Final prompt length: ${finalPrompt.length} chars`);
                console.log(`[BenchmarkingManager]   Final prompt preview: ${finalPrompt.substring(0, 100)}...`);

                const warmupJob = new JobBuilder(JobType.WARMUP_TEST, {
                    modelId,
                    benchmarkType,
                    prompt: finalPrompt
                })
                    .withTaskType(this.mapBenchmarkToTaskType(benchmarkType))
                    .withModel(modelId)
                    .withPriority(JobPriority.NORMAL)
                    .withDependencies([coldPerformanceJob.id])
                    .withConstraints({
                        serverAffinity: serverId,
                        requiresModel: modelId,
                        canSteal: false,
                        stealable: false
                    })
                    .withMetadata({
                        workflowId,
                        serverId,
                        benchmarkType: benchmarkType,
                        isWarmup: true
                    })
                    .build();

                warmupJobs.push(warmupJob);
                jobs.push(warmupJob);
            }

            // Step 4: Warm Performance Test (optimized performance measurement)
            const warmPerformanceJob = new JobBuilder(JobType.WARM_PERFORMANCE, {
                modelId,
                prompt: BENCHMARK_PROMPTS['warm-performance']
            })
                .withTaskType(TaskType.QUESTION_ANSWERING)
                .withModel(modelId)
                .withPriority(JobPriority.NORMAL)
                .withDependencies(warmupJobs.map(j => j.id))
                .withConstraints({
                    serverAffinity: serverId,
                    requiresModel: modelId,
                    canSteal: false,
                    stealable: false
                })
                .withMetadata({
                    workflowId,
                    serverId,
                    benchmarkType: 'warm-performance'
                })
                .build();

            jobs.push(warmPerformanceJob);

            // Step 5: Remaining Quality Benchmarks (for text generation models)
            const remainingTypes = types.filter(t => !warmupTypes.includes(t));
            for (const benchmarkType of remainingTypes) {
                // Skip embedding benchmarks in text generation workflow
                const isEmbeddingBenchmark = ['embedding-quality', 'embedding-speed', 'vector-similarity', 'embedding-dimensions', 'embedding-clustering'].includes(benchmarkType);
                if (isEmbeddingBenchmark) continue;

                const qualityJob = new JobBuilder(JobType.QUALITY_BENCHMARK, {
                    modelId,
                    benchmarkType,
                    prompt: (BENCHMARK_PROMPTS as any)[benchmarkType] || (BENCHMARK_PROMPTS as any)[benchmarkType.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')] || BENCHMARK_PROMPTS['creative-writing']
                })
                    .withTaskType(this.mapBenchmarkToTaskType(benchmarkType))
                    .withModel(modelId)
                    .withPriority(JobPriority.LOW)
                    .withDependencies([warmPerformanceJob.id])
                    .withConstraints({
                        serverAffinity: serverId,
                        requiresModel: modelId,
                        canSteal: false,
                        stealable: false
                    })
                    .withMetadata({
                        workflowId,
                        serverId,
                        benchmarkType: benchmarkType
                    })
                    .build();

                jobs.push(qualityJob);
            }
        } else {
            // Embedding-only workflow - create embedding benchmark jobs directly
            for (const benchmarkType of types) {
                const embeddingJob = new JobBuilder(JobType.EMBEDDING_BENCHMARK, {
                    modelId,
                    benchmarkType,
                    // Embedding benchmarks don't use text prompts
                })
                    .withTaskType(this.mapBenchmarkToTaskType(benchmarkType))
                    .withModel(modelId)
                    .withPriority(JobPriority.LOW)
                    .withDependencies([serverLatencyJob.id]) // Only depend on server latency
                    .withConstraints({
                        serverAffinity: serverId,
                        requiresModel: modelId,
                        canSteal: false,
                        stealable: false
                    })
                    .withMetadata({
                        workflowId,
                        serverId,
                        benchmarkType: benchmarkType
                    })
                    .build();

                jobs.push(embeddingJob);
            }
        }

        return jobs;
    }

    /**
     * Prioritize benchmark types based on importance and complexity for book writing
     */
    private prioritizeBenchmarkTypes(types: readonly BenchmarkType[]): BenchmarkType[] {
        const priorityOrder: BenchmarkType[] = [
            // Core book writing benchmarks (highest priority for warmup)
            'character-consistency',    // Essential for narrative continuity
            'dialogue-generation',      // Quick warmup, tests conversational ability
            'creative-writing',         // Good general creative test

            // Advanced narrative benchmarks
            'plot-coherence',          // Story logic and progression
            'world-building',          // Complex world creation
            'emotional-depth',         // Character development

            // Technical and structural benchmarks  
            'json-assembly',           // Fast, reliable technical test
            'task-planning',           // Logical thinking for server-related tasks
            'typescript-quality',      // Code generation capability

            // Specialized content benchmarks
            'style-transfer',          // Advanced stylistic control
            'long-form-generation',    // Extended narrative ability
            'summarization',           // Comprehension and distillation
            'fact-extraction',         // Information processing

            // Content moderation and edge cases
            'content-moderation',      // Safety and appropriateness
            'permissive-content',      // Edge case handling

            // Advanced technical benchmarks
            'advanced-code-generation', // Complex coding tasks
            'node-graph-construction',  // Structured data creation
            'protocol-compliance',     // Technical precision

            // Additional narrative benchmarks
            'genre-adherence',         // Style consistency
            'pacing-rhythm',           // Narrative flow
            'conflict-resolution',     // Story tension management
            'narrative-voice',         // Perspective consistency
            'scene-transitions',       // Chapter flow
            'thematic-consistency',    // Story theme maintenance

            // Vibe coding benchmarks
            'code-style-consistency',  // Code formatting
            'variable-naming',         // Code clarity
            'comment-quality',         // Documentation
            'error-handling',          // Robustness
            'performance-awareness',   // Efficiency
            'security-consciousness',  // Safe coding
            'maintainability'          // Code longevity
        ];

        return types
            .slice()
            .sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a);
                const bIndex = priorityOrder.indexOf(b);
                const aPriority = aIndex === -1 ? 999 : aIndex;
                const bPriority = bIndex === -1 ? 999 : bIndex;
                return aPriority - bPriority;
            });
    }

    private mapBenchmarkToTaskType(benchmarkType: BenchmarkType): TaskType {
        switch (benchmarkType) {
            // Technical benchmarks
            case 'json-assembly':
                return TaskType.JSON_GENERATION;
            case 'typescript-quality':
            case 'advanced-code-generation':
            case 'code-style-consistency':
            case 'variable-naming':
            case 'comment-quality':
            case 'error-handling':
            case 'performance-awareness':
            case 'security-consciousness':
            case 'maintainability':
                return TaskType.CODE_GENERATION;

            // Creative writing benchmarks
            case 'creative-writing':
            case 'character-consistency':
            case 'plot-coherence':
            case 'world-building':
            case 'emotional-depth':
            case 'long-form-generation':
            case 'style-transfer':
            case 'genre-adherence':
            case 'pacing-rhythm':
            case 'conflict-resolution':
            case 'narrative-voice':
            case 'scene-transitions':
            case 'thematic-consistency':
                return TaskType.CREATIVE_WRITING;

            // Dialogue and conversation
            case 'dialogue-generation':
                return TaskType.CONVERSATION;

            // Analysis and processing
            case 'task-planning':
            case 'fact-extraction':
            case 'node-graph-construction':
                return TaskType.DATA_ANALYSIS;

            // Text processing
            case 'summarization':
                return TaskType.SUMMARIZATION;

            // Content evaluation
            case 'content-moderation':
            case 'permissive-content':
                return TaskType.CLASSIFICATION;

            // Embedding benchmarks
            case 'embedding-quality':
            case 'embedding-speed':
            case 'vector-similarity':
            case 'embedding-dimensions':
            case 'embedding-clustering':
                return TaskType.EMBEDDING_GENERATION;

            // Default fallback
            default:
                return TaskType.QUESTION_ANSWERING;
        }
    }

    private async aggregateResults(modelId: string, jobResults: any[]): Promise<ModelQualityBenchmarks> {
        // Filter out failed job submissions and only process successful ones
        const successfulResults = jobResults.filter(result => result.success === true);

        // If no successful submissions, fall back to returning minimal structure
        if (successfulResults.length === 0) {
            // For now, return a minimal result structure
            return {
                modelId,
                benchmarks: {} as Record<BenchmarkType, QualityBenchmarkScore>,
                serverLatencyMetrics: {},
                serverColdPerformance: {},
                serverWarmPerformance: {},
                serverLatencies: {},
                serverLatencyDetails: {},
                serverThroughput: {}
            };
        }

        // Group results by server
        const serverResults = new Map<string, any[]>();

        for (const result of successfulResults) {
            const serverId = result.serverId || 'unknown';
            if (!serverResults.has(serverId)) {
                serverResults.set(serverId, []);
            }
            serverResults.get(serverId)!.push(result);
        }

        // Initialize new metrics structures
        const serverLatencyMetrics: Record<string, ServerLatencyMetrics> = {};
        const serverColdPerformance: Record<string, ColdPerformanceMetrics> = {};
        const serverWarmPerformance: Record<string, WarmPerformanceMetrics> = {};
        const qualityBenchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;

        // Legacy metrics for backward compatibility
        const serverLatencies: Record<string, number> = {};
        const serverLatencyDetails: Record<string, LatencyMetrics> = {};
        const serverThroughput: Record<string, any> = {};

        for (const [serverId, results] of serverResults) {
            // Process server latency results (model-agnostic)
            // Note: SERVER_LATENCY jobs should use measureServerInfrastructureLatency()
            // to test actual HTTP endpoints like /api/tags, /api/version, /api/ps
            const serverLatencyResults = results.filter(r => r.job?.type === JobType.SERVER_LATENCY);
            if (serverLatencyResults.length > 0) {
                const latencyResult = serverLatencyResults[0].result;
                serverLatencyMetrics[serverId] = {
                    tagsLatency: latencyResult?.tagsLatency || 0,
                    versionLatency: latencyResult?.versionLatency || 0,
                    psLatency: latencyResult?.psLatency || 0,
                    healthScore: latencyResult?.healthScore || 0
                };
            } else {
                // Fallback: measure server infrastructure directly if no queue result
                try {
                    serverLatencyMetrics[serverId] = await this.measureServerInfrastructure(serverId);
                } catch (error) {
                    console.warn(`[BenchmarkingManager] Failed to measure server infrastructure for ${serverId}:`, error);
                    serverLatencyMetrics[serverId] = {
                        tagsLatency: 9999,
                        versionLatency: 9999,
                        psLatency: 9999,
                        healthScore: 0
                    };
                }
            }

            // Process cold performance results
            const coldPerformanceResults = results.filter(r => r.job?.type === JobType.COLD_PERFORMANCE);
            if (coldPerformanceResults.length > 0) {
                const coldResult = coldPerformanceResults[0].result;
                serverColdPerformance[serverId] = {
                    timeToFirstToken: coldResult?.timeToFirstToken || 0,
                    tokensPerSecond: coldResult?.tokensPerSecond || 0,
                    totalResponseTime: coldResult?.totalResponseTime || 0,
                    loadingOverhead: coldResult?.loadingOverhead || 0
                };

                // Legacy compatibility - use cold performance as base latency
                serverLatencies[serverId] = coldResult?.totalResponseTime || 0;
            }

            // Process warm performance results
            const warmPerformanceResults = results.filter(r => r.job?.type === JobType.WARM_PERFORMANCE);
            if (warmPerformanceResults.length > 0) {
                const warmResult = warmPerformanceResults[0].result;
                serverWarmPerformance[serverId] = {
                    timeToFirstToken: warmResult?.timeToFirstToken || 0,
                    tokensPerSecond: warmResult?.tokensPerSecond || 0,
                    averageResponseTime: warmResult?.averageResponseTime || 0,
                    consistencyScore: warmResult?.consistencyScore || 0
                };
            }

            // Process warmup and quality test results
            const warmupResults = results.filter(r => r.job?.type === JobType.WARMUP_TEST);
            const qualityResults = results.filter(r => r.job?.type === JobType.QUALITY_BENCHMARK);
            const allQualityResults = [...warmupResults, ...qualityResults];

            for (const qualityResult of allQualityResults) {
                const benchmarkType = qualityResult.job?.metadata?.benchmarkType as BenchmarkType;
                if (benchmarkType && qualityResult.result) {
                    qualityBenchmarks[benchmarkType] = {
                        type: benchmarkType,
                        score: qualityResult.result.score || 0,
                        rubric: qualityResult.result.rubric || '',
                        timestamp: qualityResult.result.timestamp || new Date().toISOString(),
                        coldPerformance: serverColdPerformance[serverId],
                        warmPerformance: serverWarmPerformance[serverId]
                    };
                }
            }

            // Build legacy metrics for backward compatibility
            const coldLatency = serverColdPerformance[serverId]?.totalResponseTime || 0;
            const warmLatency = serverWarmPerformance[serverId]?.averageResponseTime || 0;

            serverLatencyDetails[serverId] = {
                cold: coldLatency,
                warmAvg: warmLatency,
                warmup: warmLatency,
                warmAll: [warmLatency, warmLatency, warmLatency] // Approximate for legacy
            };

            serverThroughput[serverId] = {
                average: serverWarmPerformance[serverId]?.averageResponseTime || 0,
                all: [serverWarmPerformance[serverId]?.averageResponseTime || 0]
            };
        }

        return {
            modelId,
            benchmarks: qualityBenchmarks,

            // New metrics structure
            serverLatencyMetrics,
            serverColdPerformance,
            serverWarmPerformance,

            // Legacy metrics for backward compatibility
            serverLatencies,
            serverLatencyDetails,
            serverThroughput,
        };
    }

    private async updateRAGSystem(result: ModelQualityBenchmarks): Promise<void> {
        try {
            // Create individual model-performance nodes for each server
            const createPromises = [];

            for (const [serverId, latencyMetrics] of Object.entries(result.serverLatencyDetails || {})) {
                // Extract performance data for this server
                const coldPerformance = result.serverColdPerformance?.[serverId];
                const warmPerformance = result.serverWarmPerformance?.[serverId];

                // Create model-performance node for this server-model combination
                const modelPerformanceNode = {
                    type: 'model-performance' as const,
                    title: `${result.modelId}-${serverId}`,
                    metadata: {
                        modelId: result.modelId,
                        serverId: serverId,
                        lastBenchmarked: new Date().toISOString(),
                        benchmarkingStrategy: 'queue-based-workflow'
                    },
                    // Performance data
                    qualityResults: result.benchmarks || {},
                    coldLatency: coldPerformance?.totalResponseTime || latencyMetrics.cold || 0,
                    warmLatencies: warmPerformance ? [warmPerformance.averageResponseTime] : (latencyMetrics.warmAll || [latencyMetrics.warmAvg || 0])
                };

                createPromises.push(ensureNode(modelPerformanceNode));
            }

            // If no server-specific data, create a single node
            if (createPromises.length === 0) {
                const modelPerformanceNode = {
                    type: 'model-performance' as const,
                    title: `${result.modelId}-unknown`,
                    metadata: {
                        modelId: result.modelId,
                        serverId: 'unknown',
                        lastBenchmarked: new Date().toISOString(),
                        benchmarkingStrategy: 'queue-based-workflow'
                    },
                    qualityResults: result.benchmarks || {},
                    coldLatency: 0,
                    warmLatencies: [0]
                };

                createPromises.push(ensureNode(modelPerformanceNode));
            }

            await Promise.all(createPromises);

            // Trigger aggregation to update ai-model and ai-server nodes
            await this.triggerAggregation(result.modelId, Object.keys(result.serverLatencyDetails || {}));

            console.log(`[BenchmarkingManager] Created ${createPromises.length} model-performance nodes and triggered aggregation`);
        } catch (err) {
            console.warn('[BenchmarkingManager] Failed to update benchmark storage system:', err);
        }
    }

    /**
     * Trigger aggregation services to update ai-model and ai-server nodes
     */
    private async triggerAggregation(modelId: string, serverIds: string[]): Promise<void> {
        try {
            // Dynamic import to avoid circular dependencies
            const { ModelAggregationService } = await import('../services/model-aggregation.service.js');
            const { ServerAggregationService } = await import('../services/server-aggregation.service.js');

            const modelAggregationService = new ModelAggregationService();
            const serverAggregationService = new ServerAggregationService();

            // Trigger model aggregation
            await modelAggregationService.aggregateModelPerformance(modelId);
            console.log(`[BenchmarkingManager] Triggered model aggregation for: ${modelId}`);

            // Trigger server aggregation for each server
            const serverPromises = serverIds.map(async (serverId) => {
                try {
                    await serverAggregationService.aggregateServerPerformance(serverId);
                    console.log(`[BenchmarkingManager] Triggered server aggregation for: ${serverId}`);
                } catch (error) {
                    console.warn(`[BenchmarkingManager] Failed to aggregate server ${serverId}:`, error);
                }
            });

            await Promise.all(serverPromises);
        } catch (error) {
            console.warn('[BenchmarkingManager] Failed to trigger aggregation:', error);
        }
    }

    // Legacy fallback implementation
    private async runLegacyBenchmarks(
        modelId: string,
        types: readonly BenchmarkType[],
        opts?: { auto?: boolean }
    ): Promise<ModelQualityBenchmarks> {
        console.log(`[BenchmarkingManager] Running benchmarks for model: ${modelId} (types: ${types.join(', ')})`);
        const servers = await discoverServersForModel(modelId);
        console.log(`[BenchmarkingManager] Discovered servers: ${servers.join(', ')}`);
        const serverLatencies: Record<string, number> = {};
        const serverLatencyDetails: Record<string, import('shared/types/aiQualityBenchmark.js').LatencyMetrics> = {};
        const serverThroughput: Record<string, import('shared/types/aiQualityBenchmark.js').ThroughputMetrics> = {};
        const latencyPrompt = 'Say hello.';
        const timeoutMs = opts?.auto ? AUTO_TIMEOUT_MS : MANUAL_TIMEOUT_MS;
        // Always use decoded URLs for all network calls and as keys
        const decodedServers = servers.map(decodeIfBase64);
        for (const server of decodedServers) {
            const decodedServer = decodeIfBase64(server);
            serverLatencies[decodedServer] = await measureSimpleServerLatency(decodedServer, modelId);
            try {
                const latency = await this.measureServerLatencies(decodedServer, modelId, latencyPrompt, timeoutMs);
                serverLatencyDetails[decodedServer] = latency;
            } catch (err) {
                console.warn(`[BenchmarkingManager] Failed to measure full latency for server ${decodedServer}:`, err);
            }
            try {
                const throughput = await this.measureServerThroughput(decodedServer, modelId, latencyPrompt, 5, timeoutMs);
                serverThroughput[decodedServer] = throughput;
            } catch (err) {
                console.warn(`[BenchmarkingManager] Failed to measure throughput for server ${decodedServer}:`, err);
            }
        }
        console.log('[BenchmarkingManager] Server latencies:', serverLatencies);
        console.log('[BenchmarkingManager] Server latency details:', serverLatencyDetails);
        console.log('[BenchmarkingManager] Server throughput:', serverThroughput);

        const slowestServer = await selectSlowestServer(decodedServers, modelId);
        console.log(`[BenchmarkingManager] Using slowest working server for benchmarking: ${slowestServer}`);

        let qualityTimeoutMs = AUTO_TIMEOUT_MS;
        const slowestLatency = serverLatencyDetails[slowestServer]?.cold;
        if (typeof slowestLatency === 'number' && !isNaN(slowestLatency) && slowestLatency > 0) {
            qualityTimeoutMs = Math.max(2 * 60 * 1000, Math.min(10 * 60 * 1000, 3 * slowestLatency));
        }

        // Always use decoded slowestServer for quality benchmarks
        const partialBenchmarks = await runQualityBenchmarks(modelId, slowestServer, types);
        // Ensure all BenchmarkType keys are present
        const { fillAllBenchmarkTypes } = await import('./benchmarkUtils.js');
        const benchmarks = fillAllBenchmarkTypes(partialBenchmarks);

        const result: ModelQualityBenchmarks = {
            modelId,
            benchmarks,
            serverLatencies,
            serverLatencyDetails,
            serverThroughput,
        };
        console.log('[BenchmarkingManager] Benchmark result:', result);
        await saveModelBenchmarkToDB(result);
        console.log('[BenchmarkingManager] Benchmark saved to persistent storage.');
        try {
            await ensureNode({
                type: 'ai-model',
                title: modelId,
                metadata: {
                    modelId,
                    benchmarks: result.benchmarks,
                    qualityScores: result.benchmarks,
                    serverLatencies: result.serverLatencies,
                    serverLatencyDetails: result.serverLatencyDetails,
                    serverThroughput: result.serverThroughput,
                    lastBenchmarked: new Date().toISOString(),
                    // Optionally, add nextBenchmark here using scheduleNextQualityBenchmark
                }
            });
            console.log('[BenchmarkingManager] Starting verification: fetching ai-model node from RAG...');
            const node = await getNode({ type: 'ai-model', title: modelId });
            if (!node) {
                console.warn('[BenchmarkingManager] Verification failed: ai-model node missing after persist.');
            } else if (!node.metadata) {
                console.warn('[BenchmarkingManager] Verification failed: ai-model node metadata missing after persist. Node:', node);
            } else if (!node.metadata.benchmarks) {
                console.warn('[BenchmarkingManager] Verification failed: ai-model node metadata.benchmarks missing after persist. Metadata:', node.metadata);
            } else {
                const match = JSON.stringify(node.metadata.benchmarks) === JSON.stringify(result.benchmarks);
                if (!match) {
                    console.warn('[BenchmarkingManager] Verification failed: benchmarks in RAG do not match expected result.');
                    console.log('[BenchmarkingManager] RAG node benchmarks:', node.metadata.benchmarks);
                    console.log('[BenchmarkingManager] Expected benchmarks:', result.benchmarks);
                } else {
                    console.log('[BenchmarkingManager] Verification succeeded: ai-model node updated in RAG.');
                }
            }
        } catch (err) {
            console.warn('[BenchmarkingManager] Failed to persist or verify benchmark in RAG ai-model node:', err);
        }
        return result;
    }

    /**
     * Aggregate results from completed job executions
     * @param modelId - The model ID
     * @param executionResults - Array of job execution results
     * @returns Promise resolving to aggregated benchmark results
     */
    private async aggregateResultsFromExecutions(modelId: string, executionResults: any[]): Promise<ModelQualityBenchmarks> {
        // Filter successful executions and extract their results
        const successfulExecutions = executionResults.filter(exec => exec.success === true);

        if (successfulExecutions.length === 0) {
            console.warn('[BenchmarkingManager] No successful job executions to aggregate');
            const { fillAllBenchmarkTypes } = await import('./benchmarkUtils.js');
            return {
                modelId,
                benchmarks: fillAllBenchmarkTypes({}),
                serverLatencyMetrics: {},
                serverColdPerformance: {},
                serverWarmPerformance: {},
                serverLatencies: {},
                serverLatencyDetails: {},
                serverThroughput: {}
            };
        }

        // Initialize result structures
        const serverLatencyMetrics: Record<string, ServerLatencyMetrics> = {};
        const serverColdPerformance: Record<string, ColdPerformanceMetrics> = {};
        const serverWarmPerformance: Record<string, WarmPerformanceMetrics> = {};
        const qualityBenchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;

        // Process each execution result
        for (const execution of successfulExecutions) {
            const serverId = execution.serverId || 'unknown';
            const result = execution.result;

            if (!result) continue;

            // Process different result types
            switch (result.type) {
                case 'server-latency':
                    serverLatencyMetrics[serverId] = {
                        tagsLatency: result.tagsLatency || 0,
                        versionLatency: result.versionLatency || 0,
                        psLatency: result.psLatency || 0,
                        healthScore: result.healthScore || 0
                    };
                    break;

                case 'cold-performance':
                    serverColdPerformance[serverId] = {
                        timeToFirstToken: result.timeToFirstToken || 0,
                        loadingOverhead: result.loadingOverhead || 0,
                        totalResponseTime: result.totalResponseTime || 0,
                        tokensPerSecond: result.tokensPerSecond || 0
                    };
                    break;

                case 'warm-performance':
                    serverWarmPerformance[serverId] = {
                        timeToFirstToken: result.timeToFirstToken || 0,
                        tokensPerSecond: result.tokensPerSecond || 0,
                        averageResponseTime: result.averageResponseTime || 0,
                        consistencyScore: result.consistencyScore || 0.8
                    };
                    break;

                case 'quality-benchmark':
                case 'warmup-test':
                    if (result.benchmarkType) {
                        qualityBenchmarks[result.benchmarkType as BenchmarkType] = {
                            type: result.benchmarkType as BenchmarkType,
                            score: result.score || 0,
                            rubric: result.rubric || 'auto-generated',
                            timestamp: result.timestamp || new Date().toISOString()
                        };
                        console.log(`[BenchmarkingManager Debug] Added quality benchmark: ${result.benchmarkType}, score: ${result.score}`);
                    }
                    break;

                case 'embedding-benchmark':
                    if (result.benchmarkType) {
                        qualityBenchmarks[result.benchmarkType as BenchmarkType] = {
                            type: result.benchmarkType as BenchmarkType,
                            score: result.score || 0,
                            rubric: result.rubric || 'auto-generated',
                            timestamp: result.timestamp || new Date().toISOString(),
                            embeddingMetrics: result.embeddingMetrics
                        };
                    }
                    break;

                // Handle specific embedding benchmark types
                case 'embedding-quality':
                case 'embedding-speed':
                case 'vector-similarity':
                case 'embedding-dimensions':
                case 'embedding-clustering':
                    qualityBenchmarks[result.type as BenchmarkType] = {
                        type: result.type as BenchmarkType,
                        score: result.score || 0,
                        rubric: result.rubric || 'auto-generated',
                        timestamp: result.timestamp || new Date().toISOString(),
                        embeddingMetrics: result.embeddingMetrics
                    };
                    break;
            }
        }

        // Legacy support - use first server's latency metrics
        const firstServerId = Object.keys(serverLatencyMetrics)[0];
        const serverLatencies: Record<string, number> = {};
        const serverLatencyDetails: Record<string, LatencyMetrics> = {};
        const serverThroughput: Record<string, any> = {};

        if (firstServerId && serverLatencyMetrics[firstServerId]) {
            const latency = serverLatencyMetrics[firstServerId];
            serverLatencies[firstServerId] = latency.tagsLatency;
            serverLatencyDetails[firstServerId] = {
                cold: latency.tagsLatency,
                warmAvg: latency.versionLatency,
                warmup: latency.psLatency,
                warmAll: [latency.tagsLatency, latency.versionLatency]
            };
        }

        console.log(`[BenchmarkingManager] Aggregated results: ${Object.keys(qualityBenchmarks).length} quality benchmarks, ${Object.keys(serverLatencyMetrics).length} servers`);

        // Ensure all BenchmarkType keys are present
        const { fillAllBenchmarkTypes } = await import('./benchmarkUtils.js');
        const benchmarks = fillAllBenchmarkTypes(qualityBenchmarks);
        return {
            modelId,
            benchmarks,
            serverLatencyMetrics,
            serverColdPerformance,
            serverWarmPerformance,
            serverLatencies,
            serverLatencyDetails,
            serverThroughput
        };
    }

    public static async executeBenchmarkType(benchmarkType: string, modelId: string, serverId: string, prompt?: string): Promise<{ score: number; rubric: string; timestamp: string }> {
        try {
            // Normalize benchmark type to kebab-case for consistency
            const normalizedBenchmarkType = benchmarkType.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
            console.log(`[BenchmarkingManager] Executing benchmark: original='${benchmarkType}', normalized='${normalizedBenchmarkType}'`);

            // Dynamically import and execute the appropriate benchmark function
            const benchmarkModule = await import('./benchmarks/index.js') as any;

            // Convert benchmark type to function name with special cases for acronyms
            let functionName = 'evaluate' + normalizedBenchmarkType
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');

            // Handle special cases for acronyms and naming mismatches
            const specialCases: Record<string, string> = {
                'evaluateJsonAssembly': 'evaluateJSONAssembly',
                'evaluateTypescriptQuality': 'evaluateTypescriptQuality',
                'evaluateAdvancedcodegeneration': 'evaluateAdvancedCodeGeneration', // Fix camelCase input
                'evaluateAdvancedCodeGeneration': 'evaluateAdvancedCodeGeneration'  // Keep correct case
            };

            if (specialCases[functionName]) {
                functionName = specialCases[functionName];
            }

            const benchmarkFunction = benchmarkModule[functionName];

            if (typeof benchmarkFunction !== 'function') {
                throw new Error(`Benchmark function '${functionName}' not found for type '${benchmarkType}'`);
            }

            console.log(`[BenchmarkingManager] Executing ${functionName} for ${benchmarkType}`);

            // Execute the benchmark function with optional prompt
            const result = await benchmarkFunction(modelId, serverId, 5 * 60 * 1000, prompt);
            const score = typeof result === 'number' ? result : (result?.score || 0);
            const rubric = result?.rubric || '';

            return {
                score,
                rubric,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[BenchmarkingManager] Failed to execute benchmark type '${benchmarkType}':`, error);
            throw error;
        }
    }
}

/**
 * Factory function to create BenchmarkingManager instance
 * This avoids circular dependency issues with module-level initialization
 */
export function createBenchmarkingManager(
    queueService?: UniversalQueueService
): BenchmarkingManager {
    // Use provided queue service or create a mock for testing
    const queue = queueService || {
        submitWorkflow: async () => [],
        submitAndWaitForWorkflow: async () => []
    } as unknown as UniversalQueueService;

    const jobBuilder = new JobBuilder(JobType.QUALITY_BENCHMARK, {});
    return new BenchmarkingManager(queue, jobBuilder);
}

// Default instance - will be created lazily when first accessed
let defaultInstance: BenchmarkingManager | null = null;

export function getBenchmarkingManager(): BenchmarkingManager {
    if (!defaultInstance) {
        defaultInstance = createBenchmarkingManager();
    }
    return defaultInstance;
}

export default getBenchmarkingManager;