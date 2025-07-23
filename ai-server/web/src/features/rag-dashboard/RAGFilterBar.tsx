import React, { createContext, useContext, useState, useEffect } from 'react';
import { ragService } from '../../services/ragService';
import type { Universe, Book, Chapter, Character } from '../../services/ragService';

/**
 * Filter context for RAG Dashboard (universe/book/chapter/character)
 */
export interface RAGFilterState {
    universe: string;
    book: string;
    chapter: string;
    character: string;
    setUniverse: (u: string) => void;
    setBook: (b: string) => void;
    setChapter: (c: string) => void;
    setCharacter: (c: string) => void;
}

const RAGFilterContext = createContext<RAGFilterState | undefined>(undefined);

export const useRAGFilter = () => {
    const ctx = useContext(RAGFilterContext);
    if (!ctx) throw new Error('useRAGFilter must be used within RAGFilterProvider');
    return ctx;
};

export const RAGFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [universe, setUniverse] = useState('');
    const [book, setBook] = useState('');
    const [chapter, setChapter] = useState('');
    const [character, setCharacter] = useState('');

    return (
        <RAGFilterContext.Provider value={{ universe, book, chapter, character, setUniverse, setBook, setChapter, setCharacter }}>
            {children}
        </RAGFilterContext.Provider>
    );
};

/**
 * Filter bar UI for selecting universe/book/chapter/character
 */

const RAGFilterBar: React.FC = () => {

    const { universe, book, chapter, character, setUniverse, setBook, setChapter, setCharacter } = useRAGFilter();
    // Store full node objects for each dropdown for correct value/label mapping
    const [universes, setUniverses] = useState<Universe[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);

    // Fetch universes on mount, with debug logging
    useEffect(() => {
        ragService.getUniverses()
            .then(data => {
                // Debug: log what we got from the API
                // eslint-disable-next-line no-console
                console.debug('[RAGFilterBar] getUniverses() result:', data);
                setUniverses(data);
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('[RAGFilterBar] getUniverses() error:', err);
                setUniverses([]);
            });
    }, []);

    // Fetch books when universe changes, with debug logging
    useEffect(() => {
        if (universe) {
            ragService.getBooks(universe)
                .then(data => {
                    // eslint-disable-next-line no-console
                    console.debug('[RAGFilterBar] getBooks() result:', data);
                    setBooks(data);
                })
                .catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error('[RAGFilterBar] getBooks() error:', err);
                    setBooks([]);
                });
        } else {
            setBooks([]);
        }
        setBook('');
        setChapter('');
        setCharacter('');
    }, [universe]);

    // Fetch chapters when book changes, with debug logging
    useEffect(() => {
        if (book) {
            ragService.getChapters(book)
                .then(data => {
                    // eslint-disable-next-line no-console
                    console.debug('[RAGFilterBar] getChapters() result:', data);
                    setChapters(data);
                })
                .catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error('[RAGFilterBar] getChapters() error:', err);
                    setChapters([]);
                });
        } else {
            setChapters([]);
        }
        setChapter('');
        setCharacter('');
    }, [book]);

    // Fetch characters when universe/book/chapter changes, with debug logging
    useEffect(() => {
        ragService.getCharacters({
            universeId: universe || undefined,
            bookId: book || undefined,
            chapterId: chapter || undefined,
        })
            .then(data => {
                // eslint-disable-next-line no-console
                console.debug('[RAGFilterBar] getCharacters() result:', data);
                setCharacters(data);
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('[RAGFilterBar] getCharacters() error:', err);
                setCharacters([]);
            });
    }, [universe, book, chapter]);

    // Show debug info in the UI for easier troubleshooting
    return (
        <div className="flex flex-col gap-2 p-2 bg-blue-50 border-b border-blue-200">
            <div className="flex gap-4">
                <select className="rounded px-2 py-1" value={universe} onChange={e => setUniverse(e.target.value)}>
                    <option value="">Universe</option>
                    {universes.map(u => (
                        <option key={u.id} value={u.id}>{u.title || u.id}</option>
                    ))}
                </select>
                <select className="rounded px-2 py-1" value={book} onChange={e => setBook(e.target.value)}>
                    <option value="">Book</option>
                    {books.map(b => (
                        <option key={b.id} value={b.id}>{b.title || b.id}</option>
                    ))}
                </select>
                <select className="rounded px-2 py-1" value={chapter} onChange={e => setChapter(e.target.value)}>
                    <option value="">Chapter</option>
                    {chapters.map(c => (
                        <option key={c.id} value={c.id}>{c.title || c.id}</option>
                    ))}
                </select>
                <select className="rounded px-2 py-1" value={character} onChange={e => setCharacter(e.target.value)}>
                    <option value="">Character</option>
                    {characters.map(c => (
                        <option key={c.id} value={c.id}>{c.name || c.id}</option>
                    ))}
                </select>
            </div>
            {/* Debug info UI */}
            <div className="text-xs text-gray-500">
                <div>Universes loaded: {universes.length} {universes.length === 0 && '(none found)'}</div>
                <div>Books loaded: {books.length}</div>
                <div>Chapters loaded: {chapters.length}</div>
                <div>Characters loaded: {characters.length}</div>
            </div>
        </div>
    );
};

export default RAGFilterBar;
