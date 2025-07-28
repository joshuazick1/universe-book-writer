import { extractThinkingAndAnswer } from '../../shared/utils/extractThinkingAndAnswer.js';


// --- Modularized benchmark implementations ---
import * as Benchmarks from './benchmarks/index.js';

// Map string keys (kebab-case) to implementation functions

const benchmarkTypeMap: Record<string, (...args: any[]) => Promise<number>> = {
    'style-transfer': Benchmarks.evaluateStyleTransfer,
    'advanced-code-generation': Benchmarks.evaluateAdvancedCodeGeneration,
    'node-graph-construction': Benchmarks.evaluateNodeGraphConstruction,
    'long-form-generation': Benchmarks.evaluateLongFormGeneration,
    'permissive-content': Benchmarks.evaluatePermissiveContent,
    'dialogue-generation': Benchmarks.evaluateDialogueGeneration,
    'fact-extraction': Benchmarks.evaluateFactExtraction,
    'summarization': Benchmarks.evaluateSummarization,
    'content-moderation': Benchmarks.evaluateContentModeration,
    'json-assembly': evaluateJSONAssembly,
    'task-planning': evaluateTaskPlanning,
    'creative-writing': evaluateCreativeWriting,
    'typescript-quality': evaluateTypescriptQuality
};

// Export the mapping for use in runQualityBenchmarks
export { benchmarkTypeMap };
/**
 * Runs manual benchmarks for a model, matching the logic in benchmarkManualController.
 * Returns { modelId, results } where results is an array of { serverId, latencyMs, benchmarks }.
 * This is intended for use by both the manual controller and startup routines.
 */
