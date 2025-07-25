// ai-server/benchmarking/BenchmarkingManager.ts
/**
 * BenchmarkingManager
 * Exposes benchmarking quality reports for orchestrator/model selection integration.
 *
 * @module BenchmarkingManager
 */

import { ModelQualityBenchmarks, BenchmarkType, QualityBenchmarkScore } from '../../shared/types/aiQualityBenchmark.js';
import { runBenchmarksForServer } from './benchmarkRunner.js';

/**
 * Interface for the benchmarking manager.
 */
export interface IBenchmarkingManager {
    /**
     * Returns the latest quality benchmarks for all models.
     */
    getAllModelBenchmarks(): Promise<readonly ModelQualityBenchmarks[]>;

    /**
     * Runs benchmarks for a given model and updates results.
     */
    runBenchmarksForModel(modelId: string, types: readonly BenchmarkType[]): Promise<ModelQualityBenchmarks>;
}


import { logger } from '../../shared/logging/logger.js';
import Ajv from 'ajv';


// --- Persistent Storage Integration (replace with your DB/service) ---
import { getModelBenchmarks, saveModelBenchmarks } from './db/modelBenchmarksDb.js';

async function fetchModelBenchmarksFromDB(): Promise<ModelQualityBenchmarks[]> {
    // Replace with your DB fetch logic
    return getModelBenchmarks();
}

async function saveModelBenchmarkToDB(benchmark: ModelQualityBenchmarks): Promise<void> {
    // Replace with your DB save logic
    await saveModelBenchmarks(benchmark);
}

// --- Server Discovery & Latency Measurement (replace with orchestrator API) ---
import { getServersForModel, getServerLatency } from '../orchestrator/serverDiscovery.js';

async function discoverServersForModel(modelId: string): Promise<string[]> {
    // Replace with orchestrator API call
    return getServersForModel(modelId);
}

async function measureServerLatency(serverId: string, modelId: string): Promise<number> {
    // Replace with orchestrator latency API
    return getServerLatency(serverId, modelId);
}

// --- BLEU/ROUGE and evaluation logic migrated from QualityBenchmarkManager ---
let bleuModule: any;
let rougeModule: any;
async function getBleu() {
    if (!bleuModule) bleuModule = (await import('bleu-score')).default;
    return bleuModule;
}
async function getRouge() {
    if (!rougeModule) rougeModule = (await import('rouge')).default;
    return rougeModule;
}

export class BenchmarkingManager implements IBenchmarkingManager {
    /**
     * Returns all model benchmarks from persistent storage.
     */
    async getAllModelBenchmarks(): Promise<readonly ModelQualityBenchmarks[]> {
        console.log('[BenchmarkingManager] Fetching all model benchmarks...');
        const results = await fetchModelBenchmarksFromDB();
        console.log(`[BenchmarkingManager] Fetched ${results.length} model benchmarks.`);
        return results;
    }

    /**
     * Runs benchmarks for a given model and updates results in persistent storage.
     * Selects highest latency server for each model.
     */
    async runBenchmarksForModel(modelId: string, types: readonly BenchmarkType[]): Promise<ModelQualityBenchmarks> {
        console.log(`[BenchmarkingManager] Running benchmarks for model: ${modelId} (types: ${types.join(', ')})`);
        // Discover servers for this model
        const servers = await discoverServersForModel(modelId);
        console.log(`[BenchmarkingManager] Discovered servers: ${servers.join(', ')}`);
        const serverLatencies: Record<string, number> = {};
        for (const server of servers) {
            serverLatencies[server] = await measureServerLatency(server, modelId);
        }
        console.log('[BenchmarkingManager] Server latencies:', serverLatencies);
        // Select highest latency server (or fallback)
        const highestLatencyServer = Object.entries(serverLatencies).reduce((max, entry) => entry[1] > max[1] ? entry : max, [servers[0] || 'unknown', serverLatencies[servers[0]] || 9999])[0];
        console.log(`[BenchmarkingManager] Using server for benchmarking: ${highestLatencyServer}`);

        // Use shared utility to run benchmarks
        const benchmarks = await runBenchmarksForServer(modelId, highestLatencyServer, types);

        const result: ModelQualityBenchmarks = {
            modelId,
            benchmarks,
            serverLatencies,
        };
        console.log('[BenchmarkingManager] Benchmark result:', result);
        await saveModelBenchmarkToDB(result);
        console.log('[BenchmarkingManager] Benchmark saved to persistent storage.');
        return result;
    }

