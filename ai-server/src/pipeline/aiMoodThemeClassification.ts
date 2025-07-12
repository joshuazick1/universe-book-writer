/**
 * aiMoodThemeClassification.ts
 *
 * Pipeline step: AI Mood/Theme Classification (Pass 5)
 *
 * This function classifies mood, theme, and extracts timeline markers for narrative structure using robust super-chunk summary, all brief summaries in the group, and relevant entity/lore context.
 *
 * @module pipeline/aiMoodThemeClassification
 */

import { getNodeById, updateNode } from '../services/ragNodeService.js';
import { getChunksBySuperChunkId } from '../services/getChunksBySuperChunkId.js';
import { getEntityLoreContextBySuperChunkId } from '../services/getEntityLoreContextBySuperChunkId.js';
import { aiClassifyMoodThemeTimeline } from '../services/aiMoodThemeClassificationService.js';

/**
 * Input for aiMoodThemeClassification pipeline step.
 */
export interface AiMoodThemeClassificationInput {
    readonly superChunkNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for aiMoodThemeClassification pipeline step.
 */
export interface AiMoodThemeClassificationResult {
    readonly classificationsBySuperChunk: Array<{
        superChunkNodeId: string;
        mood: string;
        theme: string;
        timelineMarkers: string[];
    }>;
}

/**
 * Classifies mood, theme, and extracts timeline markers for each super-chunk.
 *
 * - Fetches robust super-chunk summary, all brief summaries in the group, and relevant entity/lore context.
 * - Calls the mood/theme classification service for each super-chunk.
 * - Stores the classification and timeline markers with the super-chunk node.
 *
 * @param input - Super-chunk node IDs and context
 * @returns Array of mood/theme/timeline classifications for each super-chunk
 *
 * @example
 * const result = await aiMoodThemeClassification({
 *   superChunkNodeIds: ['sc1', 'sc2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function aiMoodThemeClassification(input: AiMoodThemeClassificationInput): Promise<AiMoodThemeClassificationResult> {
    const { superChunkNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const classificationsBySuperChunk: Array<{
        superChunkNodeId: string;
        mood: string;
        theme: string;
        timelineMarkers: string[];
    }> = [];
    // ...existing code...

    for (const superChunkNodeId of superChunkNodeIds) {
        const superChunkNode = await getNodeById(superChunkNodeId);
        if (!superChunkNode || !superChunkNode.summaries?.detailed) {
            throw new Error(`Super-chunk node ${superChunkNodeId} missing robust summary.`);
        }
        // Fetch all brief summaries in the group
        const chunkNodes = await getChunksBySuperChunkId(superChunkNodeId);
        const briefSummaries = chunkNodes.map((c: any) => c.summaries?.brief).filter(Boolean);
        // Fetch relevant entity/lore context (optional, can be extended)
        const entityLoreContext = await getEntityLoreContextBySuperChunkId(superChunkNodeId);
        // Classify mood, theme, and extract timeline markers
        const { mood, theme, timelineMarkers } = await aiClassifyMoodThemeTimeline({
            robustSummary: superChunkNode.summaries.detailed,
            briefSummaries,
            entityLoreContext,
            universeId,
            bookId,
            chapterId,
            superChunkNodeId,
            submittedBy,
        });
        // Store the classification and timeline markers with the super-chunk node
        await updateNode(superChunkNodeId, {
            metadata: {
                ...superChunkNode.metadata,
                mood,
                theme,
                timelineMarkers,
            },
        });
        classificationsBySuperChunk.push({ superChunkNodeId, mood, theme, timelineMarkers });
    }
    return { classificationsBySuperChunk };
}

/**
 * Edge Cases:
 * - If a super-chunk node is missing robust summary, an error is thrown.
 * - If classification fails, an error is thrown.
 * - Classifications are stored as properties on the super-chunk node.
 */
