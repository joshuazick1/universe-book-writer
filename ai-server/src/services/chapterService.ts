import { chapterCache } from '../infrastructure/cache/cacheProvider.js';
import type { Chapter } from '../../../shared/types/nodeTypes.ts';
import { fetchChapters, createChapter, updateChapter, deleteChapter } from '../repositories/ragNodeRepository.js';
/**
 * Create a new chapter and invalidate cache.
 */
export async function createChapterAndInvalidate(bookId: string, chapter: Chapter): Promise<Chapter> {
    const result = await createChapter(bookId, chapter);
    invalidateChapterCache(bookId);
    return result;
}

/**
 * Update a chapter and invalidate cache.
 */
export async function updateChapterAndInvalidate(bookId: string, chapterId: string, update: Partial<Chapter>): Promise<boolean> {
    const result = await updateChapter(bookId, chapterId, update);
    if (result) invalidateChapterCache(bookId);
    return result;
}

/**
 * Delete a chapter and invalidate cache.
 */
export async function deleteChapterAndInvalidate(bookId: string, chapterId: string): Promise<boolean> {
    const result = await deleteChapter(bookId, chapterId);
    if (result) invalidateChapterCache(bookId);
    return result;
}
// TODO: Add create/update/delete for chapters and call invalidateChapterCache

/**
 * Fetch all chapters for a book, using cache if available.
 */
export async function getChapters(bookId: string): Promise<Chapter[]> {
    const cacheKey = bookId;
    const cached = chapterCache.get(cacheKey);
    if (cached) return cached;
    const chapters = await fetchChapters(bookId);
    chapterCache.set(cacheKey, chapters);
    return chapters;
}

/**
 * Invalidate chapter cache (call on create/update/delete)
 */
export function invalidateChapterCache(bookId?: string) {
    if (bookId) chapterCache.invalidate(bookId);
    else chapterCache.clear();
}
