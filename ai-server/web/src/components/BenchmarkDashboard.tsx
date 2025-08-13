import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Server {
    id: string;
    modelCount: number;
}

interface Model {
    name: string;
    serverCount: number;
    servers: string[];
}

interface Benchmark {
    id: string;
    name: string;
}

interface ModelMapResponse {
    modelToServers: Record<string, string[]>;
    serverToModels: Record<string, string[]>;
}

interface BenchmarkResponse {
    benchmarks: Benchmark[];
}

interface StartBenchmarkResponse {
    inFlight: any[];
}

const BenchmarkDashboard: React.FC = () => {
    const [servers, setServers] = useState<Server[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
    const [selectedServers, setSelectedServers] = useState<string[]>([]);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
    const [inFlightBenchmarks, setInFlightBenchmarks] = useState<any[]>([]);
    const [completedResults, setCompletedResults] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const staticBenchmarks = [
        { id: 'styleTransfer', name: 'Style Transfer' },
        { id: 'advancedCodeGeneration', name: 'Advanced Code Generation' },
        { id: 'nodeGraphConstruction', name: 'Node Graph Construction' },
        { id: 'longFormGeneration', name: 'Long Form Generation' },
        { id: 'permissiveContent', name: 'Permissive Content' },
        { id: 'dialogueGeneration', name: 'Dialogue Generation' },
        { id: 'factExtraction', name: 'Fact Extraction' },
        { id: 'summarization', name: 'Summarization' },
        { id: 'contentModeration', name: 'Content Moderation' },
        { id: 'characterConsistency', name: 'Character Consistency' },
        { id: 'plotCoherence', name: 'Plot Coherence' },
        { id: 'worldBuilding', name: 'World Building' },
        { id: 'jsonAssembly', name: 'JSON Assembly' },
        { id: 'taskPlanning', name: 'Task Planning' },
        { id: 'creativeWriting', name: 'Creative Writing' },
        { id: 'typescriptQuality', name: 'TypeScript Quality' },
        { id: 'serverLatencies', name: 'Server Latencies' },
        { id: 'serverThroughput', name: 'Server Throughput' },
        { id: 'simpleServerLatency', name: 'Simple Server Latency' },
        { id: 'embeddingBenchmarks', name: 'Embedding Benchmarks' },
        { id: 'performanceProbe', name: 'Performance Probe' },
    ];

    useEffect(() => {
        const fetchServersAndModels = async () => {
            try {
                const response = await axios.get<ModelMapResponse>('/api/orchestrator/model-map');
                const { modelToServers, serverToModels } = response.data;

                const serverList = Object.keys(serverToModels).map((serverId) => ({
                    id: serverId,
                    modelCount: serverToModels[serverId].length,
                }));

                const modelList = Object.keys(modelToServers).map((modelName) => ({
                    name: modelName,
                    serverCount: modelToServers[modelName].length,
                    servers: modelToServers[modelName],
                })).sort((a, b) => b.serverCount - a.serverCount);

                setServers(serverList);
                setModels(modelList);

                // Use static benchmarks
                setBenchmarks(staticBenchmarks);
            } catch (err) {
                setError('Failed to fetch data.');
            } finally {
                setLoading(false);
            }
        };

        fetchServersAndModels();
    }, []);

    const handleServerSelection = (serverId: string) => {
        setSelectedServers((prev) =>
            prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId]
        );
    };

    const handleModelSelection = (modelName: string) => {
        setSelectedModels((prev) =>
            prev.includes(modelName) ? prev.filter((name) => name !== modelName) : [...prev, modelName]
        );
    };

    const handleBenchmarkSelection = (benchmarkId: string) => {
        setSelectedBenchmarks((prev) =>
            prev.includes(benchmarkId) ? prev.filter((id) => id !== benchmarkId) : [...prev, benchmarkId]
        );
    };

    const startBenchmarks = async () => {
        try {
            const requests = selectedServers.map((serverId) => {
                return axios.post<StartBenchmarkResponse>('/api/manual/benchmark', {
                    serverIdOrUrl: serverId, // Use serverId instead of URL
                    modelId: selectedModels[0], // Assuming one model is selected
                    benchmarkTypes: selectedBenchmarks, // Array of selected benchmark IDs
                });
            });

            const responses = await Promise.all(requests);
            const inFlight = responses.flatMap((response) => response.data.inFlight);
            setInFlightBenchmarks(inFlight);
        } catch (err) {
            setError('Failed to start benchmarks.');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="p-4 bg-gray-100 rounded-lg shadow-md">
            <h1 className="text-xl font-bold mb-4">Benchmark Dashboard</h1>

            <div className="grid grid-cols-3 gap-4">
                {/* Servers Column */}
                <div>
                    <h2 className="font-semibold mb-2">Servers</h2>
                    {servers.map((server) => (
                        <label key={server.id} className="block">
                            <input
                                type="checkbox"
                                checked={selectedServers.includes(server.id)}
                                onChange={() => handleServerSelection(server.id)}
                            />
                            {server.id} ({server.modelCount} models)
                        </label>
                    ))}
                </div>

                {/* Models Column */}
                <div>
                    <h2 className="font-semibold mb-2">Models</h2>
                    {models.map((model) => (
                        <label
                            key={model.name}
                            className={`block ${model.servers.some((server) => selectedServers.includes(server))
                                    ? ''
                                    : 'text-gray-400'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedModels.includes(model.name)}
                                onChange={() => handleModelSelection(model.name)}
                                disabled={!model.servers.some((server) => selectedServers.includes(server))}
                            />
                            {model.name} ({model.serverCount} servers)
                        </label>
                    ))}
                </div>

                {/* Benchmarks Column */}
                <div>
                    <h2 className="font-semibold mb-2">Benchmarks</h2>
                    {benchmarks.map((benchmark) => (
                        <label key={benchmark.id} className="block">
                            <input
                                type="checkbox"
                                checked={selectedBenchmarks.includes(benchmark.id)}
                                onChange={() => handleBenchmarkSelection(benchmark.id)}
                            />
                            {benchmark.name}
                        </label>
                    ))}
                </div>
            </div>

            <button
                onClick={startBenchmarks}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
                Start Benchmarks
            </button>

            {/* Visualizer */}
            {inFlightBenchmarks.length > 0 && (
                <div className="mt-8">
                    <h2 className="font-semibold mb-4">In-Flight Benchmarks</h2>
                    {/* Add visualizer logic here */}
                </div>
            )}

            {completedResults.length > 0 && (
                <div className="mt-8">
                    <h2 className="font-semibold mb-4">Completed Results</h2>
                    {/* Add completed results logic here */}
                </div>
            )}
        </div>
    );
};

export default BenchmarkDashboard;
