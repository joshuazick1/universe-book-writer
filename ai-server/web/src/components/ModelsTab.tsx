import React, { useEffect, useState } from "react";

interface ModelAnalytics {
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
    usagePatterns: {
        taskTypes: Record<string, number>;
        mostCommonTaskType: string;
    };
    totalUsageCount: number;
    lastUsed?: string;
}

interface DeploymentStats {
    totalCombinations: number;
    uniqueModels: number;
    uniqueServers: number;
    mostUsedModels: Array<{ modelName: string; serverCount: number; totalUsage: number }>;
    mostActiveServers: Array<{ serverId: string; modelCount: number; totalUsage: number }>;
}

/**
 * ModelsTab displays all available models and their server associations.
 * Enhanced with RAG database analytics for usage patterns, performance metrics, and insights.
 * Users can view models per server or servers per model, and delete models from all servers.
 */
const ModelsTab: React.FC = () => {
    const [modelToServers, setModelToServers] = useState<Record<string, string[]>>({});
    const [serverToModels, setServerToModels] = useState<Record<string, string[]>>({});
    const [models, setModels] = useState<string[]>([]);
    const [servers, setServers] = useState<string[]>([]);
    const [selected, setSelected] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<string>("");
    const [tab, setTab] = useState<'models-per-server' | 'servers-per-model' | 'analytics'>("models-per-server");
    const [serverIdToUrl, setServerIdToUrl] = useState<Record<string, string>>({});
    const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});
    const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
    const [fleetModelInput, setFleetModelInput] = useState("");
    const [fleetAddStatus, setFleetAddStatus] = useState<Record<string, string>>({});

    // RAG Analytics State
    const [modelAnalytics, setModelAnalytics] = useState<ModelAnalytics[]>([]);
    const [deploymentStats, setDeploymentStats] = useState<DeploymentStats | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [analyticsLastUpdated, setAnalyticsLastUpdated] = useState<string | null>(null);

    // Fetch model-server mapping
    const fetchModelMap = async () => {
        setLoading(true);
        setError(null);
        try {
            const [mapRes, healthRes] = await Promise.all([
                fetch("/api/orchestrator/model-map"),
                fetch("/api/orchestrator/health")
            ]);
            if (!mapRes.ok) throw new Error("Failed to fetch model-server mapping");
            if (!healthRes.ok) throw new Error("Failed to fetch server health");
            const data = await mapRes.json();
            const health = await healthRes.json();
            setModelToServers(data.modelToServers || {});
            setServerToModels(data.serverToModels || {});
            const modelNames = Object.keys(data.modelToServers || {});
            setModels(modelNames);
            setSelected((prev) => modelNames.length > 0 ? modelNames[0] : "");
            setServers(Object.keys(data.serverToModels || {}));
            // Build serverId to URL map
            const idToUrl: Record<string, string> = {};
            (health.servers || []).forEach((s: any) => {
                idToUrl[s.id] = s.url;
            });
            setServerIdToUrl(idToUrl);
        } catch (e: any) {
            setError(e.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    // Fetch RAG analytics data
    const fetchRAGAnalytics = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        try {
            const [analyticsRes, performanceRes] = await Promise.all([
                fetch("/api/orchestrator/rag/analytics"),
                fetch("/api/orchestrator/rag/model-performance?limit=100")
            ]);

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setDeploymentStats(analyticsData.analytics.deploymentStats);
                setAnalyticsLastUpdated(analyticsData.analytics.timestamp);
            } else {
                console.warn("Analytics endpoint not available");
            }

            if (performanceRes.ok) {
                const performanceData = await performanceRes.json();
                setModelAnalytics(performanceData.performanceData || []);
            } else {
                console.warn("Performance endpoint not available");
            }
        } catch (e: any) {
            setAnalyticsError(e.message || "Failed to fetch analytics");
            console.error("Analytics fetch error:", e);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        fetchModelMap();
        fetchRAGAnalytics();
    }, []);

    const handleDelete = async () => {
        if (!selected) return;
        setDeleteStatus("Deleting...");
        setError(null);
        try {
            const res = await fetch(`/api/orchestrator/models/${encodeURIComponent(selected)}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete model");
            setDeleteStatus("Deleted");
            await fetchModelMap();
        } catch (e: any) {
            setError(e.message || "Unknown error");
            setDeleteStatus("");
        }
    };

    // Add model to all servers
    const handleAddModelFleet = async () => {
        const model = fleetModelInput.trim();
        if (!model) return;
        const status: Record<string, string> = {};
        setFleetAddStatus({});
        for (const serverId of servers) {
            setFleetAddStatus(s => ({ ...s, [serverId]: "Adding..." }));
            try {
                const res = await fetch("/api/orchestrator/models/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ serverId, model }),
                });
                if (!res.ok) {
                    let msg = "Failed";
                    try {
                        const err = await res.json();
                        msg = err?.error || msg;
                    } catch { }
                    setFleetAddStatus(s => ({ ...s, [serverId]: msg }));
                } else {
                    setFleetAddStatus(s => ({ ...s, [serverId]: "Added" }));
                }
            } catch (e: any) {
                setFleetAddStatus(s => ({ ...s, [serverId]: e.message || "Error" }));
            }
        }
        setFleetModelInput("");
        await fetchModelMap();
        await fetchRAGAnalytics(); // Refresh analytics after model changes
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="font-semibold text-lg mb-4">Models & Servers</h2>
            <div className="mb-4 flex gap-2">
                <button
                    className={`px-3 py-1 rounded ${tab === 'models-per-server' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setTab('models-per-server')}
                >
                    Models per Server
                </button>
                <button
                    className={`px-3 py-1 rounded ${tab === 'servers-per-model' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setTab('servers-per-model')}
                >
                    Servers per Model
                </button>
                <button
                    className={`px-3 py-1 rounded ${tab === 'analytics' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    onClick={() => setTab('analytics')}
                >
                    Analytics & Usage
                </button>
            </div>
            {loading ? (
                <div className="text-gray-500">Loading...</div>
            ) : error ? (
                <div className="text-red-500">{error}</div>
            ) : (
                <>
                    <div className="mb-4 flex gap-2 items-center">
                        <input
                            className="flex-1 border rounded px-2 py-1"
                            type="text"
                            value={fleetModelInput}
                            onChange={e => setFleetModelInput(e.target.value)}
                            placeholder="Add model to all servers (e.g. llama2)"
                        />
                        <button
                            className="px-3 py-1 bg-green-600 text-white rounded"
                            onClick={handleAddModelFleet}
                            disabled={!fleetModelInput.trim() || servers.length === 0}
                        >
                            Add to Fleet
                        </button>
                    </div>
                    {tab === 'models-per-server' ? (
                        <div className="mb-6">
                            {servers.length === 0 ? (
                                <div className="text-gray-400">No servers found.</div>
                            ) : (
                                <ul className="space-y-4">
                                    {[...servers]
                                        .sort((a, b) => (serverToModels[b]?.length || 0) - (serverToModels[a]?.length || 0))
                                        .map(serverId => {
                                            const isExpanded = expandedServers[serverId];
                                            const modelsList = serverToModels[serverId] || [];
                                            const progress = fleetAddStatus[serverId];
                                            return (
                                                <li key={serverId} className="border rounded p-3">
                                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedServers(e => ({ ...e, [serverId]: !e[serverId] }))}>
                                                        <div className="font-semibold mb-1">
                                                            {serverIdToUrl[serverId] || serverId}
                                                            <span className="ml-2 text-xs text-gray-500">({modelsList.length} model{modelsList.length !== 1 ? 's' : ''})</span>
                                                            {progress && <span className="ml-2 text-xs text-blue-600">[{progress}]</span>}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{isExpanded ? '▲' : '▼'}</span>
                                                    </div>
                                                    {isExpanded && (
                                                        <>
                                                            {progress && <div className="text-xs text-blue-600 mb-1">Fleet Add: {progress}</div>}
                                                            {modelsList.length === 0 ? (
                                                                <div className="text-gray-400 text-sm mt-2">No models on this server.</div>
                                                            ) : (
                                                                <ul className="flex flex-wrap gap-2 mt-2">
                                                                    {modelsList.map(model => (
                                                                        <li key={model} className="bg-gray-100 px-2 py-1 rounded text-sm">{model}</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </>
                                                    )}
                                                </li>
                                            );
                                        })}
                                </ul>
                            )}
                        </div>
                    ) : tab === 'analytics' ? (
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">RAG Analytics & Usage Insights</h3>
                                <button
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                                    onClick={fetchRAGAnalytics}
                                    disabled={analyticsLoading}
                                >
                                    {analyticsLoading ? "Refreshing..." : "Refresh Analytics"}
                                </button>
                            </div>

                            {analyticsError && (
                                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                                    <p>Analytics Error: {analyticsError}</p>
                                    <p className="text-sm mt-1">Note: RAG analytics requires the orchestrator to be running with RAG integration enabled.</p>
                                </div>
                            )}

                            {analyticsLastUpdated && (
                                <div className="text-sm text-gray-500 mb-4">
                                    Last updated: {new Date(analyticsLastUpdated).toLocaleString()}
                                </div>
                            )}

                            {/* Deployment Statistics */}
                            {deploymentStats && (
                                <div className="bg-white border rounded-lg p-4 mb-6">
                                    <h4 className="font-medium text-lg mb-3">Deployment Overview</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{deploymentStats.totalCombinations}</div>
                                            <div className="text-sm text-gray-600">Total Combinations</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{deploymentStats.uniqueModels}</div>
                                            <div className="text-sm text-gray-600">Unique Models</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">{deploymentStats.uniqueServers}</div>
                                            <div className="text-sm text-gray-600">Active Servers</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {deploymentStats.mostUsedModels.length > 0 ? deploymentStats.mostUsedModels[0].totalUsage : 0}
                                            </div>
                                            <div className="text-sm text-gray-600">Top Model Usage</div>
                                        </div>
                                    </div>

                                    {/* Most Used Models */}
                                    <div className="mb-4">
                                        <h5 className="font-medium mb-2">Most Used Models</h5>
                                        <div className="space-y-2">
                                            {deploymentStats.mostUsedModels.slice(0, 5).map((model, idx) => (
                                                <div key={model.modelName} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                                                    <span className="font-mono text-sm">{model.modelName}</span>
                                                    <div className="text-sm text-gray-600">
                                                        {model.serverCount} servers, {model.totalUsage} uses
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Most Active Servers */}
                                    <div>
                                        <h5 className="font-medium mb-2">Most Active Servers</h5>
                                        <div className="space-y-2">
                                            {deploymentStats.mostActiveServers.slice(0, 5).map((server, idx) => (
                                                <div key={server.serverId} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                                                    <span className="font-mono text-sm">{serverIdToUrl[server.serverId] || server.serverId}</span>
                                                    <div className="text-sm text-gray-600">
                                                        {server.modelCount} models, {server.totalUsage} uses
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Model Performance Analytics */}
                            {modelAnalytics.length > 0 && (
                                <div className="bg-white border rounded-lg p-4">
                                    <h4 className="font-medium text-lg mb-3">Performance & Usage Analytics</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-3 py-2 text-left">Model</th>
                                                    <th className="px-3 py-2 text-left">Server</th>
                                                    <th className="px-3 py-2 text-right">Total Uses</th>
                                                    <th className="px-3 py-2 text-right">Last 24h</th>
                                                    <th className="px-3 py-2 text-right">Avg Latency</th>
                                                    <th className="px-3 py-2 text-left">Most Common Task</th>
                                                    <th className="px-3 py-2 text-left">Last Used</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modelAnalytics
                                                    .sort((a, b) => b.totalUsageCount - a.totalUsageCount)
                                                    .slice(0, 20)
                                                    .map((analytics, idx) => (
                                                        <tr key={`${analytics.serverId}:${analytics.modelName}`} className={idx % 2 ? "bg-gray-50" : ""}>
                                                            <td className="px-3 py-2 font-mono">{analytics.modelName}</td>
                                                            <td className="px-3 py-2 font-mono text-xs">{serverIdToUrl[analytics.serverId] || analytics.serverId}</td>
                                                            <td className="px-3 py-2 text-right font-medium">{analytics.totalUsageCount}</td>
                                                            <td className="px-3 py-2 text-right">{analytics.usageFrequency?.last24h || 0}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                {analytics.performanceMetrics?.averageLatency ?
                                                                    `${analytics.performanceMetrics.averageLatency.toFixed(1)}ms` :
                                                                    analytics.performanceMetrics?.latencyMs ?
                                                                        `${analytics.performanceMetrics.latencyMs.toFixed(1)}ms` : '-'
                                                                }
                                                            </td>
                                                            <td className="px-3 py-2">{analytics.usagePatterns?.mostCommonTaskType || '-'}</td>
                                                            <td className="px-3 py-2 text-xs">
                                                                {analytics.lastUsed ? new Date(analytics.lastUsed).toLocaleDateString() : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {modelAnalytics.length > 20 && (
                                        <div className="text-sm text-gray-500 mt-2 text-center">
                                            Showing top 20 of {modelAnalytics.length} model/server combinations
                                        </div>
                                    )}
                                </div>
                            )}

                            {modelAnalytics.length === 0 && !analyticsLoading && !analyticsError && (
                                <div className="bg-gray-100 border rounded-lg p-8 text-center">
                                    <div className="text-gray-500 mb-2">No analytics data available</div>
                                    <div className="text-sm text-gray-400">
                                        Analytics data will appear here once models are used for inference requests
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mb-6">
                            {models.length === 0 ? (
                                <div className="text-gray-400">No models found.</div>
                            ) : (
                                <ul className="space-y-4">
                                    {[...models]
                                        .sort((a, b) => (modelToServers[b]?.length || 0) - (modelToServers[a]?.length || 0))
                                        .map(model => {
                                            const isExpanded = expandedModels[model];
                                            const serversList = modelToServers[model] || [];
                                            return (
                                                <li key={model} className="border rounded p-3">
                                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedModels(e => ({ ...e, [model]: !e[model] }))}>
                                                        <div className="font-semibold mb-1">
                                                            {model}
                                                            <span className="ml-2 text-xs text-gray-500">({serversList.length} server{serversList.length !== 1 ? 's' : ''})</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{isExpanded ? '▲' : '▼'}</span>
                                                    </div>
                                                    {isExpanded && (
                                                        <ul className="flex flex-wrap gap-2 mt-2">
                                                            {serversList.map(serverId => (
                                                                <li key={serverId} className="bg-gray-100 px-2 py-1 rounded text-sm">{serverIdToUrl[serverId] || serverId}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </li>
                                            );
                                        })}
                                </ul>
                            )}
                        </div>
                    )}
                    {/* Delete model dropdown */}
                    <div className="flex gap-2 items-center">
                        <select
                            className="border rounded px-2 py-1"
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                        >
                            {models.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded"
                            onClick={handleDelete}
                            disabled={!selected || deleteStatus === "Deleting..."}
                        >
                            Delete
                        </button>
                        {deleteStatus && <span className="text-xs text-gray-600">{deleteStatus}</span>}
                    </div>
                </>
            )}
        </div>
    );
};

export default ModelsTab;
