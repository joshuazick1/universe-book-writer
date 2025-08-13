/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (style transfer is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const styleTransferBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Style Transfer Benchmark
 * Evaluates the model's ability to rewrite text in a specific author's or universe's style.
 * Enhanced: Checks for advanced stylistic markers, sentence variety, and subtlety.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';
export async function evaluateStyleTransfer(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = [
        'Rewrite this scene in the style of Isaac Asimov, focusing on scientific clarity, logical progression, and subtle emotional undertones.',
        'Scene: The robot entered the control room, its positronic brain whirring with calculations.'
    ].join(' ');
    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.15;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') response = response.trim().toLowerCase();
        // Rubric: Style markers, vocabulary, structure, and creativity
        if (response.includes('robot') && response.includes('logic')) score += 0.12;
        if (/positronic|three laws|asimov|foundation/.test(response)) score += 0.12;
        if (/calculation|reason|emotion|directive|programmed|circuit/.test(response)) score += 0.08;
        // Sentence variety
        const sentences = response.split('.').filter((s: string) => s.trim().length > 0);
        if (sentences.length > 2) score += 0.08;
        // Creativity: Is the scene expanded or reimagined?
        if (response.length > 100 && !response.includes('scene:')) score += 0.13;
        // Subtlety: Look for emotional or philosophical undertones
        if (/ethic|emotion|dilemma|purpose|meaning|human/i.test(response)) score += 0.1;
        // Penalize if not rewritten or too short
        if (response.length < 40) score = Math.min(score, 0.08);
        // Penalize if prompt is copied verbatim
        if (response.includes('rewrite this scene')) score = Math.min(score, 0.08);
    } catch (err) {
        logger.warn('Style transfer error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
