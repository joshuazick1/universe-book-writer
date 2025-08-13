
/**
 * Script to test all CRUD operations for universes, books, and chapters.
 * Run with: npx tsx ai-server/src/test/crudUniverseBookChapter.test.ts
 * Includes assertions, cleanup logic, and timeouts.
 */

import { getCollections } from '../../../shared/database/database.config.js';
import type { Universe, Book, Chapter } from '../../../shared/types/nodeTypes.js';
import {
    createUniverse,
    updateUniverse,
    deleteUniverse,
    createBook,
    updateBook,
    deleteBook,
    createChapter,
    updateChapter,
    deleteChapter,
    fetchUniverses,
    fetchBooks,
    fetchChapters
} from '../repositories/ragNodeRepository.js';


async function runCrudTests() {
    // Timeout helper
    function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms))
        ]);
    }

    // Cleanup before test
    await withTimeout(deleteUniverse('test-universe'), 5000, 'cleanup:deleteUniverse');

    const universeData: Universe = {
        id: 'test-universe',
        type: 'universe',
        title: 'Test Universe',
        metadata: { createdBy: 'crud-test' }
    };
    const bookData: Book = {
        id: 'test-book',
        type: 'book',
        universeId: universeData.id,
        title: 'Test Book',
        metadata: { createdBy: 'crud-test' },
        chapters: []
    };
    const chapterData: Chapter = {
        id: 'test-chapter',
        type: 'chapter',
        universeId: universeData.id,
        bookId: bookData.id,
        title: 'Test Chapter',
        content: 'This is a test chapter.'
    };

    // --- Universe CRUD ---
    console.log('Creating universe...');
    await withTimeout(createUniverse(universeData), 5000, 'createUniverse');
    let universes = await withTimeout(fetchUniverses(), 5000, 'fetchUniverses');
    console.assert(universes.some(u => u.id === universeData.id), 'Universe should exist after create');
    console.log('Universes after create:', universes);

    console.log('Updating universe...');
    await withTimeout(updateUniverse(universeData.id, { title: 'Updated Universe' }), 5000, 'updateUniverse');
    universes = await withTimeout(fetchUniverses(), 5000, 'fetchUniverses after update');
    console.assert(universes.find(u => u.id === universeData.id)?.title === 'Updated Universe', 'Universe title should be updated');
    console.log('Universes after update:', universes);

    console.log('Creating book...');
    await withTimeout(createBook(universeData.id, bookData), 5000, 'createBook');
    let books = await withTimeout(fetchBooks(universeData.id), 5000, 'fetchBooks');
    console.assert(books.some(b => b.id === bookData.id), 'Book should exist after create');
    console.log('Books after create:', books);

    console.log('Updating book...');
    await withTimeout(updateBook(universeData.id, bookData.id, { title: 'Updated Book' }), 5000, 'updateBook');
    books = await withTimeout(fetchBooks(universeData.id), 5000, 'fetchBooks after update');
    console.assert(books.find(b => b.id === bookData.id)?.title === 'Updated Book', 'Book title should be updated');
    console.log('Books after update:', books);

    console.log('Creating chapter...');
    await withTimeout(createChapter(bookData.id, chapterData), 5000, 'createChapter');
    let chapters = await withTimeout(fetchChapters(bookData.id), 5000, 'fetchChapters');
    console.assert(chapters.some(c => c.id === chapterData.id), 'Chapter should exist after create');
    console.log('Chapters after create:', chapters);

    console.log('Updating chapter...');
    await withTimeout(updateChapter(bookData.id, chapterData.id, { title: 'Updated Chapter' }), 5000, 'updateChapter');
    chapters = await withTimeout(fetchChapters(bookData.id), 5000, 'fetchChapters after update');
    console.assert(chapters.find(c => c.id === chapterData.id)?.title === 'Updated Chapter', 'Chapter title should be updated');
    console.log('Chapters after update:', chapters);

    console.log('Deleting chapter...');
    await withTimeout(deleteChapter(bookData.id, chapterData.id), 5000, 'deleteChapter');
    chapters = await withTimeout(fetchChapters(bookData.id), 5000, 'fetchChapters after delete');
    console.assert(!chapters.some(c => c.id === chapterData.id), 'Chapter should not exist after delete');
    console.log('Chapters after delete:', chapters);

    console.log('Deleting book...');
    await withTimeout(deleteBook(universeData.id, bookData.id), 5000, 'deleteBook');
    books = await withTimeout(fetchBooks(universeData.id), 5000, 'fetchBooks after delete');
    console.assert(!books.some(b => b.id === bookData.id), 'Book should not exist after delete');
    console.log('Books after delete:', books);

    console.log('Deleting universe...');
    await withTimeout(deleteUniverse(universeData.id), 5000, 'deleteUniverse');
    universes = await withTimeout(fetchUniverses(), 5000, 'fetchUniverses after delete');
    console.assert(!universes.some(u => u.id === universeData.id), 'Universe should not exist after delete');
    console.log('Universes after delete:', universes);
}


runCrudTests().then(() => {
    console.log('CRUD tests completed successfully.');
    process.exit(0);
}).catch(err => {
    console.error('CRUD test error:', err);
    process.exit(1);
});
