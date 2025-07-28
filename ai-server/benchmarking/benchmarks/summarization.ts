/**
 * Summarization Benchmark
 * Enhanced: Checks for coverage, conciseness, structure, and summary quality.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from '../../../shared/logging/logger.js';
export async function evaluateSummarization(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = [
        'Summarize the following chapter in 3 sentences. Focus on the main events, key discoveries, and outcome.',
        'Chapter: The crew of the Enterprise discovers a mysterious signal emanating from a nearby nebula. They investigate and encounter a lost alien vessel, leading to a tense first contact.'
    ].join(' ');
    const usedPrompt = prompt ?? defaultPrompt;
    const keyPhrases = [
        'mysterious signal',
        'nebula',
        'alien vessel',
        'first contact',
        'enterprise',
        'crew',
        'investigate',
        'tense',
        'discovery'
    ];
    let score = 0.08;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') {
            response = response.trim();
        }
        // Rubric: coverage, conciseness, structure, and summary quality
        let found = 0;
        for (const phrase of keyPhrases) {
            if (response.toLowerCase().includes(phrase)) found++;
        }
        score += 0.06 * found;
        // Check for sentence count (should be 3)
        const sentenceCount = (response.match(/[.!?]/g) || []).length;
        if (sentenceCount === 3) score += 0.15;
        // Brevity bonus
        if (response.length < 250) score += 0.08;
        // Bonus for clear outcome or resolution
        if (/first contact|resolved|peace|agreement|outcome|result/i.test(response)) score += 0.08;
        // Penalize if too short or missing key points
        if (!response || response.length < 30 || found < 2) score = Math.min(score, 0.03);
    } catch (err) {
        logger.warn('Summarization error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
