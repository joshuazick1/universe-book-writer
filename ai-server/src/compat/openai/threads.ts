/**
 * OpenAI Compatibility: /v1/threads endpoint with messages and runs support
 *
 * Threads:
 * GET /v1/threads - List all threads
 * POST /v1/threads - Create a thread
 * GET /v1/threads/:thread_id - Retrieve thread
 * POST /v1/threads/:thread_id/modify - Modify thread
 * DELETE /v1/threads/:thread_id - Delete thread
 *
 * Messages:
 * GET /v1/threads/:thread_id/messages - List messages in thread
 * POST /v1/threads/:thread_id/messages - Create message in thread
 * GET /v1/threads/:thread_id/messages/:message_id - Retrieve message
 * POST /v1/threads/:thread_id/messages/:message_id/modify - Modify message
 *
 * Runs:
 * GET /v1/threads/:thread_id/runs - List runs in thread
 * POST /v1/threads/:thread_id/runs - Create run in thread
 * GET /v1/threads/:thread_id/runs/:run_id - Retrieve run
 * POST /v1/threads/:thread_id/runs/:run_id/cancel - Cancel run
 * POST /v1/threads/:thread_id/runs/:run_id/submit_tool_outputs - Submit tool outputs
 *
 * This is an in-memory implementation. Real implementation should use persistent storage.
 */
import { Request, Response, RequestHandler } from 'express';

// OpenAI Thread interface
interface Thread {
    id: string;
    object: 'thread';
    created_at: number;
    metadata?: Record<string, string>;
}

// OpenAI Message interface
interface Message {
    id: string;
    object: 'thread.message';
    created_at: number;
    thread_id: string;
    status: 'in_progress' | 'incomplete' | 'completed';
    incomplete_details?: {
        reason: 'content_filter' | 'max_tokens' | 'run_cancelled' | 'run_expired' | 'run_failed';
    } | null;
    completed_at?: number | null;
    incomplete_at?: number | null;
    role: 'user' | 'assistant';
    content: Array<{
        type: 'text' | 'image_file' | 'image_url';
        text?: {
            value: string;
            annotations: Array<{
                type: 'file_citation' | 'file_path';
                text: string;
                start_index: number;
                end_index: number;
            }>;
        };
        image_file?: {
            file_id: string;
            detail?: 'auto' | 'low' | 'high';
        };
        image_url?: {
            url: string;
            detail?: 'auto' | 'low' | 'high';
        };
    }>;
    assistant_id?: string | null;
    run_id?: string | null;
    attachments?: Array<{
        file_id: string;
        tools: Array<{
            type: 'code_interpreter' | 'file_search';
        }>;
    }> | null;
    metadata?: Record<string, string>;
}

// OpenAI Run interface
interface Run {
    id: string;
    object: 'thread.run';
    created_at: number;
    thread_id: string;
    assistant_id: string;
    status: 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired';
    required_action?: {
        type: 'submit_tool_outputs';
        submit_tool_outputs: {
            tool_calls: Array<{
                id: string;
                type: 'function';
                function: {
                    name: string;
                    arguments: string;
                };
            }>;
        };
    } | null;
    last_error?: {
        code: 'server_error' | 'rate_limit_exceeded' | 'invalid_prompt';
        message: string;
    } | null;
    expires_at?: number | null;
    started_at?: number | null;
    cancelled_at?: number | null;
    failed_at?: number | null;
    completed_at?: number | null;
    incomplete_details?: {
        reason?: 'max_completion_tokens' | 'max_prompt_tokens';
    } | null;
    model: string;
    instructions: string | null;
    tools: Array<{
        type: 'code_interpreter' | 'file_search' | 'function';
        function?: {
            name: string;
            description?: string;
            parameters?: Record<string, any>;
        };
    }>;
    metadata?: Record<string, string>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    } | null;
    temperature?: number | null;
    top_p?: number | null;
    max_prompt_tokens?: number | null;
    max_completion_tokens?: number | null;
    truncation_strategy?: {
        type: 'auto' | 'last_messages';
        last_messages?: number | null;
    } | null;
    tool_choice?: 'none' | 'auto' | 'required' | {
        type: 'function';
        function: {
            name: string;
        };
    } | null;
    response_format?: 'auto' | {
        type: 'text' | 'json_object';
    } | null;
}

