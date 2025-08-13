/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (summarization is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const summarizationBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Summarization Benchmark
 * 
 * Evaluates the model's ability to create concise, accurate summaries with:
 * - Key information extraction and coverage
 * - Appropriate length and conciseness
 * - Logical structure and flow
 * - Preservation of important details
 * - Clear outcome identification
 * - Adherence to specified format constraints
 * 
 * Enhanced with BLEU/ROUGE scoring and comprehensive content analysis.
 * 
 * @module benchmarks/summarization
 * @version 2.0.0
 * @author VerseForge AI Server
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';
import type { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';

/**
 * Evaluates text summarization quality and accuracy.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 * 
 * @example
 * ```typescript
 * const score = await evaluateSummarization('llama2', 'server-1');
 * console.log(`Summarization score: ${score}`);
 * ```
 */
export async function evaluateSummarization(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Summarize the following chapter in exactly 3 sentences. Focus on the main events, key discoveries, and outcome.',
        '',
        'Chapter: The crew of the Enterprise discovers a mysterious signal emanating from a nearby nebula.',
        'Captain Picard orders an investigation, and they encounter a lost alien vessel containing refugees from a destroyed world.',
        'After tense negotiations and overcoming translation difficulties, they establish peaceful first contact and offer assistance.',
        'The refugees share crucial information about a new threat approaching Federation space.',
        '',
        'Your summary should capture: (1) the discovery, (2) the investigation and encounter, (3) the outcome and implications.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;

    // Key elements that should be covered
    const criticalPhrases = [
        'mysterious signal', 'signal', 'discovery', 'discover',
        'nebula', 'alien vessel', 'lost vessel', 'ship',
        'first contact', 'contact', 'encounter', 'meet',
        'enterprise', 'crew', 'captain', 'picard',
        'refugees', 'survivors', 'people',
        'threat', 'danger', 'warning', 'information'
    ];

    // Reference summary for BLEU/ROUGE comparison
    const referenceSummary = "The Enterprise crew discovers a mysterious signal from a nebula and investigates. They encounter a lost alien vessel containing refugees from a destroyed world and establish first contact. The refugees provide crucial information about a new threat approaching Federation space.";

    let score = 0.08; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const text = typeof response === 'string' ? response.trim() : '';

        // Enhanced scoring rubric

        // 1. Content coverage (35% weight)
        let coverageScore = 0;
        let phrasesFound = 0;

        const textLower = text.toLowerCase();
        for (const phrase of criticalPhrases) {
            if (textLower.includes(phrase.toLowerCase())) {
                phrasesFound++;
                break; // Only count each semantic group once
            }
        }

        // Group similar phrases for better coverage analysis
        const semanticGroups = [
            ['signal', 'discovery', 'discover'],
            ['nebula', 'space'],
            ['alien', 'vessel', 'ship'],
            ['contact', 'encounter', 'meet'],
            ['crew', 'enterprise', 'captain', 'picard'],
            ['refugees', 'survivors', 'people'],
            ['threat', 'danger', 'warning', 'information']
        ];

        let groupsCovered = 0;
        for (const group of semanticGroups) {
            if (group.some(term => textLower.includes(term))) {
                groupsCovered++;
            }
        }

        coverageScore = (groupsCovered / semanticGroups.length) * 0.35;
        score += coverageScore;

        // 2. Structure and format adherence (25% weight)
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
        const sentenceCount = sentences.length;

        if (sentenceCount === 3) {
            score += 0.20; // Perfect adherence
        } else if (sentenceCount === 2 || sentenceCount === 4) {
            score += 0.12; // Close enough
        } else if (sentenceCount >= 1 && sentenceCount <= 6) {
            score += 0.06; // Reasonable range
        }

        // Bonus for logical flow between sentences
        if (sentences.length >= 2) {
            const hasLogicalProgression = sentences.some(s =>
                /after|then|subsequently|following|result|outcome|consequence/.test(s.toLowerCase())
            );
            if (hasLogicalProgression) score += 0.05;
        }

        // 3. Conciseness and efficiency (20% weight)
        const wordCount = text.split(/\s+/).length;

        if (wordCount >= 30 && wordCount <= 60) {
            score += 0.15; // Optimal length
        } else if (wordCount >= 20 && wordCount <= 80) {
            score += 0.10; // Good length
        } else if (wordCount >= 15 && wordCount <= 100) {
            score += 0.05; // Acceptable length
        }

        // Penalty for excessive length
        if (wordCount > 150) {
            score *= 0.7;
        }

        // 4. Quality and clarity (15% weight)
        let qualityScore = 0;

        // Check for clear outcomes/implications
        if (/outcome|result|consequence|implication|threat|danger|information|warning/.test(textLower)) {
            qualityScore += 0.05;
        }

        // Check for action words and clear events
        if (/discover|encounter|establish|provide|investigate|order/.test(textLower)) {
            qualityScore += 0.05;
        }

        // Check for proper narrative elements
        if (/captain|crew|enterprise|picard/.test(textLower)) {
            qualityScore += 0.03;
        }

        // Bonus for mentioning the broader implications
        if (/federation|space|threat|approaching/.test(textLower)) {
            qualityScore += 0.02;
        }

        score += qualityScore;

        // 5. BLEU/ROUGE scoring for semantic similarity (5% weight)
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(text, [referenceSummary]);
            rougeScore = safeRouge(text, referenceSummary);

            score += (bleuScore * 0.025) + (rougeScore * 0.025);
        } catch (err) {
            logger.warn(`BLEU/ROUGE scoring failed for summarization: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Quality bonuses
        if (sentences.length >= 2 && sentences.every(s => s.trim().length > 10)) {
            score += 0.03; // All sentences are substantial
        }

        // Penalties for poor quality
        if (!text || text.length < 30) {
            score = Math.min(score, 0.05);
        }

        if (groupsCovered < 3) {
            score = Math.min(score, 0.15); // Missing too many key elements
        }

        // Penalty for mere repetition of input
        const inputOverlap = criticalPhrases.filter(phrase =>
            textLower.includes(phrase) &&
            usedPrompt.toLowerCase().includes(phrase)
        ).length;

        if (inputOverlap > 4 && text.length < 100) {
            score *= 0.8; // Likely just copying input
        }

        // Penalty for non-responsive answers
        if (/i cannot|unable to|don't have|insufficient information/.test(textLower)) {
            score = Math.min(score, 0.08);
        }

        logger.debug(`Summarization benchmark completed for ${modelId}:${serverId}`, {
            score,
            wordCount,
            sentenceCount,
            groupsCovered,
            phrasesFound: phrasesFound,
            coverageScore,
            qualityScore,
            bleuScore,
            rougeScore,
            textPreview: text.substring(0, 100)
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`Summarization benchmark failed for ${modelId}:${serverId}: ${errorMsg}`);
        score = 0.02;
    }

    return Math.max(0, Math.min(score, 1.0));
}
