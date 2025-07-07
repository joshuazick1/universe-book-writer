/**
 * OpenAI API models handlers
 * Handles /v1/models and related model endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import {
    handleCompatibilityError,
    sendErrorResponse,
    getOrchestrator,
    getCachedTags
} from '../shared/index.js';
import type { AIModelInfo } from '../shared/index.js';

/**
 * GET /v1/models - List available models
 */
export async function handleListModels(req: Request, res: Response): Promise<void> {
    try {
        const orchestrator = await getOrchestrator(req);
        const tags = await orchestrator.getCachedTags();

        const models: AIModelInfo[] = [];

        for (const [modelName, tagArray] of Object.entries(tags)) {
            if (!Array.isArray(tagArray) || tagArray.length === 0) continue;

            // Extract creation time from the first tag
            const firstTag = tagArray[0];
            const created = firstTag?.modified_at ?
                Math.floor(new Date(firstTag.modified_at).getTime() / 1000) :
                Math.floor(Date.now() / 1000);

            models.push({
                id: modelName,
                object: 'model',
                created,
                owned_by: 'local',
                permission: [{
                    id: `modelperm-${modelName}`,
                    object: 'model_permission',
                    created,
                    allow_create_engine: false,
                    allow_sampling: true,
                    allow_logprobs: true,
                    allow_search_indices: false,
                    allow_view: true,
                    allow_fine_tuning: false,
                    organization: '*',
                    group: null,
                    is_blocking: false
                }],
                root: modelName,
                parent: undefined
            });
        }

        res.status(200).json({
            object: 'list',
            data: models
        });
    } catch (error) {
        handleCompatibilityError(res, error, 'Failed to list models');
    }
}

/**
 * GET /v1/models/{model} - Retrieve specific model information
 */
export async function handleGetModel(req: Request, res: Response): Promise<void> {
    try {
        const { model } = req.params;

        if (!model) {
            sendErrorResponse(res, 400, 'model parameter is required', 'invalid_request_error');
            return;
        }

        const orchestrator = await getOrchestrator(req);
        const tags = await orchestrator.getCachedTags();
        const tagArr = tags[model];

        if (!tagArr || tagArr.length === 0) {
            sendErrorResponse(res, 404, `The model '${model}' does not exist`, 'not_found_error', 'model_not_found');
            return;
        }

        const firstTag = tagArr[0];
        const created = firstTag?.modified_at ?
            Math.floor(new Date(firstTag.modified_at).getTime() / 1000) :
            Math.floor(Date.now() / 1000);

        const modelInfo: AIModelInfo = {
            id: model,
            object: 'model',
            created,
            owned_by: 'local',
            permission: [{
                id: `modelperm-${model}`,
                object: 'model_permission',
                created,
                allow_create_engine: false,
                allow_sampling: true,
                allow_logprobs: true,
                allow_search_indices: false,
                allow_view: true,
                allow_fine_tuning: false,
                organization: '*',
                group: null,
                is_blocking: false
            }],
            root: model,
            parent: undefined
        };

        res.status(200).json(modelInfo);
    } catch (error) {
        handleCompatibilityError(res, error, 'Failed to get model info');
    }
}
