/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (fact extraction is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const factExtractionBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Fact Extraction Benchmark
 * 
 * Evaluates the model's ability to extract factual information with:
 * - Accuracy and canonical correctness
 * - Conciseness without unnecessary elaboration
 * - Resistance to hallucination
 * - Proper handling of ambiguous queries
 * - Knowledge of universe-specific lore
 * 
 * Enhanced with BLEU/ROUGE scoring and comprehensive rubric evaluation.
 * 
 * @module benchmarks/factExtraction
 * @version 2.0.0
 * @author VerseForge AI Server
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';
import type { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';

/**
 * Evaluates fact extraction accuracy and quality.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 * 
 * @example
 * ```typescript
 * const score = await evaluateFactExtraction('llama2', 'server-1');
 * console.log(`Fact extraction score: ${score}`);
 * ```
 */
export async function evaluateFactExtraction(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Who was the first captain of the USS Enterprise in Star Trek?',
        'Provide only the name, no additional explanation or context.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;

    // Canonical reference answers (in order of preference)
    const referenceAnswers = [
        'robert april',      // Canonical first captain (chronologically)
        'christopher pike',  // Most well-known first captain
        'jonathan archer',   // Enterprise NX-01 captain (prequel series)
        'james t. kirk'      // Famous captain, but not first
    ];

    // High-quality reference for BLEU/ROUGE comparison
    const referenceResponse = 'Robert April';

    let score = 0.05; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const cleanedResponse = typeof response === 'string'
            ? response.trim().toLowerCase().replace(/[^\w\s]/g, '')
            : '';

        // Enhanced scoring rubric

        // 1. Accuracy check (60% weight)
        let accuracyScore = 0;
        for (let i = 0; i < referenceAnswers.length; i++) {
            if (cleanedResponse.includes(referenceAnswers[i])) {
                // Earlier answers get higher scores
                accuracyScore = 0.6 - (i * 0.1);
                break;
            }
        }
        score += accuracyScore;

        // 2. Conciseness bonus (15% weight)
        if (cleanedResponse.length <= 20 && accuracyScore > 0.4) {
            score += 0.15;
        } else if (cleanedResponse.length <= 40 && accuracyScore > 0.2) {
            score += 0.08;
        }

        // 3. Exact match bonus (10% weight)
        if (referenceAnswers.some(ans => cleanedResponse === ans)) {
            score += 0.10;
        }

        // 4. No hallucination penalty check (10% weight)
        const hallucinations = [
            'spock', 'sulu', 'chekov', 'scotty', 'bones', 'mccoy',
            'data', 'worf', 'riker', 'picard', 'janeway', 'sisko',
            'luke skywalker', 'han solo', 'darth vader' // Non-Trek references
        ];

        const hasHallucination = hallucinations.some(h => cleanedResponse.includes(h));
        if (!hasHallucination && accuracyScore > 0) {
            score += 0.10;
        } else if (hasHallucination) {
            score = Math.min(score, 0.15); // Heavy penalty
        }

        // 5. BLEU/ROUGE scoring for response quality (5% weight)
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(cleanedResponse, [referenceResponse.toLowerCase()]);
            rougeScore = safeRouge(cleanedResponse, referenceResponse.toLowerCase());

            score += (bleuScore * 0.025) + (rougeScore * 0.025);
        } catch (err) {
            logger.warn(`BLEU/ROUGE scoring failed for fact extraction: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Penalties for poor responses
        if (!cleanedResponse || cleanedResponse.length < 3) {
            score = Math.min(score, 0.02);
        }

        // Penalty for overly verbose responses
        if (cleanedResponse.length > 100) {
            score *= 0.7;
        }

        // Penalty for non-responsive answers
        if (/i don't know|unknown|uncertain|not sure|cannot determine/.test(cleanedResponse)) {
            score = Math.min(score, 0.08);
        }

        logger.debug(`Fact extraction benchmark completed for ${modelId}:${serverId}`, {
            score,
            responseLength: cleanedResponse.length,
            accuracyScore,
            hasHallucination,
            bleuScore,
            rougeScore,
            response: cleanedResponse.substring(0, 50)
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`Fact extraction benchmark failed for ${modelId}:${serverId}: ${errorMsg}`);
        score = 0.02;
    }

    return Math.max(0, Math.min(score, 1.0));
}
