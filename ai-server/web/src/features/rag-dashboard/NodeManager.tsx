
import React, { useState } from 'react';
import { useRAGNodes } from './hooks/useRAGNodes';
import type { RAGNode } from '../../services/ragService';
import { useRAGFilter } from './RAGFilterBar';

/**
 * NodeManager provides CRUD and detail view for all RAG nodes.
 */
const NodeManager: React.FC = () => {
    const { universe, book, chapter, character } = useRAGFilter();
    const { nodes, loading, error, createNode, updateNode, deleteNode } = useRAGNodes(universe /*, book, chapter, character */);
    const [showCreate, setShowCreate] = useState(false);
    const [newNode, setNewNode] = useState<Omit<RAGNode, 'id' | 'timestamps'>>({
        type: 'character',
        title: '',
        content: { description: '' },
        metadata: {
            universeId: 'default-universe',
            ownerId: 'api-user',
            tags: [],
            sensitivity: 'public',
            version: 1
        }
    });
    const [editId, setEditId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleCreate = async () => {
        await createNode(newNode);
        setShowCreate(false);
        setNewNode({
            type: 'character',
            title: '',
            content: { description: '' },
            metadata: {
                universeId: 'default-universe',
                ownerId: 'api-user',
                tags: [],
                sensitivity: 'public',
                version: 1
            }
        });
    };

    const handleEdit = async (id: string) => {
        await updateNode(id, { title: editValue });
        setEditId(null);
        setEditValue('');
    };

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Node Manager</h3>
                <button
                    className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                    onClick={() => setShowCreate(v => !v)}
                >{showCreate ? 'Cancel' : 'Create Node'}</button>
            </div>
            {showCreate && (
                <div className="mb-4 p-2 bg-gray-50 rounded border">
                    <input
                        className="border p-1 rounded w-1/2 mb-2"
                        placeholder="Title"
                        value={newNode.title}
                        onChange={e => setNewNode(n => ({ ...n, title: e.target.value }))}
                    />
                    <textarea
                        className="border p-1 rounded w-full mb-2"
                        placeholder="Description"
                        value={typeof newNode.content === 'object' ? newNode.content.description : ''}
                        onChange={e => setNewNode(n => ({ ...n, content: { ...((typeof n.content === 'object' ? n.content : {})), description: e.target.value } }))}
                    />
                    <button
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                        onClick={handleCreate}
                    >Save</button>
                </div>
            )}
            {loading && <div className="text-gray-500">Loading nodes...</div>}
            {error && <div className="text-red-500">{error}</div>}
            <ul className="divide-y divide-gray-200">
                {nodes
                    .filter(node => {
                        // Exclude system nodes, nodes in System universe, and infra/model/server nodes
                        const type = node.type || node.nodeType || '';
                        const universeId = node.universeId || node.metadata?.universeId || node.properties?.universeId || '';
                        if (type === 'system' || universeId === 'System') return false;
                        // Exclude infra/model/server nodes
                        if (['ai-server', 'ai-model', 'server', 'model', 'model-performance'].includes(type)) return false;
                        return true;
                    })
                    .map(node => (
                        <li key={node.id} className="py-2 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                {editId === node.id ? (
                                    <>
                                        <input
                                            className="border p-1 rounded w-1/2"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                        />
                                        <button
                                            className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                            onClick={() => handleEdit(node.id)}
                                        >Save</button>
                                        <button
                                            className="ml-1 px-2 py-1 bg-gray-300 rounded text-sm"
                                            onClick={() => setEditId(null)}
                                        >Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-medium text-blue-900">{node.title || node.properties?.name || 'Untitled'}</span>
                                        <button
                                            className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                            onClick={() => { setEditId(node.id); setEditValue(node.title || ''); }}
                                        >Edit</button>
                                        <button
                                            className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                                            onClick={() => deleteNode(node.id)}
                                        >Delete</button>
                                    </>
                                )}
                            </div>
                            <details className="mt-1">
                                <summary className="cursor-pointer text-sm text-blue-700 select-none">Details</summary>
                                <div className="text-gray-700 text-sm">{typeof node.content === 'object' ? node.content.description : node.content}</div>
                                <div className="text-xs text-gray-400">Type: {node.type || node.nodeType}</div>
                                {/* File/Chunk Reference & Versioning Info */}
                                {node.metadata && (node.metadata as any).fileId && (
                                    <div className="text-xs text-green-700 mt-1">
                                        File ID: <span className="font-mono">{(node.metadata as any).fileId}</span>
                                        {(node.metadata as any).fileVersion && (
                                            <span> (v{(node.metadata as any).fileVersion})</span>
                                        )}
                                    </div>
                                )}
                                {node.metadata && (node.metadata as any).chunkIds && Array.isArray((node.metadata as any).chunkIds) && (
                                    <div className="text-xs text-purple-700 mt-1">
                                        Chunks: <span className="font-mono">{((node.metadata as any).chunkIds as string[]).join(', ')}</span>
                                    </div>
                                )}
                                {/* Version history placeholder (future: fetch/display real version history) */}
                                {node.metadata && (node.metadata as any).versionHistory && Array.isArray((node.metadata as any).versionHistory) && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Version History: {((node.metadata as any).versionHistory as any[]).map((v, i) => (
                                            <span key={i} className="mr-2">v{v.version} ({v.date})</span>
                                        ))}
                                    </div>
                                )}
                            </details>
                        </li>
                    ))}
            </ul>
        </section>
    );
};

export default NodeManager;
