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

    // Ensure all required fields are present and not undefined
    for (const field of REQUIRED_FIELDS) {
        if (field === 'details') {
            if (!isTagObject(merged[field])) {
                merged[field] = {};
            }
        } else if (merged[field] === undefined) {
            merged[field] = null;
        }
    }
    // Always set model to modelKey if missing or null
    if (merged.model === null || merged.model === undefined) {
        merged.model = modelKey;
    }
    return merged;
}


router.get('/', async (req, res) => {
    const orchestrator = res.req?.app?.locals?.orchestrator || getOrchestratorInstance();
    // Targeted debug output
    // eslint-disable-next-line no-console
    console.log('[tags] GET /api/tags - START');
    // eslint-disable-next-line no-console
    console.log('[tags] orchestrator instance:', !!orchestrator);
    // eslint-disable-next-line no-console
    console.log('[tags] orchestrator servers count:', orchestrator.getServers().length);
    // eslint-disable-next-line no-console
    console.log('[tags] orchestrator servers:', JSON.stringify(orchestrator.getServers(), null, 2));

    const allTags = await orchestrator.getCachedTags();
    // eslint-disable-next-line no-console
    console.log('[tags] allTags:', allTags);
    const tagList = Object.entries(allTags).flatMap(([modelKey, tagsArr]) => {
        if (!Array.isArray(tagsArr) || tagsArr.length === 0) return [];
        // Filter out empty/invalid tags, but keep those with at least a model or name
        const validTags = tagsArr.filter(t => {
            if (!t || typeof t !== 'object') return false;
            return t.model != null || t.name != null;
        });
        if (validTags.length === 0) return [];
        // Always include the merged tag, even if all fields are null except model
        // eslint-disable-next-line no-console
        console.log('[tags] modelKey:', modelKey, 'tagsArr:', tagsArr);
        const merged = mergeTags(validTags, modelKey);
        // Only include if merged.model is defined (should always be true)
        if (merged.model == null) return [];
        return [merged];
    });
    // eslint-disable-next-line no-console
    console.log('[tags] tagList:', tagList);
    res.status(200).json({ models: tagList });
});

export default router;
