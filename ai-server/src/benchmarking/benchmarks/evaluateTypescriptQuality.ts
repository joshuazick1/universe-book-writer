/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'quality' (TypeScript quality is a quality benchmark)
 * requires: [] (no gating dependencies)
 */
export const typescriptQualityBenchmarkMeta = {
    suiteType: 'quality',
    requires: []
};
/**
 * TypeScript Quality Benchmark
 * Evaluates the model's ability to generate high-quality TypeScript code.
 * 
 * @module benchmarks/evaluateTypescriptQuality
 * @version 1.0.0
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';

/**
 * Evaluates TypeScript code generation quality and syntax correctness.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 */
export async function evaluateTypescriptQuality(modelId: string, serverId: string, timeoutMs: number = 5 * 60 * 1000, prompt?: string): Promise<number> {
    const defaultPrompt = 'Write a TypeScript function that adds two numbers with proper type annotations, JSDoc comments, and error handling.';
    const usedPrompt = prompt ?? defaultPrompt;
    const reference = 'function add(a: number, b: number): number { return a + b; }';
    let score = 0;

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);

        // Basic TypeScript syntax checks
        if (/function\s+\w+\s*\(/.test(response)) score += 0.2; // Function declaration
        if (/:\s*number|:\s*string|:\s*boolean/.test(response)) score += 0.2; // Type annotations
        if (/\{\s*return/.test(response)) score += 0.15; // Return statement

        // Quality indicators
        if (/\/\*\*[\s\S]*?\*\/|\/\//.test(response)) score += 0.15; // Comments
        if (/if\s*\(|try\s*\{|throw/.test(response)) score += 0.1; // Error handling
        if (/export|interface|type/.test(response)) score += 0.1; // Advanced features

        // Syntax correctness (basic checks)
        const openBraces = (response.match(/\{/g) || []).length;
        const closeBraces = (response.match(/\}/g) || []).length;
        if (openBraces === closeBraces) score += 0.1; // Balanced braces

    } catch (err) {
        logger.warn('TypeScript quality error: ' + (err instanceof Error ? err.message : String(err)));
    }

    return Math.max(0, Math.min(score, 1.0));
}
