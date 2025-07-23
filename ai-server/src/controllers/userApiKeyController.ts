import { Request, Response } from 'express';
import { ApiKeyService } from '../services/database/apiKeyService.js';

const apiKeyService = new ApiKeyService();

/**
 * Create a new API key for the authenticated user.
 * Returns the full key only once.
 */
export function createApiKey(req: Request, res: Response, next: (err?: any) => void) {
    (async () => {
        const userId = req.apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const scopes = Array.isArray(req.body.scopes) ? req.body.scopes : [];
        const { key, record } = await apiKeyService.createKey(userId, scopes);
        res.status(201).json({ key, createdAt: record.createdAt, scopes: record.scopes });
    })().catch(next);
}

/**
 * List all API key metadata for the authenticated user.
 */
export function listApiKeys(req: Request, res: Response, next: (err?: any) => void) {
    (async () => {
        const userId = req.apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const keys = await apiKeyService.listKeysForUser(userId);
        res.json(keys);
    })().catch(next);
}

/**
 * Revoke an API key for the authenticated user.
 */
export function revokeApiKey(req: Request, res: Response, next: (err?: any) => void) {
    (async () => {
        const userId = req.apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { key } = req.params;
        if (!key) return res.status(400).json({ error: 'Missing key' });
        const success = await apiKeyService.revokeKey(key, userId);
        if (!success) return res.status(404).json({ error: 'API key not found or not owned by user' });
        res.json({ revoked: true });
    })().catch(next);
}
