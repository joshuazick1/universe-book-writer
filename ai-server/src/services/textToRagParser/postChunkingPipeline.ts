
import * as ragNodeService from '../../services/ragNodeService.js';
import { aiSummarizeChunk } from '../../services/aiSummarizer.js';
import { aiExtractEntitiesFromChunk } from '../../services/entityExtractor.js';
import { aiExtractRelationshipsFromChunk } from '../../services/relationshipExtractor.js';
import { aiExtractLoreFromChunk } from '../../services/loreExtractor.js';
import { aiExtractDialogueFromChunk } from '../../services/dialogueExtractor.js';
import { aiClassifyMoodAndThemeFromChunk } from '../../services/moodThemeClassifier.js';
import { aiGenerateCharacterMemories } from '../../services/aiGenerateCharacterMemories.js';
import type { RAGNode } from '../../rag/core/types.js';

/**
 * Run all post-chunking pipeline steps on a set of chunk nodes.
 * Ensures idempotency and runs a de-duplication step at the end.
 * @param chunks Array of chunk nodes
 * @param options { universeId: string, bookId: string }
 * @returns Promise<{ processed: number, deduplicated: number }>
 */
export async function runPostChunkingPipeline(
    chunks: RAGNode[],
    options: { universeId: string; bookId: string }
): Promise<{ processed: number; deduplicated: number }> {
    let processed = 0;
    for (const chunk of chunks) {
        // 1. Summarize chunk
        const summary = await aiSummarizeChunk(chunk.content?.fullText || '', { universeId: options.universeId });
        // 2. Extract entities
        const entities = await aiExtractEntitiesFromChunk(chunk.content?.fullText || '', { universeId: options.universeId });
        // 3. Extract relationships
        const relationships = await aiExtractRelationshipsFromChunk(entities, chunk.content?.fullText || '', { universeId: options.universeId });
        // 4. Extract lore/timeline
        const lore = await aiExtractLoreFromChunk(chunk.content?.fullText || '', { universeId: options.universeId });
        // 5. Extract dialogue
        const dialogue = await aiExtractDialogueFromChunk(chunk.content?.fullText || '', { universeId: options.universeId });
        // 6. Classify mood/theme
        const moodTheme = await aiClassifyMoodAndThemeFromChunk(chunk.content?.fullText || '', { universeId: options.universeId });
        // 7. Generate character memories (if any characters found)
        const characterEntities = Array.isArray(entities) ? entities.filter(e => e.type === 'character') : [];
        for (const char of characterEntities) {
            await aiGenerateCharacterMemories(char, dialogue, { universeId: options.universeId });
        }
        // --- Persist results to RAG ---
        await ragNodeService.updateNode(chunk.id, {
            summaries: { ...chunk.summaries, brief: summary.summary },
            content: {
                ...chunk.content,
                attributes: {
                    ...(chunk.content?.attributes ?? {}),
                    entities,
                    relationships,
                    lore,
                    dialogue,
                    moodTheme
                }
            }
        });
        processed++;
    }
    // Run de-duplication step
    const deduplicated = await deduplicateChunks(options.universeId, options.bookId);
    return { processed, deduplicated };
}

/**
 * De-duplicate chunk nodes for a given book/universe.
 * @returns number of duplicates removed
 */
export async function deduplicateChunks(universeId: string, bookId: string): Promise<number> {
    // Fetch all chunks
    const chunks = await ragNodeService.getChunksByBook(universeId, bookId);
    const seen = new Set<string>();
    let removed = 0;
    for (const chunk of chunks) {
        const key = chunk.title + '|' + (chunk.content?.fullText || '');
        if (seen.has(key)) {
            await ragNodeService.deleteNode(chunk.id);
            removed++;
        } else {
            seen.add(key);
        }
    }
    return removed;
}
