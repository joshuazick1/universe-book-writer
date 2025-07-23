/**
 * Shared RAG node interfaces for Universe, Book, Chapter, and Character.
 * Used by both frontend services and UI components.
 *
 * All types are strictly typed, use readonly for immutable fields, and match backend models.
 *
 * @module rag
 */

// Use shared types for all node definitions
import type { Universe, Book, Chapter, Character } from '../../../../shared/types/nodeTypes.js';

export type RAGNode = Universe | Book | Chapter | Character;
