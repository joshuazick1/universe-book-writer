// Timeout utility
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
    ]);
}

// Utility to decode base64-encoded server IDs (srv-<base64url>)
function decodeIfBase64(serverId: string): string {
    if (serverId.startsWith('srv-')) {
        try {
            const b64 = serverId.slice(4);
            return Buffer.from(b64, 'base64').toString('utf-8');
        } catch {
            return serverId;
        }
    }
    return serverId;
}

// ai-server/benchmarking/orchestrateEnhancedBenchmarks.ts
/**
 * Enhanced orchestration for latency and quality benchmarking.
 * Implements the plan in docs/ENHANCED_LATENCY_QUALITY_BENCHMARKING_PLAN.md.
 *
 * - Runs cold latency + JSON quality per server, proceeds to warmup/quality as soon as cold test completes.
 * - Dynamically assigns warmup slots and quality tests per server.
 * - Handles server errors gracefully, excluding failed servers from further steps.
 * - Aggregates repeated test results.
 * - Persists and reports results.
 */
import { getServersForModel } from '../orchestrator/serverDiscovery.js';
import { runBenchmarksForServer } from './benchmarkRunner.js';
import { BenchmarkType, QualityBenchmarkScore } from '../../shared/types/aiQualityBenchmark.js';
import { extractThinkingAndAnswer } from '../../shared/utils/extractThinkingAndAnswer.js';
import { ensureNode, getNode } from '../../shared/node/nodeService.js';
import type { BenchmarkNodeInput, BenchmarkNodeMetadata } from '../../shared/types/benchmarkNodeTypes.js';
import { aggregateModelPerformanceToAiModel } from './aggregateModelPerformanceToAiModel.js';
// Import RAG service for embedding generation
let ragService: any = null;
async function getRagService() {
    if (!ragService) {
        const mod = await import('../src/services/modelPerformanceRAG.service.js');
        const { getOrchestratorInstance } = await import('../src/orchestrator-instance.js');
        const orchestrator = getOrchestratorInstance();
        ragService = mod.getModelPerformanceRAGService ? await mod.getModelPerformanceRAGService(orchestrator) : new mod.ModelPerformanceRAGService(orchestrator);
    }
    return ragService;
}

interface ServerBenchmarkResult {
    serverId: string;
    coldLatency?: number;
    coldQuality?: QualityBenchmarkScore;
    warmLatencies?: number[];
    qualityResults: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>>;
    error?: string;
}

/**
 * Orchestrates enhanced benchmarking for a model across all servers.
 * @param modelId - The model to benchmark
 * @param qualityBenchmarks - List of quality benchmarks to run
 * @param warmupSlotsPerServer - Number of warmup slots per server (default: 3)
 */
