
import React, { useState } from 'react';
import { useLore, LoreNode } from './hooks/useLore';
import { useRAGFilter } from './RAGFilterBar';

/**
 * LoreBrowser allows users to explore, search, and edit universe lore and mythology.
 * Features:
 *  - List and search all lore nodes
 *  - Show relationships to timeline, characters, and events
 *  - Inline editing and tagging
 *
 * @example
 * <LoreBrowser />
 */
const LoreBrowser: React.FC = () => {
    const { universe, book, chapter, character } = useRAGFilter();
    const { loreNodes } = useLore(universe /*, book, chapter, character */);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const filtered = loreNodes.filter(node =>
        node.title.toLowerCase().includes(search.toLowerCase()) ||
        node.summary.toLowerCase().includes(search.toLowerCase())
    );

    const startEdit = (id: string, value: string) => {
        setEditingId(id);
        setEditValue(value);
    };

    const saveEdit = (id: string) => {
        // TODO: Implement save logic (API/state)
        setEditingId(null);
    };

    return (
        <section className="p-4 bg-white rounded shadow mb-4" aria-label="Lore Browser">
            <h2 className="text-xl font-semibold mb-4">Lore & Mythology</h2>
            <input
                type="text"
                className="w-full mb-3 p-2 border rounded"
                placeholder="Search lore..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search lore"
            />
            <ul className="divide-y divide-gray-200">
                {filtered.length === 0 && (
                    <li className="py-4 text-gray-500">No lore found.</li>
                )}
                {filtered.map(node => (
                    <li key={node.id} className="py-4 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            {editingId === node.id ? (
                                <>
                                    <input
                                        className="border p-1 rounded w-2/3"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        aria-label="Edit lore title"
                                    />
                                    <button
                                        className="ml-2 px-2 py-1 bg-blue-600 text-white rounded"
                                        onClick={() => saveEdit(node.id)}
                                    >Save</button>
                                    <button
                                        className="ml-1 px-2 py-1 bg-gray-300 rounded"
                                        onClick={() => setEditingId(null)}
                                    >Cancel</button>
                                </>
                            ) : (
                                <>
                                    <span className="font-medium text-blue-900">{node.title}</span>
                                    <button
                                        className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                        onClick={() => startEdit(node.id, node.title)}
                                    >Edit</button>
                                </>
                            )}
                            <span className="ml-4 text-xs text-gray-400">{node.tag}</span>
                        </div>
                        <div className="text-gray-700 text-sm">{node.summary}</div>
                        {node.related && node.related.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                                <strong>Related:</strong> {node.related.join(', ')}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default LoreBrowser;
