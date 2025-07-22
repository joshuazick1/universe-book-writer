// ai-server/src/repositories/ragNodeRepository.ts
// Repository for fetching and persisting RAG nodes (universes, books, chapters, characters)
// TODO: Replace with real MongoDB/Mongoose logic

import type { Universe, Book, Chapter, Character } from '../../../shared/types/nodeTypes.js';
import { getCollections } from '../config/database.config.js';
import { ObjectId } from 'mongodb';

// --- CREATE/UPDATE/DELETE for Chapters (embedded in books or separate collection) ---
export async function createChapter(bookId: string, chapter: Chapter): Promise<Chapter> {
    const { universes } = await getCollections();
    // Find the universe containing the book
    const universe = await universes.findOne({ 'books.id': bookId });
    if (!universe) throw new Error('Book not found');
    // Find the book and push the chapter
    const books = (universe.books as Book[]).map(book => {
        if (book.id === bookId) {
            const chapters = Array.isArray(book.chapters) ? [...book.chapters, chapter] : [chapter];
            return { ...book, chapters };
        }
        return book;
    });
    await universes.updateOne(
        { _id: universe._id },
        { $set: { books } }
    );
    return chapter;
}

export async function updateChapter(bookId: string, chapterId: string, update: Partial<Chapter>): Promise<boolean> {
    const { universes } = await getCollections();
    // Find the universe containing the book
    const universe = await universes.findOne({ 'books.id': bookId });
    if (!universe) return false;
    // Update the chapter in the book
    const books = (universe.books as Book[]).map(book => {
        if (book.id === bookId) {
            const chapters = Array.isArray(book.chapters)
                ? book.chapters.map((chap: Chapter) => chap.id === chapterId ? { ...chap, ...update, id: chapterId, bookId } : chap)
                : [];
            return { ...book, chapters };
        }
        return book;
    });
    const result = await universes.updateOne(
        { _id: universe._id },
        { $set: { books } }
    );
    return result.modifiedCount > 0;
}

export async function deleteChapter(bookId: string, chapterId: string): Promise<boolean> {
    const { universes } = await getCollections();
    // Find the universe containing the book
    const universe = await universes.findOne({ 'books.id': bookId });
    if (!universe) return false;
    // Remove the chapter from the book
    const books = (universe.books as Book[]).map(book => {
        if (book.id === bookId) {
            const chapters = Array.isArray(book.chapters)
                ? book.chapters.filter((chap: Chapter) => chap.id !== chapterId)
                : [];
            return { ...book, chapters };
        }
        return book;
    });
    const result = await universes.updateOne(
        { _id: universe._id },
        { $set: { books } }
    );
    return result.modifiedCount > 0;
}

// --- FETCH ---
export async function fetchUniverses(): Promise<Universe[]> {
    const { universes } = await getCollections();
    const docs = await universes.find({}).toArray();
    return docs.map(doc => ({
        id: doc.id || doc._id?.toString(),
        title: doc.title,
        type: 'universe',
        metadata: doc.metadata
    }));
}

/**
 * Fetches all books for a given universe, including chapters.
 * @param universeId - The ID of the universe.
 * @returns Array of Book objects, each with chapters if present.
 */
export async function fetchBooks(universeId: string): Promise<Book[]> {
    const { universes } = await getCollections();
    const universe = await universes.findOne({ id: universeId });
    if (universe && Array.isArray(universe.books)) {
        return universe.books.map((doc: any) => ({
            id: doc.id || doc._id?.toString(),
            universeId,
            title: doc.title,
            type: 'book',
            metadata: doc.metadata,
            chapters: Array.isArray(doc.chapters) ? doc.chapters : []
        }));
    }
    return [];
}

/**
 * Fetches all chapters for a given book.
 * @param bookId - The ID of the book.
 * @returns Array of Chapter objects.
 */
export async function fetchChapters(bookId: string): Promise<Chapter[]> {
    const { universes } = await getCollections();
    const universe = await universes.findOne({ 'books.id': bookId });
    if (!universe || !Array.isArray(universe.books)) return [];
    const book = universe.books.find((b: any) => b.id === bookId);
    return Array.isArray(book?.chapters) ? book.chapters : [];
}

/**
 * Fetches all characters matching the query.
 * @param query - Query object with universeId, bookId, or chapterId.
 * @returns Array of Character objects.
 */