export async function orchestrateEnhancedBenchmarks(
    modelId: string,
    qualityBenchmarks: readonly BenchmarkType[],
    warmupSlotsPerServer = 3,
    serverIds?: string[]
): Promise<ServerBenchmarkResult[]> {
    let servers: string[];
    if (serverIds && Array.isArray(serverIds) && serverIds.length > 0) {
        servers = serverIds;
        console.debug(`[Orchestrate] Using provided serverIds: ${servers.join(', ')}`);
    } else {
        servers = await getServersForModel(modelId);
        console.debug(`[Orchestrate] Discovered servers for model ${modelId}: ${servers.join(', ')}`);
    }
    const results: ServerBenchmarkResult[] = [];
    const unhealthyServers = new Set<string>();
    const healthyServers: string[] = [];

    // Step 1: Cold latency + JSON quality (per server, in parallel)
    await Promise.all(servers.map(async (serverId) => {
        const decodedServerId = decodeIfBase64(serverId);
        const result: ServerBenchmarkResult = { serverId: decodedServerId, qualityResults: {} };
        let isHealthy = false;
        console.debug(`[Orchestrate] Starting cold test for server: ${decodedServerId}, model: ${modelId}`);
        try {
            // Cold latency + JSON quality (health check) with 5 min timeout
            const coldScores = await withTimeout(
                runBenchmarksForServer(modelId, decodedServerId, ['json-assembly' as BenchmarkType]),
                5 * 60 * 1000,
                `Cold test timed out after 5 minutes for server ${decodedServerId}`
            );
            console.debug(`[Orchestrate] Cold test results for server: ${decodedServerId}, model: ${modelId}: ${JSON.stringify(coldScores)}`);
            result.coldQuality = coldScores['json-assembly'];
            result.coldLatency = result.coldQuality?.score;
            // Mark as unhealthy if error or missing score
            if (!result.coldQuality || (result.coldQuality.rubric && result.coldQuality.rubric.toLowerCase().includes('error'))) {
                console.warn(`[Orchestrate] Cold test failed for server: ${decodedServerId}, model: ${modelId}. Rubric: ${result.coldQuality ? result.coldQuality.rubric : 'none'}`);
                result.error = result.coldQuality?.rubric || 'Cold latency failed';
                unhealthyServers.add(decodedServerId);
                // Persist health status to model-performance node, with embedding
                const now = new Date();
                const nodeTitle = `${modelId}:${decodedServerId}`;
                const rag = await getRagService();
                let embeddings: number[] | undefined = undefined;
                if (rag && rag.generatePerformanceEmbeddings) {
                    try {
                        console.debug(`[Orchestrate] Generating embeddings for server: ${decodedServerId}, model: ${modelId}`);
                        embeddings = await withTimeout(
                            rag.generatePerformanceEmbeddings(modelId, {
                                latencyMs: result.coldLatency ?? 0,
                                throughput: 0,
                                lastTested: now.getTime(),
                            }),
                            30 * 60 * 1000,
                            `Embedding generation timed out after 30 minutes for server ${decodedServerId}`
                        );
                        console.debug(`[Orchestrate] Embeddings generated for server: ${decodedServerId}, model: ${modelId}: ${JSON.stringify(embeddings)}`);
                    } catch (embErr: any) {
                        console.warn(`[Orchestrate] Embedding generation failed for server: ${decodedServerId}, model: ${modelId}: ${embErr instanceof Error ? embErr.message : String(embErr)}`);
                    }
                }
                const nodeInput: BenchmarkNodeInput = {
                    type: 'model-performance',
                    title: nodeTitle,
                    metadata: {
                        modelId,
                        serverId: decodedServerId,
                        coldLatency: result.coldLatency,
                        coldQuality: result.coldQuality,
                        warmLatencies: undefined,
                        qualityResults: {},
                        aggregatedResults: {},
                        error: result.error,
                        startedAt: now.toISOString(),
                        completedAt: new Date().toISOString(),
                        health: 'unhealthy',
                        embeddings,
                    }
                };
                console.debug(`[Orchestrate] Persisting unhealthy node for server: ${decodedServerId}, model: ${modelId}`);
                await ensureNode(nodeInput);
                results.push(result);
                return;
            }
            console.debug(`[Orchestrate] Server healthy after cold test: ${decodedServerId}, model: ${modelId}`);
            healthyServers.push(decodedServerId);
            isHealthy = true;
        } catch (err: any) {
            console.error(`[Orchestrate] Cold test error for server: ${decodedServerId}, model: ${modelId}: ${err instanceof Error ? err.message : String(err)}`);
            result.error = err instanceof Error ? err.message : String(err);
            unhealthyServers.add(decodedServerId);
            // Persist health status to model-performance node, with embedding
            const now = new Date();
            const nodeTitle = `${modelId}:${decodedServerId}`;
            const rag = await getRagService();
            let embeddings: number[] | undefined = undefined;
            if (rag && rag.generatePerformanceEmbeddings) {
                try {
                    console.debug(`[Orchestrate] Generating embeddings after error for server: ${decodedServerId}, model: ${modelId}`);
                    embeddings = await withTimeout(
                        rag.generatePerformanceEmbeddings(modelId, {
                            latencyMs: result.coldLatency ?? 0,
                            throughput: 0,
                            lastTested: now.getTime(),
                        }),
                        30 * 60 * 1000,
                        `Embedding generation timed out after 30 minutes for server ${decodedServerId}`
                    );
                    console.debug(`[Orchestrate] Embeddings generated after error for server: ${decodedServerId}, model: ${modelId}: ${JSON.stringify(embeddings)}`);
                } catch (embErr: any) {
                    console.warn(`[Orchestrate] Embedding generation failed after error for server: ${decodedServerId}, model: ${modelId}: ${embErr instanceof Error ? embErr.message : String(embErr)}`);
                }
            }
            const nodeInput: BenchmarkNodeInput = {
                type: 'model-performance',
                title: nodeTitle,
                metadata: {
                    modelId,
                    serverId: decodedServerId,
                    coldLatency: result.coldLatency,
                    coldQuality: result.coldQuality,
                    warmLatencies: undefined,
                    qualityResults: {},
                    aggregatedResults: {},
                    error: result.error,
                    startedAt: now.toISOString(),
                    completedAt: new Date().toISOString(),
                    health: 'unhealthy',
                    embeddings,
                }
            };
            console.debug(`[Orchestrate] Persisting unhealthy node after error for server: ${decodedServerId}, model: ${modelId}`);
            await ensureNode(nodeInput);
            results.push(result);
        }
    }));

    // Step 2: Only assign warmup/quality/warm latency to healthy servers
    await Promise.all(healthyServers.map(async (serverId) => {
        console.debug(`[Orchestrate] Starting warmup/quality/warm latency for healthy server: ${serverId}, model: ${modelId}`);
        const result: ServerBenchmarkResult = { serverId, qualityResults: {} };
        // Step 2: Dynamic warmup slot assignment
        const assignedBenchmarks: BenchmarkType[] = [];
        for (let i = 0; i < warmupSlotsPerServer; i++) {
            const benchmark = qualityBenchmarks[i % qualityBenchmarks.length];
            assignedBenchmarks.push(benchmark);
        }
        console.debug(`[Orchestrate] Assigned benchmarks for server: ${serverId}, model: ${modelId}: ${assignedBenchmarks.join(', ')}`);

        // Step 3: Parallel warmup/quality test execution (30 min timeout per benchmark)
        await Promise.all(assignedBenchmarks.map(async (benchmark) => {
            console.debug(`[Orchestrate] Running benchmark ${benchmark} for server: ${serverId}, model: ${modelId}`);
            const score = await withTimeout(
                runBenchmarksForServer(modelId, serverId, [benchmark]),
                30 * 60 * 1000,
                `Benchmark ${benchmark} timed out after 30 minutes for server ${serverId}`
            );
            console.debug(`[Orchestrate] Benchmark ${benchmark} result for server: ${serverId}, model: ${modelId}: ${JSON.stringify(score)}`);
            if (!result.qualityResults[benchmark]) result.qualityResults[benchmark] = [];
            result.qualityResults[benchmark].push(score[benchmark]);
        }));

        console.debug(`[Orchestrate] Running warm latency tests for server: ${serverId}, model: ${modelId}`);
        // Step 4: Warm latency tests (protocol compliance) (30 min timeout)
        result.warmLatencies = await withTimeout(
            runWarmLatencyTests(modelId, serverId, 3),
            30 * 60 * 1000,
            `Warm latency tests timed out after 30 minutes for server ${serverId}`
        );
        console.debug(`[Orchestrate] Warm latency results for server: ${serverId}, model: ${modelId}: ${JSON.stringify(result.warmLatencies)}`);

        // Step 5: Remaining quality tests (if any) (30 min timeout per benchmark)
        const completed = new Set(assignedBenchmarks);
        const remaining = qualityBenchmarks.filter(qb => !completed.has(qb));
        console.debug(`[Orchestrate] Remaining benchmarks for server: ${serverId}, model: ${modelId}: ${remaining.join(', ')}`);
        for (const benchmark of remaining) {
            console.debug(`[Orchestrate] Running remaining benchmark ${benchmark} for server: ${serverId}, model: ${modelId}`);
            const score = await withTimeout(
                runBenchmarksForServer(modelId, serverId, [benchmark]),
                30 * 60 * 1000,
                `Benchmark ${benchmark} timed out after 30 minutes for server ${serverId}`
            );
            console.debug(`[Orchestrate] Remaining benchmark ${benchmark} result for server: ${serverId}, model: ${modelId}: ${JSON.stringify(score)}`);
            if (!result.qualityResults[benchmark]) result.qualityResults[benchmark] = [];
            result.qualityResults[benchmark].push(score[benchmark]);
        }

        console.debug(`[Orchestrate] Aggregating quality results for server: ${serverId}, model: ${modelId}`);
        // Step 6: Aggregation
        const aggregated = aggregateQualityResults(result.qualityResults);
        result.qualityResults = aggregated;
        console.debug(`[Orchestrate] Aggregated quality results for server: ${serverId}, model: ${modelId}: ${JSON.stringify(aggregated)}`);

        // Step 7: Persist and maintain rolling history in model-performance node, including health and embeddings (embedding: 30 min timeout)
        const now = new Date();
        const startedAt = now.toISOString();
        const completedAt = new Date().toISOString();
        const nodeTitle = `${modelId}:${serverId}`;
        const rag = await getRagService();
        let embeddings: number[] | undefined = undefined;
        if (rag && rag.generatePerformanceEmbeddings) {
            try {
                console.debug(`[Orchestrate] Generating embeddings for healthy server: ${serverId}, model: ${modelId}`);
                embeddings = await withTimeout(
                    rag.generatePerformanceEmbeddings(modelId, {
                        latencyMs: result.coldLatency ?? 0,
                        throughput: 0,
                        lastTested: now.getTime(),
                    }),
                    30 * 60 * 1000,
                    `Embedding generation timed out after 30 minutes for server ${serverId}`
                );
                console.debug(`[Orchestrate] Embeddings generated for healthy server: ${serverId}, model: ${modelId}: ${JSON.stringify(embeddings)}`);
            } catch (embErr: any) {
                console.warn(`[Orchestrate] Embedding generation failed for healthy server: ${serverId}, model: ${modelId}: ${embErr instanceof Error ? embErr.message : String(embErr)}`);
            }
        }
        const nodeInput: BenchmarkNodeInput = {
            type: 'model-performance',
            title: nodeTitle,
            metadata: {
                modelId,
                serverId,
                coldLatency: result.coldLatency,
                coldQuality: result.coldQuality,
                warmLatencies: result.warmLatencies,
                qualityResults: {},
                aggregatedResults: aggregated,
                error: result.error,
                startedAt,
                completedAt,
                health: 'healthy',
                embeddings,
            }
        };
        console.debug(`[Orchestrate] Persisting healthy node for server: ${serverId}, model: ${modelId}`);
        const node = await ensureNode(nodeInput);
        const prevResults = (node.metadata?.qualityResults || {}) as Partial<Record<BenchmarkType, QualityBenchmarkScore[]>>;
        for (const [benchmark, newScores] of Object.entries(result.qualityResults) as [BenchmarkType, QualityBenchmarkScore[]][]) {
            const prev = prevResults[benchmark] || [];
            const merged = [...prev, ...newScores].slice(-20);
            nodeInput.metadata.qualityResults[benchmark] = merged;
        }
        await ensureNode(nodeInput);

        results.push(result);
    }));

    // After all healthy server runs, aggregate to ai-model node
    console.debug(`[Orchestrate] Aggregating model-performance nodes to ai-model node for model: ${modelId}`);
    const allModelPerformanceNodes: any[] = [];
    for (const serverId of healthyServers) {
        const nodeTitle = `${modelId}:${serverId}`;
        const node = await getNode({ type: 'model-performance', title: nodeTitle });
        if (node) allModelPerformanceNodes.push(node);
    }
    await aggregateModelPerformanceToAiModel(modelId, allModelPerformanceNodes);
    console.debug(`[Orchestrate] Aggregation to ai-model node complete for model: ${modelId}`);

    return results;
}