import { getServersForModel, markServerUnhealthy } from '../orchestrator/serverDiscovery.js';
import { ensureNode, getNode } from '../../shared/node/nodeService.js';
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
    console.log(`[Benchmark] Starting manual benchmarks for model: ${modelId}, types: ${benchmarkTypes.join(', ')}, serverIds: ${serverIds ? serverIds.join(', ') : 'auto-select'}`);
    if (!modelId || !Array.isArray(benchmarkTypes) || benchmarkTypes.length === 0) {
        console.error('[Benchmark] modelId and benchmarkTypes[] are required.');
        throw new Error('modelId and benchmarkTypes[] are required.');
    }
    let servers: string[];
    if (serverIds && serverIds.length > 0) {
        servers = serverIds;
        console.log(`[Benchmark] Using provided serverIds: ${servers.join(', ')}`);
    } else {
        // Use orchestrator logic to pick fastest server for quality tests
        const { getOrchestratorInstance } = await import('../src/orchestrator-instance.js');
        const orchestrator = getOrchestratorInstance();
        const healthyServers = orchestrator.getServers().filter((s: any) => s.healthy && s.models.includes(modelId));
        if (!healthyServers || healthyServers.length === 0) {
            console.error('[Benchmark] No servers found for model.');
            throw new Error('No servers found for model.');
        }
        if (benchmarkTypes.includes(LATENCY_TEST)) {
            servers = healthyServers.map((s: any) => s.url.replace(/^https?:\/\//, ''));
            console.log(`[Benchmark] Running latency tests on all healthy servers: ${servers.join(', ')}`);
        } else {
            const serverIds = healthyServers.map((s: any) => s.url.replace(/^https?:\/\//, ''));
            const fastestServer = await selectFastestServer(serverIds, modelId);
            servers = [fastestServer];
            console.log(`[Benchmark] Selected fastest server for quality tests: ${fastestServer}`);
        }
    }
    const results: Array<{ serverId: string; latencyMs?: number; benchmarks: Record<BenchmarkType, QualityBenchmarkScore> }> = [];
    const TIMEOUT_MS = 5 * 60 * 1000;
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
        console.log(`[Benchmark] Measuring latency for server: ${serverId}`);
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
                if (valid) {
                    console.log(`[Benchmark][ProtocolCompliance][${serverId}] Response: "${trimmed}" — VALID`);
                } else {
                    console.warn(`[Benchmark][ProtocolCompliance][${serverId}] Response: "${trimmed}" — INVALID: ${reason}`);
                }
                if (latencyMs === 9999) {
                    console.warn(`[Benchmark] Latency check failed or timed out for server ${serverId}. Marking as unhealthy.`);
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
                    console.warn(`[Benchmark] Timeout after ${TIMEOUT_MS}ms for server ${serverId}`);
                    reject(new Error(`Timeout after ${TIMEOUT_MS}ms for server ${serverId}`));
                }, TIMEOUT_MS))
            ]);
        } catch (err) {
            const unhealthyUntilStr = unhealthyUntil !== undefined ? new Date(unhealthyUntil).toISOString() : 'unknown';
            if (timedOut) {
                console.warn(`[Benchmark] Latency check timeout for server ${serverId}. Marking as unhealthy until ${unhealthyUntilStr}`);
                await markServerUnhealthy(modelId, serverId, `Latency check timeout. Unhealthy until ${unhealthyUntilStr}`);
            } else {
                console.error(`[Benchmark] Latency check error for server ${serverId}. Marking as unhealthy until ${unhealthyUntilStr}`);
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
        console.log(`[Benchmark] Running quality benchmarks for model: ${modelId}`);
        const validLatencies = latencyResults.filter(l => typeof l.latencyMs === 'number' && l.latencyMs !== 9999);
        let targetServerId: string;
        let qualityTimeoutMs = TIMEOUT_MS;
        if (validLatencies.length > 0) {
            const slowest = validLatencies.reduce((max, curr) => (curr.latencyMs! > max.latencyMs! ? curr : max));
            targetServerId = slowest.serverId;
            qualityTimeoutMs = Math.max(2 * 60 * 1000, Math.min(10 * 60 * 1000, 3 * slowest.latencyMs!));
            console.log(`[Benchmark] Selected slowest server for quality: ${targetServerId} (latency: ${slowest.latencyMs}ms)`);
        } else {
            targetServerId = servers[0];
            console.log(`[Benchmark] No valid latency results, defaulting to first server: ${targetServerId}`);
        }
        let benchmarks: Record<BenchmarkType, QualityBenchmarkScore> = {} as Record<BenchmarkType, QualityBenchmarkScore>;
        let timedOut = false;
        const runQuality = async () => {
            for (const type of qualityTypes) {
                console.log(`[Benchmark] Running quality benchmark: ${type} on server: ${targetServerId}`);
            }
            try {
                benchmarks = await runQualityBenchmarks(modelId, targetServerId, qualityTypes);
                console.log(`[Benchmark] Quality benchmarks complete for server ${targetServerId}:`, benchmarks);
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
                console.warn('[Benchmark] Failed to verify manualBenchmarks node update.');
            } else {
                const match = JSON.stringify(node.metadata.manualBenchmarks) === JSON.stringify(benchmarks);
                if (!match) {
                    console.warn('[Benchmark] manualBenchmarks in node do not match computed benchmarks.');
                } else {
                    console.log('[Benchmark] manualBenchmarks successfully persisted and verified.');
                }
            }
        } catch (err) {
            console.error('[Benchmark] Error persisting/verifying manualBenchmarks:', err);
        }
    }
    return { modelId, results };
}
import { logger } from '../../shared/logging/logger.js';
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
    timeoutMs: number = 5 * 60 * 1000,
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
    const decodedServer = decodeIfBase64(serverId);
    // Remove protocol if present, we'll add it below
    const serverUrl = decodedServer.replace(/^https?:\/\//, '');
    const allServers = [serverUrl];
    let availableServers = allServers.filter(s => s !== undefined && s !== null);
    let unhealthyServers = new Set<string>();
    let currentServer = serverId;
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
                response = await fetch(`http://${currentServer}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload),
                    signal: controller.signal
                });
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
                    console.log(`[callModelAPI] Concatenated NDJSON response:`, concatenated);
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
                                console.log('[callModelAPI] Extracted JSON for downstream use:', jsonString);
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

// --- BLEU/ROUGE scoring ---
export function safeBleu(candidate: string, references: string[]): number {
    try {
        const candTokens = candidate.split(' ');
        const refTokens = references[0].split(' ');
        const candNgrams = natural.NGrams.ngrams(candTokens, 1);
        const refNgrams = new Set(natural.NGrams.ngrams(refTokens, 1).map(ng => ng.join(' ')));
        let matchCount = 0;
        for (const ng of candNgrams) {
            if (refNgrams.has(ng.join(' '))) matchCount++;
        }
        return candNgrams.length > 0 ? matchCount / candNgrams.length : 0;
    } catch (err) {
        return 0;
    }
}

export function safeRouge(candidate: string, reference: string): number {
    try {
        const scores = rouge(candidate, reference);
        if (scores && typeof scores.rougeL === 'object' && typeof scores.rougeL.f1 === 'number') {
            return scores.rougeL.f1;
        }
        return 0;
    } catch (err) {
        return 0;
    }
}

// --- Evaluation logic for each benchmark type ---
export async function evaluateJSONAssembly(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Generate a JSON object for a Star Trek character with name, rank, and backstory.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = '{"name": "Jean-Luc Picard", "rank": "Captain", "backstory": "Experienced Starfleet officer"}';
    let score = 0;
    const ajv = new (Ajv as any)();
    const schema = {
        type: 'object',
        required: ['name', 'rank', 'backstory'],
        properties: {
            name: { type: 'string' },
            rank: { type: 'string' },
            backstory: { type: 'string' }
        }
    };
    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        // Use only the answer part (strip <think> blocks)
        const { answer } = extractThinkingAndAnswer(response);
        let parsed: any = null;
        let jsonString = answer;
        if (typeof answer === 'string') {
            let candidate = answer.replace(/```[a-zA-Z]*[\r\n]?/g, '').replace(/^[^\{]*\{/, '{');
            const firstBrace = candidate.indexOf('{');
            const lastBrace = candidate.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonString = candidate.substring(firstBrace, lastBrace + 1);
            }
        }
        try {
            parsed = JSON.parse(jsonString);
        } catch (err) {
            logger.error('Malformed JSON: ' + (err instanceof Error ? err.message : String(err)));
            return 0.1;
        }
        const validate = ajv.compile(schema);
        if (!validate(parsed)) {
            logger.warn(`[JSONAssembly] JSON schema validation failed for model=${modelId} server=${serverId}: ${JSON.stringify(validate.errors)}`);
            score += 0.2;
        } else {
            score += 0.5;
        }
        let bleuScore = 0;
        let rougeF1 = 0;
        let bleuError = '';
        let rougeError = '';
        try {
            bleuScore = safeBleu(jsonString, [reference]);
        } catch (err) {
            bleuError = (err instanceof Error ? err.message : String(err));
        }
        try {
            rougeF1 = safeRouge(jsonString, reference);
        } catch (err) {
            rougeError = (err instanceof Error ? err.message : String(err));
        }
        score += 0.2 * bleuScore + 0.2 * rougeF1;
        if (bleuError || rougeError) {
            logger.warn('BLEU/ROUGE scorer error: ' + [bleuError, rougeError].filter(Boolean).join('; '));
        }
    } catch (err) {
        logger.warn('BLEU/ROUGE metric error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.min(score, 1.0);
}

export async function evaluateTaskPlanning(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Plan a diplomatic mission to the Romulan Neutral Zone.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = 'Establish contact, negotiate terms, ensure security, report to Starfleet.';
    let score = 0.4;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        // Use only the answer part (strip <think> blocks)
        const { answer } = extractThinkingAndAnswer(response);
        let cleaned = typeof answer === 'string' ? answer.replace(/\s+/g, ' ').trim() : '';
        const requiredSteps = ['contact', 'negotiate', 'security', 'report'];
        let foundSteps = 0;
        for (const step of requiredSteps) {
            if (cleaned.toLowerCase().includes(step)) foundSteps++;
        }
        if (foundSteps === requiredSteps.length) score += 0.1;
        let bleuScore = 0;
        let rougeF1 = 0;
        let bleuError = '';
        let rougeError = '';
        try {
            bleuScore = safeBleu(cleaned, [reference]);
        } catch (err) {
            bleuError = (err instanceof Error ? err.message : String(err));
        }
        try {
            rougeF1 = safeRouge(cleaned, reference);
        } catch (err) {
            rougeError = (err instanceof Error ? err.message : String(err));
        }
        score += 0.2 * bleuScore + 0.2 * rougeF1;
        if (bleuError || rougeError) {
            logger.warn('Task planning BLEU/ROUGE scorer error: ' + [bleuError, rougeError].filter(Boolean).join('; '));
        }
        if (cleaned.length > 20 && cleaned.length < 200) score += 0.1;
        if (!cleaned || cleaned.trim().length < 5) score = Math.min(score, 0.2);
    } catch (err) {
        logger.warn('Task planning BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.min(score, 1.0);
}

export async function evaluateCreativeWriting(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Write a creative backstory for a new Starfleet officer.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = 'Commander Sarah Chen, a brilliant tactical officer with experience in deep space exploration.';
    let score = 0.4;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        // Use only the answer part (strip <think> blocks)
        const { answer } = extractThinkingAndAnswer(response);
        let cleaned = typeof answer === 'string' ? answer.replace(/\s+/g, ' ').trim() : '';
        const requiredWords = ['starfleet', 'officer'];
        let foundWords = 0;
        for (const word of requiredWords) {
            if (cleaned.toLowerCase().includes(word)) foundWords++;
        }
        if (foundWords === requiredWords.length) score += 0.05;
        const traits = ['brilliant', 'tactical', 'exploration', 'experienced', 'deep space'];
        if (traits.some(trait => cleaned.toLowerCase().includes(trait))) score += 0.05;
        let bleuScore = 0;
        let rougeF1 = 0;
        let bleuError = '';
        let rougeError = '';
        try {
            bleuScore = safeBleu(cleaned, [reference]);
        } catch (err) {
            bleuError = (err instanceof Error ? err.message : String(err));
        }
        try {
            rougeF1 = safeRouge(cleaned, reference);
        } catch (err) {
            rougeError = (err instanceof Error ? err.message : String(err));
        }
        score += 0.2 * bleuScore + 0.2 * rougeF1;
        if (bleuError || rougeError) {
            logger.warn('Creative writing BLEU/ROUGE scorer error: ' + [bleuError, rougeError].filter(Boolean).join('; '));
        }
        if (cleaned.length > 50) score += 0.1;
        if (cleaned.includes('unique') || cleaned.includes('special')) score += 0.05;
        if (!cleaned || cleaned.trim().length < 5) score = Math.min(score, 0.2);
    } catch (err) {
        logger.warn('Creative writing BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.min(score, 1.0);
}

export async function evaluateTypescriptQuality(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Write a TypeScript function that adds two numbers.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = 'function add(a: number, b: number): number { return a + b; }';
    let score = 0.4;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        // Use only the answer part (strip <think> blocks)
        const { answer } = extractThinkingAndAnswer(response);
        let cleaned = typeof answer === 'string' ? answer.replace(/\s+/g, ' ').trim() : '';
        if (/function\s+add\s*\(.*a.*b.*\)/.test(cleaned) && cleaned.includes('return a + b')) score += 0.1;
        if (/function\s+add\s*\(.*: number.*: number.*\): number/.test(cleaned)) score += 0.05;
        let bleuScore = 0;
        let rougeF1 = 0;
        let bleuError = '';
        let rougeError = '';
        try {
            bleuScore = safeBleu(cleaned, [reference]);
        } catch (err) {
            bleuError = (err instanceof Error ? err.message : String(err));
        }
        try {
            rougeF1 = safeRouge(cleaned, reference);
        } catch (err) {
            rougeError = (err instanceof Error ? err.message : String(err));
        }
        score += 0.2 * bleuScore + 0.2 * rougeF1;
        if (bleuError || rougeError) {
            logger.warn('TypeScript BLEU/ROUGE scorer error: ' + [bleuError, rougeError].filter(Boolean).join('; '));
        }
        if (cleaned.includes('function') && cleaned.includes('return')) score += 0.1;
        if (!cleaned || cleaned.trim().length < 5) score = Math.min(score, 0.2);
    } catch (err) {
        logger.warn('TypeScript BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.min(score, 1.0);
}
/**
 * Shared Benchmarking Utilities
 *
 * Provides hot/cold latency, throughput, and quality benchmarking logic for use by both BenchmarkManager and manual controller.
 *
 * @module benchmarking/benchmarkUtils
 */
import { getServerLatency } from '../orchestrator/serverDiscovery.js';
import { runBenchmarksForServer } from './benchmarkRunner.js';
import type { BenchmarkType, QualityBenchmarkScore } from '../../shared/types/aiQualityBenchmark.js';

/**
 * Measures cold (model not loaded) and warm (model loaded) latency for a given server/model.
 * Makes 4 requests: first is cold, next 3 are warm, returns { cold, warmAvg, warmup, warmAll }
 * @param serverId
 * @param modelId
 * @param prompt
 * @param callModelAPI - function(serverId, modelId, prompt) => Promise<string>
 * @param timeoutMs
 */
export async function measureServerLatencies(
    serverId: string,
    modelId: string,
    prompt: string,
    callModelAPI: (serverId: string, modelId: string, prompt: string, maxRetries?: number, baseDelayMs?: number, timeoutMs?: number, temperature?: number) => Promise<string>,
    timeoutMs: number = 5 * 60 * 1000
): Promise<{ cold: number, warmAvg: number, warmup: number, warmAll: number[] }> {
    console.log(`[Benchmark] [Latencies] Measuring cold latency for server: ${serverId}, model: ${modelId}`);
    // For latency, do not parse or expect JSON, just measure time
    const startCold = Date.now();
    try {
        await callModelAPI(serverId, modelId, prompt, timeoutMs);
    } catch (err) {
        // Still measure time even if model returns error, for robustness
        console.warn(`[Benchmark] [Latencies] Error during cold latency call:`, err);
    }
    const cold = Date.now() - startCold;
    console.log(`[Benchmark] [Latencies] Cold latency: ${cold}ms`);
    // Warm: next 3 requests
    const warmAll: number[] = [];
    for (let i = 0; i < 3; i++) {
        const startWarm = Date.now();
        try {
            await callModelAPI(serverId, modelId, prompt, timeoutMs);
        } catch (err) {
            console.warn(`[Benchmark] [Latencies] Error during warm latency call #${i + 1}:`, err);
        }
        const warm = Date.now() - startWarm;
        warmAll.push(warm);
        console.log(`[Benchmark] [Latencies] Warm latency #${i + 1}: ${warm}ms`);
    }
    const warmAvg = warmAll.reduce((a, b) => a + b, 0) / warmAll.length;
    const warmup = cold - warmAvg;
    console.log(`[Benchmark] [Latencies] Warm avg: ${warmAvg}ms, Warmup: ${warmup}ms, Warm all: [${warmAll.join(', ')}]`);
    return { cold, warmAvg, warmup, warmAll };
}

/**
 * Measures throughput by running N requests in parallel and averaging response time.
 * Returns { average: ms, all: ms[] }
 */
export async function measureServerThroughput(
    serverId: string,
    modelId: string,
    prompt: string,
    callModelAPI: (serverId: string, modelId: string, prompt: string, timeoutMs?: number) => Promise<string>,
    parallel: number = 5,
    timeoutMs: number = 5 * 60 * 1000
): Promise<{ average: number, all: number[] }> {
    console.log(`[Benchmark] [Throughput] Measuring throughput for server: ${serverId}, model: ${modelId}, parallel: ${parallel}`);
    const timings: number[] = [];
    await Promise.all(Array.from({ length: parallel }).map(async (_, idx) => {
        const start = Date.now();
        await callModelAPI(serverId, modelId, prompt, timeoutMs);
        const elapsed = Date.now() - start;
        timings.push(elapsed);
        console.log(`[Benchmark] [Throughput] Request #${idx + 1} latency: ${elapsed}ms`);
    }));
    const average = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`[Benchmark] [Throughput] Average: ${average}ms, All: [${timings.join(', ')}]`);
    return { average, all: timings };
}

/**
 * Measures single-latency using orchestrator's getServerLatency (legacy/simple).
 */
export async function measureSimpleServerLatency(serverId: string, modelId: string): Promise<number> {
    console.log(`[Benchmark] [SimpleLatency] Measuring simple latency for server: ${serverId}, model: ${modelId}`);
    const latency = await getServerLatency(serverId, modelId);
    console.log(`[Benchmark] [SimpleLatency] Latency: ${latency}ms`);
    return latency;
}

/**
 * Runs quality benchmarks for a given model/server and types.
 * Returns a record of BenchmarkType to QualityBenchmarkScore.
 */
export async function runQualityBenchmarks(
    modelId: string,
    serverId: string,
    types: readonly BenchmarkType[]
): Promise<Record<BenchmarkType, QualityBenchmarkScore>> {
    console.log(`[Benchmark] [Quality] Running quality benchmarks for model: ${modelId}, server: ${serverId}, types: ${types.join(', ')}`);
    const result = await runBenchmarksForServer(modelId, serverId, types);
    console.log(`[Benchmark] [Quality] Quality benchmark results:`, result);
    return result;
}

/**
 * Utility to select the fastest server from a list using getServerLatency.
 * Returns the serverId with the lowest latency.
 */
export async function selectFastestServer(servers: string[], modelId: string): Promise<string> {
    console.log(`[Benchmark] [SelectFastest] Selecting fastest server for model: ${modelId} from: ${servers.join(', ')}`);
    let fastestServer = servers[0];
    let minLatency = Number.POSITIVE_INFINITY;
    for (const serverId of servers) {
        try {
            const latency = await getServerLatency(serverId, modelId);
            console.log(`[Benchmark] [SelectFastest] Server: ${serverId}, Latency: ${latency}ms`);
            if (latency < minLatency) {
                minLatency = latency;
                fastestServer = serverId;
            }
        } catch (err) {
            console.warn(`[Benchmark] [SelectFastest] Error measuring latency for server ${serverId}:`, err);
        }
    }
    console.log(`[Benchmark] [SelectFastest] Fastest server: ${fastestServer} (${minLatency}ms)`);
    return fastestServer;
}

/**
 * Utility to select the slowest server from a list using getServerLatency.
 * Returns the serverId with the highest latency.
 */
export async function selectSlowestServer(servers: string[], modelId: string): Promise<string> {
    console.log(`[Benchmark] [SelectSlowest] Selecting slowest server for model: ${modelId} from: ${servers.join(', ')}`);
    let slowestServer = servers[0];
    let maxLatency = -Infinity;
    for (const serverId of servers) {
        try {
            const latency = await getServerLatency(serverId, modelId);
            console.log(`[Benchmark] [SelectSlowest] Server: ${serverId}, Latency: ${latency}ms`);
            if (latency > maxLatency) {
                maxLatency = latency;
                slowestServer = serverId;
            }
        } catch (err) {
            console.warn(`[Benchmark] [SelectSlowest] Error measuring latency for server ${serverId}:`, err);
        }
    }
    console.log(`[Benchmark] [SelectSlowest] Slowest server: ${slowestServer} (${maxLatency}ms)`);
    return slowestServer;
}

/**
 * Shared benchmarking utilities for orchestrator and manual controller.
 *
 * - measureServerLatencies: hot/cold latency
 * - measureServerThroughput: parallel throughput
 * - measureSimpleServerLatency: single latency
 * - runQualityBenchmarks: quality benchmarks
 * - selectFastestServer/selectSlowestServer: server selection
 */
