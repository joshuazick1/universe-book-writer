import React, { useEffect, useState } from "react";

/**
 * ModelsTab displays all available models and their server associations.
 * Users can view models per server or servers per model, and delete models from all servers.
 * Updated to use /api/orchestrator/model-map and orchestrator endpoints.
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
    const [tab, setTab] = useState<'models-per-server' | 'servers-per-model'>("models-per-server");
    const [serverIdToUrl, setServerIdToUrl] = useState<Record<string, string>>({});
    const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});
    const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
    const [fleetModelInput, setFleetModelInput] = useState("");
    const [fleetAddStatus, setFleetAddStatus] = useState<Record<string, string>>({});

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

    useEffect(() => {
        fetchModelMap();
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