/**
 * Run warm latency (protocol compliance) tests for a server.
 */
async function runWarmLatencyTests(modelId: string, serverId: string, count: number): Promise<number[]> {
    const latencies: number[] = [];
    for (let i = 0; i < count; i++) {
        // Use a protocol compliance phrase prompt
        const scores = await runBenchmarksForServer(modelId, serverId, ['protocol-compliance' as BenchmarkType]);
        const score = scores['protocol-compliance'];
        if (score && typeof score.score === 'number') latencies.push(score.score);
    }
    return latencies;
}

/**
 * Aggregate repeated quality test results (average, median, min, max, all runs).
 */
function aggregateQualityResults(
    results: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>>
): Partial<Record<BenchmarkType, QualityBenchmarkScore[]>> {
    const aggregated: Partial<Record<BenchmarkType, QualityBenchmarkScore[]>> = {};
    for (const [benchmark, scores] of Object.entries(results) as [BenchmarkType, QualityBenchmarkScore[]][]) {
        if (!scores || scores.length === 0) continue;
        // Compute average, median, min, max
        const values = scores.map(s => s.score).filter((v): v is number => typeof v === 'number');
        if (values.length === 0) continue;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 ?
            (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
            sorted[Math.floor(sorted.length / 2)];
        const min = Math.min(...values);
        const max = Math.max(...values);
        // Store all runs and aggregated stats as synthetic QualityBenchmarkScore entries
        aggregated[benchmark] = [
            ...scores,
            {
                type: benchmark,
                score: avg,
                rubric: 'average',
                timestamp: new Date().toISOString()
            },
            {
                type: benchmark,
                score: median,
                rubric: 'median',
                timestamp: new Date().toISOString()
            },
            {
                type: benchmark,
                score: min,
                rubric: 'min',
                timestamp: new Date().toISOString()
            },
            {
                type: benchmark,
                score: max,
                rubric: 'max',
                timestamp: new Date().toISOString()
            }
        ];
    }
    return aggregated;
}