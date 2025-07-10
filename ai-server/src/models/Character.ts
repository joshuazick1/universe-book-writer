// ai-server/src/models/Character.ts
/**
 * Canonical Character model for persistence, supporting deduplication and traceability fields.
 */
export interface Character {
    readonly id: string;
    readonly universeId: string;
    readonly name: string;
    readonly title: string;
    readonly type: 'character';
    readonly aliases?: string[];
    readonly description?: string;
    readonly appearanceBookIds: string[];
    readonly appearanceChapterIds: string[];
    readonly appearanceSectionIds: string[];
    readonly metadata?: Record<string, unknown>;
    /** Pronoun/ambiguous reference links for advanced AI deduplication */
    readonly pronounLinks?: string[];
    /** Context window (textual context for this entity, for AI-powered deduplication) */
    readonly contextWindow?: string;
    /** Source references for traceability and provenance */
    readonly sourceReferences?: Array<{
        documentId?: string;
        sectionId?: string;
        offset?: number;
        context?: string;
        extractor?: string;
    }>;
}
