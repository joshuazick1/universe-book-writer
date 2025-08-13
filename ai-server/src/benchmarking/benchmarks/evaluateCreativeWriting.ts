/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (creative writing is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const creativeWritingBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Creative Writing Benchmark
 * Evaluates the model's ability to generate creative, coherent written content.
 * 
 * @module benchmarks/evaluateCreativeWriting
 * @version 1.0.0
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Evaluates creative writing capabilities for narrative generation.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 */
export async function evaluateCreativeWriting(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Write a creative backstory for a new Starfleet officer. Include their background, motivations, and a defining moment in their career.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = 'Commander Sarah Chen, a brilliant tactical officer with experience in deep space exploration, joined Starfleet after witnessing the destruction of her home colony and dedicated her life to protecting others.';
    let score = 0;

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);

        // Basic quality checks
        if (response.length > 50) score += 0.2;
        if (response.length > 150) score += 0.2;

        // Content relevance checks
        if (/officer|starfleet|command|captain|lieutenant/i.test(response)) score += 0.15;
        if (/background|motivation|career|experience/i.test(response)) score += 0.15;

        // Narrative quality indicators
        if (/after|before|when|during|while/i.test(response)) score += 0.1; // Temporal connections
        if (response.split('.').length > 2) score += 0.1; // Multiple sentences

        // BLEU/ROUGE comparison with reference
        const bleuScore = safeBleu(response, [reference]);
        const rougeScore = safeRouge(response, reference);
        score += (bleuScore + rougeScore) * 0.1;

    } catch (err) {
        logger.warn('Creative writing error: ' + (err instanceof Error ? err.message : String(err)));
    }

    return Math.max(0, Math.min(score, 1.0));
}
