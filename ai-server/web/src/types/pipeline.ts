/**
 * Pipeline event and task types for pipeline streaming and UI.
 */

export type PipelineTaskStatus = 'pending' | 'running' | 'success' | 'error';

export interface PipelineTask {
    readonly id: string;
    readonly name: string;
    readonly friendlyName: string;
    readonly status: PipelineTaskStatus;
    readonly startedAt?: string;
    readonly finishedAt?: string;
    readonly modelName?: string;
}

export interface PipelineOverviewEvent {
    readonly type: 'pipeline_overview';
    readonly tasks: readonly PipelineTask[];
}

export interface TaskStatusEvent {
    readonly type: 'task_status';
    readonly task: PipelineTask;
}

export type PipelineEvent = PipelineOverviewEvent | TaskStatusEvent;
