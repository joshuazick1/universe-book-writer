import React, { useEffect, useState } from "react";

interface Benchmark {
    serverId: string;
    model: string;
    benchmark: {
        avgResponseTimeMs?: number;
        lastRun?: string;
        [key: string]: any;
    } | null;
    inFlight: number;
}

const BenchmarksTab: React.FC = () => {
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);

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
        } catch (e) {
            setError("Failed to run benchmarks");
        } finally {
            setRunning(false);
        }
    };

    useEffect(() => {
        fetchBenchmarks();
    }, []);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold">Benchmarks</h2>
                <button
                    className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                    onClick={runAllBenchmarks}
                    disabled={running}
                >
                    {running ? "Running..." : "Run All Benchmarks"}
                </button>
                <button
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded"
                    onClick={fetchBenchmarks}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>
            {error && <div className="text-red-600 mb-2">{error}</div>}
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
                                <th className="px-3 py-2 border">Last Run</th>
                                <th className="px-3 py-2 border">In-Flight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {benchmarks.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-gray-400">
                                        No benchmark data available.
                                    </td>
                                </tr>
                            ) : (
                                benchmarks.map((b, i) => (
                                    <tr key={b.serverId + b.model} className={i % 2 ? "bg-gray-50" : ""}>
                                        <td className="px-3 py-2 border font-mono">{b.serverId}</td>
                                        <td className="px-3 py-2 border font-mono">{b.model}</td>
                                        <td className="px-3 py-2 border text-right">
                                            {b.benchmark?.latencyMs != null ? b.benchmark.latencyMs.toFixed(1) : "-"}
                                        </td>
                                        <td className="px-3 py-2 border">
                                            {b.benchmark?.lastTested ? new Date(b.benchmark.lastTested).toLocaleString() : "-"}
                                        </td>
                                        <td className="px-3 py-2 border text-right">{b.inFlight}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BenchmarksTab;
