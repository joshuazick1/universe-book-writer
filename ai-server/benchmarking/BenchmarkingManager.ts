// ai-server/benchmarking/BenchmarkingManager.ts
/**
 * BenchmarkingManager
 * Exposes benchmarking quality reports for orchestrator/model selection integration.
 *
 * @module BenchmarkingManager
 */

import { ModelQualityReport, ModelId } from '../types/models.js';

/**
 * Interface for the benchmarking manager.
 */
export interface IBenchmarkingManager {
    /**
     * Returns the latest quality report for all models.
     * @returns {Promise<ModelQualityReport[]>}
     */
    getQualityReport(): Promise<ModelQualityReport[]>;
}

/**
 * Example implementation of BenchmarkingManager.
 * In production, this would fetch from a database or benchmarking service.
 */
export class BenchmarkingManager implements IBenchmarkingManager {
    /**
     * Returns a mock quality report for demonstration.
     * Replace with real data source in production.
     */
    async getQualityReport(): Promise<ModelQualityReport[]> {
        // TODO: Replace with real benchmarking data source
        return [
            {
                modelId: 'ollama-mistral' as ModelId,
                accuracy: 0.92,
                latency: 120,
                throughput: 30,
                lastBenchmarked: new Date().toISOString(),
            },
            {
                modelId: 'ollama-llama3' as ModelId,
                accuracy: 0.89,
                latency: 140,
                throughput: 25,
                lastBenchmarked: new Date().toISOString(),
            },
        ];
    }
}

export default new BenchmarkingManager();
