/**
 * Aggregates all relevant context for a character node for memory generation.
 * This includes dialogue, lore, relationships, timeline markers, and narrative summaries.
 *
 * @param characterNodeId - The ID of the character node
 * @param universeId - The universe ID
 * @param sessionId - The pipeline session ID (optional, for session-scoped aggregation)
 * @param services - An object containing required service functions (dependency injection for testability)
 * @returns AggregatedCharacterContext
 */
import type { RAGNode } from '../rag/core/types.js';

export interface AggregatedCharacterContext {
    character: RAGNode;
    dialogue: RAGNode[];
    lore: RAGNode[];
    relationships: RAGNode[];
    timelineMarkers: RAGNode[];
    chunkSummaries: string[];
    superChunkSummaries: string[];
    previousMemories: RAGNode[];
}

export interface CharacterContextServices {
    getNodeById: (id: string) => Promise<RAGNode | null>;
    getDialogueForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<RAGNode[]>;
    getLoreForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<RAGNode[]>;
    getRelationshipsForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<RAGNode[]>;
    getTimelineMarkersForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<RAGNode[]>;
    getChunkSummariesForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<string[]>;
    getSuperChunkSummariesForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<string[]>;
    getPreviousMemoriesForCharacter: (characterId: string, universeId: string, sessionId?: string) => Promise<RAGNode[]>;
}

export async function aggregateCharacterContext(
    characterNodeId: string,
    universeId: string,
    sessionId: string | undefined,
    services: CharacterContextServices
): Promise<AggregatedCharacterContext> {
    const character = await services.getNodeById(characterNodeId);
    if (!character) throw new Error(`Character node not found: ${characterNodeId}`);

    const [
        dialogue,
        lore,
        relationships,
        timelineMarkers,
        chunkSummaries,
        superChunkSummaries,
        previousMemories
    ] = await Promise.all([
        services.getDialogueForCharacter(characterNodeId, universeId, sessionId),
        services.getLoreForCharacter(characterNodeId, universeId, sessionId),
        services.getRelationshipsForCharacter(characterNodeId, universeId, sessionId),
        services.getTimelineMarkersForCharacter(characterNodeId, universeId, sessionId),
        services.getChunkSummariesForCharacter(characterNodeId, universeId, sessionId),
        services.getSuperChunkSummariesForCharacter(characterNodeId, universeId, sessionId),
        services.getPreviousMemoriesForCharacter(characterNodeId, universeId, sessionId)
    ]);

    return {
        character,
        dialogue,
        lore,
        relationships,
        timelineMarkers,
        chunkSummaries,
        superChunkSummaries,
        previousMemories
    };
}

/**
 * Example usage:
 *
 * const context = await aggregateCharacterContext(
 *   characterId,
 *   universeId,
 *   sessionId,
 *   {
 *     getNodeById,
 *     getDialogueForCharacter,
 *     getLoreForCharacter,
 *     getRelationshipsForCharacter,
 *     getTimelineMarkersForCharacter,
 *     getChunkSummariesForCharacter,
 *     getSuperChunkSummariesForCharacter,
 *     getPreviousMemoriesForCharacter
 *   }
 * );
 */
