
import type { Character } from '../models/Character.js';
import { fetchCharacters, createCharacter, updateCharacter, deleteCharacter } from '../repositories/ragNodeRepository.js';
import { deduplicateCharacterCandidates, enforceCanonicalCharacterNode } from './textToRagParser/utils/aiDeduplicationHelper.js';
import type { EnhancedParsedEntity } from './textToRagParser/core/interfaces.js';

/**
 * Heuristic deduplication for character candidates.
 * Merges by lowercased name and aliases, aggregates appearances.
 * @param candidates
 * @param context
 */
export function heuristicDeduplicateCharacters(
    candidates: EnhancedParsedEntity[],
    context: { universeId: string; bookId?: string; chapterId?: string }
): Promise<EnhancedParsedEntity[]> {
    return deduplicateCharacterCandidates(candidates, context);
}

/**
 * AI-powered deduplication for character candidates (stub for future extension).
 * @param candidates
 * @param context
 */
export async function aiDeduplicateCharacters(
    candidates: EnhancedParsedEntity[],
    context: { universeId: string; bookId?: string; chapterId?: string }
): Promise<EnhancedParsedEntity[]> {
    // Use the real AI-powered deduplication logic
    // Replace with actual AI/ML model integration as needed
    const { aiDeduplicateCharacterCandidates } = await import('./textToRagParser/utils/aiDeduplicationHelper.js');
    return aiDeduplicateCharacterCandidates(candidates, context);
}

/**
 * Two-stage deduplication (heuristic, then AI-powered) and upsert for canonical character nodes.
 * Only valid, canonical nodes are persisted. Returns array of upserted Character objects.
 * @param candidates
 * @param context
 */
export async function upsertCanonicalCharacters(
    candidates: EnhancedParsedEntity[],
    context: { universeId: string; bookId?: string; chapterId?: string }
): Promise<Character[]> {
    // Stage 1: Heuristic deduplication
    const heuristicDeduped = await heuristicDeduplicateCharacters(candidates, context);
    // Stage 2: AI-powered deduplication (stub)
    const aiDeduped = await aiDeduplicateCharacters(heuristicDeduped, context);
    const upserted: Character[] = [];
    for (const c of aiDeduped) {
        // Enforce canonical structure
        const canonical = enforceCanonicalCharacterNode(c, context);
        // Validate required fields
        if (
            canonical.id &&
            canonical.type === 'character' &&
            canonical.universeId &&
            canonical.title &&
            Array.isArray(canonical.appearanceBookIds) &&
            Array.isArray(canonical.appearanceChapterIds) &&
            Array.isArray(canonical.appearanceSectionIds)
        ) {
            try {
                // Persist (create or update)
                const result = await createCharacter({
                    id: canonical.id,
                    universeId: canonical.universeId,
                    name: canonical.title,
                    title: canonical.title,
                    type: 'character',
                    aliases: canonical.aliases || [],
                    description: canonical.description || '',
                    appearanceBookIds: canonical.appearanceBookIds || [],
                    appearanceChapterIds: canonical.appearanceChapterIds || [],
                    appearanceSectionIds: canonical.appearanceSectionIds || [],
                    metadata: canonical.metadata || {},
                });
                upserted.push(result);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[characterService] Error persisting canonical character node:', canonical, err);
            }
        } else {
            // Invalid node, skip and log
            // eslint-disable-next-line no-console
            console.error('[characterService] Skipping invalid canonical character node:', canonical);
        }
    }
    return upserted;
}

/**
 * Create a new character (no cache to invalidate).
 */
export async function createCharacterAndInvalidate(character: Character): Promise<Character> {
    return createCharacter(character);
}

/**
 * Update a character (no cache to invalidate).
 */
export async function updateCharacterAndInvalidate(id: string, update: Partial<Character>): Promise<boolean> {
    return updateCharacter(id, update);
}

/**
 * Delete a character (no cache to invalidate).
 */
export async function deleteCharacterAndInvalidate(id: string): Promise<boolean> {
    return deleteCharacter(id);
}

export interface CharacterQuery {
    universeId?: string;
    bookId?: string;
    chapterId?: string;
}

/**
 * Fetch all characters, optionally filtered by universe/book/chapter.
 * (No cache by default, but can be added if needed)
 */
export async function getCharacters(query: CharacterQuery): Promise<Character[]> {
    return fetchCharacters(query);
}

/**
 * Invalidate character cache (if implemented)
 */
export function invalidateCharacterCache() {
    // No-op for now
}
