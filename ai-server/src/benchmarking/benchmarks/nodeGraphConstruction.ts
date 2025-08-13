/**
 * Benchmark metadata for gating and scheduling
 * suiteType: 'advanced' (node/graph construction is an advanced benchmark)
 * requires: ['json-assembly'] (depends on JSON assembly)
 */
export const nodeGraphConstructionBenchmarkMeta = {
    suiteType: 'advanced',
    requires: ['json-assembly']
};
/**
 * Node/Graph Construction Benchmark
 * 
 * Evaluates the model's ability to generate structured knowledge graph nodes with:
 * - Valid JSON syntax and structure
 * - Complete required field coverage
 * - Logical and plausible data values
 * - Proper metadata organization
 * - Consistent naming conventions
 * - Plugin-compatible node schemas
 * 
 * Enhanced with JSON validation and comprehensive data quality analysis.
 * 
 * @module benchmarks/nodeGraphConstruction
 * @version 2.0.0
 * @author VerseForge AI Server
 */

import { callModelAPI, safeBleu, safeRouge } from '../benchmarkUtils.js';
import { logger } from 'shared/logging/logger.js';
import type { BenchmarkType } from 'shared/types/aiQualityBenchmark.js';

/**
 * Evaluates knowledge graph node construction capabilities.
 * 
 * @param modelId - The model identifier to benchmark
 * @param serverId - The server identifier hosting the model
 * @param timeoutMs - Request timeout in milliseconds (default: 5 minutes)
 * @param prompt - Optional custom prompt (uses default if not provided)
 * @returns Promise resolving to a score between 0 and 1
 * 
 * @example
 * ```typescript
 * const score = await evaluateNodeGraphConstruction('llama2', 'server-1');
 * console.log(`Node construction score: ${score}`);
 * ```
 */
