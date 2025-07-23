/**
 * Shared types for AI API compatibility layers
 * These types are used across OpenAI, Ollama, and other AI provider compatibility modules
 */

import type { Request, Response, NextFunction } from 'express';

// Base AI Provider Types
export interface AIMessage {
    role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
    content: string;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

export interface AIStreamChunk {
    id?: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta?: {
            role?: string;
            content?: string;
            function_call?: {
                name?: string;
                arguments?: string;
            };
            tool_calls?: Array<{
                index?: number;
                id?: string;
                type?: 'function';
                function?: {
                    name?: string;
                    arguments?: string;
                };
            }>;
        };
        message?: AIMessage;
        finish_reason?: string | null;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface AIModelInfo {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    permission?: Array<{
        id: string;
        object: string;
        created: number;
        allow_create_engine: boolean;
        allow_sampling: boolean;
        allow_logprobs: boolean;
        allow_search_indices: boolean;
        allow_view: boolean;
        allow_fine_tuning: boolean;
        organization: string;
        group: string | null;
        is_blocking: boolean;
    }>;
    root?: string;
    parent?: string;
}

export interface AIEmbedding {
    object: 'embedding';
    index: number;
    embedding: number[];
}

export interface AIEmbeddingResponse {
    object: 'list';
    data: AIEmbedding[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export interface AIError {
    message: string;
    type: string;
    code?: string;
    param?: string;
}

export interface AIErrorResponse {
    error: AIError;
}

// Handler Types
export type AICompatHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface AICompatRoute {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    handler: AICompatHandler;
    middleware?: AICompatHandler[];
}

// Provider Configuration
export interface AIProviderConfig {
    name: string;
    baseUrl?: string;
    apiKey?: string;
    timeout?: number;
    retries?: number;
    models?: string[];
}

// Orchestrator Integration
export interface AIServer {
    id: string;
    url: string;
    healthy: boolean;
    models: string[];
    lastChecked?: number;
    responseTime?: number;
    load?: number;
}

export interface OrchestrationContext {
    getServers(): AIServer[];
    getCachedTags(refresh?: boolean): Promise<Record<string, any[]>>;
    getOrchestratorInstance?(): any;
}

// Utility Types
export interface RequestWithOrchestrator extends Omit<Request, 'app'> {
    app: Request['app'] & {
        locals?: {
            orchestrator?: OrchestrationContext;
        };
    };
}

export interface StreamingOptions {
    contentType?: string;
    enableCompression?: boolean;
    bufferSize?: number;
    timeout?: number;
}

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens?: number;
    total_tokens: number;
}

export interface TimingInfo {
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

// Response Transform Types
export interface ResponseTransformOptions {
    includeUsage?: boolean;
    includeTiming?: boolean;
    stripThinkingBlocks?: boolean;
    stripCodeFences?: boolean;
    extractJsonContent?: boolean;
}
