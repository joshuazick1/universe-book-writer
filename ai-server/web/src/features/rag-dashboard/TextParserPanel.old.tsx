
import React, { useState, useEffect, useRef } from 'react';
import { ragService, RAGNode } from '../../services/ragService';
import { useFileStorage } from './hooks/useFileStorage';

/**
 * TextParserPanel provides a UI for the text-to-RAG pipeline:
 * - Input text or upload canonical file
 * - Select model
 * - Configure chunking
 * - Run pipeline and show real-time log/progress/results
 * - Show chunk diff preview and versioning UI
 */
import { useRAGFilter } from './RAGFilterBar';
function TextParserPanel() {
    const [inputText, setInputText] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [useChunking, setUseChunking] = useState(false);
    const [chunkSize, setChunkSize] = useState(2000);
    const { universe, book, chapter } = useRAGFilter();
    const [universeId, setUniverseId] = useState(universe);
    const [bookTitle, setBookTitle] = useState(book);
    const [chapterTitle, setChapterTitle] = useState(chapter);
    const [universeNodeId, setUniverseNodeId] = useState<string | null>(null);
    const [bookNodeId, setBookNodeId] = useState<string | null>(null);
    const [chapterNodeId, setChapterNodeId] = useState<string | null>(null);
    const [pipelineLog, setPipelineLog] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [parsedResults, setParsedResults] = useState<any>(null);
    const logRef = useRef<HTMLDivElement>(null);

    // File storage hook for upload/versioning/diff
    const {
        file,
        setFile,
        uploadFile,
        versions,
        diffPreview,
        fetchDiffPreview,
        loading: fileLoading,
        error: fileError,
    } = useFileStorage();

    // Fetch available models from backend
    useEffect(() => {
        const fetchModels = async () => {
            setLoadingModels(true);
            try {
                const res = await fetch("http://localhost:5100/api/tags");
                if (!res.ok) throw new Error("Failed to fetch models");
                const data = await res.json();
                const modelNames = Array.isArray(data.models)
                    ? data.models.map((m: any) => typeof m === "string" ? m : m.name)
                    : [];
                modelNames.sort((a: string, b: string) => a.localeCompare(b));
                setModels(modelNames);
                setSelectedModel(modelNames.length > 0 ? modelNames[0] : "");
            } catch (e: any) {
                setError(e.message || "Unknown error fetching models");
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, []);

    // Scroll log to bottom on update
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [pipelineLog]);

    const appendLog = (msg: string) => setPipelineLog(log => [...log, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    // Main pipeline: send text to backend, handle SSE for real-time feedback
    const handleParse = async () => {
        if (!inputText.trim() && !file) {
            setError('Please enter some text or upload a file to parse');
            return;
        }
        if (!selectedModel) {
            setError('Please select an AI model');
            return;
        }
        if (!universeId.trim()) {
            setError('Universe ID is required');
            return;
        }
        if (!bookTitle.trim()) {
            setError('Book title is required');
            return;
        }
        // If file is present, use file upload pipeline
        if (file) {
            appendLog('Uploading file and triggering chunk diff...');
            await uploadFile(universeId, bookTitle, chapterTitle);
            appendLog('File uploaded. Previewing chunk diff...');
            if (versions.length > 0) {
                await fetchDiffPreview(versions[versions.length - 1].id);
                appendLog('Diff preview ready.');
            }
            // TODO: Trigger backend chunk update pipeline
            return;
        }
        // Chapter is optional: if blank, link chunks directly to book (for short stories or pre-chapter books)
        setIsProcessing(true);
        setError(null);
        setParsedResults(null);
        setPipelineLog([]);
        appendLog('Started text parsing pipeline');

        try {
            // 1. Ensure universe node exists
            let universeNode: RAGNode | null = null;
            const allNodes = await ragService.getAllNodes(100);
            universeNode = (allNodes.find((n: RAGNode) => (n.type === 'universe' || n.nodeType === 'universe') && (n.universeId === universeId || n.metadata?.universeId === universeId)) ?? null);
            if (!universeNode) {
                appendLog('Universe node not found, creating...');
                universeNode = await ragService.createNode({
                    type: 'universe',
                    title: universeId, // If you have a friendly name, use it here
                    universeId, // <-- set as top-level property
                    content: { description: `Universe: ${universeId}` },
                    metadata: {
                        universeId,
                        ownerId: 'api-user',
                        tags: [],
                        sensitivity: 'public',
                        version: 1
                    }
                });
                appendLog(`Universe node created: ${universeNode.id}`);
            } else {
                appendLog(`Universe node exists: ${universeNode.id}`);
            }
            setUniverseNodeId(universeNode.id);

            // 2. Ensure book node exists (child of universe)
            let bookNode: RAGNode | null = null;
            bookNode = (allNodes.find((n: RAGNode) => (n.type === 'book' || n.nodeType === 'book') && n.title === bookTitle && (n.universeId === universeId || n.metadata?.universeId === universeId)) || null);
            if (!bookNode) {
                appendLog('Book node not found, creating...');
                bookNode = await ragService.createNode({
                    type: 'book',
                    title: bookTitle,
                    universeId, // <-- set as top-level property
                    content: { description: `Book: ${bookTitle}` },
                    metadata: {
                        universeId,
                        ownerId: 'api-user',
                        tags: [],
                        sensitivity: 'public',
                        version: 1
                    }
                });
                appendLog(`Book node created: ${bookNode.id}`);
                // Optionally: create relationship to universeNode
                // await ragService.createRelationship({ ... });
            } else {
                appendLog(`Book node exists: ${bookNode.id}`);
            }
            setBookNodeId(bookNode.id);

            // 3. Optionally ensure chapter node exists (child of book)
            let chapterNode: RAGNode | null = null;
            if (chapterTitle.trim()) {
                chapterNode = (allNodes.find((n: RAGNode) => {
                    // Only check .metadata.bookId if it exists and is a string
                    const meta = n.metadata as Record<string, unknown> | undefined;
                    return (
                        (n.type === 'chapter' || n.nodeType === 'chapter') &&
                        n.title === chapterTitle &&
                        (n.universeId === universeId || n.metadata?.universeId === universeId) &&
                        (n.bookId === bookNode.id || (meta && typeof (meta as any).bookId === 'string' && bookNode && (meta as any).bookId === bookNode.id))
                    );
                }) || null);
                if (!chapterNode) {
                    appendLog('Chapter node not found, creating...');
                    // Add bookId and universeId as extra properties
                    chapterNode = await ragService.createNode({
                        type: 'chapter',
                        title: chapterTitle,
                        universeId, // top-level property
                        bookId: bookNode.id, // top-level property
                        content: { description: `Chapter: ${chapterTitle}` },
                        metadata: {
                            universeId,
                            ownerId: 'api-user',
                            tags: [],
                            sensitivity: 'public',
                            version: 1,
                            bookId: bookNode.id
                        }
                    });
                    appendLog(`Chapter node created: ${chapterNode.id}`);
                    // Optionally: create relationship to bookNode
                    // await ragService.createRelationship({ ... });
                } else {
                    appendLog(`Chapter node exists: ${chapterNode.id}`);
                }
                setChapterNodeId(chapterNode.id);
            } else {
                setChapterNodeId(null);
            }

            // --- POST with ReadableStream for SSE feedback ---
            appendLog('Connecting to backend for real-time pipeline feedback (POST)...');
            const controller = new AbortController();
            const response = await fetch('/api/rag/ingest/text/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: inputText,
                    chunkSize,
                    metadata: {
                        model: selectedModel,
                        universeId,
                        userId: 'api-user',
                        useChunking,
                        confidenceThreshold: 0.6,
                        enableRelationshipExtraction: true,
                        enableContextualUpdates: true,
                        autoCreateRAGNodes: false,
                        bookId: bookNode.id,
                        ...(chapterNode ? { chapterId: chapterNode.id } : {})
                    },
                    type: 'text'
                }),
                signal: controller.signal
            });
            if (!response.body) {
                appendLog('[backend] No response body for SSE stream.');
                setIsProcessing(false);
                return;
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let done = false;
            while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    let lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.slice(5).trim();
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.event) {
                                    switch (parsed.event) {
                                        case 'chunking':
                                            appendLog(`[backend] Chunking: ${parsed.totalChunks} chunks`);
                                            break;
                                        case 'chunk':
                                            appendLog(`[backend] Chunk ${parsed.index + 1}: ${parsed.textLength} chars`);
                                            break;
                                        case 'node_created':
                                            appendLog(`[backend] Node created: ${parsed.nodeId}`);
                                            break;
                                        case 'summarizing':
                                            appendLog(`[backend] Summarizing chunk node: ${parsed.nodeId}`);
                                            break;
                                        case 'summary':
                                            appendLog(`[backend] Summary: ${parsed.summary?.summary || ''}`);
                                            break;
                                        case 'extracting_entities':
                                            appendLog(`[backend] Extracting entities for node: ${parsed.nodeId}`);
                                            break;
                                        case 'entity':
                                            appendLog(`[backend] Entity: ${parsed.entity?.title || parsed.entity?.name || ''}`);
                                            break;
                                        case 'extracting_relationships':
                                            appendLog(`[backend] Extracting relationships for node: ${parsed.nodeId}`);
                                            break;
                                        case 'relationship':
                                            appendLog(`[backend] Relationship: ${parsed.relationship?.type || ''}`);
                                            break;
                                        case 'extracting_lore':
                                            appendLog(`[backend] Extracting lore for node: ${parsed.nodeId}`);
                                            break;
                                        case 'lore':
                                            appendLog(`[backend] Lore: ${parsed.lore?.name || ''}`);
                                            break;
                                        case 'extracting_dialogue':
                                            appendLog(`[backend] Extracting dialogue for node: ${parsed.nodeId}`);
                                            break;
                                        case 'dialogue':
                                            appendLog(`[backend] Dialogue: ${parsed.dialogue?.quote || ''}`);
                                            break;
                                        case 'chunk_entity_link':
                                            appendLog(`[backend] Linked chunk ${parsed.nodeId} to entity ${parsed.entityId}`);
                                            break;
                                        case 'character_memory':
                                            appendLog(`[backend] Character memory generated for: ${parsed.characterId}`);
                                            break;
                                        case 'done':
                                            appendLog(`[backend] Pipeline complete.`);
                                            setIsProcessing(false);
                                            break;
                                        case 'error':
                                            appendLog(`[backend] Error: ${parsed.message || 'Unknown error'}`);
                                            setIsProcessing(false);
                                            break;
                                        default:
                                            appendLog(`[backend] ${parsed.event}: ${JSON.stringify(parsed)}`);
                                    }
                                } else {
                                    appendLog(`[backend] ${JSON.stringify(parsed)}`);
                                }
                            } catch (err) {
                                appendLog(`[backend] ${data}`);
                            }
                        }
                    }
                }
            }
            setIsProcessing(false);
        } catch (err) {
            setError(`Failed to parse text: ${err instanceof Error ? err.message : String(err)}`);
            setIsProcessing(false);
        }
    };

    // ...existing UI rendering code...

    return (
        <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Text-to-RAG Parser</h2>
            <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block font-medium mb-1">Universe ID</label>
                    <input
                        className="w-full border border-gray-300 rounded p-2"
                        value={universeId}
                        onChange={e => setUniverseId(e.target.value)}
                        placeholder="Universe ID"
                        disabled={isProcessing}
                    />
                </div>
                <div className="flex-1">
                    <label className="block font-medium mb-1">Book Title</label>
                    <input
                        className="w-full border border-gray-300 rounded p-2"
                        value={bookTitle}
                        onChange={e => setBookTitle(e.target.value)}
                        placeholder="Book Title"
                        disabled={isProcessing}
                    />
                </div>
                <div className="flex-1">
                    <label className="block font-medium mb-1">Chapter Title (optional)</label>
                    <input
                        className="w-full border border-gray-300 rounded p-2"
                        value={chapterTitle}
                        onChange={e => setChapterTitle(e.target.value)}
                        placeholder="Chapter Title (optional)"
                        disabled={isProcessing}
                    />
                </div>
            </div>
            <div className="mb-4">
                <label className="block font-medium mb-1">Input Text</label>
                <textarea
                    className="w-full border border-gray-300 rounded p-2 min-h-[120px]"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Paste or type your story text here..."
                    disabled={isProcessing}
                />
            </div>
            <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block font-medium mb-1">Model</label>
                    <select
                        className="w-full border border-gray-300 rounded p-2"
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        disabled={loadingModels || isProcessing}
                    >
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block font-medium mb-1">Chunk Size</label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded p-2"
                        value={chunkSize}
                        onChange={e => setChunkSize(Number(e.target.value))}
                        min={500}
                        max={10000}
                        step={100}
                        disabled={isProcessing}
                    />
                </div>
                <div className="flex items-center mt-6">
                    <input
                        type="checkbox"
                        checked={useChunking}
                        onChange={e => setUseChunking(e.target.checked)}
                        disabled={isProcessing}
                        id="useChunking"
                    />
                    <label htmlFor="useChunking" className="ml-2">Enable Chunking</label>
                </div>
            </div>
            <div className="mb-4 flex gap-4">
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleParse}
                    disabled={isProcessing || !inputText.trim() || !selectedModel}
                >
                    {isProcessing ? 'Processing...' : 'Run Text-to-RAG Pipeline'}
                </button>
                {error && <span className="text-red-600 self-center">{error}</span>}
            </div>
            <div className="mb-4">
                <label className="block font-medium mb-1">Pipeline Log</label>
                <div
                    ref={logRef}
                    className="bg-gray-100 border border-gray-300 rounded p-2 h-40 overflow-y-auto text-xs font-mono"
                >
                    {pipelineLog.length === 0 ? <span className="text-gray-400">No log yet.</span> : pipelineLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
            {parsedResults && (
                <div className="mb-4">
                    <label className="block font-medium mb-1">Results</label>
                    <pre className="bg-gray-100 border border-gray-300 rounded p-2 overflow-x-auto text-xs">
                        {JSON.stringify(parsedResults, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default TextParserPanel;
