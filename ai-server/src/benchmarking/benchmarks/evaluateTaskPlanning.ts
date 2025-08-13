/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (task planning is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const taskPlanningBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * Task Planning Benchmark
 * Evaluates the model's ability to create structured, logical task plans.
 * 
 * @module benchmarks/evaluateTaskPlanning
 * @version 1.0.0
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Evaluates task planning capabilities for structured problem solving.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 */
export async function evaluateTaskPlanning(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Plan a diplomatic mission to the Romulan Neutral Zone. Break down the mission into logical steps including preparation, execution, and follow-up phases.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = 'Establish contact, negotiate terms, ensure security, report to Starfleet.';
    let score = 0;

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);

        // Structure and organization checks
        const hasNumbers = /\d\.|step \d|phase \d|\d\)/i.test(response);
        const hasBullets = /•|-|\*/.test(response);
        const hasSteps = /step|phase|stage|first|second|then|next|finally/i.test(response);

        if (hasNumbers || hasBullets) score += 0.2; // Structured format
        if (hasSteps) score += 0.2; // Sequential thinking

        // Content relevance checks
        if (/contact|communicat|reach out/i.test(response)) score += 0.15;
        if (/negotiat|discuss|terms|agreement/i.test(response)) score += 0.15;
        if (/security|safe|protect|guard/i.test(response)) score += 0.1;
        if (/report|debrief|inform|update/i.test(response)) score += 0.1;

        // Quality indicators
        if (response.length > 100) score += 0.1; // Sufficient detail
        if (response.split(/[.!?]/).length > 3) score += 0.1; // Multiple ideas

    } catch (err) {
        logger.warn('Task planning error: ' + (err instanceof Error ? err.message : String(err)));
    }

    return Math.max(0, Math.min(score, 1.0));
}
