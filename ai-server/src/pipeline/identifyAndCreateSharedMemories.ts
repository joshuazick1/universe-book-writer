/**
 * Identifies shared events (involving multiple characters) and creates shared memory nodes.
 *
 * For each event with >1 character, creates a shared_memory node and links it to all involved characters.
 * Returns a list of created shared memory nodes and a mapping from eventId to sharedMemoryNodeId.
 *
 * @param events - Array of event nodes (lore, dialogue, timeline, etc.)
 * @param characterNodes - Array of character nodes
 * @param createNode - Function to create a node in the knowledge graph
 * @param linkNodes - Function to create a relationship between nodes
 * @returns { sharedMemories: RAGNode[], eventToSharedMemory: Record<string, string> }
 */
import type { RAGNode } from '../rag/core/types.js';

export interface SharedMemoryResult {
    sharedMemories: RAGNode[];
    eventToSharedMemory: Record<string, string>;
}

export async function identifyAndCreateSharedMemories(
    events: RAGNode[],
    characterNodes: RAGNode[],
    createNode: (node: Partial<RAGNode>) => Promise<RAGNode>,
    linkNodes: (fromId: string, toId: string, type: string, meta?: any) => Promise<void>
): Promise<SharedMemoryResult> {
    const sharedMemories: RAGNode[] = [];
    const eventToSharedMemory: Record<string, string> = {};

    for (const event of events) {
        // Find all involved character IDs for this event
        const involvedIds: string[] = Array.isArray(event.content?.attributes?.involved_entities)
            ? event.content.attributes.involved_entities.filter((id: string) => characterNodes.some(c => c.id === id))
            : [];
        if (involvedIds.length > 1) {
            // Create shared memory node
            const sharedMemory = await createNode({
                type: 'shared_memory',
                title: event.title ? `Shared: ${event.title}` : 'Shared Event',
                content: {
                    description: event.content?.description || '',
                    attributes: {
                        ...event.content?.attributes,
                        eventType: event.type,
                        eventId: event.id,
                        shared: true
                    }
                },
                metadata: {
                    ...event.metadata,
                    // Optionally, add eventId as a custom attribute if needed
                },
                privacy: event.privacy,
                timestamps: { created: new Date(), modified: new Date() },
                active: true
            });
            sharedMemories.push(sharedMemory);
            eventToSharedMemory[event.id] = sharedMemory.id;
            // Link shared memory to all involved characters
            for (const charId of involvedIds) {
                await linkNodes(sharedMemory.id, charId, 'shared_memory_of', { description: 'Shared memory for event', eventId: event.id });
            }
            // Optionally, link shared memory to the original event
            await linkNodes(sharedMemory.id, event.id, 'derived_from', { description: 'Shared memory derived from event' });
        }
    }
    return { sharedMemories, eventToSharedMemory };
}
