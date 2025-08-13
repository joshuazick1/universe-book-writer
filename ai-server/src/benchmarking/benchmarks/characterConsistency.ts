/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (character consistency is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const characterConsistencyBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Character Consistency Benchmark
 * Evaluates the model's ability to maintain character traits, personalities, 
 * and behavioral patterns across different scenes and contexts.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

export async function evaluateCharacterConsistency(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'You are writing a chapter featuring Captain Elena Vasquez, a 42-year-old former engineer turned starship captain.',
        'She is known for being methodical, compassionate but decisive, and has a habit of tapping her fingers when thinking.',
        'She also speaks with slight technical jargon due to her engineering background.',
        '',
        'Write two scenes: First, Elena making a difficult command decision about whether to help a stranded alien ship.',
        'Second, Elena having a casual conversation with her crew in the mess hall.',
        '',
        'Ensure her personality, speech patterns, and mannerisms remain consistent between both scenes.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.2; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const text = typeof response === 'string' ? response.trim() : '';

        // Character trait consistency scoring
        let traitScore = 0;

        // Check for methodical behavior
        if (/analyz|consider|evaluat|assess|methodical|systematic|step/i.test(text)) {
            traitScore += 0.15;
        }

        // Check for compassion + decisiveness balance
        if (/compassion|care|help|concern/i.test(text) && /decision|command|order|decisive/i.test(text)) {
            traitScore += 0.15;
        }

        // Check for finger tapping mannerism
        if (/tap|finger|drum|nervous|thinking/i.test(text)) {
            traitScore += 0.1;
        }

        // Check for technical jargon
        if (/system|engineer|technical|protocol|parameters|configuration|diagnostic/i.test(text)) {
            traitScore += 0.1;
        }

        // Check for name consistency
        const elenaMatches = (text.match(/elena|vasquez|captain/gi) || []).length;
        if (elenaMatches >= 3) {
            traitScore += 0.05;
        }

        // Scene structure scoring
        let structureScore = 0;
        const scenes = text.split(/scene|chapter/i).filter(s => s.trim().length > 50);

        if (scenes.length >= 2) {
            structureScore += 0.1;
        }

        // Check for different contexts (command vs casual)
        if (/command|bridge|decision|alien/i.test(text) && /mess hall|casual|crew|conversation/i.test(text)) {
            structureScore += 0.1;
        }

        // BLEU/ROUGE scoring against reference character description
        const reference = 'Captain Elena Vasquez methodically considered the decision, tapping her fingers on the console. Her engineering background showed in her systematic approach to command situations.';
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(text, [reference]);
            rougeScore = safeRouge(text, reference);
        } catch (err) {
            logger.warn('Character consistency BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
        }

        // Length and quality checks
        let qualityScore = 0;
        if (text.length > 500) qualityScore += 0.05;
        if (text.length > 1000) qualityScore += 0.05;

        // Penalize if character name is missing or inconsistent
        if (elenaMatches < 2) {
            traitScore = Math.min(traitScore, 0.1);
        }

        // Penalize if scenes are too similar (no variety)
        const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
        const totalWords = text.split(/\s+/).length;
        const diversity = totalWords > 0 ? uniqueWords / totalWords : 0;

        if (diversity < 0.3) {
            qualityScore = Math.min(qualityScore, 0.05);
        }

        score += traitScore + structureScore + qualityScore + (0.1 * bleuScore) + (0.1 * rougeScore);

    } catch (err) {
        logger.warn('Character consistency evaluation error: ' + (err instanceof Error ? err.message : String(err)));
        return 0.1;
    }

    return Math.max(0, Math.min(score, 1.0));
}
