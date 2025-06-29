import React, { useEffect, useState } from "react";

interface Server {
    id: string;
    url: string;
    type: string;
    status?: string;
    health?: string;
    models?: string[];
    inFlight?: number;
    queueDepth?: number;
    lastError?: string;
}

function makeServerId(url: string): string {
    // base64url encode the url for a deterministic id
    return (
        "srv-" +
        btoa(url)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
    );
}

const ServersTab: React.FC = () => {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newServerUrl, setNewServerUrl] = useState("");
    const [testResults, setTestResults] = useState<Record<string, string>>({});
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [modelInputs, setModelInputs] = useState<Record<string, string>>({});
    const [modelAddStatus, setModelAddStatus] = useState<Record<string, string>>({});

    const fetchServers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/orchestrator/health");
            console.debug("[ServersTab] /api/orchestrator/health response", res);
            if (!res.ok) throw new Error("Failed to fetch server health");
            const data = await res.json();
            console.debug("[ServersTab] servers data", data);
            setServers(data.servers || []);
        } catch (e: any) {
            setError(e.message || "Unknown error");
            console.error("[ServersTab] fetchServers error", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    const handleAddServer = async () => {
        if (!newServerUrl.trim()) return;
        setAdding(true);
        setError(null);
        try {
            // Always send all servers with id/url/type
            const newServer: Server = {
                id: makeServerId(newServerUrl.trim()),
                url: newServerUrl.trim(),
                type: "ollama",
            };
            const allServers = [
                ...servers.map((s) => ({ id: makeServerId(s.url), url: s.url, type: s.type || "ollama" })),
                newServer,
            ];
            const res = await fetch("/api/servers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ servers: allServers }),
            });
            if (!res.ok) throw new Error("Failed to add server");
            setNewServerUrl("");
            await fetchServers();
        } catch (e: any) {
            setError(e.message || "Unknown error");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteServer = async (id: string) => {
        setDeleting(id);
        setError(null);
        try {
            // Use DELETE endpoint as per API docs
            const res = await fetch(`/api/orchestrator/servers/${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete server");
            await fetchServers();
        } catch (e: any) {
            setError(e.message || "Unknown error");
        } finally {
            setDeleting(null);
        }
    };

    const handleTestServer = async (url: string, id: string) => {
        setTestResults((r) => ({ ...r, [id]: "Testing..." }));
        try {
            const res = await fetch(`/api/orchestrator/health?testUrl=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error("Test failed");
            const data = await res.json();
            setTestResults((r) => ({ ...r, [id]: data.status || "OK" }));
        } catch (e: any) {
            setTestResults((r) => ({ ...r, [id]: e.message || "Error" }));
        }
    };

    const handleModelInput = (id: string, value: string) => {
        setModelInputs((inputs) => ({ ...inputs, [id]: value }));
    };

    const handleAddModel = async (server: Server) => {
        const model = modelInputs[server.id]?.trim();
        if (!model) return;
        setModelAddStatus((s) => ({ ...s, [server.id]: "Adding..." }));
        try {
            const res = await fetch("/api/orchestrator/models/pull", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverId: server.id, model }),
            });
            if (!res.ok) throw new Error("Failed to add model");
            setModelAddStatus((s) => ({ ...s, [server.id]: "Added" }));
            setModelInputs((inputs) => ({ ...inputs, [server.id]: "" }));
            await fetchServers();
        } catch (e: any) {
            setModelAddStatus((s) => ({ ...s, [server.id]: e.message || "Error" }));
        }
    };

    const handleDeleteModel = async (server: Server, model: string) => {
        setModelAddStatus((s) => ({ ...s, [server.id]: `Deleting...` }));
        try {
            const res = await fetch("/api/orchestrator/models/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverId: server.id, model }),
            });
            if (!res.ok) throw new Error("Failed to delete model");
            setModelAddStatus((s) => ({ ...s, [server.id]: "Deleted" }));
            await fetchServers();
        } catch (e: any) {
            setModelAddStatus((s) => ({ ...s, [server.id]: e.message || "Error" }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-4">
                <h2 className="font-semibold text-lg flex-1">Downstream Servers</h2>
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={fetchServers} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="flex mb-4 gap-2">
                <input
                    className="flex-1 border rounded px-2 py-1"
                    type="text"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                    placeholder="Add server URL (e.g. http://localhost:11434)"
                />
                <button
                    className="px-3 py-1 bg-green-600 text-white rounded"
                    onClick={handleAddServer}
                    disabled={adding || !newServerUrl.trim()}
                >
                    {adding ? "Adding..." : "Add"}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded shadow">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">URL</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Health</th>
                            <th className="px-3 py-2 text-left">Models</th>
                            <th className="px-3 py-2 text-left">Add Model</th>
                            <th className="px-3 py-2 text-left">In-Flight</th>
                            <th className="px-3 py-2 text-left">Queue</th>
                            <th className="px-3 py-2 text-left">Last Error</th>
                            <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {servers.length === 0 && (
                            <tr>
                                <td colSpan={10} className="text-center text-gray-400 py-4">No servers found.</td>
                            </tr>
                        )}
                        {servers.map((s) => (
                            <tr key={s.id} className="border-t">
                                <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                                <td className="px-3 py-2 font-mono text-xs">{s.url}</td>
                                <td className="px-3 py-2">{s.status}</td>
                                <td className="px-3 py-2">{s.health}</td>
                                <td className="px-3 py-2 text-xs">
                                    {s.models && s.models.length > 0 ? (
                                        <div className="flex gap-2 items-center">
                                            <select
                                                className="border rounded px-2 py-1 text-xs"
                                                value={modelInputs[`${s.id}-selected`] || s.models[0]}
                                                onChange={e => setModelInputs(inputs => ({ ...inputs, [`${s.id}-selected`]: e.target.value }))}
                                            >
                                                {s.models.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                            <button
                                                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                                                onClick={() => handleDeleteModel(s, modelInputs[`${s.id}-selected`] || s.models![0])}
                                                type="button"
                                                disabled={s.models!.length === 0}
                                            >Delete</button>
                                        </div>
                                    ) : <span className="text-gray-400">None</span>}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                    <div className="flex gap-1 items-center">
                                        <input
                                            className="border rounded px-1 py-0.5 text-xs flex-1"
                                            type="text"
                                            value={modelInputs[s.id] || ""}
                                            onChange={e => handleModelInput(s.id, e.target.value)}
                                            placeholder="Add model (e.g. llama2)"
                                        />
                                        <button
                                            className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
                                            onClick={() => handleAddModel(s)}
                                            disabled={!modelInputs[s.id]?.trim()}
                                            type="button"
                                        >Add</button>
                                        {modelAddStatus[s.id] && (
                                            <span className="ml-1 text-xs text-gray-600">{modelAddStatus[s.id]}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center">{s.inFlight}</td>
                                <td className="px-3 py-2 text-center">{s.queueDepth}</td>
                                <td className="px-3 py-2 text-xs text-red-600">{s.lastError || ""}</td>
                                <td className="px-3 py-2 flex gap-2">
                                    <button
                                        className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                        onClick={() => handleDeleteServer(s.id)}
                                        disabled={deleting === s.id}
                                    >
                                        {deleting === s.id ? "Deleting..." : "Delete"}
                                    </button>
                                    <button
                                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                                        onClick={() => handleTestServer(s.url, s.id)}
                                    >
                                        Test
                                    </button>
                                    {testResults[s.id] && (
                                        <span className="ml-1 text-xs text-gray-600">{testResults[s.id]}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ServersTab;
