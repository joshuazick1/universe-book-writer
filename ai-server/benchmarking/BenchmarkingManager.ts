// ai-server/benchmarking/BenchmarkingManager.ts
/**
 * BenchmarkingManager
 * Exposes benchmarking quality reports for orchestrator/model selection integration.
 *
 * @module BenchmarkingManager
 */

import { ModelQualityBenchmarks, BenchmarkType, QualityBenchmarkScore } from '../../shared/types/aiQualityBenchmark.js';
import { scheduleNextQualityBenchmark, NextBenchmarkSchedule } from './scheduleNextQualityBenchmark.js';
import { ensureNode, getNode } from '../../shared/node/nodeService.js';
import {
    measureServerLatencies,
    measureServerThroughput,
    measureSimpleServerLatency,
    runQualityBenchmarks,
    selectSlowestServer,
    callModelAPI,
    safeBleu,
    safeRouge,
    evaluateJSONAssembly,
    evaluateTaskPlanning,
    evaluateCreativeWriting,
    evaluateTypescriptQuality
} from './benchmarkUtils.js';

const MANUAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const AUTO_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface IBenchmarkingManager {
    getAllModelBenchmarks(): Promise<readonly ModelQualityBenchmarks[]>;
    runBenchmarksForModel(modelId: string, types: readonly BenchmarkType[]): Promise<ModelQualityBenchmarks>;
}

import { logger } from '../../shared/logging/logger.js';
import Ajv from 'ajv';

import { getModelBenchmarks, saveModelBenchmarks } from './db/modelBenchmarksDb.js';

async function fetchModelBenchmarksFromDB(): Promise<ModelQualityBenchmarks[]> {
    return getModelBenchmarks();
}

async function saveModelBenchmarkToDB(benchmark: ModelQualityBenchmarks): Promise<void> {
    await saveModelBenchmarks(benchmark);
}

import { getServersForModel, getServerLatency } from '../orchestrator/serverDiscovery.js';

function decodeIfBase64(str: string): string {
    // If the string looks like base64 (letters, numbers, +, /, =, and not a valid URL), decode it
    if (/^[A-Za-z0-9+/=]+$/.test(str) && !/^https?:\/\//.test(str)) {
        try {
            const decoded = Buffer.from(str, 'base64').toString('utf-8');
            if (/^https?:\/\//.test(decoded)) return decoded;
        } catch { }
    }
    return str;
}

async function discoverServersForModel(modelId: string): Promise<string[]> {
    const servers = await getServersForModel(modelId);
    return servers.map(decodeIfBase64);
}

async function measureServerLatency(serverId: string, modelId: string): Promise<number> {
    return getServerLatency(decodeIfBase64(serverId), modelId);
}


export class BenchmarkingManager implements IBenchmarkingManager {
    async measureServerLatencies(serverId: string, modelId: string, prompt: string, timeoutMs: number = MANUAL_TIMEOUT_MS): Promise<{ cold: number, warmAvg: number, warmup: number, warmAll: number[] }> {
        const decodedServerId = decodeIfBase64(serverId);
        return measureServerLatencies(
            decodedServerId,
            modelId,
            prompt,
            (sid, mid, p, t) => callModelAPI(decodeIfBase64(sid), mid, p, 3, 500, t),
            timeoutMs
        );
    }

    async measureServerThroughput(serverId: string, modelId: string, prompt: string, parallel: number = 5, timeoutMs: number = MANUAL_TIMEOUT_MS): Promise<{ average: number, all: number[] }> {
        const decodedServerId = decodeIfBase64(serverId);
        return measureServerThroughput(
            decodedServerId,
            modelId,
            prompt,
            (sid, mid, p, t) => callModelAPI(decodeIfBase64(sid), mid, p, 3, 500, t),
            parallel,
            timeoutMs
        );
    }

    async getAllModelBenchmarks(): Promise<readonly ModelQualityBenchmarks[]> {
        console.log('[BenchmarkingManager] Fetching all model benchmarks...');
        const results = await fetchModelBenchmarksFromDB();
        console.log(`[BenchmarkingManager] Fetched ${results.length} model benchmarks.`);
        return results;
    }

    async runBenchmarksForModel(modelId: string, types: readonly BenchmarkType[], opts?: { auto?: boolean }): Promise<ModelQualityBenchmarks> {
        console.log(`[BenchmarkingManager] Running benchmarks for model: ${modelId} (types: ${types.join(', ')})`);
        const servers = await discoverServersForModel(modelId);
        console.log(`[BenchmarkingManager] Discovered servers: ${servers.join(', ')}`);
        const serverLatencies: Record<string, number> = {};
        const serverLatencyDetails: Record<string, import('../../shared/types/aiQualityBenchmark.js').LatencyMetrics> = {};
        const serverThroughput: Record<string, import('../../shared/types/aiQualityBenchmark.js').ThroughputMetrics> = {};
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
        const benchmarks = await runQualityBenchmarks(modelId, slowestServer, types);

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
}

const benchmarkingManager = new BenchmarkingManager();
export default benchmarkingManager;