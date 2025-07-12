/**
 * summarizeChunk.ts
 *
 * Pipeline step: Generate a brief AI summary for each chunk.
 *
 * This function generates a brief summary for each source_chunk node and stores it with the chunk node.
 *
 * @module pipeline/summarizeChunk
 */

import { getNodeById, updateNode } from '../services/ragNodeService.js';
import { aiSummarizeChunk } from '../services/aiSummarizer.js';

/**
 * Input for summarizeChunk pipeline step.
 */
export interface SummarizeChunkInput {
    readonly chunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for summarizeChunk pipeline step.
 */
export interface SummarizeChunkResult {
    readonly summaries: Array<{
        chunkNodeId: string;
        summary: string;
    }>;
}

/**
 * Generates a brief AI summary for each chunk and stores it with the chunk node.
 *
 * - Fetches each chunk node's text.
 * - Calls the summarization service for each chunk.
 * - Stores the summary with the chunk node (as a property or metadata).
 *
 * @param input - Chunk node IDs and context
 * @returns Array of summaries for each chunk
 *
 * @example
 * const result = await summarizeChunk({
 *   chunkNodeIds: ['chunk1', 'chunk2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function summarizeChunk(input: SummarizeChunkInput): Promise<SummarizeChunkResult> {
    const { chunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const summaries: Array<{ chunkNodeId: string; summary: string }> = [];
    for (const chunkNodeId of chunkNodeIds) {
        const chunkNode = await getNodeById(chunkNodeId);
        const chunkText = chunkNode?.content?.fullText || chunkNode?.content?.description;
        if (!chunkNode || !chunkText) {
            throw new Error(`Chunk node ${chunkNodeId} not found or missing text.`);
        }
        // Generate summary using the AI summarizer
        const { summary } = await aiSummarizeChunk(chunkText, { universeId });
        // Store the summary in summaries.brief
        const newSummaries = { ...(chunkNode.summaries || {}), brief: summary };
        await updateNode(chunkNodeId, { summaries: newSummaries });
        summaries.push({ chunkNodeId, summary });
    }
    return { summaries };
}

/**
 * Edge Cases:
 * - If a chunk node is missing or has no text, an error is thrown.
 * - If summarization fails, an error is thrown.
 * - Summaries are stored as a property on the chunk node.
 */
