import React, { useRef, useState } from 'react';
import { useFileStorage } from './hooks/useFileStorage';
import { useRAGFilter } from './RAGFilterBar';

/**
 * FileStoragePanel allows users to upload, view, diff, rollback, and migrate canonical text files
 * for a universe, book, and (optionally) chapter. Supports full version history and traceability.
 */

/**
 * FileStoragePanel allows users to upload, view, and assign canonical text files
 * to a universe, book, and (optionally) chapter. Supports versioning and diff preview.
 */

export const FileStoragePanel: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { universe, book, chapter } = useRAGFilter();
    // Use filter context as default values, but allow override if needed
    const [universeId, setUniverseId] = useState(universe);
    const [bookTitle, setBookTitle] = useState(book);
    const [chapterTitle, setChapterTitle] = useState(chapter);
    const [selectedVersionA, setSelectedVersionA] = useState<string | null>(null);
    const [selectedVersionB, setSelectedVersionB] = useState<string | null>(null);
    // Use the custom file storage hook
    const {
        file,
        setFile,
        uploadFile,
        versions,
        diffPreview,
        fetchDiffPreview,
        loading,
        error,
    } = useFileStorage();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setFile(file);
    };

    const handleUpload = async () => {
        if (!file || !universeId || !bookTitle) {
            alert('Universe and Book are required.');
            return;
        }
        await uploadFile(universeId, bookTitle, chapterTitle);
    };

    // --- Version Diffing ---
    const handleDiffVersions = async () => {
        if (selectedVersionA && selectedVersionB && selectedVersionA !== selectedVersionB) {
            // TODO: Replace with fetchDiffBetweenVersions(selectedVersionA, selectedVersionB) when backend supports
            await fetchDiffPreview(selectedVersionB); // fallback: show diff to selected B
        }
    };

    // --- Rollback (stub) ---
    const handleRollback = async (versionId: string) => {
        // TODO: Implement rollback logic via API
        alert(`Rollback to version ${versionId} (not yet implemented)`);
    };

    // --- Migration (stub) ---
    const handleMigrate = async (versionId: string) => {
        // TODO: Implement migration logic via API
        alert(`Migrate content from version ${versionId} (not yet implemented)`);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mt-8" aria-label="File Storage Panel">
            <h2 className="text-xl font-semibold mb-4">Canonical Book/Chapter File Upload</h2>
            <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block font-medium mb-1" htmlFor="universe-id">Universe ID</label>
                    <input
                        id="universe-id"
                        className="w-full border border-gray-300 rounded p-2"
                        value={universeId}
                        onChange={e => setUniverseId(e.target.value)}
                        placeholder="Universe ID"
                        aria-required="true"
                    />
                </div>
                <div className="flex-1">
                    <label className="block font-medium mb-1" htmlFor="book-title">Book Title</label>
                    <input
                        id="book-title"
                        className="w-full border border-gray-300 rounded p-2"
                        value={bookTitle}
                        onChange={e => setBookTitle(e.target.value)}
                        placeholder="Book Title"
                        aria-required="true"
                    />
                </div>
                <div className="flex-1">
                    <label className="block font-medium mb-1" htmlFor="chapter-title">Chapter Title (optional)</label>
                    <input
                        id="chapter-title"
                        className="w-full border border-gray-300 rounded p-2"
                        value={chapterTitle}
                        onChange={e => setChapterTitle(e.target.value)}
                        placeholder="Chapter Title (optional)"
                    />
                </div>
            </div>
            <div className="mb-4">
                <input
                    type="file"
                    accept=".txt,.md"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    aria-label="File Input"
                />
            </div>
            {file && (
                <div className="mb-4">
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded" aria-label="Selected File">{file.name} ({file.size} bytes)</div>
                </div>
            )}
            <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleUpload}
                disabled={loading}
                aria-label="Upload File"
            >
                {loading ? 'Uploading...' : 'Upload'}
            </button>
            {error && <div className="text-red-600 mt-2" role="alert">{error}</div>}

            {/* --- Version History --- */}
            {versions.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">File Version History</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2">Version</th>
                                    <th className="p-2">Size</th>
                                    <th className="p-2">Created</th>
                                    <th className="p-2">Actions</th>
                                    <th className="p-2">Select for Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {versions.map(v => (
                                    <tr key={v.id} className="border-t">
                                        <td className="p-2 font-mono">{v.name}</td>
                                        <td className="p-2">{v.size} bytes</td>
                                        <td className="p-2">{new Date(v.createdAt).toLocaleString()}</td>
                                        <td className="p-2 flex flex-col gap-1">
                                            <button
                                                className="text-blue-600 underline text-xs"
                                                onClick={() => fetchDiffPreview(v.id)}
                                            >
                                                Preview Diff
                                            </button>
                                            <button
                                                className="text-green-700 underline text-xs"
                                                onClick={() => handleRollback(v.id)}
                                            >
                                                Rollback
                                            </button>
                                            <button
                                                className="text-purple-700 underline text-xs"
                                                onClick={() => handleMigrate(v.id)}
                                            >
                                                Migrate
                                            </button>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="radio"
                                                name="versionA"
                                                checked={selectedVersionA === v.id}
                                                onChange={() => setSelectedVersionA(v.id)}
                                                aria-label={`Select version ${v.name} as A`}
                                            />
                                            <input
                                                type="radio"
                                                name="versionB"
                                                checked={selectedVersionB === v.id}
                                                onChange={() => setSelectedVersionB(v.id)}
                                                aria-label={`Select version ${v.name} as B`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <button
                            className="bg-gray-200 px-2 py-1 rounded text-xs"
                            onClick={handleDiffVersions}
                            disabled={!selectedVersionA || !selectedVersionB || selectedVersionA === selectedVersionB}
                        >
                            Diff Selected Versions
                        </button>
                        <span className="text-xs text-gray-500">(Select two versions above to compare)</span>
                    </div>
                </div>
            )}

            {/* --- Diff Preview --- */}
            {diffPreview && (
                <div className="mt-4 bg-gray-50 border p-3 rounded" aria-label="Chunk Diff Preview">
                    <h4 className="font-semibold mb-2">Chunk Diff Preview</h4>
                    <pre className="whitespace-pre-wrap text-xs">{typeof diffPreview === 'string' ? diffPreview : JSON.stringify(diffPreview, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};


