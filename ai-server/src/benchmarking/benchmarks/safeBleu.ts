/**
 * Safe BLEU Score Calculation
 * Provides robust BLEU score calculation with error handling.
 * 
 * @module benchmarks/safeBleu
 * @version 1.0.0
 */

import { logger } from 'shared/logging/logger.js';

/**
 * Calculates BLEU score safely with error handling.
 * 
 * @param candidate - The candidate text to evaluate
 * @param references - Array of reference texts to compare against
 * @returns BLEU score between 0 and 1, or 0 if calculation fails
 */
export function safeBleu(candidate: string, references: string[]): number {
    try {
        if (!candidate || !references || references.length === 0) {
            return 0;
        }

        // Simple BLEU-like calculation (simplified version)
        // In a real implementation, you would use a proper BLEU library
        const candidateWords = candidate.toLowerCase().split(/\s+/);
        const referenceWords = references[0].toLowerCase().split(/\s+/);

        if (candidateWords.length === 0 || referenceWords.length === 0) {
            return 0;
        }

        // Calculate precision for 1-grams (simplified)
        let matches = 0;
        for (const word of candidateWords) {
            if (referenceWords.includes(word)) {
                matches++;
            }
        }

        const precision = matches / candidateWords.length;

        // Apply brevity penalty (simplified)
        const brevityPenalty = candidateWords.length < referenceWords.length
            ? Math.exp(1 - referenceWords.length / candidateWords.length)
            : 1.0;

        const bleuScore = precision * brevityPenalty;

        logger.debug(`BLEU calculation: precision=${precision}, brevity=${brevityPenalty}, score=${bleuScore}`);

        return Math.max(0, Math.min(1, bleuScore));

    } catch (err) {
        logger.warn('Error calculating BLEU score: ' + (err instanceof Error ? err.message : String(err)));
        return 0;
    }
}
