import React, { useState, useEffect } from 'react';
import ChatBox from './ChatBox';
import { useDashboardFormState } from '../state/formState';
import { sendAiHelperRequest, AiHelperSuggestion } from '../api/aiHelper';
import DiffDisplay from './DiffDisplay';
import ContextScopeIndicator from './ContextScopeIndicator';
/**
 * Retries an async function up to `retries` times with delay.
 * @param fn The async function to execute.
 * @param retries Number of retries.
 * @param delayMs Delay between retries in ms.
 */
async function retryAsync<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < retries) {
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
    }
    throw lastError;
}
import { Universe, Book, Chapter } from '../../../../shared/types/nodeTypes';
import ReactMarkdown from 'react-markdown';

const SUBTABS = ['Universe', 'Book', 'Chapter', 'Read'] as const;
type Subtab = (typeof SUBTABS)[number];

const Dashboard: React.FC = () => {
    // State declarations
    const [subtab, setSubtab] = useState<Subtab>('Universe');
    const [universes, setUniverses] = useState<Universe[]>([]);
    const [selectedUniverse, setSelectedUniverse] = useState<string>('');
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBook, setSelectedBook] = useState<string>('');
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [chapterContent, setChapterContent] = useState<string>('');
    const [selectedChapterId, setSelectedChapterId] = useState<string>('');
    const [newUniverseTitle, setNewUniverseTitle] = useState('');
    const [newUniverseSummary, setNewUniverseSummary] = useState('');
    const [newUniverseLore, setNewUniverseLore] = useState('');
    const [newUniverseRules, setNewUniverseRules] = useState('');
    const [newUniverseMetadata, setNewUniverseMetadata] = useState('');
    const [newBookTitle, setNewBookTitle] = useState('');
    const [editBookModalOpen, setEditBookModalOpen] = useState(false);
    const [editBookFields, setEditBookFields] = useState<Partial<Book>>({});
    const [newChapterTitle, setNewChapterTitle] = useState('');
    const [editUniverseModalOpen, setEditUniverseModalOpen] = useState(false);
    const [editUniverseId, setEditUniverseId] = useState<string>('');
    const [editUniverseFields, setEditUniverseFields] = useState<Partial<Universe>>({});

    // Refresh functions
    const refreshUniverses = async () => {
        const res = await retryAsync(() => fetch('/api/universes'));
        const data = await res.json();
        setUniverses(data);
    };
    const refreshBooks = async (universeId: string) => {
        if (!universeId) {
            setBooks([]);
            return;
        }
        const res = await retryAsync(() => fetch(`/api/books?universeId=${encodeURIComponent(universeId)}`));
        const data = await res.json();
        setBooks(data);
    };
    const refreshChapters = async (bookId: string) => {
        if (!bookId) {
            setChapters([]);
            return;
        }
        const res = await retryAsync(() => fetch(`/api/books/${bookId}/chapters`));
        const data = await res.json();
        setChapters(data);
    };

    // Universe CRUD
    const handleCreateUniverse = async () => {
        if (!newUniverseTitle.trim()) return;
        await retryAsync(() =>
            fetch('/api/universes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'universe',
                    title: newUniverseTitle,
                    summary: newUniverseSummary ?? '',
                    lore: newUniverseLore ?? '',
                    rules: newUniverseRules ?? '',
                    metadata: newUniverseMetadata ? JSON.parse(newUniverseMetadata) : {},
                }),
            })
        );
        setNewUniverseTitle('');
        setNewUniverseSummary('');
        setNewUniverseLore('');
        setNewUniverseRules('');
        setNewUniverseMetadata('');
        await refreshUniverses();
    };
    const handleUpdateUniverse = async () => {
        if (!editUniverseId) return;
        await retryAsync(() =>
            fetch(`/api/universes/${editUniverseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editUniverseFields),
            })
        );
        setEditUniverseModalOpen(false);
        setEditUniverseId('');
        setEditUniverseFields({});
        await refreshUniverses();
    };
    const handleDeleteUniverse = async (id: string) => {
        await retryAsync(() => fetch(`/api/universes/${id}`, { method: 'DELETE' }));
        await refreshUniverses();
    };

    // Book CRUD
    const handleCreateBook = async () => {
        if (!newBookTitle.trim() || !selectedUniverse) return;
        await retryAsync(() =>
            fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'book',
                    title: newBookTitle,
                    universeId: selectedUniverse,
                    metadata: {},
                }),
            })
        );
        setNewBookTitle('');
        await refreshBooks(selectedUniverse);
    };
    const handleUpdateBook = async () => {
        if (!editBookFields || !editBookFields.id || !selectedUniverse) return;
        await retryAsync(() =>
            fetch(
                `/api/books/${editBookFields.id}?universeId=${encodeURIComponent(selectedUniverse)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editBookFields),
                }
            )
        );
        setEditBookModalOpen(false);
        setEditBookFields({});
        await refreshBooks(selectedUniverse);
    };

    // Chapter CRUD
    const handleCreateChapter = async () => {
        if (!newChapterTitle.trim() || !selectedBook) return;
        await retryAsync(() =>
            fetch(`/api/books/${selectedBook}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'chapter',
                    title: newChapterTitle,
                    content: '',
                }),
            })
        );
        setNewChapterTitle('');
        await refreshChapters(selectedBook);
    };
    const handleUpdateChapterContent = async () => {
        if (!selectedChapterId || !selectedBook) return;
        await retryAsync(() =>
            fetch(`/api/books/${selectedBook}/chapters/${selectedChapterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: chapterContent }),
            })
        );
        await refreshChapters(selectedBook);
    };

    const openEditUniverseModal = (u: Universe) => {
        setEditUniverseId(u.id);
        setEditUniverseFields({ ...u });
        setEditUniverseModalOpen(true);
    };

    useEffect(() => {
        refreshUniverses();
    }, []);

    useEffect(() => {
        if (selectedUniverse) {
            refreshBooks(selectedUniverse);
        } else {
            setBooks([]);
        }
        if (!selectedUniverse) {
            setSelectedBook('');
            setChapters([]);
            setSelectedChapterId('');
        }
    }, [selectedUniverse]);

    useEffect(() => {
        if (selectedBook) {
            refreshChapters(selectedBook);
        } else {
            setChapters([]);
        }
        if (!selectedBook) {
            setSelectedChapterId('');
        }
    }, [selectedBook]);

    // AI Helper Chat State
    const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AiHelperSuggestion[]>([]);
    // Simulate context scope (e.g., selected universe name)
    const contextScope = selectedUniverse
        ? universes.find(u => u.id === selectedUniverse)?.title || ''
        : undefined;

    // Extract form state for AI helper
    const { universeForm, bookForm, chapterForm } = useDashboardFormState({
        newUniverseTitle,
        newUniverseSummary,
        newUniverseLore,
        newUniverseRules,
        newUniverseMetadata,
        editUniverseFields,
        newBookTitle,
        editBookFields,
        newChapterTitle,
        chapterContent,
        selectedUniverse,
        selectedBook,
        selectedChapterId,
        universes,
        books,
        chapters,
    });

    // Handler to clear context scope (broaden search)
    const handleClearContextScope = () => {
        setSelectedUniverse('');
        setSelectedBook('');
        setSelectedChapterId('');
    };

    // Send chat and form state to backend AI helper
    const handleSendAiMessage = async (input: string) => {
        setAiMessages(msgs => [...msgs, { role: 'user', content: input }]);
        setAiLoading(true);
        setAiSuggestions([]);
        try {
            const payload = {
                prompt: input,
                context: {
                    universeId: selectedUniverse || undefined,
                    bookId: selectedBook || undefined,
                    chapterId: selectedChapterId || undefined,
                },
                formState: {
                    universe: universeForm,
                    book: bookForm,
                    chapter: chapterForm,
                },
            };
            console.log('[AI HELPER] Sending request:', payload);
            const res = await sendAiHelperRequest(payload);
            console.log('[AI HELPER] Received response:', res);
            if (res.messages && res.messages.length > 0) {
                setAiMessages(msgs => [...msgs, ...res.messages.filter(m => m.role === 'ai')]);
            }
            if (res.suggestions && res.suggestions.length > 0) {
                setAiSuggestions(res.suggestions);
            }
            if (res.error) {
                console.error('[AI HELPER] Error in response:', res.error);
            }
            // TODO: handle queueStatus, error, etc.
        } catch (err) {
            console.error('[AI HELPER] Request failed:', err);
            setAiMessages(msgs => [
                ...msgs,
                { role: 'ai', content: 'Error contacting AI helper. Please try again.' },
            ]);
        } finally {
            setAiLoading(false);
        }
    };

    // Suggestion handlers
    const handleAcceptSuggestion = (suggestion: AiHelperSuggestion) => {
        // Apply suggestion to the appropriate form field
        if (suggestion.field.startsWith('universe.')) {
            const key = suggestion.field.replace('universe.', '');
            setEditUniverseFields(f => ({ ...f, [key]: suggestion.suggestion }));
        } else if (suggestion.field.startsWith('book.')) {
            const key = suggestion.field.replace('book.', '');
            setEditBookFields(f => ({ ...f, [key]: suggestion.suggestion }));
        } else if (suggestion.field.startsWith('chapter.')) {
            if (suggestion.field.endsWith('.content')) {
                setChapterContent(suggestion.suggestion);
            } else {
                // For chapter title, etc.
                // ...extend as needed
            }
        }
        // Remove suggestion after applying
        setAiSuggestions(s => s.filter(sug => sug !== suggestion));
    };

    const handleRetrySuggestion = (suggestion: AiHelperSuggestion) => {
        // Re-request a new suggestion for the same field
        handleSendAiMessage(`Retry suggestion for ${suggestion.field}`);
        setAiSuggestions(s => s.filter(sug => sug !== suggestion));
    };

    const handleDisapproveSuggestion = (suggestion: AiHelperSuggestion) => {
        // Remove suggestion from list
        setAiSuggestions(s => s.filter(sug => sug !== suggestion));
    };

    return (
        <div className="bg-white rounded shadow p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Universe Dashboard</h2>
            <div className="flex gap-2 mb-4">
                {SUBTABS.map(t => (
                    <button
                        key={t}
                        className={`px-4 py-2 rounded ${subtab === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        onClick={() => setSubtab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="flex">
                <aside className="w-64 mr-6 bg-gray-50 border-r p-4 rounded h-full flex flex-col">
                    <h3 className="font-bold mb-2">AI Helper</h3>
                    <ContextScopeIndicator scope={contextScope || ''} onClear={selectedUniverse ? handleClearContextScope : undefined} />
                    <div className="mb-4">
                        <button
                            className="bg-purple-600 text-white px-3 py-1 rounded mb-2 w-full"
                            onClick={() => handleSendAiMessage('Can you give me worldbuilding advice?')}
                        >
                            Ask for Worldbuilding Advice
                        </button>
                        <button
                            className="bg-purple-600 text-white px-3 py-1 rounded mb-2 w-full"
                            onClick={() => handleSendAiMessage('Suggest some universe rules.')}
                        >
                            Suggest Universe Rules
                        </button>
                        <button
                            className="bg-purple-600 text-white px-3 py-1 rounded mb-2 w-full"
                            onClick={() => handleSendAiMessage('Generate some lore for my universe.')}
                        >
                            Generate Lore
                        </button>
                    </div>
                    {/* AI Suggestions (DiffDisplay) */}
                    {aiSuggestions.length > 0 && (
                        <div className="mb-2">
                            {aiSuggestions.map((sug, i) => (
                                sug.diff ? (
                                    <DiffDisplay
                                        key={i}
                                        before={sug.diff.before}
                                        after={sug.diff.after}
                                        reason={sug.reason}
                                        onAccept={() => handleAcceptSuggestion(sug)}
                                        onRetry={() => handleRetrySuggestion(sug)}
                                        onDisapprove={() => handleDisapproveSuggestion(sug)}
                                    />
                                ) : (
                                    <div key={i} className="border rounded p-2 bg-white mb-2 flex flex-col">
                                        <div className="font-bold text-xs text-gray-500 mb-1">AI Suggestion</div>
                                        <div className="text-sm mb-1">{sug.suggestion}</div>
                                        {sug.reason && <div className="text-xs text-gray-600 mb-1">Reason: {sug.reason}</div>}
                                        <div className="flex gap-2 mt-2">
                                            <button className="bg-green-600 text-white px-3 py-1 rounded text-xs" onClick={() => handleAcceptSuggestion(sug)}>
                                                Accept
                                            </button>
                                            <button className="bg-yellow-500 text-white px-3 py-1 rounded text-xs" onClick={() => handleRetrySuggestion(sug)}>
                                                Retry
                                            </button>
                                            <button className="bg-red-500 text-white px-3 py-1 rounded text-xs" onClick={() => handleDisapproveSuggestion(sug)}>
                                                Disapprove
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                    <div className="flex-1 flex flex-col">
                        <ChatBox
                            messages={aiMessages}
                            onSend={handleSendAiMessage}
                            loading={aiLoading}
                            contextScope={contextScope}
                        />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        (Coming soon: semantic search, suggestions, and more)
                    </div>
                </aside>
                <div className="flex-1">
                    {subtab === 'Universe' && (
                        <>
                            <label className="block mb-2 font-semibold">Universe</label>
                            <select
                                className="border px-2 py-1 rounded mb-4 w-full"
                                value={selectedUniverse || 'new'}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedUniverse(val === 'new' ? '' : val);
                                    if (val === 'new') {
                                        setNewUniverseTitle('');
                                        setNewUniverseSummary('');
                                        setNewUniverseLore('');
                                        setNewUniverseRules('');
                                        setNewUniverseMetadata('');
                                    } else {
                                        const u = universes.find(u => u.id === val);
                                        setNewUniverseTitle(u?.title ?? '');
                                        setNewUniverseSummary(u?.summary ?? '');
                                        setNewUniverseLore(u?.lore ?? '');
                                        setNewUniverseRules(u?.rules ?? '');
                                        setNewUniverseMetadata(u?.metadata ? JSON.stringify(u.metadata, null, 2) : '');
                                    }
                                }}
                            >
                                <option value="new">New</option>
                                {universes.map(u => (
                                    <option key={u.id ?? u.title} value={u.id}>
                                        {u.title}
                                    </option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input
                                    type="text"
                                    className="border px-2 py-1 rounded w-full"
                                    placeholder="Universe Title"
                                    value={newUniverseTitle}
                                    onChange={e => setNewUniverseTitle(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="border px-2 py-1 rounded w-full"
                                    placeholder="Summary"
                                    value={newUniverseSummary}
                                    onChange={e => setNewUniverseSummary(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="border px-2 py-1 rounded w-full"
                                    placeholder="Lore"
                                    value={newUniverseLore}
                                    onChange={e => setNewUniverseLore(e.target.value)}
                                />
                                <input
                                    type="text"
                                    className="border px-2 py-1 rounded w-full"
                                    placeholder="Rules"
                                    value={newUniverseRules}
                                    onChange={e => setNewUniverseRules(e.target.value)}
                                />
                                <textarea
                                    className="border px-2 py-1 rounded w-full resize-y"
                                    placeholder="Metadata (JSON) (multi-line supported)"
                                    value={newUniverseMetadata}
                                    onChange={e => setNewUniverseMetadata(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2 mb-6">
                                <button
                                    className="bg-blue-600 text-white px-4 py-1 rounded"
                                    onClick={handleCreateUniverse}
                                >
                                    {selectedUniverse ? 'Update' : 'Create'}
                                </button>
                                {selectedUniverse && (
                                    <button
                                        className="bg-red-500 text-white px-4 py-1 rounded"
                                        onClick={() => handleDeleteUniverse(selectedUniverse)}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                    {subtab === 'Book' && (
                        <>
                            <label className="block mb-2 font-semibold">Select Universe</label>
                            <select
                                className="border px-2 py-1 rounded mb-2 w-full"
                                value={selectedUniverse}
                                onChange={e => {
                                    setSelectedUniverse(e.target.value);
                                    setSelectedBook('');
                                    setNewBookTitle('');
                                }}
                            >
                                <option value="">-- Select Universe --</option>
                                {universes.map(u => (
                                    <option key={u.id ?? u.title} value={u.id}>
                                        {u.title}
                                    </option>
                                ))}
                            </select>
                            <label className="block mb-2 font-semibold">Book</label>
                            <select
                                className="border px-2 py-1 rounded mb-4 w-full"
                                value={selectedBook || 'new'}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedBook(val === 'new' ? '' : val);
                                    if (val === 'new') {
                                        setNewBookTitle('');
                                    } else {
                                        const b = books.find(b => b.id === val);
                                        setNewBookTitle(b?.title ?? '');
                                    }
                                }}
                            >
                                <option value="new">New</option>
                                {books.map(b => (
                                    <option key={b.id ?? b.title} value={b.id}>
                                        {b.title}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    className="border px-2 py-1 rounded w-full"
                                    placeholder="Book Title"
                                    value={newBookTitle}
                                    onChange={e => setNewBookTitle(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 mb-6">
                                <button
                                    className="bg-blue-600 text-white px-4 py-1 rounded"
                                    onClick={handleCreateBook}
                                >
                                    {selectedBook ? 'Update' : 'Create'}
                                </button>
                                {selectedBook && (
                                    <button
                                        className="bg-red-500 text-white px-4 py-1 rounded"
                                        onClick={async () => {
                                            await fetch(
                                                `/api/books/${selectedBook}?universeId=${encodeURIComponent(selectedUniverse)}`,
                                                { method: 'DELETE' }
                                            );
                                            await refreshBooks(selectedUniverse);
                                            setSelectedBook('');
                                            setNewBookTitle('');
                                            setChapters([]);
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                            {selectedBook && (
                                <details className="mb-4">
                                    <summary className="cursor-pointer text-xs text-gray-500">Raw Details</summary>
                                    <pre className="bg-gray-100 p-2 rounded text-xs max-w-xs max-h-64 overflow-auto whitespace-pre mt-1 border border-gray-200">
                                        {JSON.stringify(
                                            Object.fromEntries(
                                                Object.entries(books.find(b => b.id === selectedBook) || {}).filter(
                                                    ([k]) => k !== 'embedding'
                                                )
                                            ),
                                            null,
                                            2
                                        )}
                                    </pre>
                                </details>
                            )}
                        </>
                    )}
                    {subtab === 'Chapter' && (
                        <>
                            <label className="block mb-2 font-semibold">Select Universe</label>
                            <select
                                className="border px-2 py-1 rounded mb-2 w-full"
                                value={selectedUniverse}
                                onChange={e => setSelectedUniverse(e.target.value)}
                            >
                                <option value="">-- Select Universe --</option>
                                {universes.map(u => (
                                    <option key={u.id ?? u.title} value={u.id}>
                                        {u.title}
                                    </option>
                                ))}
                            </select>
                            <label className="block mb-2 font-semibold">Select Book</label>
                            <select
                                className="border px-2 py-1 rounded mb-2 w-full"
                                value={selectedBook}
                                onChange={e => setSelectedBook(e.target.value)}
                            >
                                <option value="">-- Select Book --</option>
                                {books.map(b => (
                                    <option key={b.id ?? b.title} value={b.id}>
                                        {b.title}
                                    </option>
                                ))}
                            </select>
                            <label className="block mb-2 font-semibold">Chapter</label>
                            <select
                                className="border px-2 py-1 rounded mb-4 w-full"
                                value={selectedChapterId || 'new'}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedChapterId(val === 'new' ? '' : val);
                                    if (val === 'new') {
                                        setChapterContent('');
                                    } else {
                                        const c = chapters.find(ch => ch.id === val);
                                        setChapterContent(c?.content ?? '');
                                    }
                                }}
                            >
                                <option value="new">New</option>
                                {chapters.map(c => (
                                    <option key={c.id ?? c.title} value={c.id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    className="border px-2 py-1 rounded w-full"
                                    placeholder="Chapter Title"
                                    value={newChapterTitle}
                                    onChange={e => setNewChapterTitle(e.target.value)}
                                />
                                <button
                                    className="bg-blue-600 text-white px-4 py-1 rounded"
                                    onClick={handleCreateChapter}
                                >
                                    Create
                                </button>
                            </div>
                            {selectedChapterId && (
                                <div className="mb-4">
                                    <label className="block mb-2 font-semibold">Edit Chapter Content</label>
                                    <textarea
                                        className="border px-2 py-1 rounded w-full resize-y"
                                        placeholder="Chapter Content"
                                        value={chapterContent}
                                        onChange={e => setChapterContent(e.target.value)}
                                        rows={6}
                                    />
                                </div>
                            )}
                            <div className="flex gap-2 mb-6">
                                <button
                                    className="bg-blue-600 text-white px-4 py-1 rounded"
                                    onClick={handleUpdateChapterContent}
                                    disabled={!selectedChapterId}
                                >
                                    {selectedChapterId ? 'Update' : 'Save'}
                                </button>
                                {selectedChapterId && (
                                    <button
                                        className="bg-red-500 text-white px-4 py-1 rounded"
                                        onClick={async () => {
                                            await fetch(`/api/books/${selectedBook}/chapters/${selectedChapterId}`, {
                                                method: 'DELETE',
                                            });
                                            await refreshChapters(selectedBook);
                                            setSelectedChapterId('');
                                            setChapterContent('');
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                            {selectedChapterId && (
                                <details className="mb-4">
                                    <summary className="cursor-pointer text-xs text-gray-500">Raw Details</summary>
                                    <pre className="bg-gray-100 p-2 rounded text-xs max-w-xs max-h-64 overflow-auto whitespace-pre mt-1 border border-gray-200">
                                        {JSON.stringify(
                                            Object.fromEntries(
                                                Object.entries(
                                                    chapters.find(ch => ch.id === selectedChapterId) || {}
                                                ).filter(([k]) => k !== 'embedding')
                                            ),
                                            null,
                                            2
                                        )}
                                    </pre>
                                </details>
                            )}
                        </>
                    )}
                    {subtab === 'Read' && (
                        <div>
                            <label className="block mb-2 font-semibold">Select Book to Read</label>
                            <select
                                className="border px-2 py-1 rounded mb-4 w-full"
                                value={selectedBook}
                                onChange={e => {
                                    setSelectedBook(e.target.value);
                                    setSelectedChapterId(''); // Reset chapter selection when book changes
                                    if (e.target.value) {
                                        setChapterContent(''); // Reset chapter content when book changes
                                        refreshChapters(e.target.value); // Fetch chapters for the selected book
                                    }
                                }}
                            >
                                <option value="">-- Select Book --</option>
                                {books.map(b => (
                                    <option key={b.id ?? b.title} value={b.id}>
                                        {b.title}
                                    </option>
                                ))}
                            </select>
                            {selectedBook && (
                                <>
                                    <label className="block mb-2 font-semibold">Select Chapter</label>
                                    <select
                                        className="border px-2 py-1 rounded mb-4 w-full"
                                        value={selectedChapterId}
                                        onChange={e => {
                                            setSelectedChapterId(e.target.value);
                                            const chapter = chapters.find(ch => ch.id === e.target.value);
                                            setChapterContent(chapter?.content || '');
                                        }}
                                    >
                                        <option value="">-- Select Chapter --</option>
                                        {chapters.map(ch => (
                                            <option key={ch.id ?? ch.title} value={ch.id}>
                                                {ch.title}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                            {selectedChapterId && (
                                <div className="prose max-w-none">
                                    <ReactMarkdown>{chapterContent}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Edit Universe Modal */}
            {editUniverseModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Edit Universe</h3>
                        <div className="grid grid-cols-1 gap-3 mb-4">
                            <input
                                type="text"
                                className="border px-2 py-1 rounded w-full"
                                placeholder="Title"
                                value={editUniverseFields.title ?? ''}
                                onChange={e => setEditUniverseFields(f => ({ ...f, title: e.target.value }))}
                            />
                            <textarea
                                className="border px-2 py-1 rounded w-full resize-y"
                                placeholder="Summary"
                                value={editUniverseFields.summary ?? ''}
                                onChange={e => setEditUniverseFields(f => ({ ...f, summary: e.target.value }))}
                                rows={2}
                            />
                            <textarea
                                className="border px-2 py-1 rounded w-full resize-y"
                                placeholder="Lore"
                                value={editUniverseFields.lore ?? ''}
                                onChange={e => setEditUniverseFields(f => ({ ...f, lore: e.target.value }))}
                                rows={2}
                            />
                            <textarea
                                className="border px-2 py-1 rounded w-full resize-y"
                                placeholder="Rules"
                                value={editUniverseFields.rules ?? ''}
                                onChange={e => setEditUniverseFields(f => ({ ...f, rules: e.target.value }))}
                                rows={2}
                            />
                            <textarea
                                className="border px-2 py-1 rounded w-full resize-y"
                                placeholder="Metadata (JSON)"
                                value={
                                    typeof editUniverseFields.metadata === 'string'
                                        ? editUniverseFields.metadata
                                        : JSON.stringify(editUniverseFields.metadata ?? {}, null, 2)
                                }
                                onChange={e => {
                                    let parsed: Record<string, unknown> = {};
                                    try {
                                        parsed = JSON.parse(e.target.value);
                                    } catch {
                                        // fallback to empty object if invalid
                                    }
                                    setEditUniverseFields(f => ({ ...f, metadata: parsed }));
                                }}
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                className="bg-blue-600 text-white px-4 py-1 rounded"
                                onClick={handleUpdateUniverse}
                            >
                                Save
                            </button>
                            <button
                                className="bg-gray-400 text-white px-4 py-1 rounded"
                                onClick={() => setEditUniverseModalOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Book Modal */}
            {editBookModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Edit Book</h3>
                        <div className="grid grid-cols-1 gap-3 mb-4">
                            <input
                                type="text"
                                className="border px-2 py-1 rounded w-full"
                                placeholder="Title"
                                value={editBookFields.title ?? ''}
                                onChange={e => setEditBookFields(f => ({ ...f, title: e.target.value }))}
                            />
                            <textarea
                                className="border px-2 py-1 rounded w-full resize-y"
                                placeholder="Metadata (JSON)"
                                value={
                                    typeof editBookFields.metadata === 'string'
                                        ? editBookFields.metadata
                                        : JSON.stringify(editBookFields.metadata ?? {}, null, 2)
                                }
                                onChange={e => {
                                    let parsed: Record<string, unknown> = {};
                                    try {
                                        parsed = JSON.parse(e.target.value);
                                    } catch {
                                        // fallback to empty object if invalid
                                    }
                                    setEditBookFields(f => ({ ...f, metadata: parsed }));
                                }}
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                className="bg-blue-600 text-white px-4 py-1 rounded"
                                onClick={handleUpdateBook}
                            >
                                Save
                            </button>
                            <button
                                className="bg-gray-400 text-white px-4 py-1 rounded"
                                onClick={() => setEditBookModalOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