// In-memory stores (for demo only)
const threads: Thread[] = [];
const messages: Message[] = [];
const runs: Run[] = [];

// Thread handlers
export const openaiListThreadsHandler: RequestHandler = (req, res) => {
    const { limit = 20, order = 'desc', after, before } = req.query;
    let filteredThreads = [...threads];

    // Apply ordering
    if (order === 'desc') {
        filteredThreads.sort((a, b) => b.created_at - a.created_at);
    } else {
        filteredThreads.sort((a, b) => a.created_at - b.created_at);
    }

    // Apply pagination
    if (after) {
        const afterIndex = filteredThreads.findIndex(t => t.id === after);
        if (afterIndex !== -1) {
            filteredThreads = filteredThreads.slice(afterIndex + 1);
        }
    }
    if (before) {
        const beforeIndex = filteredThreads.findIndex(t => t.id === before);
        if (beforeIndex !== -1) {
            filteredThreads = filteredThreads.slice(0, beforeIndex);
        }
    }

    // Apply limit
    filteredThreads = filteredThreads.slice(0, Number(limit));

    res.json({
        object: 'list',
        data: filteredThreads,
        first_id: filteredThreads[0]?.id || null,
        last_id: filteredThreads[filteredThreads.length - 1]?.id || null,
        has_more: false // Simplified for demo
    });
};

export const openaiCreateThreadHandler: RequestHandler = (req, res) => {
    const { messages: initialMessages, metadata } = req.body;

    const id = 'thread_' + Math.random().toString(36).slice(2, 10);
    const created_at = Math.floor(Date.now() / 1000);

    const thread: Thread = {
        id,
        object: 'thread',
        created_at,
        metadata: metadata || {}
    };

    threads.push(thread);

    // Create initial messages if provided
    if (initialMessages && Array.isArray(initialMessages)) {
        for (const msg of initialMessages) {
            const messageId = 'msg_' + Math.random().toString(36).slice(2, 10);
            const message: Message = {
                id: messageId,
                object: 'thread.message',
                created_at: Math.floor(Date.now() / 1000),
                thread_id: id,
                status: 'completed',
                completed_at: Math.floor(Date.now() / 1000),
                incomplete_at: null,
                role: msg.role || 'user',
                content: msg.content ? (Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: { value: msg.content, annotations: [] } }]) : [],
                assistant_id: null,
                run_id: null,
                attachments: msg.attachments || null,
                metadata: msg.metadata || {}
            };
            messages.push(message);
        }
    }

    res.status(201).json(thread);
};

export const openaiRetrieveThreadHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }
    res.json(thread);
};

export const openaiModifyThreadHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const { metadata } = req.body;

    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (metadata !== undefined) {
        thread.metadata = metadata;
    }

    res.json(thread);
};

export const openaiDeleteThreadHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const idx = threads.findIndex(t => t.id === thread_id);
    if (idx === -1) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    // Also remove associated messages and runs
    const threadMessages = messages.filter(m => m.thread_id === thread_id);
    const threadRuns = runs.filter(r => r.thread_id === thread_id);

    for (const msg of threadMessages) {
        const msgIdx = messages.findIndex(m => m.id === msg.id);
        if (msgIdx !== -1) messages.splice(msgIdx, 1);
    }

    for (const run of threadRuns) {
        const runIdx = runs.findIndex(r => r.id === run.id);
        if (runIdx !== -1) runs.splice(runIdx, 1);
    }

    threads.splice(idx, 1);
    res.json({ id: thread_id, object: 'thread.deleted', deleted: true });
};

// Message handlers
export const openaiListThreadMessagesHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const { limit = 20, order = 'desc', after, before, run_id } = req.query;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    let threadMessages = messages.filter(m => m.thread_id === thread_id);

    // Filter by run_id if provided
    if (run_id) {
        threadMessages = threadMessages.filter(m => m.run_id === run_id);
    }

    // Apply ordering
    if (order === 'desc') {
        threadMessages.sort((a, b) => b.created_at - a.created_at);
    } else {
        threadMessages.sort((a, b) => a.created_at - b.created_at);
    }

    // Apply pagination
    if (after) {
        const afterIndex = threadMessages.findIndex(m => m.id === after);
        if (afterIndex !== -1) {
            threadMessages = threadMessages.slice(afterIndex + 1);
        }
    }
    if (before) {
        const beforeIndex = threadMessages.findIndex(m => m.id === before);
        if (beforeIndex !== -1) {
            threadMessages = threadMessages.slice(0, beforeIndex);
        }
    }

    // Apply limit
    threadMessages = threadMessages.slice(0, Number(limit));

    res.json({
        object: 'list',
        data: threadMessages,
        first_id: threadMessages[0]?.id || null,
        last_id: threadMessages[threadMessages.length - 1]?.id || null,
        has_more: false // Simplified for demo
    });
};

export const openaiCreateThreadMessageHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const { role, content, attachments, metadata } = req.body;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (!role || !content) {
        res.status(400).json({
            error: {
                message: 'Missing required fields: role and content are required.',
                type: 'invalid_request_error',
                code: 'missing_required_parameter'
            }
        });
        return;
    }

    const id = 'msg_' + Math.random().toString(36).slice(2, 10);
    const created_at = Math.floor(Date.now() / 1000);

    const message: Message = {
        id,
        object: 'thread.message',
        created_at,
        thread_id,
        status: 'completed',
        completed_at: created_at,
        incomplete_at: null,
        role: role,
        content: Array.isArray(content) ? content : [{ type: 'text', text: { value: content, annotations: [] } }],
        assistant_id: null,
        run_id: null,
        attachments: attachments || null,
        metadata: metadata || {}
    };

    messages.push(message);
    res.status(201).json(message);
};

export const openaiRetrieveThreadMessageHandler: RequestHandler = (req, res) => {
    const { thread_id, message_id } = req.params;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    const message = messages.find(m => m.id === message_id && m.thread_id === thread_id);
    if (!message) {
        res.status(404).json({
            error: {
                message: 'No message found with that ID.',
                type: 'invalid_request_error',
                param: 'message_id',
                code: 'not_found'
            }
        });
        return;
    }

    res.json(message);
};

export const openaiModifyThreadMessageHandler: RequestHandler = (req, res) => {
    const { thread_id, message_id } = req.params;
    const { metadata } = req.body;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    const message = messages.find(m => m.id === message_id && m.thread_id === thread_id);
    if (!message) {
        res.status(404).json({
            error: {
                message: 'No message found with that ID.',
                type: 'invalid_request_error',
                param: 'message_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (metadata !== undefined) {
        message.metadata = metadata;
    }

    res.json(message);
};

// Run handlers
export const openaiListThreadRunsHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const { limit = 20, order = 'desc', after, before } = req.query;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    let threadRuns = runs.filter(r => r.thread_id === thread_id);

    // Apply ordering
    if (order === 'desc') {
        threadRuns.sort((a, b) => b.created_at - a.created_at);
    } else {
        threadRuns.sort((a, b) => a.created_at - b.created_at);
    }

    // Apply pagination
    if (after) {
        const afterIndex = threadRuns.findIndex(r => r.id === after);
        if (afterIndex !== -1) {
            threadRuns = threadRuns.slice(afterIndex + 1);
        }
    }
    if (before) {
        const beforeIndex = threadRuns.findIndex(r => r.id === before);
        if (beforeIndex !== -1) {
            threadRuns = threadRuns.slice(0, beforeIndex);
        }
    }

    // Apply limit
    threadRuns = threadRuns.slice(0, Number(limit));

    res.json({
        object: 'list',
        data: threadRuns,
        first_id: threadRuns[0]?.id || null,
        last_id: threadRuns[threadRuns.length - 1]?.id || null,
        has_more: false // Simplified for demo
    });
};

export const openaiCreateThreadRunHandler: RequestHandler = (req, res) => {
    const { thread_id } = req.params;
    const {
        assistant_id,
        model,
        instructions,
        additional_instructions,
        additional_messages,
        tools,
        metadata,
        temperature,
        top_p,
        stream = false,
        max_prompt_tokens,
        max_completion_tokens,
        truncation_strategy,
        tool_choice,
        response_format
    } = req.body;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (!assistant_id) {
        res.status(400).json({
            error: {
                message: 'Missing required field: assistant_id is required.',
                type: 'invalid_request_error',
                code: 'missing_required_parameter'
            }
        });
        return;
    }

    const id = 'run_' + Math.random().toString(36).slice(2, 10);
    const created_at = Math.floor(Date.now() / 1000);

    const run: Run = {
        id,
        object: 'thread.run',
        created_at,
        thread_id,
        assistant_id,
        status: 'queued',
        required_action: null,
        last_error: null,
        expires_at: created_at + 600, // 10 minutes
        started_at: null,
        cancelled_at: null,
        failed_at: null,
        completed_at: null,
        incomplete_details: null,
        model: model || 'gpt-3.5-turbo',
        instructions: instructions || null,
        tools: tools || [],
        metadata: metadata || {},
        usage: null,
        temperature: temperature || null,
        top_p: top_p || null,
        max_prompt_tokens: max_prompt_tokens || null,
        max_completion_tokens: max_completion_tokens || null,
        truncation_strategy: truncation_strategy || null,
        tool_choice: tool_choice || null,
        response_format: response_format || null
    };

    runs.push(run);

    // In a real implementation, you would start the run in the background
    // For demo purposes, we'll just mark it as completed immediately
    setTimeout(() => {
        run.status = 'in_progress';
        run.started_at = Math.floor(Date.now() / 1000);

        // Simulate completion after a short delay
        setTimeout(() => {
            run.status = 'completed';
            run.completed_at = Math.floor(Date.now() / 1000);
            run.usage = {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
            };
        }, 1000);
    }, 100);

    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ object: 'thread.run', data: run })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    } else {
        res.status(201).json(run);
    }
};

