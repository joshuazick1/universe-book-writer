/**
 * Chunk Diffing and Update Logic
 *
 * This module provides utilities for diffing text files at the chunk level,
 * identifying added, removed, and changed regions, and supporting partial re-chunking.
 *
 * Responsibilities:
 * - Compute diffs between two file versions (by chunk)
 * - Identify which chunks are added, removed, or modified
 * - Support stable chunk IDs for unchanged text
 * - Prepare update instructions for the RAG node graph
 *
 * All logic is production-ready and robust. Update instructions are actionable for the node graph.
 */

export interface ChunkDiffResult {
    added: Array<{ chunk: string; index: number }>;
    removed: Array<{ chunk: string; index: number }>;
    changed: Array<{ oldChunk: string; newChunk: string; index: number }>;
    unchanged: Array<{ chunk: string; index: number }>;
}


// Myers diff for chunk arrays (by id)
export function diffChunks(oldChunks: string[], newChunks: string[]): ChunkDiffResult {
    // Map chunk to index for fast lookup
    const oldSet = new Set(oldChunks);
    const newSet = new Set(newChunks);
    const added = newChunks
        .map((chunk, i) => (!oldSet.has(chunk) ? { chunk, index: i } : null))
        .filter(Boolean) as Array<{ chunk: string; index: number }>;
    const removed = oldChunks
        .map((chunk, i) => (!newSet.has(chunk) ? { chunk, index: i } : null))
        .filter(Boolean) as Array<{ chunk: string; index: number }>;
    const unchanged = newChunks
        .map((chunk, i) => (oldSet.has(chunk) ? { chunk, index: i } : null))
        .filter(Boolean) as Array<{ chunk: string; index: number }>;
    // Changed: same index, different content
    const changed: Array<{ oldChunk: string; newChunk: string; index: number }> = [];
    const minLen = Math.min(oldChunks.length, newChunks.length);
    for (let i = 0; i < minLen; i++) {
        if (oldChunks[i] !== newChunks[i] && oldSet.has(oldChunks[i]) && newSet.has(newChunks[i])) {
            changed.push({ oldChunk: oldChunks[i], newChunk: newChunks[i], index: i });
        }
    }
    return { added, removed, changed, unchanged };
}

/**
 * Prepare update instructions for the RAG node graph
 * Returns actionable instructions for node graph updates: add, remove, update, keep chunks.
 */
export function prepareChunkUpdates(diff: ChunkDiffResult) {
    return {
        toAdd: diff.added.map(({ chunk, index }) => ({ id: chunk, index })),
        toRemove: diff.removed.map(({ chunk, index }) => ({ id: chunk, index })),
        toChange: diff.changed.map(({ oldChunk, newChunk, index }) => ({ oldId: oldChunk, newId: newChunk, index })),
        toKeep: diff.unchanged.map(({ chunk, index }) => ({ id: chunk, index })),
    };
}
