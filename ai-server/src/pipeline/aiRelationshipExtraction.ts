/**
 * aiRelationshipExtraction.ts
 *
 * Pipeline step: AI Relationship Extraction (Pass 2)
 *
 * This function detects relationships between entities (e.g., interactions, affiliations, conflicts) within and across chunks, using chunk text, extracted entities, and both levels of summaries as context.
 *
 * @module pipeline/aiRelationshipExtraction
 */

import { getNodeById, getEntitiesByChunkId, createRelationshipNode } from '../services/ragNodeService.js';
import { aiExtractRelationshipsFromChunk } from '../services/relationshipExtractor.js';

/**
 * Input for aiRelationshipExtraction pipeline step.
 */
export interface AiRelationshipExtractionInput {
    readonly chunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for aiRelationshipExtraction pipeline step.
 */
export interface AiRelationshipExtractionResult {
    readonly relationshipsByChunk: Array<{
        chunkNodeId: string;
        relationships: RelationshipExtraction[];
    }>;
}

/**
 * Relationship extraction result for a single relationship.
 */
export interface RelationshipExtraction {
    readonly id: string;
    readonly type: string;
    readonly sourceEntityId: string;
    readonly targetEntityId: string;
    readonly description?: string;
    readonly attributes?: Record<string, unknown>;
    readonly sourceText: string;
    readonly summary: string;
    readonly superChunkSummary: string;
}

/**
 * Detects relationships between entities using chunk text, extracted entities, and both levels of summaries.
 *
 * - Fetches chunk node text, summary, super-chunk summary, and extracted entities.
 * - Calls the relationship extraction service for each chunk.
 * - Stores extracted relationships in the knowledge graph, linked to the chunk node and entities.
 *
 * @param input - Chunk node IDs and context
 * @returns Array of extracted relationships for each chunk
 *
 * @example
 * const result = await aiRelationshipExtraction({
 *   chunkNodeIds: ['chunk1', 'chunk2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function aiRelationshipExtraction(input: AiRelationshipExtractionInput): Promise<AiRelationshipExtractionResult> {
    const { chunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const relationshipsByChunk: Array<{ chunkNodeId: string; relationships: RelationshipExtraction[] }> = [];
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
            robustSummary?: string;
        } | null;
        // Prefer robustSummary, fallback to summaries.detailed
        const robustSummary = superChunkNode?.robustSummary || superChunkNode?.summaries?.detailed;
        if (!superChunkNode || !robustSummary) {
            throw new Error(`Super-chunk node ${chunkNode.metadata.superChunkId} missing robust summary.`);
        }
        // Fetch extracted entities for this chunk
        const entities = await getEntitiesByChunkId(chunkNodeId);
        // Extract relationships using the relationship extraction service
        // NOTE: Replace with your actual relationship extraction function/service
        // Only pass allowed options to aiExtractRelationshipsFromChunk
        const relationships = await aiExtractRelationshipsFromChunk(
            entities,
            chunkNode.content.fullText,
            {
                universeId
                // Add model if needed, e.g., model: 'gpt-4',
            }
        );
        // Store extracted relationships and link to chunk node and entities
        for (const relationship of relationships.relationships || []) {
            await createRelationshipNode({
                ...relationship,
                chunkNodeId,
                universeId,
                bookId,
                chapterId,
                submittedBy,
            });
        }
        relationshipsByChunk.push({ chunkNodeId, relationships: relationships.relationships || [] });
    }
    return { relationshipsByChunk };
}

/**
 * Edge Cases:
 * - If a chunk or super-chunk node is missing required data, an error is thrown.
 * - If relationship extraction fails, an error is thrown.
 * - Relationships are stored as nodes linked to the chunk node and entities.
 */
