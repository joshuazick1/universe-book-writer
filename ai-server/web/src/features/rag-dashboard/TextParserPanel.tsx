import React, { useState, useEffect, useRef } from 'react';

// Pipeline task type
interface PipelineTask {
    id: string;
    task: string;
    friendlyName: string;
    status: 'not_queued' | 'pending' | 'running' | 'success' | 'error';
    startedAt?: string;
    finishedAt?: string;
    modelName?: string;
}

// Pipeline stepper component
function PipelineStepper({ tasks }: { tasks: PipelineTask[] }) {
    return (
        <ol className="relative border-l border-gray-300 ml-4 my-6">
            {tasks.map((task, idx) => {
                let icon, color;
                switch (task.status) {
                    case 'success':
                        icon = <span className="inline-block w-4 h-4 bg-green-500 rounded-full border-2 border-white" />;
                        color = 'text-green-700';
                        break;
                    case 'running':
                        icon = <span className="inline-block w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse" />;
                        color = 'text-blue-700';
                        break;
                    case 'error':
                        icon = <span className="inline-block w-4 h-4 bg-red-500 rounded-full border-2 border-white" />;
                        color = 'text-red-700';
                        break;
                    case 'pending':
                        icon = <span className="inline-block w-4 h-4 bg-yellow-400 rounded-full border-2 border-white" />;
                        color = 'text-yellow-700';
                        break;
                    default:
                        icon = <span className="inline-block w-4 h-4 bg-gray-300 rounded-full border-2 border-white" />;
                        color = 'text-gray-600';
                }
                return (
                    <li key={task.id || idx} className="mb-6 ml-2 flex items-center">
                        <span className="absolute -left-6">{icon}</span>
                        <div>
                            <span className={`font-medium ${color}`}>{task.friendlyName || task.task}</span>
                            {task.modelName && (
                                <span className="ml-2 text-xs text-gray-500">(Model: {task.modelName})</span>
                            )}
                            <div className="text-xs text-gray-400">
                                {task.status === 'success' && task.finishedAt && `Finished: ${new Date(task.finishedAt).toLocaleTimeString()}`}
                                {task.status === 'running' && 'Running...'}
                                {task.status === 'pending' && 'Queued'}
                                {task.status === 'not_queued' && 'Waiting'}
                                {task.status === 'error' && 'Failed'}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// Main TextParserPanel component
const TextParserPanel: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [useChunking, setUseChunking] = useState(false);
    const [chunkSize, setChunkSize] = useState(2000);
    const [universeId, setUniverseId] = useState('');
    const [bookTitle, setBookTitle] = useState('');
    const [chapterTitle, setChapterTitle] = useState('');
    const [universeNodeId, setUniverseNodeId] = useState<string | null>(null);
    const [bookNodeId, setBookNodeId] = useState<string | null>(null);
    const [chapterNodeId, setChapterNodeId] = useState<string | null>(null);
    const [pipelineLog, setPipelineLog] = useState<string[]>([]);
    const [pipelineTasks, setPipelineTasks] = useState<PipelineTask[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [parsedResults, setParsedResults] = useState<any>(null);
    const logRef = useRef<HTMLDivElement>(null);

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
        if (!inputText.trim()) {
            setError('Please enter some text to parse');
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
        setIsProcessing(true);
        setError(null);
        setParsedResults(null);
        setPipelineLog([]);
        setPipelineTasks([]);
        appendLog('Started text parsing pipeline');

        // --- POST with ReadableStream for SSE feedback ---
        try {
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
                        bookId: bookNodeId,
                        ...(chapterNodeId ? { chapterId: chapterNodeId } : {})
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
                                if (parsed.tasks && Array.isArray(parsed.tasks)) {
                                    setPipelineTasks(parsed.tasks);
                                }
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
                                        case 'lore':
                                        case 'extracting_dialogue':
                                        default:
                                    }
                                }
                            } catch (err) {
                                appendLog(`[backend] Malformed SSE data: ${data}`);
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
                <textarea
                    className="w-full border border-gray-300 rounded p-2 min-h-[120px]"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Paste or type your story text here..."
                    disabled={isProcessing}
                />
            </div>
            <div className="mb-4 flex items-center gap-4">
                <label className="font-medium">Model:</label>
                <select
                    className="border rounded px-2 py-1"
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    disabled={isProcessing || loadingModels}
                >
                    {models.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
                {loadingModels && <span className="text-xs text-gray-500">Loading models...</span>}
            </div>
            <button
                onClick={handleParse}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isProcessing || !selectedModel}
            >
                {isProcessing ? 'Processing...' : 'Parse Text'}
            </button>
            {pipelineTasks.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">Pipeline Progress</h3>
                    <PipelineStepper tasks={pipelineTasks} />
                </div>
            )}
            <div className="mt-6">
                <h3 className="font-semibold mb-2">Pipeline Log</h3>
                <div ref={logRef} className="bg-gray-100 rounded p-2 h-40 overflow-y-auto text-xs font-mono">
                    {pipelineLog.map((line, idx) => <div key={idx}>{line}</div>)}
                </div>
            </div>
            {error && <div className="text-red-600 mt-4">{error}</div>}
        </div>
    );
};

export default TextParserPanel;
