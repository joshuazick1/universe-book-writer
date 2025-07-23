import { CharacterMemoryManager } from './textToRagParser/memory/characterMemoryManager.js';
import { DatabaseManager } from './textToRagParser/storage/databaseManager.js';
import fetch from 'node-fetch';

/**
 * Aggregates a character's actions, dialogue, and experiences, then uses the LLM to generate memory objects.
 * @param characterNode The character node (RAGNode)
 * @param events Array of related events (actions, dialogue, etc.)
 * @param opts { model, universeId }
 * @returns Array of created CharacterMemory objects
 */
export async function aiGenerateCharacterMemories(
    characterNode: any,
    events: { type: string; content: string; context?: string }[],
    opts: { model?: string; universeId: string }
): Promise<any[]> {
    const model = opts.model || 'default-model';
    const dbManager = new DatabaseManager();
    const memoryManager = new CharacterMemoryManager(dbManager);

    // Aggregate narrative for LLM
    const narrative = events.map(e => `- [${e.type}] ${e.content}${e.context ? ` (Context: ${e.context})` : ''}`).join('\n');
    const prompt = `You are an expert in character psychology. Given the following character and their story events, generate a set of memory objects as if the character is reflecting on their own experiences.\n\nCharacter: ${characterNode.title}\nDescription: ${characterNode.content.description}\n\nEvents:\n${narrative}\n\nFor each memory, return a JSON object with:\n- memoryType ('trait', 'relationship', 'event', 'knowledge', 'dialogue', or 'emotion')\n- content (the memory as the character would recall it)\n- importance (0-1)\n- related_entities (array of names)\n- tags (array of strings)\n`;

    let memories: any[] = [];
    try {
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        memories = typeof data.response === 'string' ? JSON.parse(data.response) : [];
    } catch (err) {
        // fallback: no memories generated
        memories = [];
    }

    // Store each memory using the memory manager
    const created: any[] = [];
    for (const mem of memories) {
        try {
            const createdMem = await memoryManager.createBookMemory(
                characterNode.id,
                mem.memoryType,
                mem.content,
                undefined,
                undefined,
                mem.related_entities || []
            );
            created.push(createdMem);
        } catch (e) {
            // skip failed memory
        }
    }
    return created;
}
