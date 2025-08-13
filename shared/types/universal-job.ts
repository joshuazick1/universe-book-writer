/**
 * Types and interfaces for universal job management
 */

import { ServerId } from './server.js';
import { TaskType, OutputFormat, JobPriority, ModelRequirements } from './model-selection.js';

export type JobId = string;

export enum JobType {
    // Ollama API endpoints (load balanced)
    OLLAMA_GENERATE = 'ollama-generate',
    OLLAMA_CHAT = 'ollama-chat',
    OLLAMA_EMBEDDINGS = 'ollama-embeddings',
    OLLAMA_PULL = 'ollama-pull',
    OLLAMA_PUSH = 'ollama-push',
    OLLAMA_CREATE = 'ollama-create',
    OLLAMA_DELETE = 'ollama-delete',
    OLLAMA_COPY = 'ollama-copy',
    OLLAMA_SHOW = 'ollama-show',
    OLLAMA_TAGS = 'ollama-tags',
    OLLAMA_PS = 'ollama-ps',

    // OpenAI Compatible endpoints (load balanced)
    OPENAI_CHAT_COMPLETIONS = 'openai-chat-completions',
    OPENAI_COMPLETIONS = 'openai-completions',
    OPENAI_EMBEDDINGS = 'openai-embeddings',
    OPENAI_MODELS = 'openai-models',

    // Specialized inference jobs
    TEXT_GENERATION = 'text-generation',
    CODE_COMPLETION = 'code-completion',
    JSON_COMPLETION = 'json-completion',
    STRUCTURED_OUTPUT = 'structured-output',
    FUNCTION_CALLING = 'function-calling',

    // Benchmark jobs (server-specific) - Updated terminology
    SERVER_LATENCY = 'server-latency',           // Model-agnostic server response time
    COLD_PERFORMANCE = 'cold-performance',       // Model performance including load time
    WARMUP_TEST = 'warmup-test',                 // Quality benchmark for model warmup
    WARM_PERFORMANCE = 'warm-performance',       // Optimized model performance
    QUALITY_BENCHMARK = 'quality-benchmark',     // General quality assessment
    EMBEDDING_BENCHMARK = 'embedding-benchmark',

    // Legacy benchmark types (for backward compatibility)
    COLD_LATENCY = 'cold-latency',
    WARM_LATENCY = 'warm-latency',

    // RAG pipeline jobs (dependency chains)
    TEXT_CHUNKING = 'text-chunking',
    SUMMARIZATION = 'summarization',
    ENTITY_EXTRACTION = 'entity-extraction',
    EMBEDDING_GENERATION = 'embedding-generation',
    VECTOR_SEARCH = 'vector-search',

    // System jobs
    SERVER_HEALTH_CHECK = 'server-health-check',
    MODEL_DISCOVERY = 'model-discovery',
    MODEL_MANAGEMENT = 'model-management'
}

// Job categories for different orchestration strategies
export enum JobCategory {
    INFERENCE = 'inference',           // Regular AI calls - can be load balanced
    BENCHMARK = 'benchmark',           // Must run on specific servers
    RAG_PIPELINE = 'rag-pipeline',     // Complex dependency chains
    HEALTH_CHECK = 'health-check',     // System maintenance
    EMBEDDING = 'embedding'            // Vector operations
}

// Job constraints determine scheduling behavior
export interface JobConstraints {
    readonly serverAffinity?: ServerId;      // Must run on specific server
    readonly excludeServers?: ServerId[];    // Cannot run on these servers
    readonly requiresModel?: string;         // Specific model required (optional)
    readonly preferredModels?: string[];     // Preferred models for task type
    readonly modelRequirements?: ModelRequirements; // Task-specific model criteria
    readonly canSteal: boolean;              // Allows job stealing
    readonly stealable: boolean;             // Can be stolen by faster servers
    readonly maxConcurrency?: number;        // Limit concurrent instances
    readonly resourceRequirements?: ResourceRequirements;
}

export interface ResourceRequirements {
    readonly minMemoryMB?: number;
    readonly minCpuCores?: number;
    readonly requiresGPU?: boolean;
    readonly minGpuMemoryMB?: number;
}

export interface TimeoutConfig {
    readonly executionTimeoutMs: number;
    readonly queueTimeoutMs?: number;
}

export interface RetryPolicy {
    readonly maxRetries: number;
    readonly retryDelayMs: number;
    readonly exponentialBackoff?: boolean;
}

export interface JobMetadata {
    readonly submittedAt: Date;
    readonly submittedBy?: string;
    readonly tags?: string[];
    readonly correlationId?: string;
}

export interface UniversalJob {
    readonly id: JobId;
    readonly type: JobType;
    readonly category: JobCategory;
    readonly modelId: string;
    readonly priority: JobPriority;
    readonly dependencies: readonly JobId[];
    readonly constraints: JobConstraints;
    readonly payload: Record<string, any>;
    readonly metadata: JobMetadata;
    readonly timeout: TimeoutConfig;
    readonly retryPolicy: RetryPolicy;
}

export { TaskType, OutputFormat, JobPriority } from './model-selection.js';
