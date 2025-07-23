import React, { useState, useEffect } from 'react';
import { ragService, RAGNode } from '../services/ragService';

interface AIRAGTestProps {
    className?: string;
}

export const AIRAGTest: React.FC<AIRAGTestProps> = ({ className }) => {
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [aiModel, setAiModel] = useState('');
    const [universeId, setUniverseId] = useState('ai-test-universe');

    // Load models on component mount
    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoadingModels(true);
        setModelsError(null);
        try {
            const res = await fetch("http://localhost:5100/api/tags");
            if (!res.ok) throw new Error("Failed to fetch models");
            const data = await res.json();

            // Ensure models is always an array of strings
            const modelNames = Array.isArray(data.models)
                ? data.models.map((m: any) => typeof m === "string" ? m : m.name)
                : [];
            modelNames.sort((a: string, b: string) => a.localeCompare(b));
            setModels(modelNames);
            setSelectedModel(modelNames.length > 0 ? modelNames[0] : "");
        } catch (e: any) {
            setModelsError(e.message || "Unknown error");
        } finally {
            setLoadingModels(false);
        }
    };

    const addResult = (type: string, data: any) => {
        setResults(prev => [...prev, {
            timestamp: new Date().toISOString(),
            type,
            data
        }]);
    };

    const clearResults = () => {
        setResults([]);
        setError(null);
    };

    const testAICreateNode = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Check RAG health
            addResult('info', 'Checking RAG system health...');
            const health = await ragService.healthCheck();
            addResult('rag-health', health);

            if (!health.healthy) {
                throw new Error('RAG system is not healthy');
            }

            // Step 2: Generate character using AI
            addResult('info', `Generating character using AI model: ${selectedModel}`);

            const characterPrompt = `Create a detailed character for a science fiction story. Include:
- Name and basic information
- Background and occupation  
- Personality traits
- Special abilities or skills
- Brief backstory

Keep it concise but creative. Focus on making them interesting and unique.`;

            const aiResponse = await callAIModel(characterPrompt);
            addResult('ai-response', { model: selectedModel, response: aiResponse });

            // Step 3: Parse AI response into RAG node
            addResult('info', 'Converting AI response to RAG node...');
            const characterData = parseCharacterResponse(aiResponse, universeId);

            // Create the node
            const createdNode = await ragService.createNode(characterData);
            addResult('node-created', createdNode);

            // Step 4: Test retrieval
            addResult('info', `Retrieving created node: ${createdNode.id}`);
            const retrievedNode = await ragService.getNode(createdNode.id);
            addResult('node-retrieved', retrievedNode);

            // Step 5: Test search
            addResult('info', 'Testing search for the created character...');
            const searchResults = await ragService.searchNodes(characterData.content.name.split(' ')[0], {
                universeId: universeId,
                limit: 5
            });
            addResult('search-results', searchResults);

            // Step 5: Create a relationship (location where character operates)
            addResult('info', 'Creating a location and relationship...');
            const locationNode = {
                type: 'location',
                content: {
                    name: 'Navigation Hub Omega',
                    description: 'A state-of-the-art navigation center orbiting a neutron star',
                    environment: 'Space station with artificial gravity',
                    features: ['Quantum navigation arrays', 'Stellar cartography lab', 'Crew quarters']
                },
                metadata: {
                    universeId: universeId,
                    title: 'Navigation Hub Omega',
                    description: 'Advanced stellar navigation facility',
                    tags: ['ai-generated', 'location', 'space-station', 'navigation'],
                    sensitivity: 'low' as const
                }
            };

            const locationCreated = await ragService.createNode(locationNode);
            addResult('location-created', locationCreated);

            // Create relationship
            const relationship = {
                sourceNodeId: createdNode.id,
                targetNodeId: locationCreated.id,
                type: 'works_at',
                properties: {
                    strength: 0.9,
                    description: 'Zara Nova is the chief navigator at Navigation Hub Omega'
                },
                metadata: {
                    universeId: universeId,
                    title: 'Zara Nova works at Navigation Hub Omega',
                    tags: ['ai-generated', 'relationship', 'employment'],
                    sensitivity: 'low' as const
                }
            };

            const createdRelationship = await ragService.createRelationship(relationship);
            addResult('relationship-created', createdRelationship);

            // Step 6: Test context assembly simulation
            addResult('info', 'Simulating AI context retrieval...');
            const contextNodes = await ragService.searchNodes('navigation', {
                universeId: universeId,
                limit: 10
            });
            addResult('context-assembly', {
                focusNode: retrievedNode,
                relatedNodes: contextNodes,
                summary: `AI can now work with character "${retrievedNode?.metadata.title}" in the context of navigation and space exploration.`
            });

            addResult('success', 'AI RAG integration test completed successfully!');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            addResult('error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const testAIQuery = async () => {
        setIsLoading(true);
        setError(null);

        try {
            addResult('info', 'Testing AI knowledge query...');

            // Simulate AI querying the knowledge graph
            const queryResults = await ragService.searchNodes('cyborg navigator', {
                universeId: universeId,
                limit: 10
            });

            addResult('ai-query', {
                query: 'Tell me about cyborg navigators in the universe',
                results: queryResults,
                aiResponse: queryResults.nodes.length > 0
                    ? `I found ${queryResults.nodes.length} relevant entries about cyborg navigators. Based on the knowledge graph, these characters typically have enhanced spatial reasoning abilities and work in space navigation roles.`
                    : 'No cyborg navigators found in the current knowledge graph.'
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            addResult('error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const testAIQueryRAG = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Check what nodes exist
            addResult('info', 'Checking existing nodes in universe...');
            const searchResults = await ragService.searchNodes('', {
                universeId: universeId,
                limit: 10
            });
            addResult('existing-nodes', searchResults);

            if (searchResults.nodes.length === 0) {
                addResult('warning', 'No nodes found. Create some nodes first to test AI querying.');
                return;
            }

            // Step 2: Ask AI to analyze the universe
            addResult('info', `Asking AI to analyze the universe: ${universeId}`);

            const nodeDescriptions = searchResults.nodes.map(result =>
                `- ${result.node.metadata.title}: ${result.node.content.description || result.node.content.name}`
            ).join('\n');

            const analysisPrompt = `Here are the characters and elements in a fictional universe:

${nodeDescriptions}

Please analyze this universe and suggest:
1. Potential relationships between these characters
2. Interesting story possibilities
3. Missing elements that would make the universe more complete

Keep your response concise but insightful.`;

            const aiAnalysis = await callAIModel(analysisPrompt);
            addResult('ai-analysis', {
                model: selectedModel,
                prompt: analysisPrompt,
                analysis: aiAnalysis
            });

            // Step 3: Create a story element based on AI analysis
            addResult('info', 'Creating story element based on AI analysis...');

            const storyPrompt = `Based on this analysis: "${aiAnalysis.substring(0, 200)}...", create a brief plot point or event that could happen in this universe. Include title and description.`;

            const storyResponse = await callAIModel(storyPrompt);

            const storyData = {
                type: 'plot_point',
                content: {
                    title: 'AI-Generated Story Element',
                    description: storyResponse,
                    aiGenerated: true,
                    basedOnAnalysis: aiAnalysis.substring(0, 100) + '...'
                },
                metadata: {
                    universeId: universeId,
                    title: 'AI-Generated Story Element',
                    description: 'Plot point created by AI analysis',
                    tags: ['ai-generated', 'plot-point', 'story'],
                    sensitivity: 'low' as const
                }
            };

            const storyNode = await ragService.createNode(storyData);
            addResult('story-created', storyNode);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            addResult('error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // AI Chat function to generate content using selected model
    const callAIModel = async (prompt: string): Promise<string> => {
        if (!selectedModel) {
            throw new Error('No AI model selected');
        }

        addResult('info', `Calling AI model: ${selectedModel}`);

        const response = await fetch('http://localhost:5100/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                stream: false
            }),
        });

        if (!response.ok) {
            throw new Error(`AI API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || data.response || 'No response from AI';
    };

    // Parse AI response into structured character data
    const parseCharacterResponse = (aiResponse: string, universeId: string) => {
        // Try to extract structured information from AI response
        // For now, create a character with AI response as description
        const lines = aiResponse.split('\n').filter(line => line.trim());
        const name = lines.find(line => line.toLowerCase().includes('name'))?.split(':')[1]?.trim() || 'AI Generated Character';

        return {
            type: 'character',
            content: {
                name: name,
                description: aiResponse,
                aiGenerated: true,
                originalPrompt: 'AI-generated character creation'
            },
            metadata: {
                universeId: universeId,
                title: name,
                description: 'Character created by AI',
                tags: ['ai-generated', 'character'],
                sensitivity: 'low' as const
            },
            timeline: {
                startDate: new Date().toISOString().split('T')[0],
                era: 'AI Generation Era'
            }
        };
    };

    const formatData = (data: any) => {
        return JSON.stringify(data, null, 2);
    };

    const getResultColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'info': return 'text-blue-600';
            case 'node-created':
            case 'node-retrieved':
            case 'location-created':
            case 'relationship-created': return 'text-purple-600';
            case 'search-results':
            case 'ai-query': return 'text-orange-600';
            case 'rag-health': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className={`p-6 ${className}`}>
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">AI + RAG Integration Test</h2>
                <p className="text-gray-600 mb-4">
                    Test how AI can create, retrieve, and query RAG nodes for intelligent content management.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Universe ID
                        </label>
                        <input
                            type="text"
                            value={universeId}
                            onChange={(e) => setUniverseId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ai-test-universe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            AI Model
                        </label>
                        {loadingModels ? (
                            <span className="text-gray-500 text-sm">Loading models...</span>
                        ) : modelsError ? (
                            <span className="text-red-500 text-sm">{modelsError}</span>
                        ) : (
                            <select
                                value={selectedModel}
                                onChange={(e) => {
                                    setSelectedModel(e.target.value);
                                    setAiModel(e.target.value);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={models.length === 0}
                            >
                                {models.map((model) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={testAICreateNode}
                        disabled={isLoading || !selectedModel}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Running...' : 'Test AI Create & Retrieve'}
                    </button>

                    <button
                        onClick={testAIQueryRAG}
                        disabled={isLoading || !selectedModel}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Analyzing...' : 'Test AI Universe Analysis'}
                    </button>

                    <button
                        onClick={clearResults}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        Clear Results
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 font-semibold">Error:</p>
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                {results.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`font-semibold ${getResultColor(result.type)}`}>
                                {result.type.replace(/-/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                        </div>

                        {typeof result.data === 'string' ? (
                            <p className="text-gray-700">{result.data}</p>
                        ) : (
                            <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                                {formatData(result.data)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>

            {results.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                    <p>No test results yet. Click a test button to begin.</p>
                </div>
            )}
        </div>
    );
};
