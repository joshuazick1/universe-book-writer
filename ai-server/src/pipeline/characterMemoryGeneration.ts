/**
 * characterMemoryGeneration.ts
 *
 * Pipeline step: Character Memory Generation (Pass 6)
 *
 * This function generates character memories and perspectives for use in future story development, using aggregated events (dialogue, lore, relationships) linked to each character from previous passes.
 *
 * @module pipeline/characterMemoryGeneration
 */

import { getEventsByCharacterId, updateNode } from '../services/ragNodeService.js';
import { aiGenerateCharacterMemories } from '../services/aiGenerateCharacterMemories.js';

/**
 * Input for characterMemoryGeneration pipeline step.
 */
export interface CharacterMemoryGenerationInput {
    readonly characterNodeIds: string[];
    readonly universeId: string;
    readonly bookId: string;
    readonly chapterId?: string;
    readonly submittedBy: string;
}

/**
 * Output for characterMemoryGeneration pipeline step.
 */
export interface CharacterMemoryGenerationResult {
    readonly memoriesByCharacter: Array<{
        characterNodeId: string;
        memory: CharacterMemory;
    }>;
}

/**
 * Character memory structure.
 */
export interface CharacterMemory {
    readonly summary: string;
    readonly events: Array<{
        type: string;
        description: string;
        relatedEntities?: string[];
        sourceText?: string;
        timestamp?: string;
    }>;
    readonly perspective?: string;
}

/**
 * Generates character memories and perspectives for each character node.
 *
 * - Fetches all events (dialogue, lore, relationships) linked to the character.
 * - Calls the character memory service for each character.
 * - Stores the generated memory with the character node.
 *
 * @param input - Character node IDs and context
 * @returns Array of generated memories for each character
 *
 * @example
 * const result = await characterMemoryGeneration({
 *   characterNodeIds: ['char1', 'char2'],
 *   universeId: 'u1',
 *   bookId: 'b1',
 *   chapterId: 'c1',
 *   submittedBy: 'user123',
 * });
 */
export async function characterMemoryGeneration(input: CharacterMemoryGenerationInput): Promise<CharacterMemoryGenerationResult> {
    const { characterNodeIds, universeId, bookId, chapterId, submittedBy } = input;
    const memoriesByCharacter: Array<{ characterNodeId: string; memory: CharacterMemory }> = [];
    for (const characterNodeId of characterNodeIds) {
        // Fetch all events linked to the character
        const events = await getEventsByCharacterId(characterNodeId);
        // Fetch the character node (for title/description and content)
        const characterNode = await (await import('../services/ragNodeService.js')).getNodeById(characterNodeId);
        // Generate character memories using the AI service
        const memories = await aiGenerateCharacterMemories(
            characterNode,
            events,
            { universeId }
        );
        // Merge new memories into existing content.attributes
        const existingContent = characterNode?.content || { description: '' };
        const existingAttributes = existingContent.attributes || {};
        const newContent = {
            ...existingContent,
            attributes: {
                ...existingAttributes,
                memories
            }
        };
        await updateNode(characterNodeId, { content: newContent });
        for (const memory of memories) {
            memoriesByCharacter.push({ characterNodeId, memory });
        }
    }
    return { memoriesByCharacter };
}

/**
 * Edge Cases:
 * - If a character node has no events, memory is generated from an empty event list.
 * - If memory generation fails, an error is thrown.
 * - Memories are stored as a property on the character node.
 */
