// ai-server/orchestrator/ModelSelector.ts
// Orchestrator logic for selecting the best model for a given task
// This is a stub implementation. Replace with real logic as needed.

import BenchmarkingManager from '../benchmarking/BenchmarkingManager.js';

export interface ModelSelectionParams {
    task: string;
    universeId?: string;
    userId?: string;
    preferredVendors?: string[];
    minQualityScore?: number;
    maxLatencyMs?: number;
    // Add more fields as needed
}

/**
 * Selects the best model for a given task using benchmarking data.
 * @param params Model selection parameters (task, universeId, userId, ...)
 * @returns The model name/id to use
 */




/**
 * Selects the best model for a given task using benchmarking data and advanced criteria.
 * @param params Model selection parameters (task, universeId, userId, ...)
 * @returns The model name/id to use
 */
export async function selectBestModel(params: ModelSelectionParams): Promise<string> {
    // For demonstration, use the quality report and pick the highest accuracy
    const report = await BenchmarkingManager.getQualityReport();
    if (!Array.isArray(report) || report.length === 0) return 'default-model';
    // Sort by accuracy DESC, then latency ASC
    const sorted = [...report].sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        if (a.latency !== b.latency) return a.latency - b.latency;
        return 0;
    });
    return sorted[0].modelId;
}
