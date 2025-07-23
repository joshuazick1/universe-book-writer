/**
 * summarizeSuperChunk.ts
 *
 * Pipeline step: Generate a robust AI summary for each super-chunk.
 *
 * This function generates a robust summary for each super-chunk node and stores it with the super-chunk node.
 *
 * @module pipeline/summarizeSuperChunk
 */

import { getNodeById, updateNode } from '../services/ragNodeService.js';
import { aiSummarizeChunk } from '../services/aiSummarizer.js';

/**
 * Input for summarizeSuperChunk pipeline step.
 */
export interface SummarizeSuperChunkInput {
    readonly superChunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for summarizeSuperChunk pipeline step.
 */
export interface SummarizeSuperChunkResult {
    readonly summaries: Array<{
        superChunkNodeId: string;
        summary: string;
    }>;
}

/**
 * Generates a robust AI summary for each super-chunk and stores it with the super-chunk node.
 *
 * - Fetches each super-chunk node's text (aggregated chunk text if needed).
 * - Calls the summarization service for each super-chunk.
 * - Stores the robust summary with the super-chunk node (as a property or metadata).
 *
 * @param input - Super-chunk node IDs and context
 * @returns Array of robust summaries for each super-chunk
 *
 * @example
 * const result = await summarizeSuperChunk({
 *   superChunkNodeIds: ['sc1', 'sc2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function summarizeSuperChunk(input: SummarizeSuperChunkInput): Promise<SummarizeSuperChunkResult> {
    const { superChunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const summaries: Array<{ superChunkNodeId: string; summary: string }> = [];
    for (const superChunkNodeId of superChunkNodeIds) {
        const superChunkNode = await getNodeById(superChunkNodeId);
        const superChunkText = superChunkNode?.content?.fullText || superChunkNode?.content?.description;
        if (!superChunkNode || !superChunkText) {
            throw new Error(`Super-chunk node ${superChunkNodeId} not found or missing text.`);
        }
        // Generate robust summary using the AI summarizer
        const { summary } = await aiSummarizeChunk(superChunkText, { universeId });
        // Store the robust summary in summaries.detailed and also in content.attributes.robustSummary for plugin compatibility
        const newSummaries = { ...(superChunkNode.summaries || {}), detailed: summary };
        const newContent = {
            ...(superChunkNode.content || {}),
            attributes: {
                ...((superChunkNode.content && superChunkNode.content.attributes) || {}),
                robustSummary: summary,
            },
        };
        await updateNode(superChunkNodeId, { summaries: newSummaries, content: newContent });
        summaries.push({ superChunkNodeId, summary });
    }
    return { summaries };
}

/**
 * Edge Cases:
 * - If a super-chunk node is missing or has no text, an error is thrown.
 * - If summarization fails, an error is thrown.
 * - Robust summaries are stored as a property on the super-chunk node.
 */
