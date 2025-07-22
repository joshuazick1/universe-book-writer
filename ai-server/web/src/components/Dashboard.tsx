import React, { useState, useEffect } from "react";
import { Universe, Book, Chapter } from "../../../../shared/types/nodeTypes";

const SUBTABS = ["Universe", "Book", "Chapter"] as const;
type Subtab = typeof SUBTABS[number];

const Dashboard: React.FC = () => {
    const [subtab, setSubtab] = useState<Subtab>("Universe");
    const [universes, setUniverses] = useState<Universe[]>([]);
    const [selectedUniverse, setSelectedUniverse] = useState<string>("");
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBook, setSelectedBook] = useState<string>("");
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [chapterContent, setChapterContent] = useState<string>("");

    // Universe CRUD
    const [newUniverseTitle, setNewUniverseTitle] = useState("");
    const handleCreateUniverse = async () => {
        if (!newUniverseTitle.trim()) return;
        await fetch("/api/universes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: `u-${Date.now()}`,
                type: "universe",
                title: newUniverseTitle,
                metadata: {}
            })
        });
        setNewUniverseTitle("");
        await refreshUniverses();
    };

    const refreshUniverses = async () => {
        const res = await fetch("/api/universes");
        const data: Universe[] = await res.json();
        setUniverses(data);
    };

    // Book CRUD
    const [newBookTitle, setNewBookTitle] = useState("");
    const handleCreateBook = async () => {
        if (!selectedUniverse || !newBookTitle.trim()) return;
        await fetch(`/api/universes/${selectedUniverse}/books`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: `b-${Date.now()}`,
                type: "book",
                universeId: selectedUniverse,
                title: newBookTitle,
                metadata: {},
                chapters: []
            })
        });
        setNewBookTitle("");
        await refreshBooks(selectedUniverse);
    };

    const refreshBooks = async (universeId: string) => {
        const res = await fetch(`/api/universes/${universeId}/books`);
        const data: Book[] = await res.json();
        setBooks(data);
    };

    // Chapter CRUD
    const [newChapterTitle, setNewChapterTitle] = useState("");
    const handleCreateChapter = async () => {
        if (!selectedBook || !selectedUniverse || !newChapterTitle.trim()) return;
        await fetch(`/api/books/${selectedBook}/chapters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: `c-${Date.now()}`,
                type: "chapter",
                universeId: selectedUniverse,
                bookId: selectedBook,
                title: newChapterTitle,
                content: "",
                metadata: {}
            })
        });
        setNewChapterTitle("");
        await refreshChapters(selectedBook);
    };

    const refreshChapters = async (bookId: string) => {
        const res = await fetch(`/api/books/${bookId}/chapters`);
        const data: Chapter[] = await res.json();
        setChapters(data);
    };

    // Content update
    const handleUpdateChapterContent = async () => {
        if (!selectedBook || !selectedUniverse || !chapterContent.trim()) return;
        await fetch(`/api/books/${selectedBook}/chapters/${selectedChapterId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: chapterContent })
        });
        await refreshChapters(selectedBook);
    };

    // Selection
    const [selectedChapterId, setSelectedChapterId] = useState("");

    useEffect(() => {
        refreshUniverses();
    }, []);

    useEffect(() => {
        if (selectedUniverse) refreshBooks(selectedUniverse);
        else setBooks([]);
        setSelectedBook("");
        setChapters([]);
        setSelectedChapterId("");
    }, [selectedUniverse]);

    useEffect(() => {
        if (selectedBook) refreshChapters(selectedBook);
        else setChapters([]);
        setSelectedChapterId("");
    }, [selectedBook]);

    // UI
    return (
        <div className="bg-white rounded shadow p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Universe Dashboard</h2>
            <div className="flex gap-2 mb-4">
                {SUBTABS.map((t) => (
                    <button
                        key={t}
                        className={`px-4 py-2 rounded ${subtab === t ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                        onClick={() => setSubtab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            {subtab === "Universe" && (
                <div>
                    <label className="block mb-2 font-semibold">Create Universe</label>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            className="border px-2 py-1 rounded w-full"
                            placeholder="Universe Title"
                            value={newUniverseTitle}
                            onChange={e => setNewUniverseTitle(e.target.value)}
                        />
                        <button className="bg-blue-600 text-white px-4 py-1 rounded" onClick={handleCreateUniverse}>Create</button>
                    </div>
                    <div>
                        <label className="block mb-2 font-semibold">Universes</label>
                        <ul className="mb-2">
                            {universes.map(u => (
                                <li key={u.id} className="mb-1">
                                    <span className="font-mono text-sm">{u.id}</span> - {u.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {subtab === "Book" && (
                <div>
                    <label className="block mb-2 font-semibold">Select Universe</label>
                    <select
                        className="border px-2 py-1 rounded mb-4 w-full"
                        value={selectedUniverse}
                        onChange={e => setSelectedUniverse(e.target.value)}
                    >
                        <option value="">-- Select Universe --</option>
                        {universes.map(u => (
                            <option key={u.id} value={u.id}>{u.title}</option>
                        ))}
                    </select>
                    <label className="block mb-2 font-semibold">Create Book</label>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            className="border px-2 py-1 rounded w-full"
                            placeholder="Book Title"
                            value={newBookTitle}
                            onChange={e => setNewBookTitle(e.target.value)}
                        />
                        <button className="bg-blue-600 text-white px-4 py-1 rounded" onClick={handleCreateBook}>Create</button>
                    </div>
                    <div>
                        <label className="block mb-2 font-semibold">Books</label>
                        <ul className="mb-2">
                            {books.map(b => (
                                <li key={b.id} className="mb-1">
                                    <span className="font-mono text-sm">{b.id}</span> - {b.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {subtab === "Chapter" && (
                <div>
                    <label className="block mb-2 font-semibold">Select Universe</label>
                    <select
                        className="border px-2 py-1 rounded mb-2 w-full"
                        value={selectedUniverse}
                        onChange={e => setSelectedUniverse(e.target.value)}
                    >
                        <option value="">-- Select Universe --</option>
                        {universes.map(u => (
                            <option key={u.id} value={u.id}>{u.title}</option>
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
                            <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                    </select>
                    <label className="block mb-2 font-semibold">Create Chapter</label>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            className="border px-2 py-1 rounded w-full"
                            placeholder="Chapter Title"
                            value={newChapterTitle}
                            onChange={e => setNewChapterTitle(e.target.value)}
                        />
                        <button className="bg-blue-600 text-white px-4 py-1 rounded" onClick={handleCreateChapter}>Create</button>
                    </div>
                    <div>
                        <label className="block mb-2 font-semibold">Chapters</label>
                        <ul className="mb-2">
                            {chapters.map(c => (
                                <li key={c.id} className="mb-1">
                                    <span className="font-mono text-sm">{c.id}</span> - {c.title}
                                    <button
                                        type="button"
                                        className={`ml-2 px-2 py-1 rounded text-xs ${selectedChapterId === c.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                        onClick={() => { setSelectedChapterId(c.id); setChapterContent(c.content || ""); }}
                                    >
                                        Edit
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {selectedChapterId && (
                        <div className="mt-4">
                            <label className="block mb-2 font-semibold">Edit Chapter Content</label>
                            <textarea
                                className="border px-2 py-1 rounded w-full mb-2"
                                rows={6}
                                value={chapterContent}
                                onChange={e => setChapterContent(e.target.value)}
                            />
                            <button className="bg-blue-600 text-white px-4 py-1 rounded" onClick={handleUpdateChapterContent}>Save Content</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
