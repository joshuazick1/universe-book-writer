import { bookCache } from '../infrastructure/cache/cacheProvider.js';
import type { Book } from '../models/Book.js';
import { fetchBooks, createBook, updateBook, deleteBook } from '../repositories/ragNodeRepository.js';
/**
 * Create a new book and invalidate cache.
 */
export async function createBookAndInvalidate(universeId: string, book: Book): Promise<Book> {
    const result = await createBook(universeId, book);
    invalidateBookCache(universeId);
    return result;
}

/**
 * Update a book and invalidate cache.
 */
export async function updateBookAndInvalidate(universeId: string, bookId: string, update: Partial<Book>): Promise<boolean> {
    const result = await updateBook(universeId, bookId, update);
    if (result) invalidateBookCache(universeId);
    return result;
}

/**
 * Delete a book and invalidate cache.
 */
export async function deleteBookAndInvalidate(universeId: string, bookId: string): Promise<boolean> {
    const result = await deleteBook(universeId, bookId);
    if (result) invalidateBookCache(universeId);
    return result;
}

/**
 * Fetch all books for a universe, using cache if available.
 */
export async function getBooks(universeId: string): Promise<Book[]> {
    const cacheKey = universeId;
    const cached = bookCache.get(cacheKey);
    if (cached) return cached;
    const books = await fetchBooks(universeId);
    bookCache.set(cacheKey, books);
    return books;
}

/**
 * Invalidate book cache (call on create/update/delete)
 */
export function invalidateBookCache(universeId?: string) {
    if (universeId) bookCache.invalidate(universeId);
    else bookCache.clear();
}
