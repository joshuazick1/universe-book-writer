/**
 * Links character_memory nodes in the knowledge graph according to the pipeline plan.
 *
 * For each character_memory node:
 *   - Link to the corresponding character node (type: 'memory_of')
 *   - If part of a shared event, link to the shared_memory node (type: 'perspective_on')
 *   - Link to related events, dialogue, or lore nodes as appropriate (type: 'memory_of_event', 'memory_of_dialogue', 'memory_of_lore')
 *
 * @param characterMemories - Array of character_memory nodes
 * @param characterNodes - Array of character nodes
 * @param sharedMemoryMap - Map from eventId to sharedMemoryNodeId
 * @param events - Array of event nodes
 * @param linkNodes - Function to create a relationship between nodes
 */
import type { RAGNode } from '../rag/core/types.js';

export async function linkCharacterMemories(
    characterMemories: RAGNode[],
    characterNodes: RAGNode[],
    sharedMemoryMap: Record<string, string>,
    events: RAGNode[],
    linkNodes: (fromId: string, toId: string, type: string, meta?: any) => Promise<void>
) {
    for (const memory of characterMemories) {
        // Link to character node
        const charId = memory.content?.attributes?.characterId;
        if (charId && characterNodes.some(c => c.id === charId)) {
            await linkNodes(memory.id, charId, 'memory_of', { description: 'Personal memory for character' });
        }
        // Link to shared memory node if applicable
        const eventId = memory.content?.attributes?.eventId;
        const sharedMemoryId = eventId ? sharedMemoryMap[eventId] : undefined;
        if (sharedMemoryId) {
            await linkNodes(memory.id, sharedMemoryId, 'perspective_on', { description: 'Perspective on shared event' });
        }
        // Link to event
        if (eventId && events.some(e => e.id === eventId)) {
            await linkNodes(memory.id, eventId, 'memory_of_event', { description: 'Memory of event' });
        }
        // Optionally, link to related dialogue or lore nodes (if available in attributes)
        const dialogueIds: string[] = memory.content?.attributes?.dialogueIds || [];
        for (const dId of dialogueIds) {
            await linkNodes(memory.id, dId, 'memory_of_dialogue', { description: 'Memory of dialogue' });
        }
        const loreIds: string[] = memory.content?.attributes?.loreIds || [];
        for (const lId of loreIds) {
            await linkNodes(memory.id, lId, 'memory_of_lore', { description: 'Memory of lore' });
        }
    }
}
