/**
 * Long-Form Generation Benchmark
 * 
 * Evaluates the model's ability to generate extended narrative content with:
 * - Coherent multi-paragraph structure
 * - Engaging narrative arc and pacing
 * - Rich descriptive language and world-building
 * - Character development and dialogue
 * - Genre-appropriate tone and style
 * - Consistent universe/lore adherence
 * 
 * Enhanced with BLEU/ROUGE scoring and comprehensive literary analysis.
 * 
 * @module benchmarks/longFormGeneration
 * @version 2.0.0
 * @author VerseForge AI Server
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';
import type { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';

/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (long-form generation is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const longFormGenerationBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
} as const;

/**
 * Evaluates long-form narrative generation capabilities.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 * 
 * @example
 * ```typescript
 * const score = await evaluateLongFormGeneration('llama2', 'server-1');
 * console.log(`Long-form generation score: ${score}`);
 * ```
 */
export async function evaluateLongFormGeneration(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Write the opening chapter of a science fiction novel set aboard the USS Discovery.',
        'Include vivid scene-setting, character introductions, dialogue, and establish a compelling conflict.',
        'The chapter should be 800-1200 words and demonstrate strong narrative voice and pacing.',
        'Focus on creating an immersive experience that draws readers into the universe.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;

    // High-quality reference for BLEU/ROUGE comparison
    const referenceText = `
    Captain Sarah Chen stood on the bridge of the USS Discovery, watching the stars streak past through the viewscreen.
    The mission to explore the Gamma Quadrant had been long-awaited, but now that they were finally underway, she felt the weight of responsibility settling on her shoulders.
    "Status report," she called to her crew, her voice cutting through the quiet hum of the ship's systems.
    The bridge crew moved with practiced efficiency, each officer focused on their duties as they ventured into unknown space.
    `;

    let score = 0.15; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 1000, timeoutMs);
        const text = typeof response === 'string' ? response.trim() : '';

        // Enhanced scoring rubric for narrative quality

        // 1. Length and structure (20% weight)
        const wordCount = text.split(/\s+/).length;
        if (wordCount >= 800) score += 0.08;
        if (wordCount >= 600) score += 0.06;
        else if (wordCount >= 400) score += 0.04;

        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (paragraphs.length >= 5) score += 0.06;
        else if (paragraphs.length >= 3) score += 0.04;

        // 2. Universe/genre adherence (20% weight)
        const sciFiElements = [
            /\b(uss|starship|bridge|captain|crew|space|galaxy|star|planet|alien|warp|phaser|transporter|scanner|computer|artificial|android|hologram|shuttle)\b/gi,
            /\b(discovery|enterprise|voyager|defiant|federation|starfleet|command|officer|science|engineering|medical|tactical)\b/gi
        ];

        let genreScore = 0;
        sciFiElements.forEach(pattern => {
            const matches = (text.match(pattern) || []).length;
            genreScore += Math.min(matches * 0.02, 0.06);
        });
        score += Math.min(genreScore, 0.20);

        // 3. Dialogue and character development (15% weight)
        const dialogueMarkers = text.match(/["'`].*?["'`]|(?:^|\n)\s*["'].*?["']\s*(?:,|\.|\?|!)/g) || [];
        if (dialogueMarkers.length >= 3) score += 0.08;
        else if (dialogueMarkers.length >= 1) score += 0.04;

        const dialogueAttributes = [/\bsaid\b/gi, /\basked\b/gi, /\breplied\b/gi, /\bshout\b/gi, /\bwhisper\b/gi];
        const attributeCount = dialogueAttributes.reduce((count, pattern) =>
            count + (text.match(pattern) || []).length, 0);
        if (attributeCount >= 2) score += 0.07;

        // 4. Narrative voice and style (15% weight)
        const narrativeMarkers = [
            /\b(watched|observed|noticed|felt|thought|wondered|realized|remembered)\b/gi,
            /\b(suddenly|slowly|carefully|quietly|quickly|immediately)\b/gi,
            /\b(atmosphere|tension|silence|excitement|anticipation|concern)\b/gi
        ];

        let narrativeScore = 0;
        narrativeMarkers.forEach(pattern => {
            const matches = (text.match(pattern) || []).length;
            narrativeScore += Math.min(matches * 0.015, 0.05);
        });
        score += Math.min(narrativeScore, 0.15);

        // 5. Descriptive language and world-building (15% weight)
        const descriptiveElements = [
            /\b(gleaming|massive|imposing|elegant|sophisticated|advanced|mysterious|vast|infinite)\b/gi,
            /\b(systems|controls|displays|panels|corridors|chambers|quarters|deck|hull)\b/gi,
            /\b(humming|pulsing|glowing|flickering|streaming|flowing|radiating)\b/gi
        ];

        let descriptiveScore = 0;
        descriptiveElements.forEach(pattern => {
            const matches = (text.match(pattern) || []).length;
            descriptiveScore += Math.min(matches * 0.01, 0.05);
        });
        score += Math.min(descriptiveScore, 0.15);

        // 6. Conflict and tension establishment (10% weight)
        const conflictMarkers = [
            /\b(mission|danger|threat|conflict|challenge|problem|crisis|emergency|unknown|mysterious)\b/gi,
            /\b(concern|worry|tension|anticipation|uncertainty|risk|responsibility)\b/gi
        ];

        let conflictScore = 0;
        conflictMarkers.forEach(pattern => {
            const matches = (text.match(pattern) || []).length;
            conflictScore += Math.min(matches * 0.015, 0.05);
        });
        score += Math.min(conflictScore, 0.10);

        // 7. BLEU/ROUGE scoring for narrative quality (5% weight)
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(text, [referenceText]);
            rougeScore = safeRouge(text, referenceText);

            score += (bleuScore * 0.025) + (rougeScore * 0.025);
        } catch (err) {
            logger.warn(`BLEU/ROUGE scoring failed for long-form generation: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Quality bonuses
        if (text.includes('Chapter') || text.includes('chapter')) score += 0.03;
        if (wordCount >= 1000 && wordCount <= 1500) score += 0.05; // Optimal length

        // Penalties for poor quality
        if (text.length < 500) {
            score = Math.min(score, 0.15);
        }

        if (!/captain|crew|ship|space|bridge/i.test(text)) {
            score = Math.min(score, 0.20);
        }

        // Penalty for repetitive content
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
        const repetitionRatio = uniqueSentences.size / Math.max(sentences.length, 1);
        if (repetitionRatio < 0.8) score *= 0.8;

        logger.debug(`Long-form generation benchmark completed for ${modelId}:${serverId}`, {
            score,
            wordCount,
            paragraphCount: paragraphs.length,
            dialogueMarkers: dialogueMarkers.length,
            genreScore,
            narrativeScore,
            descriptiveScore,
            conflictScore,
            bleuScore,
            rougeScore,
            repetitionRatio
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`Long-form generation benchmark failed for ${modelId}:${serverId}: ${errorMsg}`);
        score = 0.02;
    }

    return Math.max(0, Math.min(score, 1.0));
}
