// --- CREATE/UPDATE/DELETE for Chapters (embedded in books or separate collection) ---
// If chapters are embedded in books:
export async function createChapter(bookId: string, chapter: Chapter): Promise<Chapter> {
    // const { books } = await getCollections();
    // await books.updateOne({ id: bookId }, { $push: { chapters: chapter } });
    // return chapter;
    return chapter; // Placeholder
}

export async function updateChapter(bookId: string, chapterId: string, update: Partial<Chapter>): Promise<boolean> {
    // const { books } = await getCollections();
    // const result = await books.updateOne(
    //   { id: bookId, 'chapters.id': chapterId },
    //   { $set: { 'chapters.$': { ...update, id: chapterId, bookId } } }
    // );
    // return result.modifiedCount > 0;
    return true; // Placeholder
}

export async function deleteChapter(bookId: string, chapterId: string): Promise<boolean> {
    // const { books } = await getCollections();
    // const result = await books.updateOne(
    //   { id: bookId },
    //   { $pull: { chapters: { id: chapterId } } }
    // );
    // return result.modifiedCount > 0;
    return true; // Placeholder
}
// ai-server/src/repositories/ragNodeRepository.ts
// Repository for fetching and persisting RAG nodes (universes, books, chapters, characters)
// TODO: Replace with real MongoDB/Mongoose logic
import type { Universe } from '../models/Universe.js';
import type { Book } from '../models/Book.js';
import type { Chapter } from '../models/Chapter.js';
import type { Character } from '../models/Character.js';
import { getCollections } from '../config/database.config.js';

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

export async function fetchBooks(universeId: string): Promise<Book[]> {
    // If books are embedded in universes:
    const { universes } = await getCollections();
    const universe = await universes.findOne({ id: universeId });
    if (universe && Array.isArray((universe as any).books)) {
        return (universe as any).books.map((doc: any) => ({
            id: doc.id || doc._id?.toString(),
            universeId,
            title: doc.title,
            type: 'book',
            metadata: doc.metadata
        }));
    }
    // If books are in their own collection, use this instead:
    // const { books } = await getCollections();
    // const docs = await books.find({ universeId }).toArray();
    // return docs.map(doc => ({
    //   id: doc.id || doc._id?.toString(),
    //   universeId,
    //   title: doc.title,
    //   type: 'book',
    //   metadata: doc.metadata
    // }));
    return [];
}

export async function fetchChapters(bookId: string): Promise<Chapter[]> {
    // If chapters are embedded in books:
    // const { books } = await getCollections();
    // const book = await books.findOne({ id: bookId });
    // if (book && Array.isArray((book as any).chapters)) {
    //   return (book as any).chapters.map((doc: any) => ({
    //     id: doc.id || doc._id?.toString(),
    //     bookId,
    //     title: doc.title,
    //     type: 'chapter',
    //     metadata: doc.metadata
    //   }));
    // }
    // If chapters are in their own collection:
    // const { chapters } = await getCollections();
    // const docs = await chapters.find({ bookId }).toArray();
    // return docs.map(doc => ({
    //   id: doc.id || doc._id?.toString(),
    //   bookId,
    //   title: doc.title,
    //   type: 'chapter',
    //   metadata: doc.metadata
    // }));
    return [];
}

/**
 * Fetches canonical character nodes, including all deduplication and traceability fields.
 */
export async function fetchCharacters(query: { universeId?: string; bookId?: string; chapterId?: string }): Promise<Character[]> {
    const { generated_characters } = await getCollections();
    const filter: any = {};
    if (query.universeId) filter.universeId = query.universeId;
    // Canonical: do not filter by bookId/chapterId at top level, but allow for appearance queries if needed
    const docs = await generated_characters.find(filter).toArray();
    return docs.map(doc => ({
        id: doc.id || doc._id?.toString(),
        universeId: doc.universeId,
        name: doc.name,
        title: doc.title || doc.name,
        type: 'character',
        aliases: doc.aliases || [],
        description: doc.description || '',
        appearanceBookIds: doc.appearanceBookIds || [],
        appearanceChapterIds: doc.appearanceChapterIds || [],
        appearanceSectionIds: doc.appearanceSectionIds || [],
        metadata: doc.metadata || {},
        // --- Extensible deduplication/traceability fields ---
        pronounLinks: doc.pronounLinks || [],
        contextWindow: doc.contextWindow || '',
        sourceReferences: doc.sourceReferences || [],
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
    const result = await universes.updateOne({ id }, { $set: update });
    return result.modifiedCount > 0;
}

export async function deleteUniverse(id: string): Promise<boolean> {
    const { universes } = await getCollections();
    const result = await universes.deleteOne({ id });
    return result.deletedCount > 0;
}

// --- CREATE/UPDATE/DELETE for Books (embedded in universes or separate collection) ---
export async function createBook(universeId: string, book: Book): Promise<Book> {
    const { universes } = await getCollections();
    // Defensive: Only push if books is an array, otherwise initialize
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
    // Defensive: Only pull if books is an array
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

// --- CREATE/UPDATE/DELETE for Chapters (embedded in books or separate collection) ---
// If chapters are embedded, you would update the book document
// If chapters are in their own collection, implement similar to universes

// --- CREATE/UPDATE/DELETE for Characters ---
/**
 * Persists a canonical character node, including all deduplication and traceability fields.
 */
export async function createCharacter(character: Character): Promise<Character> {
    const { generated_characters } = await getCollections();
    // Canonical: ensure all required and extensible fields are present
    const canonicalCharacter: Character = {
        id: character.id,
        universeId: character.universeId,
        name: character.name,
        title: character.title,
        type: 'character',
        aliases: character.aliases || [],
        description: character.description || '',
        appearanceBookIds: character.appearanceBookIds || [],
        appearanceChapterIds: character.appearanceChapterIds || [],
        appearanceSectionIds: character.appearanceSectionIds || [],
        metadata: character.metadata || {},
        // --- Extensible deduplication/traceability fields ---
        pronounLinks: character.pronounLinks || [],
        contextWindow: character.contextWindow || '',
        sourceReferences: character.sourceReferences || [],
    };
    await generated_characters.insertOne(canonicalCharacter);
    return canonicalCharacter;
}

/**
 * Updates a canonical character node, including all deduplication and traceability fields.
 */
export async function updateCharacter(id: string, update: Partial<Character>): Promise<boolean> {
    const { generated_characters } = await getCollections();
    // Allow canonical and extensible fields to be updated
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
