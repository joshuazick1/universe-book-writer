/**
 * OpenAI Compatibility: /v1/assistants endpoint
 *
 * GET /v1/assistants - List assistants
 * POST /v1/assistants - Create an assistant
 * GET /v1/assistants/{assistant_id} - Retrieve assistant
 * DELETE /v1/assistants/{assistant_id} - Delete assistant
 * POST /v1/assistants/{assistant_id} - Modify assistant
 *
 * Request (POST): {
 *   model: string,
 *   name?: string,
 *   description?: string,
 *   instructions?: string,
 *   tools?: [{ type: 'code_interpreter' | 'retrieval' | 'function', function?: object }],
 *   file_ids?: string[],
 *   metadata?: object
 * }
 *
 * Response: {
 *   id: string,
 *   object: 'assistant',
 *   created_at: number,
 *   name: string,
 *   description: string,
 *   model: string,
 *   instructions: string,
 *   tools: object[],
 *   file_ids: string[],
 *   metadata: object
 * }
 */
import { Request, Response, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../shared/logging/logger.js';

// In-memory assistant store (in production, use a database)
interface AssistantRecord {
    id: string;
    object: 'assistant';
    created_at: number;
    name: string | null;
    description: string | null;
    model: string;
    instructions: string | null;
    tools: any[];
    file_ids: string[];
    metadata: Record<string, any>;
}

const assistants = new Map<string, AssistantRecord>();

export const openaiListAssistantsHandler: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { limit = 20, order = 'desc', after, before } = req.query;

        let assistantsList = Array.from(assistants.values());

        // Sort by created_at
        assistantsList.sort((a, b) => {
            return order === 'desc' ? b.created_at - a.created_at : a.created_at - b.created_at;
        });

        // Apply pagination
        if (after) {
            const afterAssistant = assistants.get(after as string);
            if (afterAssistant) {
                const afterIndex = assistantsList.findIndex(a => a.id === after);
                if (afterIndex >= 0) {
                    assistantsList = assistantsList.slice(afterIndex + 1);
                }
            }
        }

        if (before) {
            const beforeAssistant = assistants.get(before as string);
            if (beforeAssistant) {
                const beforeIndex = assistantsList.findIndex(a => a.id === before);
                if (beforeIndex >= 0) {
                    assistantsList = assistantsList.slice(0, beforeIndex);
                }
            }
        }

        // Apply limit
        const limitNum = parseInt(limit as string, 10);
        if (limitNum > 0) {
            assistantsList = assistantsList.slice(0, limitNum);
        }

        res.json({
            object: 'list',
            data: assistantsList,
            first_id: assistantsList.length > 0 ? assistantsList[0].id : null,
            last_id: assistantsList.length > 0 ? assistantsList[assistantsList.length - 1].id : null,
            has_more: false, // Simple implementation - always false
        });
    } catch (error) {
        logger.error(`Error listing assistants: ${error}`);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                code: 'internal_error',
            },
        });
    }
};

export const openaiCreateAssistantHandler: RequestHandler = async (req, res): Promise<void> => {
    try {
        const {
            model,
            name = null,
            description = null,
            instructions = null,
            tools = [],
            file_ids = [],
            metadata = {}
        } = req.body;

        if (!model) {
            res.status(400).json({
                error: {
                    message: 'Model is required',
                    type: 'invalid_request_error',
                    code: 'missing_model',
                },
            });
            return;
        }

        // Validate tools
        const validToolTypes = ['code_interpreter', 'retrieval', 'function'];
        for (const tool of tools) {
            if (!tool.type || !validToolTypes.includes(tool.type)) {
                res.status(400).json({
                    error: {
                        message: `Invalid tool type. Must be one of: ${validToolTypes.join(', ')}`,
                        type: 'invalid_request_error',
                        code: 'invalid_tool_type',
                    },
                });
                return;
            }

            if (tool.type === 'function' && !tool.function) {
                res.status(400).json({
                    error: {
                        message: 'Function tool requires function definition',
                        type: 'invalid_request_error',
                        code: 'missing_function',
                    },
                });
                return;
            }
        }

        const assistantId = 'asst_' + uuidv4().replace(/-/g, '');
        const created_at = Math.floor(Date.now() / 1000);

        const assistant: AssistantRecord = {
            id: assistantId,
            object: 'assistant',
            created_at,
            name,
            description,
            model,
            instructions,
            tools,
            file_ids,
            metadata,
        };

        assistants.set(assistantId, assistant);

        res.json(assistant);
    } catch (error) {
        logger.error(`Error creating assistant: ${error}`);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                code: 'internal_error',
            },
        });
    }
};

export const openaiRetrieveAssistantHandler: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { assistant_id } = req.params;

        if (!assistant_id) {
            res.status(400).json({
                error: {
                    message: 'Assistant ID is required',
                    type: 'invalid_request_error',
                    code: 'missing_assistant_id',
                },
            });
            return;
        }

        const assistant = assistants.get(assistant_id);

        if (!assistant) {
            res.status(404).json({
                error: {
                    message: 'Assistant not found',
                    type: 'invalid_request_error',
                    code: 'assistant_not_found',
                },
            });
            return;
        }

        res.json(assistant);
    } catch (error) {
        logger.error(`Error retrieving assistant: ${error}`);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                code: 'internal_error',
            },
        });
    }
};

export const openaiDeleteAssistantHandler: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { assistant_id } = req.params;

        if (!assistant_id) {
            res.status(400).json({
                error: {
                    message: 'Assistant ID is required',
                    type: 'invalid_request_error',
                    code: 'missing_assistant_id',
                },
            });
            return;
        }

        const assistant = assistants.get(assistant_id);

        if (!assistant) {
            res.status(404).json({
                error: {
                    message: 'Assistant not found',
                    type: 'invalid_request_error',
                    code: 'assistant_not_found',
                },
            });
            return;
        }

        assistants.delete(assistant_id);

        res.json({
            id: assistant_id,
            object: 'assistant.deleted',
            deleted: true,
        });
    } catch (error) {
        logger.error(`Error deleting assistant: ${error}`);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                code: 'internal_error',
            },
        });
    }
};
