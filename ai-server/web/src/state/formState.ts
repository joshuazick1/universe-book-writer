import { useState } from 'react';
import { Universe, Book, Chapter } from '../../../../shared/types/nodeTypes';

/**
 * Centralized form state management for Dashboard and AI helper.
 * Provides helpers to extract current form state for universes, books, and chapters.
 */
export interface UniverseFormState {
    title: string;
    summary: string;
    lore: string;
    rules: string;
    metadata: unknown;
}

export interface BookFormState {
    title: string;
    metadata: unknown;
}

export interface ChapterFormState {
    title: string;
    content: string;
}

export function useDashboardFormState(
    params: {
        newUniverseTitle: string;
        newUniverseSummary: string;
        newUniverseLore: string;
        newUniverseRules: string;
        newUniverseMetadata: string;
        editUniverseFields: Partial<Universe>;
        newBookTitle: string;
        editBookFields: Partial<Book>;
        newChapterTitle: string;
        chapterContent: string;
        selectedUniverse: string;
        selectedBook: string;
        selectedChapterId: string;
        universes: Universe[];
        books: Book[];
        chapters: Chapter[];
    }
) {
    // Universe form state (new or edit)
    const universeForm: UniverseFormState = params.selectedUniverse
        ? {
            title: params.editUniverseFields.title ?? '',
            summary: params.editUniverseFields.summary ?? '',
            lore: params.editUniverseFields.lore ?? '',
            rules: params.editUniverseFields.rules ?? '',
            metadata: params.editUniverseFields.metadata ?? {},
        }
        : {
            title: params.newUniverseTitle,
            summary: params.newUniverseSummary,
            lore: params.newUniverseLore,
            rules: params.newUniverseRules,
            metadata: params.newUniverseMetadata ? JSON.parse(params.newUniverseMetadata) : {},
        };

    // Book form state (new or edit)
    const bookForm: BookFormState = params.selectedBook
        ? {
            title: params.editBookFields.title ?? '',
            metadata: params.editBookFields.metadata ?? {},
        }
        : {
            title: params.newBookTitle,
            metadata: {},
        };

    // Chapter form state (new or edit)
    const chapterForm: ChapterFormState = params.selectedChapterId
        ? {
            title:
                params.chapters.find(ch => ch.id === params.selectedChapterId)?.title || '',
            content: params.chapterContent,
        }
        : {
            title: params.newChapterTitle,
            content: '',
        };

    return { universeForm, bookForm, chapterForm };
}
