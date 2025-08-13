/**
 * @fileoverview Shared type definitions for Book entities.
 * @module shared/types/book
 *
 * Defines interfaces and types for book data models used across universes and plugins.
 *
 * @example
 * import { Book } from 'shared/types/book';
 *
 * @edgecase
 * Handles books with missing chapters or plugin-specific extensions.
 */

export interface Book {
    readonly id: string;
    readonly title: string;
    readonly universeId: string;
    readonly author?: string;
    readonly description?: string;
    readonly chapters?: Chapter[];
    readonly metadata?: Record<string, unknown>;
}

export interface Chapter {
    readonly id: string;
    readonly title: string;
    readonly order: number;
    readonly content?: string;
    readonly metadata?: Record<string, unknown>;
}
