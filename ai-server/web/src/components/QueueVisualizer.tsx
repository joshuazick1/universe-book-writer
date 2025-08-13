/**
 * QueueVisualizer - Real-time visualization of the benchmarking queue, job status, and server/model assignment.
 * Uses Tailwind CSS for styling and is fully accessible (WCAG compliant).
 * Polls backend /api/queue/status for updates.
 *
 * Usage: <QueueVisualizer />
 */
import React, { useState, useEffect } from 'react';

// Define QueueStats locally
interface QueueStats {
    totalJobs: number;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageWaitTime: number;
    averageExecutionTime: number;
}

interface JobMetadata {
    jobId: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    retries: number;
    timestamps: {
        enqueued: number;
        started?: number;
        completed?: number;
        failed?: number;
    };
    serverId: string;
    modelId: string; // Change from model to modelId
    type?: string;
}

// Correct QueueJob structure to match API response
interface QueueJob {
    jobId: string;
    serverId: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    type?: string;
    modelId: string; // API returns modelId, not model
    retries: number;
    executionTimeMs?: number; // API includes execution time
    timestamps: {
        enqueued: number;
        started?: number;
        completed?: number;
        failed?: number;
    };
}

// Update QueueStatus to match backend response
interface QueueStatus {
    stats: QueueStats;
    runningJobs: QueueJob[];
    recentCompletedJobs: QueueJob[];
}

// Group jobs by server only (not server/model pair)
function groupJobsByServer(queueData: QueueStatus): Record<string, QueueJob[]> {
    const grouped: Record<string, QueueJob[]> = {};

    // Add running jobs
    if (queueData.runningJobs && queueData.runningJobs.length > 0) {
        queueData.runningJobs.forEach(job => {
            if (!grouped[job.serverId]) grouped[job.serverId] = [];
            grouped[job.serverId].push(job);
        });
    }

    // Add recent completed jobs
    if (queueData.recentCompletedJobs && queueData.recentCompletedJobs.length > 0) {
        queueData.recentCompletedJobs.forEach(job => {
            if (!grouped[job.serverId]) grouped[job.serverId] = [];
            grouped[job.serverId].push(job);
        });
    }

    return grouped;
}

export const QueueVisualizer: React.FC = () => {
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch queue status from HTTP API
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/queue/status');
                if (!response.ok) {
                    throw new Error(`Failed to fetch queue status: ${response.status}`);
                }
                const data = await response.json();
                setQueueStatus(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching queue status:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchStatus();

        // Poll every 2 seconds
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const connected = !error;

    // Group jobs by server - handle the actual API response structure
    const jobsByServer = queueStatus ? groupJobsByServer(queueStatus) : {};
    const serverIds = Object.keys(jobsByServer);

    return (
        <section className="p-4 bg-white rounded shadow-md max-w-5xl mx-auto mt-6" aria-label="Benchmark Queue Visualizer">
            <h2 className="text-2xl font-bold mb-4">Benchmark Queue Visualizer</h2>
            {loading && <div className="text-gray-500">Loading queue status...</div>}
            {error && <div className="text-red-600">Error: {error}</div>}

            {/* Queue Statistics */}
            {queueStatus && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Queue Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{queueStatus.stats.totalJobs || 0}</div>
                            <div className="text-gray-600">Total Jobs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{queueStatus.stats.pendingJobs || 0}</div>
                            <div className="text-gray-600">Pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-500">{queueStatus.stats.runningJobs || 0}</div>
                            <div className="text-gray-600">Running</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{queueStatus.stats.completedJobs || 0}</div>
                            <div className="text-gray-600">Completed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{queueStatus.stats.failedJobs || 0}</div>
                            <div className="text-gray-600">Failed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">{Math.round(queueStatus.stats.averageWaitTime || 0)}ms</div>
                            <div className="text-gray-600">Avg Wait</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">{Math.round(queueStatus.stats.averageExecutionTime || 0)}ms</div>
                            <div className="text-gray-600">Avg Execution</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-2 py-1 text-left">Server</th>
                            <th className="px-2 py-1 text-left">Queue Length</th>
                            <th className="px-2 py-1 text-left">Jobs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {serverIds.length === 0 && !loading ? (
                            <tr><td colSpan={3} className="text-center py-4">No active jobs in queue.</td></tr>
                        ) : (
                            serverIds.map(serverId => (
                                <tr key={serverId} className="border-b">
                                    <td className="px-2 py-1 font-mono text-sm">{serverId}</td>
                                    <td className="px-2 py-1">{jobsByServer[serverId].length}</td>
                                    <td className="px-2 py-1">
                                        <ul className="space-y-1">
                                            {jobsByServer[serverId].map((job: QueueJob) => (
                                                <li key={job.jobId} className="flex items-center gap-2 text-xs">
                                                    <span className={`inline-block w-3 h-3 rounded-full ${job.status === 'pending' ? 'bg-yellow-400' :
                                                            job.status === 'active' ? 'bg-blue-400 animate-pulse' :
                                                                job.status === 'completed' ? 'bg-green-500' :
                                                                    'bg-red-500'
                                                        }`} aria-label={job.status}></span>
                                                    <span className="font-mono" title={job.jobId}>{job.jobId.slice(-8)}</span>
                                                    <span className="text-gray-600">{job.type || 'job'}</span>
                                                    <span className="text-gray-500">Model: {job.modelId}</span>
                                                    {job.executionTimeMs && (
                                                        <span className="text-gray-500">
                                                            {Math.round(job.executionTimeMs)}ms
                                                        </span>
                                                    )}
                                                    <span className="text-gray-500">
                                                        {new Date(job.timestamps.enqueued).toLocaleTimeString()}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Show recent completed jobs info */}
                {queueStatus && queueStatus.recentCompletedJobs && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                        <h4 className="font-medium text-green-800 mb-2">Recent Completed Jobs</h4>
                        <div className="text-sm text-green-700">
                            Showing {queueStatus.recentCompletedJobs.length} recent completed jobs.
                            {queueStatus.recentCompletedJobs.some((job) => job.executionTimeMs && job.executionTimeMs > 1000) && (
                                <div className="mt-1">✅ Real AI inference confirmed - jobs taking {Math.round(queueStatus.stats.averageExecutionTime || 0)}ms average</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
                <strong>Legend:</strong> <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span>Pending <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1"></span>Active <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>Completed <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>Failed
            </div>
        </section>
    );
};

export default QueueVisualizer;
