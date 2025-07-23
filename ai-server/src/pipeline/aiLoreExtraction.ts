/**
 * aiLoreExtraction.ts
 *
 * Pipeline step: AI Lore Extraction (Pass 3)
 *
 * This function extracts lore, world-building facts, and universe-specific details using chunk text, robust super-chunk summary, and entity/relationship context.
 *
 * @module pipeline/aiLoreExtraction
 */

import { getNodeById } from '../services/ragNodeService.js';
import { aiExtractLoreFromChunk } from '../services/loreExtractor.js';

export interface AiLoreExtractionInput {
    readonly chunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

export interface AiLoreExtractionResult {
    readonly loreByChunk: Array<{
        chunkNodeId: string;
        lore: LoreExtraction[];
    }>;
}

export interface LoreExtraction {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly attributes?: Record<string, unknown>;
    readonly sourceText: string;
    readonly summary: string;
    readonly superChunkSummary: string;
}

/**
 * Extracts lore from each chunk using chunk text, robust super-chunk summary, and entity/relationship context.
 *
 * - Fetches chunk node text, robust summary, and context.
 * - Calls the lore extraction service for each chunk.
 * - Stores extracted lore and links to relevant nodes.
 *
 * @param input - Chunk node IDs and context
 * @returns Array of extracted lore for each chunk
 */
export async function aiLoreExtraction(input: AiLoreExtractionInput): Promise<AiLoreExtractionResult> {
    const { chunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const loreByChunk: Array<{ chunkNodeId: string; lore: LoreExtraction[] }> = [];
    for (const chunkNodeId of chunkNodeIds) {
        const chunkNode = await getNodeById(chunkNodeId);
        if (!chunkNode || !chunkNode.content?.fullText) {
            throw new Error(`Chunk node ${chunkNodeId} missing required data.`);
        }
        const lore = await aiExtractLoreFromChunk(
            chunkNode.content.fullText,
            { universeId }
        );
        loreByChunk.push({ chunkNodeId, lore });
    }
    return { loreByChunk };
}
