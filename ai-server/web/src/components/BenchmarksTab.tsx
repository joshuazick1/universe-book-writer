import React, { useEffect, useState } from "react";

interface Benchmark {
    serverId: string;
    model: string;
    benchmark: {
        avgResponseTimeMs?: number;
        latencyMs?: number;
        throughput?: number;
        lastRun?: string;
        lastTested?: number;
        [key: string]: any;
    } | null;
    inFlight: number;
}

interface RAGPerformanceData {
    id: string;
    serverId: string;
    modelName: string;
    performanceMetrics: {
        latencyMs?: number;
        throughput?: number;
        lastTested?: number;
        averageLatency?: number;
        stabilityScore?: number;
        qualityScore?: number;
    };
    usageFrequency: {
        last24h: number;
        last7d: number;
        last30d: number;
        averagePerDay: number;
    };
    totalUsageCount: number;
    lastUsed?: string;
}

interface BestModel {
    serverId: string;
    modelName: string;
    score: number;
}

const BenchmarksTab: React.FC = () => {
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [tab, setTab] = useState<'current' | 'rag-analytics' | 'recommendations'>('current');

    // RAG Analytics State
    const [ragPerformanceData, setRAGPerformanceData] = useState<RAGPerformanceData[]>([]);
    const [bestModels, setBestModels] = useState<BestModel[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [taskType, setTaskType] = useState<string>('general');
    const [maxLatency, setMaxLatency] = useState<string>('');
    const [minThroughput, setMinThroughput] = useState<string>('');

    const fetchBenchmarks = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:5100/api/orchestrator/benchmarks");
            const data = await res.json();
            setBenchmarks(data.benchmarks || []);
        } catch (e) {
            setError("Failed to load benchmarks");
        } finally {
            setLoading(false);
        }
    };

    const runAllBenchmarks = async () => {
        setRunning(true);
        setError(null);
        try {
            await fetch("http://localhost:5100/api/orchestrator/benchmarks/run", { method: "POST" });
            await fetchBenchmarks();
            await fetchRAGAnalytics(); // Refresh RAG data after benchmarks
        } catch (e) {
            setError("Failed to run benchmarks");
        } finally {
            setRunning(false);
        }
    };

    // Fetch RAG performance analytics
    const fetchRAGAnalytics = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
            const performanceRes = await fetch("/api/orchestrator/rag/model-performance?limit=100");
            if (performanceRes.ok) {
                const data = await performanceRes.json();
                setRAGPerformanceData(data.performanceData || []);
            } else {
                console.warn("RAG performance endpoint not available");
            }
        } catch (e: any) {
            setAnalyticsError(e.message || "Failed to fetch RAG analytics");
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // Fetch best model recommendations
    const fetchBestModels = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
            const params = new URLSearchParams();
            if (taskType) params.append('taskType', taskType);
            if (maxLatency) params.append('maxLatency', maxLatency);
            if (minThroughput) params.append('minThroughput', minThroughput);

            const bestModelsRes = await fetch(`/api/orchestrator/rag/best-models?${params}`);
            if (bestModelsRes.ok) {
                const data = await bestModelsRes.json();
                setBestModels(data.bestModels || []);
            } else {
                console.warn("Best models endpoint not available");
            }
        } catch (e: any) {
            setAnalyticsError(e.message || "Failed to fetch best models");
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        fetchBenchmarks();
        fetchRAGAnalytics();
    }, []);

    useEffect(() => {
        if (tab === 'recommendations') {
            fetchBestModels();
        }
    }, [tab, taskType, maxLatency, minThroughput]);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold">Benchmarks & Performance</h2>
                <button
                    className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                    onClick={runAllBenchmarks}
                    disabled={running}
                >
                    {running ? "Running..." : "Run All Benchmarks"}
                </button>
                <button
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded"
                    onClick={() => {
                        fetchBenchmarks();
                        fetchRAGAnalytics();
                    }}
                    disabled={loading || analyticsLoading}
                >
                    Refresh
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="mb-4 flex gap-2">
                <button
                    className={`px-3 py-1 rounded ${tab === 'current' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setTab('current')}
                >
                    Current Benchmarks
                </button>
                <button
                    className={`px-3 py-1 rounded ${tab === 'rag-analytics' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setTab('rag-analytics')}
                >
                    RAG Analytics
                </button>
                <button
                    className={`px-3 py-1 rounded ${tab === 'recommendations' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setTab('recommendations')}
                >
                    Model Recommendations
                </button>
            </div>

            {error && <div className="text-red-600 mb-2">{error}</div>}
            {analyticsError && <div className="text-orange-600 mb-2">Analytics: {analyticsError}</div>}

            {tab === 'current' ? (
                <>
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border bg-white">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-2 border">Server</th>
                                        <th className="px-3 py-2 border">Model</th>
                                        <th className="px-3 py-2 border">Avg Response (ms)</th>
                                        <th className="px-3 py-2 border">Throughput (req/s)</th>
                                        <th className="px-3 py-2 border">Last Run</th>
                                        <th className="px-3 py-2 border">In-Flight</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {benchmarks.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-4 text-gray-400">
                                                No benchmark data available.
                                            </td>
                                        </tr>
                                    ) : (
                                        benchmarks.map((b, i) => (
                                            <tr key={b.serverId + b.model} className={i % 2 ? "bg-gray-50" : ""}>
                                                <td className="px-3 py-2 border font-mono text-xs">{b.serverId}</td>
                                                <td className="px-3 py-2 border font-mono">{b.model}</td>
                                                <td className="px-3 py-2 border text-right">
                                                    {b.benchmark?.latencyMs != null ? b.benchmark.latencyMs.toFixed(1) :
                                                        b.benchmark?.avgResponseTimeMs != null ? b.benchmark.avgResponseTimeMs.toFixed(1) : "-"}
                                                </td>
                                                <td className="px-3 py-2 border text-right">
                                                    {b.benchmark?.throughput != null ? b.benchmark.throughput.toFixed(2) : "-"}
                                                </td>
                                                <td className="px-3 py-2 border">
                                                    {b.benchmark?.lastTested ? new Date(b.benchmark.lastTested).toLocaleString() :
                                                        b.benchmark?.lastRun ? new Date(b.benchmark.lastRun).toLocaleString() : "-"}
                                                </td>
                                                <td className="px-3 py-2 border text-right">{b.inFlight}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : tab === 'rag-analytics' ? (
                <div>
                    {analyticsLoading ? (
                        <div>Loading analytics...</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white border rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-4">Performance Analytics from RAG</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-3 py-2 text-left">Model</th>
                                                <th className="px-3 py-2 text-left">Server</th>
                                                <th className="px-3 py-2 text-right">Avg Latency (ms)</th>
                                                <th className="px-3 py-2 text-right">Throughput</th>
                                                <th className="px-3 py-2 text-right">Usage (Total)</th>
                                                <th className="px-3 py-2 text-right">Usage (24h)</th>
                                                <th className="px-3 py-2 text-right">Stability Score</th>
                                                <th className="px-3 py-2 text-right">Quality Score</th>
                                                <th className="px-3 py-2 text-left">Last Used</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ragPerformanceData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="text-center py-4 text-gray-400">
                                                        No RAG performance data available.
                                                    </td>
                                                </tr>
                                            ) : (
                                                ragPerformanceData
                                                    .sort((a, b) => (b.performanceMetrics?.latencyMs || 0) - (a.performanceMetrics?.latencyMs || 0))
                                                    .map((data, i) => (
                                                        <tr key={data.id} className={i % 2 ? "bg-gray-50" : ""}>
                                                            <td className="px-3 py-2 font-mono">{data.modelName}</td>
                                                            <td className="px-3 py-2 font-mono text-xs">{data.serverId}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                {data.performanceMetrics?.averageLatency?.toFixed(1) ||
                                                                    data.performanceMetrics?.latencyMs?.toFixed(1) || '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                {data.performanceMetrics?.throughput?.toFixed(2) || '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-medium">{data.totalUsageCount}</td>
                                                            <td className="px-3 py-2 text-right">{data.usageFrequency?.last24h || 0}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                {data.performanceMetrics?.stabilityScore ?
                                                                    (data.performanceMetrics.stabilityScore * 100).toFixed(1) + '%' : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                {data.performanceMetrics?.qualityScore != null
                                                                    ? (data.performanceMetrics.qualityScore * 100).toFixed(1) + '%'
                                                                    : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-xs">
                                                                {data.lastUsed ? new Date(data.lastUsed).toLocaleDateString() : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <div className="bg-white border rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-semibold mb-4">Model Recommendations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Task Type</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value)}
                                >
                                    <option value="general">General</option>
                                    <option value="coding">Coding</option>
                                    <option value="writing">Writing</option>
                                    <option value="analysis">Analysis</option>
                                    <option value="reasoning">Reasoning</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max Latency (ms)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-2 py-1"
                                    value={maxLatency}
                                    onChange={(e) => setMaxLatency(e.target.value)}
                                    placeholder="e.g. 500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Min Throughput (req/s)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full border rounded px-2 py-1"
                                    value={minThroughput}
                                    onChange={(e) => setMinThroughput(e.target.value)}
                                    placeholder="e.g. 2.0"
                                />
                            </div>
                        </div>
                    </div>

                    {analyticsLoading ? (
                        <div>Loading recommendations...</div>
                    ) : (
                        <div className="bg-white border rounded-lg p-4">
                            <h4 className="font-medium text-lg mb-3">Best Models for "{taskType}" Tasks</h4>
                            {bestModels.length === 0 ? (
                                <div className="text-gray-400 text-center py-8">
                                    No model recommendations available with current criteria.
                                    <br />Try adjusting the requirements or ensure models have performance data.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-3 py-2 text-left">Rank</th>
                                                <th className="px-3 py-2 text-left">Model</th>
                                                <th className="px-3 py-2 text-left">Server</th>
                                                <th className="px-3 py-2 text-right">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bestModels.map((model, idx) => (
                                                <tr key={`${model.serverId}:${model.modelName}`} className={idx % 2 ? "bg-gray-50" : ""}>
                                                    <td className="px-3 py-2 text-center font-medium">#{idx + 1}</td>
                                                    <td className="px-3 py-2 font-mono">{model.modelName}</td>
                                                    <td className="px-3 py-2 font-mono text-xs">{model.serverId}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className={`px-2 py-1 rounded text-xs ${model.score > 0.8 ? 'bg-green-100 text-green-800' :
                                                            model.score > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                            {(model.score * 100).toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BenchmarksTab;
