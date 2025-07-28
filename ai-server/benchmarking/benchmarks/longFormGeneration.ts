/**
 * Long-Form Generation Benchmark
 * Evaluates the model's ability to generate multi-paragraph or chapter-length content.
 * Enhanced: Checks for narrative arc, dialogue, and Star Trek elements.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from '../../../shared/logging/logger.js';
export async function evaluateLongFormGeneration(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = [
        'Write the first chapter of a Star Trek novel introducing a new crew. Use vivid descriptions, dialogue, and a clear narrative arc.'
    ].join(' ');
    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.15;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') response = response.trim();
        // Rubric: length, structure, dialogue, narrative, and Star Trek elements
        if (response.length > 1000) score += 0.15;
        if (/chapter|uss|captain|crew|starfleet/i.test(response)) score += 0.12;
        if (response.split('\n').length > 15) score += 0.08;
        if (/'|"|:/.test(response) && /\bsaid\b|\basked\b|\breplied\b/i.test(response)) score += 0.08; // dialogue
        if (/mission|explore|unknown|galaxy|alien/i.test(response)) score += 0.08;
        // Bonus for narrative arc (beginning, middle, end)
        if (/introduction|conflict|resolution|climax|ending/i.test(response)) score += 0.08;
        // Penalize if too short or not a story
        if (!/chapter|captain|crew|starfleet/i.test(response) || response.length < 200) score = Math.min(score, 0.08);
    } catch (err) {
        logger.warn('Long-form generation error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
