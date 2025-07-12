import React, { useEffect, useRef, useState } from 'react';
import PipelineStatus, { PipelineTask } from '../../components/PipelineStatus';

/**
 * SSE event types for pipeline streaming
 */
interface PipelineOverviewEvent {
    type: 'pipeline_overview';
    tasks: Array<{
        id: string;
        name: string;
        friendlyName: string;
        status: 'pending' | 'running' | 'success' | 'error';
        modelName?: string;
        startedAt?: string;
        finishedAt?: string;
    }>;
}

interface TaskStatusEvent {
    type: 'task_status';
    task: {
        id: string;
        status: 'pending' | 'running' | 'success' | 'error';
        startedAt?: string;
        finishedAt?: string;
        modelName?: string;
    };
}

type PipelineEvent = PipelineOverviewEvent | TaskStatusEvent;

/**
 * IngestPage - Handles text ingestion, SSE pipeline events, and model selection UI.
 * Displays real-time pipeline progress using PipelineStatus.
 */
const IngestPage: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [pipelineTasks, setPipelineTasks] = useState<PipelineTask[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Handle SSE events
    useEffect(() => {
        if (!isIngesting) return;
        const es = new window.EventSource(`/api/ingest/stream`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data: PipelineEvent = JSON.parse(event.data);
                if (data.type === 'pipeline_overview') {
                    setPipelineTasks(data.tasks);
                } else if (data.type === 'task_status') {
                    setPipelineTasks((prev) =>
                        prev.map((t) =>
                            t.id === data.task.id
                                ? { ...t, ...data.task }
                                : t
                        )
                    );
                }
            } catch (err) {
                // Optionally handle parse errors
            }
        };
        es.onerror = () => {
            es.close();
            setIsIngesting(false);
        };
        return () => {
            es.close();
        };
    }, [isIngesting]);

    // Submit text for ingestion
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPipelineTasks([]);
        setIsIngesting(true);
        await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: inputText }),
        });
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Ingest Text</h1>
            <form onSubmit={handleSubmit} className="mb-8">
                <textarea
                    className="w-full h-32 p-2 border rounded mb-2"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste or type your text here..."
                    required
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={isIngesting}
                >
                    {isIngesting ? 'Ingesting...' : 'Ingest'}
                </button>
            </form>
            {pipelineTasks.length > 0 && <PipelineStatus tasks={pipelineTasks} />}
        </div>
    );
};

export default IngestPage;
