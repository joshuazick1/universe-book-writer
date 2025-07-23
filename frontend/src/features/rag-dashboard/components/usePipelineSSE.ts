import { useEffect, useState, useRef } from 'react';
import { PIPELINE_TASKS, PipelineTaskDef } from 'shared/utils/pipelineTasks';
import type { PipelineTask } from 'shared/components/PipelineStatus';

/**
 * usePipelineSSE
 * Listens to SSE events for pipeline progress and updates task status accordingly.
 * @param sseUrl - SSE endpoint URL
 * @returns tasks - Array of PipelineTask for PipelineStatus
 */
export function usePipelineSSE(sseUrl: string, enabled: boolean) {
    const [tasks, setTasks] = useState<PipelineTask[]>(() =>
        PIPELINE_TASKS.map((def, idx) => ({
            id: def.key,
            name: def.key,
            friendlyName: def.friendlyName,
            status: 'pending',
        }))
    );
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const eventSource = new window.EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // data: { taskKey: string, status: string, startedAt?: string, finishedAt?: string, modelName?: string }
                setTasks((prev) =>
                    prev.map((t) =>
                        t.id === data.taskKey
                            ? {
                                ...t,
                                status: data.status,
                                startedAt: data.startedAt || t.startedAt,
                                finishedAt: data.finishedAt || t.finishedAt,
                                modelName: data.modelName || t.modelName,
                            }
                            : t
                    )
                );
            } catch (err) {
                // ignore parse errors
            }
        };
        eventSource.onerror = () => {
            eventSource.close();
        };
        return () => {
            eventSource.close();
        };
    }, [sseUrl, enabled]);

    return tasks;
}
