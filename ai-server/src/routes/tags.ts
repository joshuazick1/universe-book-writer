
import { Router } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

const router = Router();

const REQUIRED_FIELDS = ['name', 'model', 'modified_at', 'size', 'digest', 'details'] as const;
type TagField = typeof REQUIRED_FIELDS[number];

function isTagObject(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
}


function mergeTags(tagsArr: unknown[], modelKey: string): Record<string, unknown> {
    const allKeys = new Set<string>();
    for (const t of tagsArr) {
        if (isTagObject(t)) {
            Object.keys(t).forEach(k => allKeys.add(k));
        }
    }

    const merged: Record<string, unknown> = {};
    for (const t of tagsArr) {
        if (!isTagObject(t)) {
            // Optionally log invalid tag
            // console.debug(`Skipping invalid tag for model ${modelKey}:`, t);
            continue;
        }
        for (const key of Object.keys(t)) {
            if (key === 'details') {
                if (isTagObject(t.details)) {
                    merged.details = { ...(merged.details as object || {}), ...t.details };
                }
            } else if (merged[key] === undefined && t[key] !== undefined) {
                merged[key] = t[key];
            }
        }
    }

    // Ensure all required fields and all keys are present and not undefined
    for (const field of new Set([...allKeys, ...REQUIRED_FIELDS])) {
        if (field === 'details') {
            if (!isTagObject(merged[field])) {
                merged[field] = {};
            }
        } else if (merged[field] === undefined) {
            merged[field] = null;
        }
    }

    // If model is missing, set it to the group key
    if (merged.model === null || merged.model === undefined) {
        merged.model = modelKey;
    }

    return merged;
}


router.get('/', async (_req, res) => {
    const orchestrator = getOrchestratorInstance();
    const allTags = await orchestrator.getCachedTags();
    const tagList = Object.entries(allTags).flatMap(([modelKey, tagsArr]) => {
        if (!Array.isArray(tagsArr) || tagsArr.length === 0) return [];
        return [mergeTags(tagsArr, modelKey)];
    });
    res.status(200).json({ models: tagList });
});

export default router;
