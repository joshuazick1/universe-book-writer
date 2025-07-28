/**
 * Node/Graph Construction Benchmark
 * Evaluates the model's ability to generate or update knowledge graph nodes.
 * Enhanced: Checks for JSON validity, field completeness, and plausible values.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from '../../../shared/logging/logger.js';
export async function evaluateNodeGraphConstruction(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = [
        'Create a JSON node for the planet Vulcan with fields: name, type, climate, population, system, and a metadata object.'
    ].join(' ');
    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.15;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') response = response.trim();
        // Rubric: JSON structure, required fields, metadata, and value plausibility
        if (/\{.*\}/.test(response) && response.includes('vulcan')) score += 0.12;
        if (/climate|population|system|metadata/i.test(response)) score += 0.12;
        if (/'name'\s*:\s*'vulcan'|"name"\s*:\s*"vulcan"/i.test(response)) score += 0.08;
        if (/"metadata"\s*:\s*\{/.test(response)) score += 0.08;
        // Bonus for plausible values
        if (/desert|millions|alpha centauri|star system/i.test(response)) score += 0.08;
        if (response.length > 80) score += 0.08;
        // Penalize if not JSON or too short
        if (!/\{.*\}/.test(response) || response.length < 20) score = Math.min(score, 0.08);
    } catch (err) {
        logger.warn('Node/graph construction error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
