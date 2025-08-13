/**
 * Ensures a Record<BenchmarkType, QualityBenchmarkScore> contains all BenchmarkType keys.
 * Fills missing keys with a default QualityBenchmarkScore (score 0, current timestamp).
 * @param partialBenchmarks - Partial or incomplete benchmarks object
 * @returns Complete Record<BenchmarkType, QualityBenchmarkScore>
 */
import { BenchmarkType, QualityBenchmarkScore } from 'shared/types/aiQualityBenchmark.js';
export function fillAllBenchmarkTypes(partialBenchmarks: Partial<Record<BenchmarkType, QualityBenchmarkScore>>): Record<BenchmarkType, QualityBenchmarkScore> {
    // List of all possible BenchmarkType values
    const allTypes: BenchmarkType[] = [
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
        'code-style-consistency',
        'variable-naming',
        'comment-quality',
        'error-handling',
        'performance-awareness',
        'security-consciousness',
        'maintainability',
        'embedding-quality',
        'embedding-speed',
        'vector-similarity',
        'embedding-dimensions',
        'embedding-clustering',
    ];
    const now = new Date().toISOString();
    const result: Record<BenchmarkType, QualityBenchmarkScore> = {} as any;
    for (const type of allTypes) {
        if (partialBenchmarks && partialBenchmarks[type]) {
            result[type] = partialBenchmarks[type]!;
        } else {
            result[type] = {
                type,
                score: 0,
                rubric: 'Not yet benchmarked',
                timestamp: now
            };
        }
    }
    return result;
}
/**
 * Utility functions for benchmarking operations.
 */

import { getServersForModel, markServerUnhealthy } from '../../orchestrator/serverDiscovery.js';
import { extractThinkingAndAnswer } from 'shared/utils/extractThinkingAndAnswer.js';
import { ensureNode, getNode } from 'shared/node/nodeService.js';
import { logger } from 'shared/logging/logger.js';

// Import from extracted modules
import { measureServerLatencies } from './benchmarks/measureServerLatencies.js';
import { runQualityBenchmarks } from './benchmarks/runQualityBenchmarks.js';
import { selectFastestServer } from './benchmarks/selectFastestServer.js';

/**
 * Validates the structure of benchmark data.
 * @param data - Data to validate.
 * @returns True if valid, otherwise false.
 */
export function validateBenchmarkData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.modelId || typeof data.modelId !== 'string') return false;
    if (!data.benchmarks || typeof data.benchmarks !== 'object') return false;
    return true;
}

/**
 * Validates enhanced benchmark data structure for RAG system.
 * @param data - Enhanced data structure to validate.
 * @returns True if valid, otherwise false.
 */
export function validateEnhancedBenchmarkData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.servers) || !Array.isArray(data.performances) || !Array.isArray(data.models)) return false;
    return true;
}

/**
 * Logs benchmark processing details.
 * @param message - Message to log.
 */
export function logBenchmarkDetails(message: string): void {
    console.log(`[BenchmarkUtils] ${message}`);
}

/**
 * Detects if a model supports enhanced node creation features.
 * @param modelId - The model identifier
 * @returns True if the model supports enhanced features
 */
export function supportsEnhancedNodeCreation(modelId: string): boolean {
    const enhancedModels = ['llama', 'mistral', 'qwen', 'phi', 'gemma'];
    return enhancedModels.some(model => modelId.toLowerCase().includes(model));
}

/**
 * Calculates priority for benchmark execution.
 * @param benchmarkType - Type of benchmark
 * @param modelId - Model identifier
 * @returns Priority level (1-10, higher is more important)
 */
export function calculateBenchmarkPriority(benchmarkType: string, modelId: string): number {
    const highPriorityBenchmarks = ['creative-writing', 'character-consistency', 'dialogue-generation'];
    const isHighPriority = highPriorityBenchmarks.includes(benchmarkType);
    const isBookWritingModel = modelId.toLowerCase().includes('instruct') || modelId.toLowerCase().includes('chat');

    if (isHighPriority && isBookWritingModel) return 10;
    if (isHighPriority) return 8;
    if (isBookWritingModel) return 6;
    return 4;
}