export async function fetchCharacters(query: { universeId?: string; bookId?: string; chapterId?: string }): Promise<Character[]> {
    const { generated_characters } = await getCollections();
    const filter: any = {};
    if (query.universeId) filter.universeId = query.universeId;
    if (query.bookId) filter.appearanceBookIds = query.bookId;
    if (query.chapterId) filter.appearanceChapterIds = query.chapterId;
    const docs = await generated_characters.find(filter).toArray();
    return docs.map(doc => ({
        id: doc.id || doc._id?.toString(),
        universeId: doc.universeId,
        name: doc.name,
        type: 'character',
        aliases: doc.aliases || [],
        description: doc.description || '',
        appearanceBookIds: doc.appearanceBookIds || [],
        appearanceChapterIds: doc.appearanceChapterIds || [],
        appearanceSectionIds: doc.appearanceSectionIds || [],
        metadata: doc.metadata || {},
    }));
}

// --- CREATE/UPDATE/DELETE for Universes ---
export async function createUniverse(universe: Universe): Promise<Universe> {
    const { universes } = await getCollections();
    await universes.insertOne(universe);
    return universe;
}

export async function updateUniverse(id: string, update: Partial<Universe>): Promise<boolean> {
    const { universes } = await getCollections();
    // Try update by id (string)
    let result = await universes.updateOne({ id }, { $set: update });
    if (result.modifiedCount > 0) return true;
    // Try update by _id (ObjectId)
    let objectId: ObjectId | undefined;
    if (ObjectId.isValid(id)) {
        objectId = new ObjectId(id);
        result = await universes.updateOne({ _id: objectId }, { $set: update });
        if (result.modifiedCount > 0) return true;
    }
    return false;
}

export async function deleteUniverse(id: string): Promise<boolean> {
    const { universes } = await getCollections();
    // Try delete by id (string)
    let result = await universes.deleteOne({ id });
    if (result.deletedCount > 0) return true;
    // Try delete by _id (ObjectId)
    let objectId: ObjectId | undefined;
    if (ObjectId.isValid(id)) {
        objectId = new ObjectId(id);
        result = await universes.deleteOne({ _id: objectId });
        if (result.deletedCount > 0) return true;
    }
    return false;
}

// --- CREATE/UPDATE/DELETE for Books (embedded in universes or separate collection) ---
export async function createBook(universeId: string, book: Book): Promise<Book> {
    const { universes } = await getCollections();
    await universes.updateOne(
        { id: universeId },
        [
            {
                $set: {
                    books: {
                        $cond: [
                            { $isArray: "$books" },
                            { $concatArrays: ["$books", [book]] },
                            [book]
                        ]
                    }
                }
            }
        ]
    );
    return book;
}

export async function updateBook(universeId: string, bookId: string, update: Partial<Book>): Promise<boolean> {
    const { universes } = await getCollections();
    const result = await universes.updateOne(
        { id: universeId, 'books.id': bookId },
        { $set: { 'books.$': { ...update, id: bookId, universeId } } }
    );
    return result.modifiedCount > 0;
}

export async function deleteBook(universeId: string, bookId: string): Promise<boolean> {
    const { universes } = await getCollections();
    const result = await universes.updateOne(
        { id: universeId },
        [
            {
                $set: {
                    books: {
                        $cond: [
                            { $isArray: "$books" },
                            {
                                $filter: {
                                    input: "$books",
                                    as: "book",
                                    cond: { $ne: ["$$book.id", bookId] }
                                }
                            },
                            []
                        ]
                    }
                }
            }
        ]
    );
    return result.modifiedCount > 0;
}

// --- CREATE/UPDATE/DELETE for Characters ---
export async function createCharacter(character: Character): Promise<Character> {
    const { generated_characters } = await getCollections();
    const canonicalCharacter: Character = {
        id: character.id,
        universeId: character.universeId,
        name: character.name,
        type: 'character',
        aliases: character.aliases || [],
        description: character.description || '',
        appearanceBookIds: character.appearanceBookIds || [],
        appearanceChapterIds: character.appearanceChapterIds || [],
        appearanceSectionIds: character.appearanceSectionIds || [],
        metadata: character.metadata || {},
    };
    await generated_characters.insertOne(canonicalCharacter);
    return canonicalCharacter;
}

export async function updateCharacter(id: string, update: Partial<Character>): Promise<boolean> {
    const { generated_characters } = await getCollections();
    const allowedFields = [
        'name', 'title', 'aliases', 'description',
        'appearanceBookIds', 'appearanceChapterIds', 'appearanceSectionIds', 'metadata',
        'pronounLinks', 'contextWindow', 'sourceReferences'
    ];
    const canonicalUpdate: Partial<Character> = {};
    for (const key of allowedFields) {
        if (key in update) {
            (canonicalUpdate as any)[key] = (update as any)[key];
        }
    }
    const result = await generated_characters.updateOne({ id }, { $set: canonicalUpdate });
    return result.modifiedCount > 0;
}

export async function deleteCharacter(id: string): Promise<boolean> {
    const { generated_characters } = await getCollections();
    const result = await generated_characters.deleteOne({ id });
    return result.deletedCount > 0;
}