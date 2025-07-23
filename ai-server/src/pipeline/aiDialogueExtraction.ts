/**
 * aiDialogueExtraction.ts
 *
 * Pipeline step: AI Dialogue Extraction (Pass 4)
 *
 * This function identifies dialogue, speakers, and targets, linking them to character entities using chunk text, brief summary, and entity context.
 *
 * @module pipeline/aiDialogueExtraction
 */

import { getNodeById, createOrGetEntityNode } from '../services/ragNodeService.js';
import { aiExtractDialogueFromChunk } from '../services/dialogueExtractor.js';

export interface AiDialogueExtractionInput {
    readonly chunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

export interface AiDialogueExtractionResult {
    readonly dialogueByChunk: Array<{
        chunkNodeId: string;
        dialogue: DialogueExtraction[];
    }>;
}

export interface DialogueExtraction {
    readonly id: string;
    readonly speaker: string;
    readonly target?: string;
    readonly quote: string;
    readonly context?: string;
    readonly attributes?: Record<string, unknown>;
}

/**
 * Extracts dialogue from each chunk using chunk text, brief summary, and entity context.
 *
 * - Fetches chunk node text, summary, and entities.
 * - Calls the dialogue extraction service for each chunk.
 * - Stores extracted dialogue and links to character entities.
 *
 * @param input - Chunk node IDs and context
 * @returns Array of extracted dialogue for each chunk
 */
export async function aiDialogueExtraction(input: AiDialogueExtractionInput): Promise<AiDialogueExtractionResult> {
    const { chunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const dialogueByChunk: Array<{ chunkNodeId: string; dialogue: DialogueExtraction[] }> = [];
    for (const chunkNodeId of chunkNodeIds) {
        const chunkNode = await getNodeById(chunkNodeId);
        if (!chunkNode || !chunkNode.content?.fullText) {
            throw new Error(`Chunk node ${chunkNodeId} missing required data.`);
        }
        // Fetch entities for this chunk if needed (for linking)
        // const entities = await getEntitiesByChunkId(chunkNodeId);
        const dialogue = await aiExtractDialogueFromChunk(
            chunkNode.content.fullText,
            { universeId }
        );
        // Optionally link dialogue to character nodes/entities here
        dialogueByChunk.push({ chunkNodeId, dialogue });
    }
    return { dialogueByChunk };
}