export const openaiRetrieveThreadRunHandler: RequestHandler = (req, res) => {
    const { thread_id, run_id } = req.params;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    const run = runs.find(r => r.id === run_id && r.thread_id === thread_id);
    if (!run) {
        res.status(404).json({
            error: {
                message: 'No run found with that ID.',
                type: 'invalid_request_error',
                param: 'run_id',
                code: 'not_found'
            }
        });
        return;
    }

    res.json(run);
};

export const openaiCancelThreadRunHandler: RequestHandler = (req, res) => {
    const { thread_id, run_id } = req.params;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    const run = runs.find(r => r.id === run_id && r.thread_id === thread_id);
    if (!run) {
        res.status(404).json({
            error: {
                message: 'No run found with that ID.',
                type: 'invalid_request_error',
                param: 'run_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (run.status === 'completed' || run.status === 'cancelled' || run.status === 'failed' || run.status === 'expired') {
        res.status(400).json({
            error: {
                message: 'Cannot cancel a run that is already in a terminal state.',
                type: 'invalid_request_error',
                code: 'invalid_request'
            }
        });
        return;
    }

    run.status = 'cancelling';
    run.cancelled_at = Math.floor(Date.now() / 1000);

    // Simulate cancellation completion
    setTimeout(() => {
        run.status = 'cancelled';
    }, 100);

    res.json(run);
};

export const openaiSubmitToolOutputsHandler: RequestHandler = (req, res) => {
    const { thread_id, run_id } = req.params;
    const { tool_outputs, stream = false } = req.body;

    // Check if thread exists
    const thread = threads.find(t => t.id === thread_id);
    if (!thread) {
        res.status(404).json({
            error: {
                message: 'No thread found with that ID.',
                type: 'invalid_request_error',
                param: 'thread_id',
                code: 'not_found'
            }
        });
        return;
    }

    const run = runs.find(r => r.id === run_id && r.thread_id === thread_id);
    if (!run) {
        res.status(404).json({
            error: {
                message: 'No run found with that ID.',
                type: 'invalid_request_error',
                param: 'run_id',
                code: 'not_found'
            }
        });
        return;
    }

    if (run.status !== 'requires_action') {
        res.status(400).json({
            error: {
                message: 'Run is not in a state that requires action.',
                type: 'invalid_request_error',
                code: 'invalid_request'
            }
        });
        return;
    }

    if (!tool_outputs || !Array.isArray(tool_outputs)) {
        res.status(400).json({
            error: {
                message: 'Missing required field: tool_outputs must be an array.',
                type: 'invalid_request_error',
                code: 'missing_required_parameter'
            }
        });
        return;
    }

    // Process tool outputs (simplified for demo)
    run.status = 'in_progress';
    run.required_action = null;

    // Simulate completion after processing tool outputs
    setTimeout(() => {
        run.status = 'completed';
        run.completed_at = Math.floor(Date.now() / 1000);
    }, 500);

    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ object: 'thread.run', data: run })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    } else {
        res.json(run);
    }
};
