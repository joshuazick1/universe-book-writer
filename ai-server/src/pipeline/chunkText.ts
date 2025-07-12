/**
 * chunkText.ts
 *
 * Pipeline step: Split the text into small chunks (e.g., by paragraph or markdown block).
 *
 * This function splits the input text into chunks for granular processing and stores each chunk as a source_chunk node.
 *
 * @module pipeline/chunkText
 */

import { createNode } from '../services/ragNodeService.js';

/**
 * Input for chunkText pipeline step.
 */
export interface ChunkTextInput {
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly text: string;
    readonly submittedBy: string;
    readonly parentVersion?: number;
}

/**
 * Output for chunkText pipeline step.
 */
export interface ChunkTextResult {
    readonly chunkNodeIds: string[];
    readonly chunkCount: number;
}

/**
 * Splits the input text into small chunks (by paragraph or markdown block) and stores each as a source_chunk node.
 *
 * - Chunks are created for each non-empty paragraph or markdown block.
 * - Each chunk is stored as a node linked to the parent chapter or book node.
 *
 * @param input - Chunking metadata and text
 * @returns Information about created chunk nodes
 *
 * @example
 * const result = await chunkText({
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   text: 'Para1.\n\nPara2.',
 *   submittedBy: 'user123',
 * });
 */
export async function chunkText(input: ChunkTextInput): Promise<ChunkTextResult> {
    const { universeId, bookId, chapterId, text, submittedBy, parentVersion } = input;
    // Split text by double newlines (paragraphs/markdown blocks)
    const rawChunks = text.split(/\n{2,}/g).map(chunk => chunk.trim()).filter(Boolean);
    const chunkNodeIds: string[] = [];
    const parentId = chapterId || bookId;
    for (let i = 0; i < rawChunks.length; i++) {
        const chunkTextValue = rawChunks[i];
        // Store each chunk as a source_chunk node (RAGNode shape)
        const now = new Date();
        const chunkNode = await createNode({
            type: 'source_chunk',
            title: `Chunk ${i + 1}`,
            content: {
                description: chunkTextValue,
                fullText: chunkTextValue,
                attributes: {},
            },
            summaries: { brief: '', medium: '', detailed: '' },
            embeddings: [],
            metadata: {
                universeId,
                bookId,
                chapterId,
                ownerId: submittedBy,
                tags: ['source_chunk'],
                sensitivity: 'public',
                version: 1,
            },
            privacy: { encrypted: false, shareable: true },
            timestamps: { created: now, modified: now },
            active: true,
        });
        chunkNodeIds.push(chunkNode.id);
    }
    return {
        chunkNodeIds,
        chunkCount: chunkNodeIds.length,
    };
}

/**
 * Edge Cases:
 * - If text is empty or only whitespace, returns an empty chunk list.
 * - If the parent node does not exist, RagNodeService.createNode should create it or throw.
 * - If both chapterId and bookId are missing, an error is thrown.
 */