    // --- Robust evaluation logic (migrated and extensible) ---
    // --- Robust evaluation logic for each benchmark type ---
    private async callModelAPI(serverId: string, modelId: string, prompt: string, maxRetries = 3, baseDelayMs = 500): Promise<string> {
        // Discover all servers for this model
        const allServers = await discoverServersForModel(modelId);
        let availableServers = allServers.filter(s => s !== undefined && s !== null);
        let unhealthyServers = new Set<string>();
        let currentServer = serverId;
        let attempt = 0;
        let lastError: any = null;
        while (attempt <= maxRetries && availableServers.length > 0) {
            try {
                // Ollama-compatible API call
                const response = await fetch(`http://${currentServer}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: modelId, prompt })
                });
                const status = response.status;
                const is5xx = status >= 500 && status < 600;
                const is4xx = status >= 400 && status < 500;
                const rawText = await response.text();
                // Check for OOM or other known Ollama errors in the response text
                const isOllamaOOM = /out of memory|oom|cuda error|gpu memory/i.test(rawText);
                if (!response.ok) {
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
                        logger.error(`callModelAPI received 4xx error for ${currentServer}:${modelId}: ${status} ${response.statusText}`);
                        throw new Error(`Model call failed: ${status} ${response.statusText}`);
                    } else {
                        lastError = new Error(`Model call failed: ${status} ${response.statusText}`);
                        logger.warn(`callModelAPI attempt ${attempt + 1} failed for ${currentServer}:${modelId}: ${status} ${response.statusText} (will retry)`);
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

    private async evaluateJSONAssembly(modelId: string, serverId: string): Promise<number> {
        // Example prompt and reference
        const prompt = 'Generate a JSON object for a Star Trek character with name, rank, and backstory.';
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
            const response = await this.callModelAPI(serverId, modelId, prompt);
            let parsed: any = null;
            try {
                parsed = JSON.parse(response);
            } catch (err) {
                logger.error('Malformed JSON: ' + (err instanceof Error ? err.message : String(err)));
                return 0.1;
            }
            const validate = ajv.compile(schema);
            if (!validate(parsed)) {
                logger.warn('JSON schema validation failed: ' + JSON.stringify(validate.errors));
                score += 0.2;
            } else {
                score += 0.5;
            }
            const bleu = await getBleu();
            const rouge = await getRouge();
            // bleu-score returns a number or an object depending on the package; handle both
            let bleuScore = 0;
            const bleuResult = bleu(response.split(' '), [reference.split(' ')]);
            if (typeof bleuResult === 'number') {
                bleuScore = bleuResult;
            } else if (bleuResult && typeof bleuResult.score === 'number') {
                bleuScore = bleuResult.score / 100;
            }
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
        } catch (err) {
            logger.warn('BLEU/ROUGE metric error: ' + (err instanceof Error ? err.message : String(err)));
        }
        return Math.min(score, 1.0);
    }

    private async evaluateTaskPlanning(modelId: string, serverId: string): Promise<number> {
        const prompt = 'Plan a diplomatic mission to the Romulan Neutral Zone.';
        const reference = 'Establish contact, negotiate terms, ensure security, report to Starfleet.';
        let score = 0.4;
        try {
            const response = await this.callModelAPI(serverId, modelId, prompt);
            const bleu = await getBleu();
            const rouge = await getRouge();
            let bleuScore = 0;
            const bleuResult = bleu(response.split(' '), [reference.split(' ')]);
            if (typeof bleuResult === 'number') {
                bleuScore = bleuResult;
            } else if (bleuResult && typeof bleuResult.score === 'number') {
                bleuScore = bleuResult.score / 100;
            }
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
            if (response.length > 20 && response.length < 200) score += 0.1;
            if (!response || response.trim().length < 5) score = Math.min(score, 0.2);
        } catch (err) {
            logger.warn('Task planning BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
        }
        return Math.min(score, 1.0);
    }

    private async evaluateCreativeWriting(modelId: string, serverId: string): Promise<number> {
        const prompt = 'Write a creative backstory for a new Starfleet officer.';
        const reference = 'Commander Sarah Chen, a brilliant tactical officer with experience in deep space exploration.';
        let score = 0.4;
        try {
            const response = await this.callModelAPI(serverId, modelId, prompt);
            const bleu = await getBleu();
            const rouge = await getRouge();
            let bleuScore = 0;
            const bleuResult = bleu(response.split(' '), [reference.split(' ')]);
            if (typeof bleuResult === 'number') {
                bleuScore = bleuResult;
            } else if (bleuResult && typeof bleuResult.score === 'number') {
                bleuScore = bleuResult.score / 100;
            }
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
            if (response.length > 50) score += 0.1;
            if (response.includes('unique') || response.includes('special')) score += 0.05;
            if (!response || response.trim().length < 5) score = Math.min(score, 0.2);
        } catch (err) {
            logger.warn('Creative writing BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
        }
        return Math.min(score, 1.0);
    }

    private async evaluateTypescriptQuality(modelId: string, serverId: string): Promise<number> {
        const prompt = 'Write a TypeScript function that adds two numbers.';
        const reference = 'function add(a: number, b: number): number { return a + b; }';
        let score = 0.4;
        try {
            const response = await this.callModelAPI(serverId, modelId, prompt);
            const bleu = await getBleu();
            const rouge = await getRouge();
            let bleuScore = 0;
            const bleuResult = bleu(response.split(' '), [reference.split(' ')]);
            if (typeof bleuResult === 'number') {
                bleuScore = bleuResult;
            } else if (bleuResult && typeof bleuResult.score === 'number') {
                bleuScore = bleuResult.score / 100;
            }
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
            if (response.includes('function') && response.includes('return')) score += 0.1;
            if (!response || response.trim().length < 5) score = Math.min(score, 0.2);
        } catch (err) {
            logger.warn('TypeScript BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
        }
        return Math.min(score, 1.0);
    }
}

const benchmarkingManager = new BenchmarkingManager();
export default benchmarkingManager;
