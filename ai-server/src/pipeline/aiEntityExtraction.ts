/**
 * aiEntityExtraction.ts
 *
 * Pipeline step: AI Entity Extraction (Pass 1)
 *
 * This function identifies and extracts all entities (characters, places, objects, etc.) present in each chunk, using full chunk text, brief chunk summary, and robust super-chunk summary as context.
 *
 * @module pipeline/aiEntityExtraction
 */

import { getNodeById, createOrGetEntityNode } from '../services/ragNodeService.js';
import { aiExtractEntitiesFromChunk } from '../services/entityExtractor.js';

/**
 * Input for aiEntityExtraction pipeline step.
 */
export interface AiEntityExtractionInput {
    readonly chunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for aiEntityExtraction pipeline step.
 */
export interface AiEntityExtractionResult {
    readonly entitiesByChunk: Array<{
        chunkNodeId: string;
        entities: EntityExtraction[];
    }>;
}

/**
 * Entity extraction result for a single entity.
 */
export interface EntityExtraction {
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly description?: string;
    readonly aliases?: string[];
    readonly attributes?: Record<string, unknown>;
    readonly sourceText: string;
    readonly summary: string;
    readonly superChunkSummary: string;
}

/**
 * Extracts entities from each chunk using chunk text, brief summary, and robust super-chunk summary.
 *
 * - Fetches chunk node text, summary, and parent super-chunk summary.
 * - Calls the entity extraction service for each chunk.
 * - Stores extracted entities in the knowledge graph, linked to the chunk node.
 *
 * @param input - Chunk node IDs and context
 * @returns Array of extracted entities for each chunk
 *
 * @example
 * const result = await aiEntityExtraction({
 *   chunkNodeIds: ['chunk1', 'chunk2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function aiEntityExtraction(input: AiEntityExtractionInput): Promise<AiEntityExtractionResult> {
    const { chunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const entitiesByChunk: Array<{ chunkNodeId: string; entities: EntityExtraction[] }> = [];
    for (const chunkNodeId of chunkNodeIds) {
        // Use the correct type for chunkNode and superChunkNode
        const chunkNode = await getNodeById(chunkNodeId) as {
            content?: { fullText?: string };
            summaries?: { brief?: string };
            metadata?: { superChunkId?: string };
        } | null;
        if (!chunkNode || !chunkNode.content?.fullText || !chunkNode.summaries?.brief || !chunkNode.metadata?.superChunkId) {
            throw new Error(`Chunk node ${chunkNodeId} missing required data.`);
        }
        // Fetch robust summary from parent super-chunk
        const superChunkNode = await getNodeById(chunkNode.metadata.superChunkId) as {
            summaries?: { detailed?: string };
        } | null;
        if (!superChunkNode || !superChunkNode.summaries?.detailed) {
            throw new Error(`Super-chunk node ${chunkNode.metadata.superChunkId} missing robust summary.`);
        }
        // Compose priorSummaries for context
        const priorSummaries: string[] = [chunkNode.summaries.brief, superChunkNode.summaries.detailed];
        // Extract entities using the entity extraction service (expects 2 args: text, options)
        const entities = await aiExtractEntitiesFromChunk(
            chunkNode.content.fullText,
            {
                universeId,
                priorSummaries,
                // bookId, chapterId, chunkNodeId, submittedBy removed for type safety
            }
        );
        // Store extracted entities and link to chunk node
        for (const entity of entities) {
            await createOrGetEntityNode({
                ...entity,
                chunkNodeId,
                universeId,
                bookId,
                chapterId,
                submittedBy,
            });
        }
        entitiesByChunk.push({ chunkNodeId, entities });
    }
    return { entitiesByChunk };
}

/**
 * Edge Cases:
 * - If a chunk or super-chunk node is missing required data, an error is thrown.
 * - If entity extraction fails, an error is thrown.
 * - Entities are stored as nodes linked to the chunk node.
 */
