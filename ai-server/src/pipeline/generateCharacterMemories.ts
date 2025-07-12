/**
 * Generates personalized character memory nodes for each character involved in an event (shared or solo).
 *
 * For each character, creates a `character_memory` node with a first-person, subjective summary of the event,
 * emotional state, thoughts, and possible biases. Links to the `shared_memory` node (if applicable), the character node,
 * and optionally to related events or previous memories.
 *
 * @param characters - Array of character nodes
 * @param events - Array of event nodes (lore, dialogue, timeline, etc.)
 * @param sharedMemoryMap - Map from eventId to sharedMemoryNodeId (if event is shared)
 * @param createNode - Function to create a node in the knowledge graph
 * @param linkNodes - Function to create a relationship between nodes
 * @param generateMemoryText - Function to generate the memory text (AI or template-based)
 * @returns Array of created character memory nodes
 */
import type { RAGNode } from '../rag/core/types.js';

export interface CharacterMemoryInput {
    character: RAGNode;
    event: RAGNode;
    sharedMemoryId?: string;
    previousMemories?: RAGNode[];
}

export async function generateCharacterMemories(
    characters: RAGNode[],
    events: RAGNode[],
    sharedMemoryMap: Record<string, string>,
    createNode: (node: Partial<RAGNode>) => Promise<RAGNode>,
    linkNodes: (fromId: string, toId: string, type: string, meta?: any) => Promise<void>,
    generateMemoryText: (input: CharacterMemoryInput) => Promise<string>
): Promise<RAGNode[]> {
    const characterMemories: RAGNode[] = [];
    for (const event of events) {
        // Find all involved character IDs for this event
        const involvedIds: string[] = Array.isArray(event.content?.attributes?.involved_entities)
            ? event.content.attributes.involved_entities
            : [];
        for (const charId of involvedIds) {
            const character = characters.find(c => c.id === charId);
            if (!character) continue;
            const sharedMemoryId = sharedMemoryMap[event.id];
            // Optionally, fetch previous memories for this character
            // (Assume previousMemories is handled externally or can be injected)
            const memoryText = await generateMemoryText({
                character,
                event,
                sharedMemoryId
            });
            const characterMemory = await createNode({
                type: 'character_memory',
                title: `${character.title}: Memory of ${event.title || event.id}`,
                content: {
                    description: memoryText,
                    attributes: {
                        eventId: event.id,
                        sharedMemoryId,
                        characterId: character.id
                    }
                },
                metadata: {
                    ...event.metadata
                    // Optionally, add characterId as a custom attribute in content.attributes if needed
                },
                privacy: event.privacy,
                timestamps: { created: new Date(), modified: new Date() },
                active: true
            });
            characterMemories.push(characterMemory);
            // Link to character node
            await linkNodes(characterMemory.id, character.id, 'memory_of', { description: 'Personal memory for character' });
            // Link to shared memory node if applicable
            if (sharedMemoryId) {
                await linkNodes(characterMemory.id, sharedMemoryId, 'perspective_on', { description: 'Perspective on shared event' });
            }
            // Link to event
            await linkNodes(characterMemory.id, event.id, 'memory_of_event', { description: 'Memory of event' });
        }
    }
    return characterMemories;
}
