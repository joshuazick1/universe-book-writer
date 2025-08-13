/**
 * Safe ROUGE Score Calculation
 * Provides robust ROUGE score calculation with error handling.
 * 
 * @module benchmarks/safeRouge
 * @version 1.0.0
 */

import { logger } from 'shared/logging/logger.js';

/**
 * Calculates ROUGE score safely with error handling.
 * 
 * @param candidate - The candidate text to evaluate
 * @param reference - The reference text to compare against
 * @returns ROUGE score between 0 and 1, or 0 if calculation fails
 */
export function safeRouge(candidate: string, reference: string): number {
    try {
        if (!candidate || !reference) {
            return 0;
        }

        // Simple ROUGE-L-like calculation (simplified version)
        // In a real implementation, you would use a proper ROUGE library
        const candidateWords = candidate.toLowerCase().split(/\s+/);
        const referenceWords = reference.toLowerCase().split(/\s+/);

        if (candidateWords.length === 0 || referenceWords.length === 0) {
            return 0;
        }

        // Find longest common subsequence length (simplified)
        let lcs = 0;
        for (const word of candidateWords) {
            if (referenceWords.includes(word)) {
                lcs++;
            }
        }

        // Calculate recall and precision
        const recall = lcs / referenceWords.length;
        const precision = lcs / candidateWords.length;

        // Calculate F1-score (ROUGE-L)
        const f1 = precision + recall > 0
            ? (2 * precision * recall) / (precision + recall)
            : 0;

        logger.debug(`ROUGE calculation: recall=${recall}, precision=${precision}, f1=${f1}`);

        return Math.max(0, Math.min(1, f1));

    } catch (err) {
        logger.warn('Error calculating ROUGE score: ' + (err instanceof Error ? err.message : String(err)));
        return 0;
    }
}
