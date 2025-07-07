/**
 * Shared utilities for AI API compatibility layers
 * Common functions used across OpenAI, Ollama, and other AI provider compatibility modules
 */

import type { Response } from 'express';
import type {
    AIError,
    AIErrorResponse,
    StreamingOptions,
    ResponseTransformOptions,
    TokenUsage,
    TimingInfo,
    AIMessage
} from './types.js';

/**
 * Error handling utilities
 */
export class CompatibilityError extends Error {
    public readonly type: string;
    public readonly code?: string;
    public readonly statusCode: number;

    constructor(message: string, type: string, statusCode: number = 500, code?: string) {
        super(message);
        this.name = 'CompatibilityError';
        this.type = type;
        this.code = code;
        this.statusCode = statusCode;
    }
}

export function createErrorResponse(
    message: string,
    type: string,
    code?: string
): AIErrorResponse {
    return {
        error: {
            message,
            type,
            code
        }
    };
}

export function sendErrorResponse(
    res: Response,
    statusCode: number,
    message: string,
    type: string,
    code?: string
): void {
    res.status(statusCode).json(createErrorResponse(message, type, code));
}

export function handleCompatibilityError(
    res: Response,
    error: unknown,
    fallbackMessage: string = 'Internal server error'
): void {
    console.error('[CompatibilityError]', error);

    if (error instanceof CompatibilityError) {
        sendErrorResponse(res, error.statusCode, error.message, error.type, error.code);
        return;
    }

    if (error instanceof Error) {
        sendErrorResponse(res, 500, error.message, 'api_error');
        return;
    }

    sendErrorResponse(res, 500, fallbackMessage, 'api_error');
}

/**
 * Request validation utilities
 */
export function validateRequiredFields(
    body: any,
    fields: string[]
): { isValid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of fields) {
        if (body?.[field] === undefined || body[field] === null) {
            missing.push(field);
        }
    }

    return {
        isValid: missing.length === 0,
        missing
    };
}

export function validateModel(model: string, availableModels: string[]): boolean {
    return availableModels.includes(model);
}

/**
 * Response transformation utilities
 */
export function extractJsonOrText(content: string): string {
    // Remove <think>...</think> blocks
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Remove markdown code fences
    content = content.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();

    // If the remaining content is a JSON object, return as is
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];

    return content;
}

export function transformResponseContent(
    content: string,
    options: ResponseTransformOptions = {}
): string {
    let transformed = content;

    if (options.stripThinkingBlocks) {
        transformed = transformed.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    if (options.stripCodeFences) {
        transformed = transformed.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
    }

    if (options.extractJsonContent) {
        const jsonMatch = transformed.match(/\{[\s\S]*\}/);
        if (jsonMatch) transformed = jsonMatch[0];
    }

    return transformed;
}

/**
 * Streaming utilities
 */
export function setupStreamingHeaders(
    res: Response,
    options: StreamingOptions = {}
): void {
    const contentType = options.contentType || 'application/x-ndjson';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (options.enableCompression !== false) {
        res.setHeader('Transfer-Encoding', 'chunked');
    }
}

export function setupSSEHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
}