export async function evaluateNodeGraphConstruction(
    modelId: string,
    serverId: string,
    timeoutMs = 5 * 60 * 1000,
    prompt?: string
): Promise<number> {
    const defaultPrompt = [
        'Create a JSON node for the planet Vulcan with the following structure:',
        '- name: string (planet name)',
        '- type: string (node type, should be "planet")',
        '- climate: string (climate description)',
        '- population: number (approximate population)',
        '- system: string (star system name)',
        '- metadata: object (additional information including coordinates, discovery date, and notable features)',
        'Ensure all fields are properly typed and contain realistic values for the Star Trek universe.'
    ].join(' ');

    const usedPrompt = prompt ?? defaultPrompt;

    // Reference JSON for BLEU/ROUGE comparison
    const referenceJson = JSON.stringify({
        name: "Vulcan",
        type: "planet",
        climate: "Desert, hot and arid",
        population: 6000000000,
        system: "40 Eridani A",
        metadata: {
            coordinates: "40 Eridani A system",
            discoveryDate: "2151",
            notableFeatures: ["Mount Seleya", "Forge desert", "T'Paal mountain range"],
            government: "Vulcan High Command",
            species: "Vulcans"
        }
    }, null, 2);

    let score = 0.15; // Base score

    try {
        const response = await callModelAPI(serverId, modelId, usedPrompt, 3, 500, timeoutMs);
        const text = typeof response === 'string' ? response.trim() : '';

        // Extract JSON from response (handle code blocks, etc.)
        let jsonText = text;
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*?\})/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        }

        let parsedJson: any = null;
        let isValidJson = false;

        // 1. JSON validity check (25% weight)
        try {
            parsedJson = JSON.parse(jsonText);
            isValidJson = true;
            score += 0.25;
        } catch (jsonError) {
            // Try to extract key-value pairs for partial credit
            if (/\{.*name.*vulcan.*\}/.test(text.toLowerCase())) {
                score += 0.10; // Partial credit for structure
            }
        }

        if (isValidJson && parsedJson) {
            // 2. Required fields check (30% weight)
            const requiredFields = ['name', 'type', 'climate', 'population', 'system', 'metadata'];
            const presentFields = requiredFields.filter(field =>
                parsedJson.hasOwnProperty(field) && parsedJson[field] !== null && parsedJson[field] !== undefined
            );

            const fieldCoverageScore = (presentFields.length / requiredFields.length) * 0.30;
            score += fieldCoverageScore;

            // 3. Data type validation (15% weight)
            let typeScore = 0;
            if (typeof parsedJson.name === 'string' && parsedJson.name.toLowerCase().includes('vulcan')) typeScore += 0.04;
            if (typeof parsedJson.type === 'string' && parsedJson.type.toLowerCase() === 'planet') typeScore += 0.03;
            if (typeof parsedJson.climate === 'string' && parsedJson.climate.length > 5) typeScore += 0.03;
            if (typeof parsedJson.population === 'number' && parsedJson.population > 0) typeScore += 0.03;
            if (typeof parsedJson.system === 'string' && parsedJson.system.length > 3) typeScore += 0.02;
            score += typeScore;

            // 4. Metadata quality (15% weight)
            if (parsedJson.metadata && typeof parsedJson.metadata === 'object') {
                score += 0.05;

                const metadataKeys = Object.keys(parsedJson.metadata);
                if (metadataKeys.length >= 3) score += 0.05;
                if (metadataKeys.length >= 5) score += 0.05;

                // Bonus for universe-appropriate metadata
                const goodMetadataKeys = ['coordinates', 'discovery', 'features', 'government', 'species', 'notable'];
                const relevantKeys = metadataKeys.filter(key =>
                    goodMetadataKeys.some(good => key.toLowerCase().includes(good))
                );
                if (relevantKeys.length >= 2) score += 0.03;
            }

            // 5. Value plausibility (10% weight)
            let plausibilityScore = 0;

            // Population check
            if (typeof parsedJson.population === 'number') {
                if (parsedJson.population >= 1000000 && parsedJson.population <= 50000000000) {
                    plausibilityScore += 0.03;
                }
            }

            // Climate appropriateness
            if (typeof parsedJson.climate === 'string') {
                const climateText = parsedJson.climate.toLowerCase();
                if (/desert|arid|hot|dry|volcanic/.test(climateText)) {
                    plausibilityScore += 0.03;
                }
            }

            // System accuracy
            if (typeof parsedJson.system === 'string') {
                const systemText = parsedJson.system.toLowerCase();
                if (/eridani|40 eridani|vulcan system/.test(systemText)) {
                    plausibilityScore += 0.04;
                }
            }

            score += plausibilityScore;
        }

        // 6. BLEU/ROUGE scoring for content quality (5% weight)
        let bleuScore = 0;
        let rougeScore = 0;

        try {
            bleuScore = safeBleu(text, [referenceJson]);
            rougeScore = safeRouge(text, referenceJson);

            score += (bleuScore * 0.025) + (rougeScore * 0.025);
        } catch (err) {
            logger.warn(`BLEU/ROUGE scoring failed for node construction: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Quality bonuses
        if (text.length > 200) score += 0.02;
        if (isValidJson && JSON.stringify(parsedJson).length > 150) score += 0.03;

        // Penalties
        if (!text.includes('{') || !text.includes('}')) {
            score = Math.min(score, 0.08);
        }

        if (text.length < 50) {
            score = Math.min(score, 0.05);
        }

        // Penalty for non-responsive answers
        if (!/vulcan|planet|json/i.test(text)) {
            score = Math.min(score, 0.10);
        }

        logger.debug(`Node construction benchmark completed for ${modelId}:${serverId}`, {
            score,
            isValidJson,
            textLength: text.length,
            presentFields: parsedJson ? Object.keys(parsedJson) : [],
            hasMetadata: parsedJson?.metadata ? Object.keys(parsedJson.metadata).length : 0,
            bleuScore,
            rougeScore
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`Node construction benchmark failed for ${modelId}:${serverId}: ${errorMsg}`);
        score = 0.02;
    }

    return Math.max(0, Math.min(score, 1.0));
}
