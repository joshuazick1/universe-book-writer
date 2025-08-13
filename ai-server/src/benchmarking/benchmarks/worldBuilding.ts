/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (world building is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const worldBuildingBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * World Building Benchmark
 * Evaluates the model's ability to create consistent, detailed fictional universes
 * with logical rules, geography, culture, and internal consistency.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

export async function evaluateWorldBuilding(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Create a detailed description of a new planetary colony called "Haven Prime".',
        'Include the following elements:',
        '1. Physical environment (climate, geography, resources)',
        '2. Colonial government and social structure',
        '3. Economic system and trade relationships',
        '4. Cultural traditions and daily life',
        '5. Unique challenges this colony faces',
        '',
        'Ensure all elements are consistent and interconnected.',
        'The description should feel like a real place with its own identity.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.15; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const text = typeof response === 'string' ? response.trim() : '';

        // Completeness scoring - check for required elements
        let completenessScore = 0;

        if (/climate|weather|temperature|atmosphere|environment/i.test(text)) {
            completenessScore += 0.08;
        }

        if (/government|leader|council|administration|authority|political/i.test(text)) {
            completenessScore += 0.08;
        }

        if (/economy|trade|business|industry|commerce|economic/i.test(text)) {
            completenessScore += 0.08;
        }

        if (/culture|tradition|custom|ritual|society|social/i.test(text)) {
            completenessScore += 0.08;
        }

        if (/challenge|problem|difficulty|threat|issue/i.test(text)) {
            completenessScore += 0.08;
        }

        // Consistency and logic scoring
        let consistencyScore = 0;

        // Check for internal logic (harsh environment = adaptation)
        if ((/harsh|difficult|extreme/i.test(text) && /adapt|surviv|endur|resilien/i.test(text)) ||
            (/abundant|rich|fertile/i.test(text) && /prosper|wealth|growth/i.test(text))) {
            consistencyScore += 0.1;
        }

        // Check for interconnected systems
        if ((/mining|resource/i.test(text) && /economy|trade/i.test(text)) ||
            (/agriculture|farming/i.test(text) && /food|sustain/i.test(text))) {
            consistencyScore += 0.08;
        }

        // Detail and immersion scoring
        let detailScore = 0;

        // Check for specific names and details
        const properNouns = (text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []).length;
        if (properNouns >= 3) detailScore += 0.05;
        if (properNouns >= 6) detailScore += 0.05;

        // Check for numbers and specifics
        if (/\d+.*(?:million|thousand|percent|degree|kilometer|year)/i.test(text)) {
            detailScore += 0.05;
        }

        // Creativity and originality scoring
        let creativityScore = 0;

        // Look for unique elements
        if (/unique|unusual|different|special|distinctive|innovative/i.test(text)) {
            creativityScore += 0.05;
        }

        // Check for creative problem-solving
        if (/solution|innovation|invention|discovery|breakthrough/i.test(text)) {
            creativityScore += 0.05;
        }

        // BLEU/ROUGE scoring against reference world description
        const reference = 'Haven Prime is a mountainous colony with a democratic council governing its mining-based economy. The harsh winters shaped a culture of cooperation and resource sharing. Trade relationships with nearby systems provide essential supplies in exchange for rare minerals.';
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(text, [reference]);
            rougeScore = safeRouge(text, reference);
        } catch (err) {
            logger.warn('World building BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
        }

        // Coherence and realism scoring
        let realismScore = 0;

        // Check for realistic social structures
        if (/law|rule|regulation|order|justice|security/i.test(text)) {
            realismScore += 0.04;
        }

        // Check for believable technology level
        if (/technology|equipment|tool|communication|transport/i.test(text)) {
            realismScore += 0.04;
        }

        // Check for human needs addressed
        if (/food|water|shelter|energy|medical|health/i.test(text)) {
            realismScore += 0.04;
        }

        // Length and depth scoring
        let depthScore = 0;
        if (text.length > 400) depthScore += 0.03;
        if (text.length > 800) depthScore += 0.03;
        if (text.length > 1200) depthScore += 0.04;

        // Penalize inconsistencies
        if (/contradiction|impossible|unrealistic|doesn.*make sense/i.test(text)) {
            consistencyScore = Math.min(consistencyScore, 0.05);
        }

        // Penalize if missing colony name reference
        if (!/haven prime/i.test(text)) {
            score = Math.min(score, 0.1);
        }

        // Check for world-building terminology
        let terminologyScore = 0;
        if (/colony|colonist|settlement|outpost|frontier/i.test(text)) {
            terminologyScore += 0.03;
        }

        if (/planet|world|surface|terrain|landscape/i.test(text)) {
            terminologyScore += 0.03;
        }

        // Evaluate narrative quality
        let narrativeScore = 0;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

        if (sentences.length >= 8) {
            // Check for varied sentence structure
            const shortSentences = sentences.filter(s => s.length < 80).length;
            const longSentences = sentences.filter(s => s.length > 120).length;
            const varietyRatio = (shortSentences + longSentences) / sentences.length;

            if (varietyRatio > 0.3) {
                narrativeScore += 0.04;
            }
        }

        score += completenessScore + consistencyScore + detailScore + creativityScore +
            realismScore + depthScore + terminologyScore + narrativeScore +
            (0.05 * bleuScore) + (0.05 * rougeScore);

    } catch (err) {
        logger.warn('World building evaluation error: ' + (err instanceof Error ? err.message : String(err)));
        return 0.1;
    }

    return Math.max(0, Math.min(score, 1.0));
}
