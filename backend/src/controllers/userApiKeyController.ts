import { Request, Response } from 'express';
import { apiKeyService } from '../services/database/apiKeyService.js';

export function listApiKeys(req: Request, res: Response) {
    (async () => {
        const userId = (req as any).apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const keys = await apiKeyService.listApiKeys(userId);
        res.json(keys);
    })().catch(err => res.status(500).json({ error: err.message }));
}

export function createApiKey(req: Request, res: Response) {
    (async () => {
        const userId = (req as any).apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { scopes = [] } = req.body;
        const key = await apiKeyService.createApiKey(userId, scopes);
        res.json(key);
    })().catch(err => res.status(500).json({ error: err.message }));
}

export function revokeApiKey(req: Request, res: Response) {
    (async () => {
        const userId = (req as any).apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { key } = req.params;
        await apiKeyService.revokeApiKey(userId, key);
        res.status(204).send();
    })().catch(err => res.status(500).json({ error: err.message }));
}
