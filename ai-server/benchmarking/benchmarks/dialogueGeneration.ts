/**
 * Dialogue Generation Benchmark
 * Enhanced: Checks for negotiation, emotional nuance, and dialogue realism.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from '../../../shared/logging/logger.js';
export async function evaluateDialogueGeneration(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = [
        'Write a short conversation between a Starfleet captain and a Romulan ambassador negotiating a ceasefire. Each line should be a new speaker, labeled with their role. Use realistic, in-universe dialogue and negotiation tactics.'
    ].join(' ');
    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.15;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') {
            response = response.trim();
        }
        // Rubric: speaker alternation, negotiation, in-universe, dialogue realism
        const lines = response.split('\n').filter((l: string) => l.trim().length > 0);
        const speakerPattern = /^(Captain|Romulan|Ambassador|Commander|[A-Za-z]+):/i;
        let speakers = new Set<string>();
        let alternates = true;
        let lastSpeaker = '';
        let negotiationFound = false;
        for (const line of lines) {
            const match = line.match(speakerPattern);
            if (match) {
                const speaker = match[1].toLowerCase();
                speakers.add(speaker);
                if (lastSpeaker === speaker) alternates = false;
                lastSpeaker = speaker;
            }
            if (/ceasefire|peace|agreement|terms|negotiat|treaty|hostilities|diplomacy/i.test(line)) negotiationFound = true;
        }
        if (speakers.size >= 2) score += 0.12;
        if (alternates && lines.length >= 4) score += 0.12;
        if (negotiationFound) score += 0.08;
        // In-universe check
        if (/starfleet|romulan|federation|empire/i.test(response)) score += 0.08;
        // Dialogue realism: short lines, not monologue
        if (lines.length >= 4 && lines.length <= 12 && lines.every((l: string) => l.length < 120)) score += 0.08;
        // Bonus for emotional nuance
        if (/trust|suspicion|honor|risk|alliance|threat|cooperation/i.test(response)) score += 0.08;
        // Penalize if too short or not a dialogue
        if (lines.length < 3 || speakers.size < 2) score = Math.min(score, 0.05);
    } catch (err) {
        logger.warn('Dialogue generation error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
