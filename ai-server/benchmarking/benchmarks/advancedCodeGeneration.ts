/**
 * Advanced Code Generation Benchmark
 * Evaluates the model's ability to generate complex TypeScript code (e.g., classes, plugin skeletons).
 * Enhanced: Checks for interface usage, JSDoc, generics, and code correctness.
 */
import { callModelAPI } from '../benchmarkUtils.js';
import { logger } from '../../../shared/logging/logger.js';
export async function evaluateAdvancedCodeGeneration(modelId: string, serverId: string, timeoutMs = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = [
        'Write a TypeScript class for a Starship with methods for warp and impulse travel. Include JSDoc comments, type annotations, at least one interface, and use generics if possible.'
    ].join(' ');
    const usedPrompt = prompt ?? defaultPrompt;
    let score = 0.15;
    try {
        let response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        if (typeof response === 'string') response = response.trim();
        // Rubric: class, methods, interface, JSDoc, types, structure, generics
        if (/class\s+starship/i.test(response)) score += 0.12;
        if (/warp|impulse/i.test(response)) score += 0.12;
        if (/interface\s+[A-Za-z]+/.test(response)) score += 0.08;
        if (/\/\*\*|@param|@returns/.test(response)) score += 0.08;
        if (/constructor|public|private|: string|: number|: void/.test(response)) score += 0.08;
        if (/<[A-Za-z, ]+>/.test(response)) score += 0.07; // generics
        if (response.length > 120) score += 0.08;
        // Bonus for correct method signatures
        if (/warp\s*\([^)]+\)\s*:\s*void/.test(response) && /impulse\s*\([^)]+\)\s*:\s*void/.test(response)) score += 0.08;
        // Penalize if not code or too short
        if (!/class|interface/.test(response) || response.length < 40) score = Math.min(score, 0.08);
    } catch (err) {
        logger.warn('Advanced code generation error: ' + (err instanceof Error ? err.message : String(err)));
    }
    return Math.max(0, Math.min(score, 1.0));
}
