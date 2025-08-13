/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'advanced' (advanced code generation is an advanced benchmark)
 * requires: ['typescript-quality'] (depends on TypeScript quality benchmark)
 */
export const advancedCodeGenerationBenchmarkMeta = {
    suiteType: 'advanced',
    requires: ['typescript-quality']
};
/**
 * Advanced Code Generation Benchmark
 * 
 * Evaluates the model's ability to generate complex TypeScript code with:
 * - Proper class structure and inheritance
 * - Interface definitions and implementation
 * - Generic type parameters
 * - Comprehensive JSDoc documentation
 * - Type annotations and safety
 * - Plugin-compatible architecture patterns
 * 
 * Enhanced with BLEU/ROUGE scoring for code quality assessment.
 * 
 * @module benchmarks/advancedCodeGeneration
 * @version 2.0.0
 * @author VerseForge AI Server
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';
import type { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';

/**
 * Evaluates advanced TypeScript code generation capabilities.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 * 
 * @example
 * ```typescript
 * const score = await evaluateAdvancedCodeGeneration('llama2', 'server-1');
 * console.log(`Advanced code generation score: ${score}`);
 * ```
 */
export async function evaluateAdvancedCodeGeneration(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Write a TypeScript class for a Starship plugin with the following requirements:',
        '1. Implement a SpaceVessel interface with required methods',
        '2. Use generic types for cargo and crew management',
        '3. Include comprehensive JSDoc with @param and @returns',
        '4. Add proper error handling and validation',
        '5. Follow plugin-first architecture patterns',
        '6. Include methods for warp travel, impulse engines, and docking'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;

    // Reference code for BLEU/ROUGE comparison
    const referenceCode = `
    interface SpaceVessel<T, U> {
        warpTo(destination: T): Promise<boolean>;
        setImpulse(speed: number): void;
        dock(station: U): Promise<void>;
    }
    
    /**
     * Advanced starship implementation with plugin architecture
     */
    class Starship<CargoType, CrewType> implements SpaceVessel<string, any> {
        constructor(private name: string) {}
        
        /**
         * Engages warp drive to specified destination
         * @param destination - Target location
         * @returns Promise resolving to success status
         */
        async warpTo(destination: string): Promise<boolean> {
            // Implementation
            return true;
        }
    }`;

    let score = 0.15; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const codeText = typeof response === 'string' ? response.trim() : '';

        // Enhanced scoring rubric with detailed criteria

        // 1. Basic structure and syntax (25% weight)
        if (/class\s+\w+/i.test(codeText)) score += 0.08;
        if (/interface\s+\w+/i.test(codeText)) score += 0.08;
        if (/implements\s+\w+/i.test(codeText)) score += 0.05;

        // 2. Type safety and generics (20% weight)
        if (/<[A-Za-z,\s]+>/.test(codeText)) score += 0.08;
        if (/:\s*(string|number|boolean|void|Promise)/i.test(codeText)) score += 0.06;
        if (/private|public|protected/.test(codeText)) score += 0.06;

        // 3. JSDoc documentation (15% weight)
        if (/\/\*\*[\s\S]*?\*\//.test(codeText)) score += 0.06;
        if (/@param|@returns|@throws/.test(codeText)) score += 0.06;
        if (/\*\s+@\w+\s+\w+\s+-/.test(codeText)) score += 0.03; // Detailed param descriptions

        // 4. Method implementations (20% weight)
        const requiredMethods = ['warp', 'impulse', 'dock'];
        const foundMethods = requiredMethods.filter(method =>
            new RegExp(`${method}\\w*\\s*\\(`, 'i').test(codeText)
        );
        score += (foundMethods.length / requiredMethods.length) * 0.08;

        // 5. Error handling and validation (10% weight)
        if (/try\s*\{|catch\s*\(|throw\s+new/.test(codeText)) score += 0.04;
        if (/if\s*\(.*\)\s*{[\s\S]*throw/.test(codeText)) score += 0.02;

        // 6. Plugin architecture patterns (10% weight)
        if (/export\s+(class|interface|type)/.test(codeText)) score += 0.03;
        if (/extends\s+\w+|implements\s+\w+/.test(codeText)) score += 0.02;

        // BLEU/ROUGE scoring for code quality
        let bleuScore = 0;
        let rougeScore = 0;
        let bleuError = '';
        let rougeError = '';

        try {
            // Split code into tokens for BLEU/ROUGE comparison
            const codeTokens = codeText.split(/\s+/).filter(token => token.trim().length > 0);
            const referenceTokens = referenceCode.split(/\s+/).filter(token => token.trim().length > 0);

            bleuScore = safeBleu(codeTokens.join(' '), [referenceTokens.join(' ')]);
            rougeScore = safeRouge(codeTokens.join(' '), referenceTokens.join(' '));

            // Weighted contribution from semantic similarity
            score += (bleuScore * 0.05) + (rougeScore * 0.05);
        } catch (err) {
            bleuError = err instanceof Error ? err.message : String(err);
            logger.warn(`BLEU/ROUGE scoring failed for advanced code generation: ${bleuError}`);
        }

        // Code quality bonuses
        if (codeText.length > 200) score += 0.05;
        if (/async\s+\w+|Promise</.test(codeText)) score += 0.03;
        if ((/constructor\s*\(/i.test(codeText)) && (/private|public|protected/.test(codeText))) score += 0.03;

        // Penalties for poor quality
        if (!/class|interface/.test(codeText) || codeText.length < 50) {
            score = Math.min(score, 0.08);
        }

        // Syntax error detection
        if (/\}\s*\{|\(\s*\)/.test(codeText) && codeText.length < 100) {
            score = Math.min(score, 0.12);
        }

        logger.debug(`Advanced code generation benchmark completed for ${modelId}:${serverId}`, {
            score,
            codeLength: codeText.length,
            hasInterface: /interface/.test(codeText),
            hasGenerics: /<[A-Za-z,\s]+>/.test(codeText),
            hasJSDoc: /\/\*\*/.test(codeText),
            foundMethods: foundMethods.length,
            bleuScore,
            rougeScore
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`Advanced code generation benchmark failed for ${modelId}:${serverId}: ${errorMsg}`);

        // Return minimal score for failures
        score = 0.02;
    }

    return Math.max(0, Math.min(score, 1.0));
}