export function writeSSEChunk(res: Response, data: any, event?: string): void {
    if (event) {
        res.write(`event: ${event}\n`);
    }
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function writeNDJSONChunk(res: Response, data: any): void {
    res.write(JSON.stringify(data) + '\n');
}

/**
 * Model and server utilities
 */
export function findAvailableServers(
    allServers: any[],
    model: string
): any[] {
    return allServers.filter(
        (server: any) =>
            server.healthy &&
            Array.isArray(server.models) &&
            server.models.includes(model)
    );
}

export function selectBestServer(servers: any[]): any | null {
    if (servers.length === 0) return null;

    // Simple selection: return the first healthy server
    // TODO: Implement load balancing logic
    return servers[0];
}

/**
 * Message and conversation utilities
 */
export function composePromptFromMessages(messages: AIMessage[]): string {
    return messages.map(m => {
        const rolePrefix = m.role === 'system' ? 'System: ' :
            m.role === 'user' ? 'User: ' :
                m.role === 'assistant' ? 'Assistant: ' : '';
        return rolePrefix + m.content;
    }).join('\n');
}

export function formatOpenAIMessage(
    role: 'system' | 'user' | 'assistant',
    content: string
): AIMessage {
    return { role, content };
}

/**
 * Token counting utilities (placeholder implementations)
 */
export function estimateTokenCount(text: string): number {
    // Simple estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
}

export function calculateUsage(
    promptText: string,
    completionText: string
): TokenUsage {
    const prompt_tokens = estimateTokenCount(promptText);
    const completion_tokens = estimateTokenCount(completionText);

    return {
        prompt_tokens,
        completion_tokens,
        total_tokens: prompt_tokens + completion_tokens
    };
}

/**
 * Timing utilities
 */
export function createTimingInfo(
    startTime: number,
    loadTime?: number,
    evalStartTime?: number
): TimingInfo {
    const now = Date.now();
    const totalDuration = (now - startTime) * 1000000; // Convert to nanoseconds

    return {
        total_duration: totalDuration,
        load_duration: loadTime ? (loadTime - startTime) * 1000000 : undefined,
        eval_duration: evalStartTime ? (now - evalStartTime) * 1000000 : undefined
    };
}

/**
 * ID generation utilities
 */
export function generateRequestId(prefix: string = 'req'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}${random}`;
}

export function generateChatCompletionId(): string {
    return generateRequestId('chatcmpl');
}

export function generateCompletionId(): string {
    return generateRequestId('cmpl');
}

export function generateEmbeddingId(): string {
    return generateRequestId('emb');
}

/**
 * Async utilities for handling streams
 */
export async function* parseNDJSONStream(
    stream: NodeJS.ReadableStream
): AsyncGenerator<any, void, unknown> {
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    try {
        for await (const line of rl) {
            if (!line.trim()) continue;

            try {
                const obj = JSON.parse(line);
                yield obj;
            } catch (err) {
                console.warn('[parseNDJSONStream] Failed to parse JSON line:', line);
                continue;
            }
        }
    } finally {
        rl.close();
    }
}

export async function collectStreamChunks(
    stream: NodeJS.ReadableStream,
    contentExtractor: (chunk: any) => string = (chunk) => chunk.response || chunk.content || ''
): Promise<{ fullContent: string; chunks: any[]; lastChunk?: any }> {
    const chunks: any[] = [];
    let fullContent = '';
    let lastChunk: any;

    for await (const chunk of parseNDJSONStream(stream)) {
        chunks.push(chunk);
        lastChunk = chunk;

        const content = contentExtractor(chunk);
        if (content) {
            fullContent += content;
        }
    }

    return { fullContent, chunks, lastChunk };
}

/**
 * Orchestrator integration utilities
 */
export async function getOrchestrator(req: any): Promise<any> {
    // Try to get orchestrator from app.locals first
    if (req.app?.locals?.orchestrator) {
        return req.app.locals.orchestrator;
    }

    // Fallback to singleton import
    try {
        const orchestratorInstance = await import('../../orchestrator-instance.js');
        return orchestratorInstance.getOrchestratorInstance ?
            orchestratorInstance.getOrchestratorInstance() :
            orchestratorInstance.default;
    } catch (error) {
        throw new CompatibilityError(
            'Orchestrator unavailable',
            'service_unavailable',
            503,
            'orchestrator_offline'
        );
    }
}

export async function getCachedTags(req: any, refresh: boolean = false): Promise<Record<string, any[]>> {
    const orchestrator = await getOrchestrator(req);
    return await orchestrator.getCachedTags(refresh);
}

export function getHealthyServers(req: any): any[] {
    // This would need to be implemented based on your orchestrator structure
    // For now, return empty array as placeholder
    return [];
}
