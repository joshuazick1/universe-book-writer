/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (plot coherence is a quality benchmark)
 * requires: ['character-consistency'] (depends on character consistency)
 */
export const plotCoherenceBenchmarkMeta = {
    suiteType: 'quality',
    requires: ['character-consistency']
};
/**
 * Plot Coherence Benchmark
 * Evaluates the model's ability to maintain logical story progression,
 * cause-and-effect relationships, and narrative continuity.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

export async function evaluatePlotCoherence(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Continue this story with logical plot progression:',
        '',
        'Setup: Dr. Sarah Chen discovered an ancient alien artifact in her lab that began emitting strange energy readings.',
        'The artifact caused all electronic devices within 50 meters to malfunction.',
        'Security was called, but their equipment failed as they approached.',
        '',
        'Write the next 3 story beats that logically follow from this setup.',
        'Include cause-and-effect relationships and maintain narrative consistency.',
        'Each beat should build naturally from the previous events.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.2; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const text = typeof response === 'string' ? response.trim() : '';

        // Logical progression scoring
        let logicScore = 0;

        // Check for continuation of established elements
        if (/artifact|chen|sarah|energy|electronic|malfunction/i.test(text)) {
            logicScore += 0.15;
        }

        // Check for cause-and-effect relationships
        if (/because|therefore|as a result|consequently|due to|caused by|led to/i.test(text)) {
            logicScore += 0.15;
        }

        // Check for escalation or development
        if (/spread|expand|intensif|worsen|develop|escalat|progress/i.test(text)) {
            logicScore += 0.1;
        }

        // Check for problem-solving attempts
        if (/solution|attempt|try|investigat|analyz|contain|isolat/i.test(text)) {
            logicScore += 0.1;
        }

        // Story structure scoring
        let structureScore = 0;

        // Check for numbered beats or clear progression
        const beats = text.split(/beat|step|\d+\.|first|second|third|next|then|finally/i);
        if (beats.length >= 3) {
            structureScore += 0.1;
        }

        // Check for timeline consistency
        if (!/contradiction|inconsistent|simultaneously.*later|before.*after/i.test(text)) {
            structureScore += 0.05;
        }

        // Character consistency scoring
        let characterScore = 0;

        // Dr. Chen should remain the focus or be referenced
        const chenMentions = (text.match(/chen|sarah|doctor|scientist/gi) || []).length;
        if (chenMentions >= 2) {
            characterScore += 0.05;
        }

        // BLEU/ROUGE scoring against reference continuation
        const reference = 'Dr. Chen stepped back as the artifact\'s energy field expanded, causing laboratory equipment to spark and fail. She attempted to contact the research director, but her phone remained dead. As a result, Chen decided to evacuate the lab and establish a perimeter.';
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(text, [reference]);
            rougeScore = safeRouge(text, reference);
        } catch (err) {
            logger.warn('Plot coherence BLEU/ROUGE error: ' + (err instanceof Error ? err.message : String(err)));
        }

        // Coherence and continuity checks
        let coherenceScore = 0;

        // Check for scientific consistency
        if (/energy|field|electromagnetic|radiation|frequency|signal/i.test(text)) {
            coherenceScore += 0.05;
        }

        // Check for realistic responses
        if (/evacuat|contain|study|research|caution|protocol|safety/i.test(text)) {
            coherenceScore += 0.05;
        }

        // Length and detail scoring
        let detailScore = 0;
        if (text.length > 300) detailScore += 0.05;
        if (text.length > 600) detailScore += 0.05;

        // Penalize plot holes or inconsistencies
        if (/suddenly.*for no reason|inexplicably|without explanation|magic|impossible/i.test(text)) {
            logicScore = Math.min(logicScore, 0.1);
        }

        // Penalize if no progression from setup
        if (!new RegExp('artifact|energy|malfunction|chen', 'i').test(text)) {
            score = Math.min(score, 0.15);
        }

        // Check for narrative flow
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        let flowScore = 0;

        if (sentences.length >= 5) {
            // Check for good transitions between sentences
            let goodTransitions = 0;
            for (let i = 1; i < sentences.length; i++) {
                const prev = sentences[i - 1].toLowerCase();
                const curr = sentences[i].toLowerCase();

                // Look for connecting words or related concepts
                if (/meanwhile|however|then|next|as|while|when|after/.test(curr) ||
                    hasConceptualConnection(prev, curr)) {
                    goodTransitions++;
                }
            }

            const transitionRatio = goodTransitions / (sentences.length - 1);
            flowScore = transitionRatio * 0.1;
        }

        score += logicScore + structureScore + characterScore + coherenceScore +
            detailScore + flowScore + (0.05 * bleuScore) + (0.05 * rougeScore);

    } catch (err) {
        logger.warn('Plot coherence evaluation error: ' + (err instanceof Error ? err.message : String(err)));
        return 0.1;
    }

    return Math.max(0, Math.min(score, 1.0));
}

// Helper function to check conceptual connections between sentences
function hasConceptualConnection(prev: string, curr: string): boolean {
    const prevWords = new Set(prev.split(/\s+/));
    const currWords = new Set(curr.split(/\s+/));

    // Check for shared concepts
    const intersection = new Set([...prevWords].filter(x => currWords.has(x)));
    return intersection.size > 1; // More than just articles/prepositions
}
