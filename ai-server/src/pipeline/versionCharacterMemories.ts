/**
 * Persists and versions all generated character memory nodes in the knowledge graph.
 *
 * For each character_memory node:
 *   - If a previous version exists (by characterId + eventId), create a new version and link to the previous version.
 *   - Otherwise, store as the initial version.
 *   - Updates version metadata for auditability and future updates.
 *
 * @param characterMemories - Array of character_memory nodes
 * @param findPreviousMemory - Function to find previous memory node by characterId and eventId
 * @param updateNode - Function to update a node in the knowledge graph
 * @param linkNodes - Function to create a relationship between nodes
 * @returns Array of updated character_memory nodes (with version info)
 */
import type { RAGNode } from '../rag/core/types.js';

export async function versionCharacterMemories(
    characterMemories: RAGNode[],
    findPreviousMemory: (characterId: string, eventId: string) => Promise<RAGNode | null>,
    updateNode: (id: string, update: Partial<RAGNode>) => Promise<RAGNode>,
    linkNodes: (fromId: string, toId: string, type: string, meta?: any) => Promise<void>
): Promise<RAGNode[]> {
    const updatedMemories: RAGNode[] = [];
    for (const memory of characterMemories) {
        const characterId = memory.content?.attributes?.characterId;
        const eventId = memory.content?.attributes?.eventId;
        if (!characterId || !eventId) {
            updatedMemories.push(memory);
            continue;
        }
        const prev = await findPreviousMemory(characterId, eventId);
        let version = 1;
        let prevId: string | undefined;
        if (prev) {
            version = (prev.metadata?.version || 1) + 1;
            prevId = prev.id;
            // Link new version to previous version
            await linkNodes(memory.id, prev.id, 'version_of', { description: 'Previous version of memory' });
        }
        // Update version metadata
        const updated = await updateNode(memory.id, {
            metadata: {
                ...memory.metadata,
                version
            }
        });
        updatedMemories.push(updated);
    }
    return updatedMemories;
}
