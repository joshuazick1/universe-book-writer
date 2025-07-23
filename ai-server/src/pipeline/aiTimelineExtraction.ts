/**
 * aiTimelineExtraction.ts
 *
 * Pipeline step: AI Timeline Extraction (Pass 5)
 *
 * This function extracts timeline markers for narrative structure using robust super-chunk summary, all brief summaries in the group, and relevant entity/lore context.
 *
 * @module pipeline/aiTimelineExtraction
 */

import { getNodeById, updateNode } from '../services/ragNodeService.js';
import { getChunksBySuperChunkId } from '../services/getChunksBySuperChunkId.js';
import { getEntityLoreContextBySuperChunkId } from '../services/getEntityLoreContextBySuperChunkId.js';
import { aiExtractLoreFromChunk } from '../services/loreExtractor.js';

/**
 * Input for aiTimelineExtraction pipeline step.
 */
export interface AiTimelineExtractionInput {
    readonly superChunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for aiTimelineExtraction pipeline step.
 */
export interface AiTimelineExtractionResult {
    readonly timelinesBySuperChunk: Array<{
        superChunkNodeId: string;
        timelineMarkers: TimelineMarker[];
    }>;
}

/**
 * Timeline marker structure.
 */
export interface TimelineMarker {
    readonly id: string;
    readonly label: string;
    readonly timestamp?: string;
    readonly description?: string;
    readonly relatedEntities?: string[];
}

/**
 * Extracts timeline markers for each super-chunk.
 *
 * - Fetches robust super-chunk summary, all brief summaries in the group, and relevant entity/lore context.
 * - Calls the timeline extraction service for each super-chunk.
 * - Stores the timeline markers with the super-chunk node.
 *
 * @param input - Super-chunk node IDs and context
 * @returns Array of timeline markers for each super-chunk
 *
 * @example
 * const result = await aiTimelineExtraction({
 *   superChunkNodeIds: ['sc1', 'sc2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function aiTimelineExtraction(input: AiTimelineExtractionInput): Promise<AiTimelineExtractionResult> {
    const { superChunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const timelinesBySuperChunk: Array<{
        superChunkNodeId: string;
        timelineMarkers: TimelineMarker[];
    }> = [];
    for (const superChunkNodeId of superChunkNodeIds) {
        const superChunkNode = await getNodeById(superChunkNodeId) as {
            robustSummary?: string;
            summaries?: { detailed?: string };
            metadata?: any;
        } | null;
        // Prefer robustSummary, fallback to summaries.detailed
        const robustSummary = superChunkNode?.robustSummary || superChunkNode?.summaries?.detailed;
        if (!superChunkNode || !robustSummary) {
            throw new Error(`Super-chunk node ${superChunkNodeId} missing robust summary.`);
        }
        // Fetch all brief summaries in the group
        const chunkNodes = await getChunksBySuperChunkId(superChunkNodeId);
        const briefSummaries = chunkNodes.map((c: any) => c.summaries?.brief).filter(Boolean);
        // Fetch relevant entity/lore context (optional, can be extended)
        const entityLoreContext = await getEntityLoreContextBySuperChunkId(superChunkNodeId);
        // Extract timeline markers using the AI lore extractor (filter for timeline_marker type)
        const loreResults = await aiExtractLoreFromChunk(
            robustSummary,
            { universeId, priorSummaries: briefSummaries }
        );
        const timelineMarkers = Array.isArray(loreResults)
            ? loreResults.filter((item: any) => item.type === 'timeline_marker')
            : [];
        // Store the timeline markers with the super-chunk node (merge with existing metadata)
        await updateNode(superChunkNodeId, {
            metadata: {
                ...(superChunkNode?.metadata || {}),
                timelineMarkers
            }
        });
        timelinesBySuperChunk.push({ superChunkNodeId, timelineMarkers });
    }
    return { timelinesBySuperChunk };
}

/**
 * Edge Cases:
 * - If a super-chunk node is missing robust summary, an error is thrown.
 * - If timeline extraction fails, an error is thrown.
 * - Timeline markers are stored as properties on the super-chunk node.
 */
