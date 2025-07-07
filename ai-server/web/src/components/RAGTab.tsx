import React, { useState, useEffect } from 'react';
import { ragService, type RAGNode } from '../services/ragService';
import { AIRAGTest } from './AIRAGTest';

const RAGTab: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'ai-test' | 'text-parser'>('dashboard');
    const [healthStatus, setHealthStatus] = useState<{ healthy: boolean; details?: any } | null>(null);
    const [nodes, setNodes] = useState<RAGNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any>(null);

    // Text parser state
    const [inputText, setInputText] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [useChunking, setUseChunking] = useState(false);
    const [chunkSize, setChunkSize] = useState(2000);
    const [universeId, setUniverseId] = useState('text-parser-universe');
    const [currentJob, setCurrentJob] = useState<any>(null);
    const [parsedResults, setParsedResults] = useState<any>(null);
    const [jobPollingInterval, setJobPollingInterval] = useState<NodeJS.Timeout | null>(null);

    // Node creation form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newNode, setNewNode] = useState({
        type: 'character',
        title: '',
        content: {
            description: ''
        },
        metadata: {
            universeId: 'test-universe',
            ownerId: 'frontend-user',
            tags: [] as string[],
            sensitivity: 'public' as 'public' | 'private' | 'sensitive' | 'restricted',
            version: 1
        }
    });

    // Load RAG health and nodes on component mount
    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadHealthStatus();
            loadNodes();
        }
    }, [activeTab]);

    const loadHealthStatus = async () => {
        try {
            const health = await ragService.healthCheck();
            setHealthStatus(health);
        } catch (err) {
            setError(`Health check failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const loadNodes = async () => {
        try {
            setLoading(true);
            const allNodes = await ragService.getAllNodes(20);
            setNodes(allNodes);
        } catch (err) {
            setError(`Failed to load nodes: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        try {
            setLoading(true);
            const results = await ragService.searchNodes(searchQuery);
            setSearchResults(results);
        } catch (err) {
            setError(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNode = async () => {
        try {
            setLoading(true);
            const nodeData = {
                ...newNode,
                // Use the title directly since it's now a top-level property
            };

            const createdNode = await ragService.createNode(nodeData);
            setNodes(prev => [createdNode, ...prev]);
            setShowCreateForm(false);

            // Reset form
            setNewNode({
                type: 'character',
                title: '',
                content: { description: '' },
                metadata: {
                    universeId: 'test-universe',
                    ownerId: 'frontend-user',
                    tags: [],
                    sensitivity: 'public' as 'public' | 'private' | 'sensitive' | 'restricted',
                    version: 1
                }
            });
        } catch (err) {
            setError(`Failed to create node: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteNode = async (nodeId: string) => {
        try {
            await ragService.deleteNode(nodeId);
            setNodes(prev => prev.filter(node => node.id !== nodeId));
        } catch (err) {
            setError(`Failed to delete node: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Text parser backend integration functions
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

    const parseTextWithBackend = async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to parse');
            return;
        }

        if (!selectedModel) {
            setError('Please select an AI model');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setParsedResults(null);
        setCurrentJob(null);

        try {
            // Determine whether to use sync or async endpoint
            const useSyncEndpoint = inputText.length <= 5000 && !useChunking;

            if (useSyncEndpoint) {
                await parseTextSync();
            } else {
                await parseTextAsync();
            }
        } catch (err) {
            setError(`Failed to parse text: ${err instanceof Error ? err.message : String(err)}`);
            setIsProcessing(false);
        }
    };

    const parseTextSync = async () => {
        try {
            const response = await fetch('http://localhost:5100/api/text-to-rag/parse-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceText: inputText,
                    options: {
                        useChunking,
                        chunkSize,
                        model: selectedModel,
                        universeId,
                        confidenceThreshold: 0.6,
                        enableRelationshipExtraction: true,
                        enableContextualUpdates: true,
                        autoCreateRAGNodes: false,
                        userId: 'frontend-user'
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.results) {
                setParsedResults(data.results);
            } else {
                throw new Error(data.error || 'Failed to parse text');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const parseTextAsync = async () => {
        try {
            const response = await fetch('http://localhost:5100/api/text-to-rag/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceText: inputText,
                    options: {
                        useChunking,
                        chunkSize,
                        model: selectedModel,
                        universeId,
                        confidenceThreshold: 0.6,
                        enableRelationshipExtraction: true,
                        enableContextualUpdates: true,
                        autoCreateRAGNodes: false,
                        userId: 'frontend-user'
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.jobId) {
                pollJobStatus(data.jobId);
            } else {
                throw new Error(data.error || 'Failed to start parsing job');
            }
        } catch (err) {
            setError(`Failed to start parsing: ${err instanceof Error ? err.message : String(err)}`);
            setIsProcessing(false);
        }
    };

    const pollJobStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`http://localhost:5100/api/text-to-rag/job/${jobId}/status`);
                const data = await response.json();

                if (data.success && data.job) {
                    setCurrentJob(data.job);

                    if (data.job.status === 'completed') {
                        clearInterval(interval);
                        setJobPollingInterval(null);
                        await fetchJobResults(jobId);
                        setIsProcessing(false);
                    } else if (data.job.status === 'failed') {
                        clearInterval(interval);
                        setJobPollingInterval(null);
                        setError(data.job.error || 'Job failed');
                        setIsProcessing(false);
                    }
                }
            } catch (err) {
                console.error('Error polling job status:', err);
            }
        }, 2000); // Poll every 2 seconds

        setJobPollingInterval(interval);
    };

    const fetchJobResults = async (jobId: string) => {
        try {
            const response = await fetch(`http://localhost:5100/api/text-to-rag/job/${jobId}/results`);
            const data = await response.json();

            if (data.success && data.results) {
                setParsedResults(data.results);
            } else {
                throw new Error(data.error || 'Failed to fetch results');
            }
        } catch (err) {
            setError(`Failed to fetch results: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const cancelCurrentJob = async () => {
        if (currentJob && jobPollingInterval) {
            try {
                await fetch(`http://localhost:5100/api/text-to-rag/job/${currentJob.id}`, {
                    method: 'DELETE'
                });

                clearInterval(jobPollingInterval);
                setJobPollingInterval(null);
                setCurrentJob(null);
                setIsProcessing(false);
            } catch (err) {
                setError(`Failed to cancel job: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    };

    // Load models when text parser tab is activated
    useEffect(() => {
        if (activeTab === 'text-parser' && models.length === 0) {
            fetchModels();
        }
    }, [activeTab, models.length]);

    // Cleanup polling interval on unmount
    useEffect(() => {
        return () => {
            if (jobPollingInterval) {
                clearInterval(jobPollingInterval);
            }
        };
    }, [jobPollingInterval]);

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex space-x-4 border-b">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-2 px-1 ${activeTab === 'dashboard'
                            ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        RAG Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('text-parser')}
                        className={`pb-2 px-1 ${activeTab === 'text-parser'
                            ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Text Parser
                    </button>
                    <button
                        onClick={() => setActiveTab('ai-test')}
                        className={`pb-2 px-1 ${activeTab === 'ai-test'
                            ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        AI RAG Test
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">RAG System Dashboard</h2>

                        {/* Health Status */}
                        <div className="mb-4">
                            <h3 className="font-medium mb-2">System Health</h3>
                            {healthStatus ? (
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${healthStatus.healthy
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {healthStatus.healthy ? '✅ Healthy' : '❌ Unhealthy'}
                                </div>
                            ) : (
                                <div className="text-gray-500">Loading...</div>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-2 text-red-500 hover:text-red-700"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Search Section */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="font-medium mb-3">Search RAG Nodes</h3>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Enter search query..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                        </div>

                        {/* Search Results */}
                        {searchResults && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Search Results</h4>
                                {searchResults.results && searchResults.results.length > 0 ? (
                                    <div className="space-y-2">
                                        {searchResults.results.map((result: any, index: number) => (
                                            <div key={index} className="p-3 border border-gray-200 rounded">
                                                <div className="font-medium">{result.title || result.id}</div>
                                                <div className="text-sm text-gray-600">
                                                    Type: {result.type} | Score: {result.score?.toFixed(3)}
                                                </div>
                                                {result.content && (
                                                    <div className="text-sm text-gray-700 mt-1">
                                                        {typeof result.content === 'string'
                                                            ? result.content
                                                            : JSON.stringify(result.content, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-500">No results found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Node Management */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">Node Management</h3>
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                {showCreateForm ? 'Cancel' : 'Create New Node'}
                            </button>
                        </div>

                        {/* Create Node Form */}
                        {showCreateForm && (
                            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                                <h4 className="font-medium mb-3">Create New Node</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type</label>
                                        <select
                                            value={newNode.type}
                                            onChange={(e) => setNewNode(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="character">Character</option>
                                            <option value="location">Location</option>
                                            <option value="event">Event</option>
                                            <option value="lore">Lore</option>
                                            <option value="plot_point">Plot Point</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Universe ID</label>
                                        <input
                                            type="text"
                                            value={newNode.metadata.universeId}
                                            onChange={(e) => setNewNode(prev => ({
                                                ...prev,
                                                metadata: { ...prev.metadata, universeId: e.target.value }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Title/Name</label>
                                        <input
                                            type="text"
                                            value={newNode.title}
                                            onChange={(e) => setNewNode(prev => ({
                                                ...prev,
                                                title: e.target.value
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Sensitivity</label>
                                        <select
                                            value={newNode.metadata.sensitivity}
                                            onChange={(e) => setNewNode(prev => ({
                                                ...prev,
                                                metadata: { ...prev.metadata, sensitivity: e.target.value as 'public' | 'private' | 'sensitive' | 'restricted' }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                            <option value="sensitive">Sensitive</option>
                                            <option value="restricted">Restricted</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            value={newNode.content.description}
                                            onChange={(e) => setNewNode(prev => ({
                                                ...prev,
                                                content: { ...prev.content, description: e.target.value }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={handleCreateNode}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Create Node
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Nodes List */}
                        <div className="space-y-3">
                            {loading && <div className="text-gray-500">Loading...</div>}
                            {nodes.length === 0 && !loading && (
                                <div className="text-gray-500">No nodes found. Create one to get started!</div>
                            )}
                            {nodes.map((node) => (
                                <div key={node.id} className="p-3 border border-gray-200 rounded">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {node.title ||
                                                    (typeof node.content === 'object' && node.content?.description) ||
                                                    (typeof node.content === 'string' ? node.content.substring(0, 50) + '...' : '') ||
                                                    node.id}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Type: {node.nodeType || node.type || 'Unknown'} | Universe: {node.universeId || node.metadata?.universeId || 'Unknown'}
                                            </div>
                                            {/* Display content based on the actual structure */}
                                            {typeof node.content === 'string' && (
                                                <div className="text-sm text-gray-700 mt-1">
                                                    {node.content}
                                                </div>
                                            )}
                                            {typeof node.content === 'object' && node.content?.description && (
                                                <div className="text-sm text-gray-700 mt-1">
                                                    {node.content.description}
                                                </div>
                                            )}
                                            {/* Display properties if available */}
                                            {node.properties && (
                                                <div className="text-sm text-gray-700 mt-1">
                                                    {node.properties.description || ''}
                                                </div>
                                            )}
                                            {/* Display tags if available */}
                                            {node.tags && node.tags.length > 0 && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    Tags: {node.tags.join(', ')}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-2">
                                                ID: {node.id} | Created: {node.timestamps?.created ? new Date(node.timestamps.created).toLocaleString() : 'Unknown'}
                                            </div>
                                            {/* Temporary debug info to see actual node structure */}
                                            <details className="mt-2">
                                                <summary className="text-xs text-blue-600 cursor-pointer">🐛 Debug: Show Raw Node Data</summary>
                                                <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                                                    {JSON.stringify(node, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteNode(node.id)}
                                            className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Refresh Button */}
                        <div className="mt-4">
                            <button
                                onClick={loadNodes}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                            >
                                Refresh Nodes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Text Parser Tab */}
            {activeTab === 'text-parser' && (
                <div className="space-y-6">
                    {/* Text Parser Interface */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Text-to-RAG Parser</h3>

                        {/* Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">AI Model</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    disabled={loadingModels || isProcessing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                                >
                                    {loadingModels ? (
                                        <option>Loading models...</option>
                                    ) : models.length > 0 ? (
                                        models.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))
                                    ) : (
                                        <option>No models available</option>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Universe ID</label>
                                <input
                                    type="text"
                                    value={universeId}
                                    onChange={(e) => setUniverseId(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
                                    placeholder="Enter universe identifier"
                                />
                            </div>

                            <div className="flex items-center space-x-4 pt-6">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={useChunking}
                                        onChange={(e) => setUseChunking(e.target.checked)}
                                        disabled={isProcessing}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Enable chunking</span>
                                </label>

                                {useChunking && (
                                    <div className="flex items-center space-x-2">
                                        <label className="text-sm">Size:</label>
                                        <input
                                            type="number"
                                            value={chunkSize}
                                            onChange={(e) => setChunkSize(Number(e.target.value))}
                                            disabled={isProcessing}
                                            min="500"
                                            max="5000"
                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Text Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Text to Parse</label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={isProcessing}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 disabled:opacity-50"
                                placeholder="Enter text to parse into RAG entities and relationships..."
                            />
                            <div className="text-sm text-gray-500 mt-1">
                                Characters: {inputText.length}
                                {inputText.length > 5000 && !useChunking && (
                                    <span className="text-orange-600 ml-2">
                                        (Large text - consider enabling chunking)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-4 mb-4">
                            <button
                                onClick={parseTextWithBackend}
                                disabled={isProcessing || !inputText.trim() || !selectedModel}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Parse Text'}
                            </button>

                            {isProcessing && currentJob && (
                                <button
                                    onClick={cancelCurrentJob}
                                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Cancel Job
                                </button>
                            )}

                            <button
                                onClick={fetchModels}
                                disabled={loadingModels}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                            >
                                {loadingModels ? 'Loading...' : 'Refresh Models'}
                            </button>
                        </div>

                        {/* Job Status */}
                        {currentJob && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">Job Status</h4>
                                <div className="text-sm space-y-1">
                                    <div>Job ID: <code className="bg-gray-100 px-1 rounded">{currentJob.id}</code></div>
                                    <div>Status: <span className={`px-2 py-1 rounded text-xs ${currentJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        currentJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            currentJob.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>{currentJob.status}</span></div>
                                    {currentJob.progress && (
                                        <div>Progress: {currentJob.progress.current}/{currentJob.progress.total}</div>
                                    )}
                                    {currentJob.error && (
                                        <div className="text-red-600">Error: {currentJob.error}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-2 text-red-500 hover:text-red-700"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {/* Results Display */}
                        {parsedResults && (
                            <div className="mt-6">
                                <h4 className="font-medium text-gray-800 mb-3">Parsing Results</h4>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <pre className="text-sm overflow-auto max-h-96">
                                        {JSON.stringify(parsedResults, null, 2)}
                                    </pre>
                                </div>

                                {/* Quick Stats */}
                                {parsedResults.entities && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <div className="text-sm font-medium text-blue-800">Entities Found</div>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {parsedResults.entities.length || 0}
                                            </div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <div className="text-sm font-medium text-green-800">Relationships</div>
                                            <div className="text-2xl font-bold text-green-600">
                                                {parsedResults.relationships?.length || 0}
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded">
                                            <div className="text-sm font-medium text-purple-800">Chunks Processed</div>
                                            <div className="text-2xl font-bold text-purple-600">
                                                {parsedResults.chunkResults?.length || 1}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI RAG Test Tab */}
            {activeTab === 'ai-test' && (
                <div className="bg-white p-4 rounded-lg shadow">
                    <AIRAGTest />
                </div>
            )}
        </div>
    );
};

export default RAGTab;
