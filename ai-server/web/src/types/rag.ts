/**
 * Shared RAG node interfaces for Universe, Book, Chapter, and Character.
 * Used by both frontend services and UI components.
 *
 * All types are strictly typed, use readonly for immutable fields, and match backend models.
 *
 * @module rag
 */

/** Canonical node type for a Universe. */
export interface Universe {
    readonly id: string;
    readonly type: 'universe';
    readonly title: string;
    readonly description?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    // Add additional universe metadata as needed
}

/** Canonical node type for a Book. */
export interface Book {
    readonly id: string;
    readonly type: 'book';
    readonly universeId: string;
    readonly title: string;
    readonly description?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    // Add additional book metadata as needed
}

/** Canonical node type for a Chapter. */
export interface Chapter {
    readonly id: string;
    readonly type: 'chapter';
    readonly universeId: string;
    readonly bookId: string;
    readonly title: string;
    readonly description?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    // Add additional chapter metadata as needed
}

/** Canonical node type for a Character. */
export interface Character {
    readonly id: string;
    readonly type: 'character';
    readonly universeId: string;
    readonly bookId?: string;
    readonly chapterId?: string;
    readonly name: string;
    readonly aliases?: readonly string[];
    readonly description?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    // Add additional character metadata as needed
}

/**
 * Union type for all RAG node types.
 */
export type RAGNode = Universe | Book | Chapter | Character;