/**
 * Runs manual benchmarks for a model, matching the logic in benchmarkManualController.
 * Returns { modelId, results } where results is an array of { serverId, latencyMs, benchmarks }.
 * This is intended for use by both the manual controller and startup routines.
 */
const LATENCY_TEST = 'latency';
export async function runManualBenchmarksForModel({
    modelId,
    benchmarkTypes,
    serverIds
}: {
    modelId: string;
    benchmarkTypes: (BenchmarkType | typeof LATENCY_TEST)[];
    serverIds?: string[];
}): Promise<{ modelId: string; results: Array<{ serverId: string; latencyMs?: number; benchmarks: Record<BenchmarkType, QualityBenchmarkScore> }> }> {
    // [Benchmark] Starting manual benchmarks for model: ...
    if (!modelId || !Array.isArray(benchmarkTypes) || benchmarkTypes.length === 0) {
        console.error('[Benchmark] modelId and benchmarkTypes[] are required.');
        throw new Error('modelId and benchmarkTypes[] are required.');
    }
    let servers: string[];
    if (serverIds && serverIds.length > 0) {
        servers = serverIds;
        // [Benchmark] Using provided serverIds: ...
    } else {
        // Use orchestrator logic to pick fastest server for quality tests
        const { getOrchestratorInstance } = await import('../orchestrator-instance.js');
        const orchestrator = getOrchestratorInstance();
        const healthyServers = orchestrator.getServers().filter((s: any) => s.healthy && s.models.includes(modelId));
        if (!healthyServers || healthyServers.length === 0) {
            console.error('[Benchmark] No servers found for model.');
            throw new Error('No servers found for model.');
        }
        if (benchmarkTypes.includes(LATENCY_TEST)) {
            servers = healthyServers.map((s: any) => s.url.replace(/^https?:\/\//, ''));
            // [Benchmark] Running latency tests on all healthy servers: ...
        } else {
            const serverIds = healthyServers.map((s: any) => s.url.replace(/^https?:\/\//, ''));
            const fastestServer = await selectFastestServer(serverIds, modelId);
            servers = [fastestServer];
            // [Benchmark] Selected fastest server for quality tests: ...
        }
    }
    const results: Array<{ serverId: string; latencyMs?: number; benchmarks: Record<BenchmarkType, QualityBenchmarkScore> }> = [];
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes for CPU inference
    const qualityTypes = benchmarkTypes.filter((t): t is BenchmarkType => t !== LATENCY_TEST);
    let latencyResults: Array<{ serverId: string; latencyMs: number | undefined }> = [];
    const { callModelAPI } = await import('./benchmarkUtils.js');
    // Use a reproducible, multi-word prompt for protocol compliance
    const protocolCompliancePhrase = "The quick brown fox jumps over the lazy dog";
    const latencyPrompt = `Reply with the following text, exactly as shown, with no extra words, punctuation, or formatting:\n\n${protocolCompliancePhrase}`;
    // Wrapper to force temperature=0 for latency tests
    const callModelAPILatency = (
        serverId: string,
        modelId: string,
        prompt: string,
        maxRetries = 3,
        baseDelayMs = 500,
        timeoutMs = TIMEOUT_MS
    ) => callModelAPI(serverId, modelId, prompt, maxRetries, baseDelayMs, timeoutMs, 0);
    // Run all latency tests in parallel, with response validation and improved logging
    const latencyPromises = servers.map(async (serverId) => {
        // [Benchmark] Measuring latency for server: ...
        let latencyMs: number | undefined = undefined;
        let timedOut = false;
        let failureTimestamps: number[] = [];
        let unhealthyUntil: number | undefined = undefined;
        let protocolComplianceScore: { valid: boolean; reason: string; response: string; details?: Record<string, boolean> } = { valid: false, reason: '', response: '' };
        let warmupHistory: number[] = [];
        let warmAll: number[] = [];
        let warmupAvg: number | undefined = undefined;
        const runLatency = async () => {
            try {
                // --- Validation logic ---
                // Run latency and get warmup
                const latencyResult = await measureServerLatencies(
                    serverId,
                    modelId,
                    latencyPrompt,
                    callModelAPILatency,
                    TIMEOUT_MS
                );
                latencyMs = latencyResult.cold;
                warmAll = latencyResult.warmAll;
                warmupAvg = latencyResult.warmAll.length > 0 ? (latencyResult.warmAll.reduce((a, b) => a + b, 0) / latencyResult.warmAll.length) : undefined;
                // Store new warmup value
                if (typeof latencyResult.warmup === 'number' && isFinite(latencyResult.warmup)) {
                    warmupHistory.push(latencyResult.warmup);
                    if (warmupHistory.length > 20) warmupHistory = warmupHistory.slice(-20);
                }
                // Validation: must be exactly the protocolCompliancePhrase, no extra text, punctuation, or formatting
                let response: string = '';
                try {
                    response = await callModelAPILatency(serverId, modelId, latencyPrompt, 3, 500, TIMEOUT_MS);
                } catch (err) {
                    // Already logged by callModelAPI
                }
                const trimmed = (response || '').trim();
                // Validation logic
                const details: Record<string, boolean> = {
                    exactMatch: trimmed === protocolCompliancePhrase,
                    caseSensitiveMatch: trimmed === protocolCompliancePhrase,
                    caseInsensitiveMatch: trimmed.toLowerCase() === protocolCompliancePhrase.toLowerCase(),
                    hasExtraText: trimmed !== protocolCompliancePhrase && trimmed.includes(protocolCompliancePhrase),
                    hasPunctuation: /[.,;:!?]/.test(trimmed.replace(protocolCompliancePhrase, '')),
                    hasMarkdown: /```|\*\*|__|\[|\]/.test(trimmed),
                    hasApology: /apolog/i.test(trimmed) || /sorry/i.test(trimmed),
                    hasRefusal: /cannot|can\'t|unable|refus/i.test(trimmed),
                    hasLink: /https?:\/\//i.test(trimmed) || /#|@/.test(trimmed),
                    isEmpty: trimmed.length === 0
                };
                let valid = details.exactMatch;
                let reason = '';
                if (details.exactMatch) {
                    reason = 'exact match';
                } else if (details.isEmpty) {
                    reason = 'empty response';
                } else if (details.hasApology || details.hasRefusal) {
                    reason = 'apology or refusal detected';
                } else if (details.hasLink) {
                    reason = 'link or hashtag detected';
                } else if (details.hasMarkdown) {
                    reason = 'markdown or formatting detected';
                } else if (details.hasPunctuation) {
                    reason = 'punctuation detected';
                } else if (details.hasExtraText) {
                    reason = 'extra text detected';
                } else {
                    reason = 'unexpected content';
                }
                protocolComplianceScore = { valid, reason, response: trimmed, details };
                // Protocol compliance result logged via logger if needed
                if (latencyMs === 9999) {
                    // [Benchmark] Latency check failed or timed out for server ...
                    failureTimestamps.push(Date.now());
                    if (failureTimestamps.length > 5) failureTimestamps = failureTimestamps.slice(-5);
                    const backoffMinutes = Math.pow(2, failureTimestamps.length) * 2;
                    unhealthyUntil = Date.now() + backoffMinutes * 60 * 1000;
                    await markServerUnhealthy(modelId, serverId, `Latency check failed or timed out. Unhealthy until ${new Date(unhealthyUntil).toISOString()}`);
                }
                // Mark as unhealthy for repeated protocol violations
                if (!valid) {
                    failureTimestamps.push(Date.now());
                    if (failureTimestamps.length > 5) failureTimestamps = failureTimestamps.slice(-5);
                    const backoffMinutes = Math.pow(2, failureTimestamps.length) * 2;
                    unhealthyUntil = Date.now() + backoffMinutes * 60 * 1000;
                    await markServerUnhealthy(modelId, serverId, `Latency protocol violation: ${reason}. Unhealthy until ${new Date(unhealthyUntil).toISOString()}`);
                }
                // --- Store best latency/protocol compliance in ai-model node (only if best) ---
                // Fetch current ai-model node to compare
                let aiModelNode: any = null;
                try {
                    aiModelNode = await getNode({ type: 'ai-model', title: modelId });
                } catch { }
                let shouldUpdateModelNode = false;
                if (!aiModelNode || !aiModelNode.metadata || typeof aiModelNode.metadata.latencyMs !== 'number' || (latencyMs !== undefined && latencyMs < aiModelNode.metadata.latencyMs)) {
                    shouldUpdateModelNode = true;
                }
                if (shouldUpdateModelNode) {
                    await ensureNode({
                        type: 'ai-model',
                        title: modelId,
                        metadata: {
                            modelId,
                            serverId,
                            latencyMs,
                            protocolComplianceScore,
                            lastLatencyFailure: new Date().toISOString(),
                            latencyFailures: failureTimestamps,
                            unhealthyUntil
                        }
                    });
                }
                // --- Store all latency/warmup history in model-performance node ---
                await ensureNode({
                    type: 'model-performance',
                    title: `${modelId} Performance on ${serverId}`,
                    metadata: {
                        modelId,
                        serverId,
                        latencyHistory: [latencyMs],
                        warmupHistory,
                        warmupAvg,
                        warmAll,
                        lastTested: new Date().toISOString(),
                        protocolComplianceScore
                    }
                });
            } catch (err) {
                console.error(`[Benchmark] Latency check error for server ${serverId}:`, err);
                failureTimestamps.push(Date.now());
                if (failureTimestamps.length > 5) failureTimestamps = failureTimestamps.slice(-5);
                const backoffMinutes = Math.pow(2, failureTimestamps.length) * 2;
                unhealthyUntil = Date.now() + backoffMinutes * 60 * 1000;
                await markServerUnhealthy(modelId, serverId, `Latency check error or exception. Unhealthy until ${new Date(unhealthyUntil).toISOString()}`);
                // Also update model-performance node with error info
                await ensureNode({
                    type: 'model-performance',
                    title: `${modelId} Performance on ${serverId}`,
                    metadata: {
                        modelId,
                        serverId,
                        error: err instanceof Error ? err.message : String(err),
                        lastTested: new Date().toISOString(),
                        protocolComplianceScore
                    }
                });
            }
        };
        try {
            await Promise.race([
                runLatency(),
                new Promise((_, reject) => setTimeout(() => {
                    timedOut = true;
                    failureTimestamps.push(Date.now());
                    if (failureTimestamps.length > 5) failureTimestamps = failureTimestamps.slice(-5);
                    const backoffMinutes = Math.pow(2, failureTimestamps.length) * 2;
                    unhealthyUntil = Date.now() + backoffMinutes * 60 * 1000;
                    // [Benchmark] Timeout after ...
                    reject(new Error(`Timeout after ${TIMEOUT_MS}ms for server ${serverId}`));
                }, TIMEOUT_MS))
            ]);
        } catch (err) {
            const unhealthyUntilStr = unhealthyUntil !== undefined ? new Date(unhealthyUntil).toISOString() : 'unknown';
            if (timedOut) {
                // [Benchmark] Latency check timeout for server ...
                await markServerUnhealthy(modelId, serverId, `Latency check timeout. Unhealthy until ${unhealthyUntilStr}`);
            } else {
                // [Benchmark] Latency check error for server ...
                await markServerUnhealthy(modelId, serverId, `Latency check error. Unhealthy until ${unhealthyUntilStr}`);
            }
            await ensureNode({
                type: 'ai-model',
                title: modelId,
                metadata: {
                    modelId,
                    serverId,
                    latencyFailures: failureTimestamps,
                    unhealthyUntil,
                    lastLatencyFailure: new Date().toISOString(),
                    protocolComplianceScore,
                    latencyMs,
                }
            });
        }
        return { serverId, latencyMs };
    });
    const latencyResultsArr = await Promise.all(latencyPromises);
    for (const { serverId, latencyMs } of latencyResultsArr) {
        latencyResults.push({ serverId, latencyMs });
        results.push({ serverId, latencyMs, benchmarks: {} as Record<BenchmarkType, QualityBenchmarkScore> });
    }
    // --- 2. Run quality benchmarks only on the fastest server ---
    if (qualityTypes.length > 0 && latencyResults.length > 0) {
        // [Benchmark] Running quality benchmarks for model: ...
        const validLatencies = latencyResults.filter(l => typeof l.latencyMs === 'number' && l.latencyMs !== 9999);
        let targetServerId: string;
        let qualityTimeoutMs = TIMEOUT_MS;
        if (validLatencies.length > 0) {
            const slowest = validLatencies.reduce((max, curr) => (curr.latencyMs! > max.latencyMs! ? curr : max));
            targetServerId = slowest.serverId;
            qualityTimeoutMs = Math.max(2 * 60 * 1000, Math.min(10 * 60 * 1000, 3 * slowest.latencyMs!));
            // [Benchmark] Selected slowest server for quality: ...
        } else {
            targetServerId = servers[0];
            // [Benchmark] No valid latency results, defaulting to first server: ...
        }
        let benchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;
        let timedOut = false;
        const runQuality = async () => {
            // [Benchmark] Running quality benchmarks for each type ...
            try {
                benchmarks = await runQualityBenchmarks(modelId, targetServerId, qualityTypes as any) as any;
                // [Benchmark] Quality benchmarks complete for server ...
            } catch (err) {
                console.error(`[Benchmark] Quality benchmark error for server ${targetServerId}:`, err);
                await markServerUnhealthy(modelId, targetServerId, 'Quality benchmark error or exception');
            }
        };
        try {
            await Promise.race([
                runQuality(),
                new Promise((_, reject) => setTimeout(() => {
                    timedOut = true;
                    console.warn(`[Benchmark] Quality benchmark timeout after ${qualityTimeoutMs}ms for server ${targetServerId}`);
                    reject(new Error(`Timeout after ${qualityTimeoutMs}ms for server ${targetServerId}`));
                }, qualityTimeoutMs))
            ]);
        } catch (err) {
            if (timedOut) {
                console.warn(`[Benchmark] Quality benchmark timeout for server ${targetServerId}`);
                await markServerUnhealthy(modelId, targetServerId, 'Quality benchmark timeout');
            } else {
                console.error(`[Benchmark] Quality benchmark error for server ${targetServerId}`);
                await markServerUnhealthy(modelId, targetServerId, 'Quality benchmark error');
            }
        }
        const resultEntry = results.find(r => r.serverId === targetServerId);
        if (resultEntry) {
            resultEntry.benchmarks = benchmarks;
        } else {
            results.push({ serverId: targetServerId, benchmarks, latencyMs: undefined });
        }
        // Persist quality results to RAG (ai-model node)
        try {
            await ensureNode({
                type: 'ai-model',
                title: modelId,
                metadata: {
                    modelId,
                    manualBenchmarks: benchmarks,
                    lastManualBenchmarked: new Date().toISOString(),
                    qualityTimeoutMs,
                }
            });
            // Verification step
            const node = await getNode({ type: 'ai-model', title: modelId });
            if (!node || !node.metadata || !node.metadata.manualBenchmarks) {
                // [Benchmark] Failed to verify manualBenchmarks node update.
            } else {
                const match = JSON.stringify(node.metadata.manualBenchmarks) === JSON.stringify(benchmarks);
                if (!match) {
                    // [Benchmark] manualBenchmarks in node do not match computed benchmarks.
                } else {
                    // [Benchmark] manualBenchmarks successfully persisted and verified.
                }
            }
        } catch (err) {
            // [Benchmark] Error persisting/verifying manualBenchmarks.
        }
    }
    return { modelId, results };
}
import Ajv from 'ajv';
import natural from 'natural';
import rouge from 'rouge';

// --- Shared callModelAPI ---
export async function callModelAPI(
    serverId: string,
    modelId: string,
    prompt: string,
    maxRetries = 3,
    baseDelayMs = 500,
    timeoutMs: number = 15 * 60 * 1000, // 15 minutes for CPU inference
    temperature?: number,
    options?: {
        stream?: boolean;
        format?: string;
        template?: string;
        context?: any[];
        system?: string;
        raw?: boolean;
        top_p?: number;
        top_k?: number;
        repeat_penalty?: number;
        presence_penalty?: number;
        frequency_penalty?: number;
        num_predict?: number;
    }
): Promise<string> {
    // Discover all servers for this model
    // NOTE: This requires discoverServersForModel to be imported or passed in; for now, use getServerLatency as a proxy
    // (In BenchmarkingManager, discoverServersForModel is a local function; here, we assume all servers are healthy)
    // For a real orchestrator, pass in a discoverServersForModel function or refactor as needed.
    // Always decode the serverId in case it's base64-encoded (srv-...)
    function decodeIfBase64(serverId: string): string {
        console.log(`[callModelAPI] Debug: Input serverId: ${serverId}`);
        if (serverId.startsWith('srv-')) {
            try {
                const b64 = serverId.slice(4);
                console.log(`[callModelAPI] Debug: Base64 part: ${b64}`);
                const decoded = Buffer.from(b64, 'base64').toString('utf-8');
                console.log(`[callModelAPI] Debug: Decoded result: ${decoded}`);
                return decoded;
            } catch (error) {
                console.log(`[callModelAPI] Debug: Decode error: ${error}`);
                return serverId;
            }
        }
        console.log(`[callModelAPI] Debug: No srv- prefix, returning original: ${serverId}`);
        return serverId;
    }
    const decodedServer = decodeIfBase64(serverId);
    console.log(`[callModelAPI] Debug: Final decodedServer: ${decodedServer}`);
    // Remove protocol if present, we'll add it below
    const serverUrl = decodedServer.replace(/^https?:\/\//, '');
    console.log(`[callModelAPI] Debug: Final serverUrl after protocol removal: ${serverUrl}`);
    const allServers = [serverUrl];
    let availableServers = allServers.filter(s => s !== undefined && s !== null);
    let unhealthyServers = new Set<string>();
    let currentServer = serverUrl; // Use the clean server URL without protocol
    let attempt = 0;
    let lastError: any = null;
    while (attempt <= maxRetries && availableServers.length > 0) {
        try {
            // Ollama-compatible API call with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            let response;
            let requestPayload: Record<string, any>;
            try {
                // Build the full Ollama-compatible payload
                requestPayload = { model: modelId, prompt };
                if (typeof temperature === 'number') requestPayload.temperature = temperature;
                if (options) {
                    if (typeof options.stream === 'boolean') requestPayload.stream = options.stream;
                    if (typeof options.format === 'string') requestPayload.format = options.format;
                    if (typeof options.template === 'string') requestPayload.template = options.template;
                    if (Array.isArray(options.context)) requestPayload.context = options.context;
                    if (typeof options.system === 'string') requestPayload.system = options.system;
                    if (typeof options.raw === 'boolean') requestPayload.raw = options.raw;
                    if (typeof options.top_p === 'number') requestPayload.top_p = options.top_p;
                    if (typeof options.top_k === 'number') requestPayload.top_k = options.top_k;
                    if (typeof options.repeat_penalty === 'number') requestPayload.repeat_penalty = options.repeat_penalty;
                    if (typeof options.presence_penalty === 'number') requestPayload.presence_penalty = options.presence_penalty;
                    if (typeof options.frequency_penalty === 'number') requestPayload.frequency_penalty = options.frequency_penalty;
                    if (typeof options.num_predict === 'number') requestPayload.num_predict = options.num_predict;
                }

                const fetchUrl = `http://${currentServer}/api/generate`;
                console.log(`[callModelAPI] Attempting fetch to: ${fetchUrl} for model: ${modelId}`);
                console.log(`[callModelAPI] Using timeout: ${timeoutMs}ms (${Math.round(timeoutMs / 60000)} minutes) for CPU inference`);
                const startTime = Date.now();

                response = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload),
                    signal: controller.signal
                });

                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000;
                console.log(`[callModelAPI] API call completed in ${duration.toFixed(2)} seconds`);
                if (duration > 60) {
                    console.log(`[callModelAPI] Note: CPU inference took ${Math.round(duration / 60)} minutes - this is normal for complex prompts`);
                }
            } finally {
                clearTimeout(timeout);
            }
            const status = response.status;
            const is5xx = status >= 500 && status < 600;
            const is4xx = status >= 400 && status < 500;
            const rawText = await response.text();
            const responseHeaders = Object.fromEntries(response.headers.entries());
            // Check for OOM or other known Ollama errors in the response text
            const isOllamaOOM = /out of memory|oom|cuda error|gpu memory/i.test(rawText);
            if (!response.ok) {
                // Log full request/response context for all errors
                logger.error(`[callModelAPI] Error response for attempt ${attempt + 1} on ${currentServer}:${modelId}:
  Status: ${status} ${response.statusText}
  OOM: ${isOllamaOOM}
  Request: ${JSON.stringify(requestPayload, null, 2)}
  Response Headers: ${JSON.stringify(responseHeaders, null, 2)}
  Response Body: ${rawText}`);
                if (is5xx || isOllamaOOM) {
                    lastError = new Error(`Model call failed: ${status} ${response.statusText}${isOllamaOOM ? ' (OOM or GPU error)' : ''}`);
                    logger.warn(`callModelAPI attempt ${attempt + 1} failed for ${currentServer}:${modelId}: ${status} ${response.statusText}${isOllamaOOM ? ' (OOM or GPU error)' : ''} (marking server as unhealthy and retrying)`);
                    unhealthyServers.add(currentServer);
                    availableServers = availableServers.filter(s => !unhealthyServers.has(s));
                    if (availableServers.length === 0) break;
                    currentServer = availableServers[attempt % availableServers.length];
                    attempt++;
                    continue;
                } else if (is4xx) {
                    // Do not retry on 4xx
                    logger.error(`callModelAPI received 4xx error for ${currentServer}:${modelId}: ${status} ${response.statusText}\n  Request: ${JSON.stringify(requestPayload, null, 2)}\n  Response Headers: ${JSON.stringify(responseHeaders, null, 2)}\n  Response Body: ${rawText}`);
                    throw new Error(`Model call failed: ${status} ${response.statusText}`);
                } else {
                    lastError = new Error(`Model call failed: ${status} ${response.statusText}`);
                    logger.warn(`callModelAPI attempt ${attempt + 1} failed for ${currentServer}:${modelId}: ${status} ${response.statusText} (will retry)\n  Request: ${JSON.stringify(requestPayload, null, 2)}\n  Response Headers: ${JSON.stringify(responseHeaders, null, 2)}\n  Response Body: ${rawText}`);
                }
            } else {
                // Try to parse as JSON first
                try {
                    const data = JSON.parse(rawText);
                    // If the response is empty or missing expected fields, treat as invalid and retry
                    const text = data.response || data.text || '';
                    if (typeof text === 'string' && text.trim().length === 0) {
                        lastError = new Error('Model returned empty response');
                        logger.warn(`callModelAPI attempt ${attempt + 1} got empty response for ${currentServer}:${modelId} (marking server as unhealthy and retrying)`);
                        unhealthyServers.add(currentServer);
                        availableServers = availableServers.filter(s => !unhealthyServers.has(s));
                        if (availableServers.length === 0) break;
                        currentServer = availableServers[attempt % availableServers.length];
                        attempt++;
                        continue;
                    } else {
                        return text || JSON.stringify(data);
                    }
                } catch (jsonErr) {
                    // Try to parse as NDJSON (newline-delimited JSON)
                    const lines = rawText.split('\n').filter(Boolean);
                    let concatenated = '';
                    for (const line of lines) {
                        try {
                            const obj = JSON.parse(line);
                            if (typeof obj.response === 'string') concatenated += obj.response;
                        } catch { }
                    }
                    // [callModelAPI] Concatenated NDJSON response.
                    if (concatenated.length > 0) {
                        // Try to extract the first valid JSON object from the concatenated output
                        // Remove markdown/code block markers and leading text
                        let jsonCandidate = concatenated
                            .replace(/```[a-zA-Z]*[\r\n]?/g, '') // remove code block markers
                            .replace(/^[^\{]*\{/, '{'); // remove leading text before first {
                        // Find the substring from first { to last }
                        const firstBrace = jsonCandidate.indexOf('{');
                        const lastBrace = jsonCandidate.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                            const jsonString = jsonCandidate.substring(firstBrace, lastBrace + 1);
                            try {
                                JSON.parse(jsonString); // validate
                                // [callModelAPI] Extracted JSON for downstream use.
                                return jsonString;
                            } catch (jsonExtractErr) {
                                logger.error(`[callModelAPI] Failed to parse extracted JSON: ${jsonExtractErr instanceof Error ? jsonExtractErr.message : String(jsonExtractErr)}`);
                                lastError = jsonExtractErr;
                                unhealthyServers.add(currentServer);
                                availableServers = availableServers.filter(s => !unhealthyServers.has(s));
                                if (availableServers.length === 0) break;
                                currentServer = availableServers[attempt % availableServers.length];
                                attempt++;
                                continue;
                            }
                        }
                        // If no valid JSON found, return the concatenated output if not empty
                        if (concatenated.trim().length === 0) {
                            lastError = new Error('Model returned empty NDJSON response');
                            logger.warn(`callModelAPI attempt ${attempt + 1} got empty NDJSON for ${currentServer}:${modelId} (marking server as unhealthy and retrying)`);
                            unhealthyServers.add(currentServer);
                            availableServers = availableServers.filter(s => !unhealthyServers.has(s));
                            if (availableServers.length === 0) break;
                            currentServer = availableServers[attempt % availableServers.length];
                            attempt++;
                            continue;
                        } else {
                            return concatenated;
                        }
                    } else {
                        lastError = jsonErr;
                        logger.warn(`[callModelAPI] Failed to parse response as JSON or NDJSON. Error: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)} (marking server as unhealthy and retrying)`);
                        unhealthyServers.add(currentServer);
                        availableServers = availableServers.filter(s => !unhealthyServers.has(s));
                        if (availableServers.length === 0) break;
                        currentServer = availableServers[attempt % availableServers.length];
                        attempt++;
                        continue;
                    }
                }
            }
        } catch (error) {
            lastError = error;
            logger.warn(`callModelAPI attempt ${attempt + 1} failed for ${currentServer}:${modelId}: ${error instanceof Error ? error.message : String(error)} (marking server as unhealthy and retrying)`);
            unhealthyServers.add(currentServer);
            availableServers = availableServers.filter(s => !unhealthyServers.has(s));
            if (availableServers.length === 0) break;
            currentServer = availableServers[attempt % availableServers.length];
            attempt++;
            continue;
        }
        attempt++;
        if (attempt <= maxRetries && availableServers.length > 0) {
            // Add jitter to exponential backoff
            const base = baseDelayMs * Math.pow(2, attempt - 1);
            const jitter = Math.floor(Math.random() * base * 0.2); // up to 20% jitter
            const delay = base + jitter;
            await new Promise(res => setTimeout(res, delay));
        }
    }
    logger.error(`callModelAPI failed after ${attempt} attempts for ${modelId}. All servers unhealthy or max retries reached. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    throw lastError;
}

// Export extracted benchmark functions from individual modules
export { detectEmbeddingModel } from './benchmarks/embeddingBenchmarks.js';
export { safeBleu } from './benchmarks/safeBleu.js';
export { safeRouge } from './benchmarks/safeRouge.js';
export { evaluateJSONAssembly } from './benchmarks/evaluateJSONAssembly.js';
export { evaluateTaskPlanning } from './benchmarks/evaluateTaskPlanning.js';
export { evaluateCreativeWriting } from './benchmarks/evaluateCreativeWriting.js';
export { evaluateTypescriptQuality } from './benchmarks/evaluateTypescriptQuality.js';
export { measureServerLatencies } from './benchmarks/measureServerLatencies.js';
export { measureServerThroughput } from './benchmarks/measureServerThroughput.js';
export { measureSimpleServerLatency } from './benchmarks/measureSimpleServerLatency.js';
export { runQualityBenchmarks } from './benchmarks/runQualityBenchmarks.js';
export { selectFastestServer } from './benchmarks/selectFastestServer.js';
export { selectSlowestServer } from './benchmarks/selectSlowestServer.js';

/**
 * Shared benchmarking utilities for orchestrator and manual controller.
 *
 * - measureServerLatencies: hot/cold latency
 * - measureServerThroughput: parallel throughput
 * - measureSimpleServerLatency: single latency
 * - runQualityBenchmarks: quality benchmarks
 * - selectFastestServer/selectSlowestServer: server selection
 */
