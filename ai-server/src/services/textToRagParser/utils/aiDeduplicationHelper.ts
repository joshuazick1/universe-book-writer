// ai-server/src/services/textToRagParser/utils/aiDeduplicationHelper.ts
import type { EnhancedParsedEntity } from '../core/interfaces.js';

/**
 * Heuristic and AI-powered deduplication for character candidates.
 * This is a stub for now; real AI logic should be implemented here.
 */

/**
 * Deduplicate character candidates using heuristics and (optionally) AI.
 * - Merges by lowercased name and aliases.
 * - Aggregates all appearanceBookIds, appearanceChapterIds, appearanceSectionIds.
 * - Prefers higher confidence and richer metadata.
 * - (Stub) AI-powered merging can be added for advanced co-reference.
 */
/**
 * Deduplicate character candidates using heuristics (name/alias merge, appearance aggregation).
 */
export async function deduplicateCharacterCandidates(
    candidates: EnhancedParsedEntity[],
    context: { universeId: string; bookId?: string; chapterId?: string }
): Promise<EnhancedParsedEntity[]> {
    const map = new Map<string, EnhancedParsedEntity>();
    for (const c of candidates) {
        const key = c.name.trim().toLowerCase();
        if (!map.has(key)) {
            map.set(key, {
                ...c,
                aliases: c.aliases ? [...c.aliases] : [],
                appearanceBookIds: c.appearanceBookIds ? [...c.appearanceBookIds] : [],
                appearanceChapterIds: c.appearanceChapterIds ? [...c.appearanceChapterIds] : [],
                appearanceSectionIds: c.appearanceSectionIds ? [...c.appearanceSectionIds] : [],
            });
        } else {
            const existing = map.get(key)!;
            if (c.aliases) {
                existing.aliases = Array.from(new Set([...(existing.aliases || []), ...c.aliases]));
            }
            if (c.appearanceBookIds) {
                existing.appearanceBookIds = Array.from(new Set([...(existing.appearanceBookIds || []), ...c.appearanceBookIds]));
            }
            if (c.appearanceChapterIds) {
                existing.appearanceChapterIds = Array.from(new Set([...(existing.appearanceChapterIds || []), ...c.appearanceChapterIds]));
            }
            if (c.appearanceSectionIds) {
                existing.appearanceSectionIds = Array.from(new Set([...(existing.appearanceSectionIds || []), ...c.appearanceSectionIds]));
            }
            if (c.confidence > existing.confidence) {
                map.set(key, { ...existing, ...c });
            }
        }
    }
    return Array.from(map.values());
}

/**
 * AI-powered deduplication for character candidates.
 * Uses context, dialogue, and references to cluster candidates (including pronouns and ambiguous references).
 * This is a basic implementation; replace with real AI/ML model integration as needed.
 */
export async function aiDeduplicateCharacterCandidates(
    candidates: EnhancedParsedEntity[],
    context: { universeId: string; bookId?: string; chapterId?: string }
): Promise<EnhancedParsedEntity[]> {
    // Example: Use a simple rule to merge candidates with overlapping section appearances or similar aliases.
    // In production, replace with AI/ML model call (e.g., LLM, embedding similarity, etc.)
    const merged: EnhancedParsedEntity[] = [];
    const used = new Set<number>();
    for (let i = 0; i < candidates.length; i++) {
        if (used.has(i)) continue;
        let base = { ...candidates[i] };
        for (let j = i + 1; j < candidates.length; j++) {
            if (used.has(j)) continue;
            const b = candidates[j];
            // Simple overlap check: aliases or section appearances
            const aliasOverlap = base.aliases && b.aliases && base.aliases.some(a => b.aliases!.includes(a));
            const sectionOverlap = base.appearanceSectionIds && b.appearanceSectionIds && base.appearanceSectionIds.some(id => b.appearanceSectionIds!.includes(id));
            if (aliasOverlap || sectionOverlap) {
                // Merge b into base
                base.aliases = Array.from(new Set([...(base.aliases || []), ...(b.aliases || [])]));
                base.appearanceBookIds = Array.from(new Set([...(base.appearanceBookIds || []), ...(b.appearanceBookIds || [])]));
                base.appearanceChapterIds = Array.from(new Set([...(base.appearanceChapterIds || []), ...(b.appearanceChapterIds || [])]));
                base.appearanceSectionIds = Array.from(new Set([...(base.appearanceSectionIds || []), ...(b.appearanceSectionIds || [])]));
                used.add(j);
            }
        }
        merged.push(base);
    }
    return merged;
}

/**
 * Enforce canonical structure for character nodes.
 */

/**
 * Enforce canonical structure for character nodes.
 * - Ensures all required fields are present and valid.
 * - Fills in missing appearance arrays from context if needed.
 * - Ensures canonical id, type, and title.
 */
export function enforceCanonicalCharacterNode(
    entity: EnhancedParsedEntity,
    context: { universeId: string; bookId?: string; chapterId?: string }
): EnhancedParsedEntity {
    return {
        ...entity,
        type: 'character',
        universeId: context.universeId,
        appearanceBookIds: entity.appearanceBookIds && entity.appearanceBookIds.length > 0
            ? entity.appearanceBookIds
            : (context.bookId ? [context.bookId] : []),
        appearanceChapterIds: entity.appearanceChapterIds && entity.appearanceChapterIds.length > 0
            ? entity.appearanceChapterIds
            : (context.chapterId ? [context.chapterId] : []),
        appearanceSectionIds: entity.appearanceSectionIds || [],
        id: entity.id || `${context.universeId}:${entity.name}`,
        title: entity.title || entity.name,
    } as EnhancedParsedEntity;
}
