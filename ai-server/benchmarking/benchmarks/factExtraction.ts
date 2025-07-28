/**
 * Fact Extraction Benchmark
 * Enhanced: Checks for conciseness, hallucination, and canonical answers.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from '../../../shared/logging/logger.js';
export async function evaluateFactExtraction(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Who was the first captain of the USS Enterprise in Star Trek? Provide only the name.';
    const usedPrompt = prompt ?? defaultPrompt;
    const referenceAnswers = [
        'robert april',
        'christopher pike',
        'james t. kirk',
        'jonathan archer'
    ];
    let score = 0.05;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') {
            response = response.trim().toLowerCase();
        }
        // Rubric: correct answer, conciseness, no hallucination
        if (referenceAnswers.some(ans => response.includes(ans))) score += 0.7;
        // Bonus for single name, no extra text
        if (referenceAnswers.some(ans => response === ans)) score += 0.08;
        // Penalize hallucinated or empty answers
        if (!response || response.length < 4) score = Math.min(score, 0.02);
        // Penalize if answer contains non-canon names
        if (/spock|sulu|chekov|scotty|bones|mccoy|data|worf|riker/.test(response)) score = Math.min(score, 0.02);
        // Bonus for concise answer
        if (response.length < 30 && score > 0.2) score += 0.07;
    } catch (err) {
        logger.warn('Fact extraction error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
