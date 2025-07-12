/**
 * groupChunks.ts
 *
 * Pipeline step: Group every 3–5 chunks into a super-chunk.
 *
 * This function groups chunk node IDs into super-chunks and stores grouping information.
 *
 * @module pipeline/groupChunks
 */

export interface GroupChunksInput {
    readonly chunkNodeIds: string[];
    readonly groupSize?: number; // default 3
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

export interface GroupChunksResult {
    readonly superChunkGroups: string[][];
}

/**
 * Groups chunk node IDs into super-chunks of configurable size.
 * @param input - Grouping metadata and chunk node IDs
 * @returns Array of super-chunk groups (each is an array of chunkNodeIds)
 */
export function groupChunks(input: GroupChunksInput): GroupChunksResult {
    const { chunkNodeIds, groupSize = 3 } = input;
    const superChunkGroups: string[][] = [];
    for (let i = 0; i < chunkNodeIds.length; i += groupSize) {
        superChunkGroups.push(chunkNodeIds.slice(i, i + groupSize));
    }
    return { superChunkGroups };
}
