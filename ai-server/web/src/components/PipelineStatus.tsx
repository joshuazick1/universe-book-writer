import React from 'react';

/**
 * PipelineStatus Props
 * @param tasks - Array of pipeline tasks with status and friendly names
 */
export interface PipelineTask {
    readonly id: string;
    readonly name: string;
    readonly friendlyName: string;
    readonly status: 'pending' | 'running' | 'success' | 'error';
    readonly startedAt?: string;
    readonly finishedAt?: string;
    readonly modelName?: string;
}

export interface PipelineStatusProps {
    readonly tasks: readonly PipelineTask[];
}

/**
 * PipelineStatus
 * Visualizes the current status of the pipeline tasks in real time.
 * Shows friendly names, status icons, and (optionally) model names.
 *
 * Example usage:
 * <PipelineStatus tasks={pipelineTasks} />
 */
const statusIcon = {
    pending: '⏳',
    running: '🔄',
    success: '✅',
    error: '❌',
};

export const PipelineStatus: React.FC<PipelineStatusProps> = ({ tasks }) => {
    return (
        <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded shadow">
            <h2 className="text-lg font-bold mb-4">Pipeline Progress</h2>
            <ul className="space-y-2">
                {tasks.map((task) => (
                    <li
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                        aria-current={task.status === 'running' ? 'step' : undefined}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl" aria-label={task.status}>
                                {statusIcon[task.status]}
                            </span>
                            <span className="font-medium text-gray-800">{task.friendlyName}</span>
                            {task.modelName && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                    {task.modelName}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">
                            {task.status === 'running' && task.startedAt && `Started: ${new Date(task.startedAt).toLocaleTimeString()}`}
                            {task.status === 'success' && task.finishedAt && `Finished: ${new Date(task.finishedAt).toLocaleTimeString()}`}
                            {task.status === 'error' && 'Error'}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PipelineStatus;
