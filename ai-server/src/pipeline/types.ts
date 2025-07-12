/**
 * PipelineStep and PipelineContext interfaces for RAG pipeline modularity.
 *
 * All pipeline step modules should implement PipelineStep<Input, Output>.
 * The PipelineContext is passed to every step for shared state, graph access, logging, and orchestration.
 */


/**
 * Minimal logger interface for pipeline context.
 */
export interface PipelineLogger {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    debug?: (msg: string) => void;
}

/**
 * Shared context object passed to every pipeline step.
 */
export interface PipelineContext {
    /** Submission metadata (universe, book, chapter, user, etc.) */
    readonly submission: {
        universeId: string;
        bookId: string;
        chapterId?: string;
        userId?: string;
        [key: string]: unknown;
    };
    /** Knowledge graph accessors and mutation methods */
    readonly graph: {
        getNode: (id: string) => Promise<any>;
        updateNode: (id: string, data: any) => Promise<void>;
        createNode: (data: any) => Promise<string>;
        createRelationship: (from: string, to: string, type: string, data?: any) => Promise<void>;
        // ...extend as needed
    };
    /** Job/step state and progress tracking */
    readonly job: {
        jobId: string;
        step: string;
        enqueueStep: (step: string, payload: any) => Promise<void>;
        markComplete: (step: string) => Promise<void>;
        // ...extend as needed
    };
    /** Logger for structured logging/tracing */
    readonly logger: PipelineLogger;
    /** Arbitrary context for plugins/middleware */
    [key: string]: unknown;
}

/**
 * Standard interface for all pipeline step modules.
 * Input and Output types should be strictly typed per step.
 */
export interface PipelineStep<Input, Output> {
    (input: Input, context: PipelineContext): Promise<Output>;
}

/**
 * Example usage in a pipeline step module:
 *
 * import type { PipelineStep, PipelineContext } from './types';
 *
 * export const chunkText: PipelineStep<ChunkTextInput, ChunkTextOutput> = async (input, context) => {
 *   // ...implementation...
 * };
 */
