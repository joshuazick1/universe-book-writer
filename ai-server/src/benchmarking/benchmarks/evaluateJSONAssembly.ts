/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (JSON assembly is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const jsonAssemblyBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * JSON Assembly Benchmark
 * Evaluates the model's ability to generate valid JSON objects with specific structure.
 * 
 * @module benchmarks/evaluateJSONAssembly
 * @version 1.0.0
 */

import Ajv from 'ajv';
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

const ajv = new Ajv.default();

/**
 * Evaluates JSON assembly capabilities for structured data generation.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 */
export async function evaluateJSONAssembly(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Generate a JSON object for a Star Trek character with name, rank, and backstory. Return only the JSON object.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = '{"name": "Jean-Luc Picard", "rank": "Captain", "backstory": "Experienced Starfleet officer"}';
    let score = 0;

    const schema = {
        type: 'object',
        required: ['name', 'rank', 'backstory'],
        properties: {
            name: { type: 'string' },
            rank: { type: 'string' },
            backstory: { type: 'string' }
        }
    };

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);

        // Try to extract JSON from response
        let jsonStr = response.trim();
        const jsonMatch = jsonStr.match(/\{.*\}/s);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const parsedResponse = JSON.parse(jsonStr);

        // Validate JSON structure against schema
        const isValid = ajv.validate(schema, parsedResponse);
        if (isValid) {
            score += 0.5; // Base score for valid structure

            // Score content quality
            if (parsedResponse.name && parsedResponse.name.length > 0) score += 0.2;
            if (parsedResponse.rank && parsedResponse.rank.length > 0) score += 0.15;
            if (parsedResponse.backstory && parsedResponse.backstory.length > 10) score += 0.15;
        } else {
            // Partial credit for attempting JSON format
            if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) score += 0.1;
        }
    } catch (err) {
        logger.warn('JSON assembly error: ' + (err instanceof Error ? err.message : String(err)));
        // Minimal score if response contains some JSON-like structure
        if (typeof err === 'string' && err.includes('{')) score = 0.05;
    }

    return Math.max(0, Math.min(score, 1.0));
}
