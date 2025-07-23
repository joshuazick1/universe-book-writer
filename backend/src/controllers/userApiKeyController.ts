import { Request, Response } from 'express';
import { apiKeyService } from '../../../shared/database/apiKeyService.js';


export function listApiKeys(req: Request, res: Response) {
    (async () => {
        const userId = (req as any).apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const keys = (await apiKeyService.listKeys()).filter(k => k.userId === userId);
        res.json(keys);
    })().catch(err => res.status(500).json({ error: err.message }));
}


import { randomBytes } from 'crypto';

export function createApiKey(req: Request, res: Response) {
    (async () => {
        const userId = (req as any).apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        // Scopes are not used in the shared service, but keep for compatibility
        const { scopes = [] } = req.body;
        const key = randomBytes(32).toString('hex');
        const record = {
            key,
            userId,
            createdAt: new Date().toISOString(),
            scopes,
        };
        await apiKeyService.addKey(record);
        res.json(record);
    })().catch(err => res.status(500).json({ error: err.message }));
}


export function revokeApiKey(req: Request, res: Response) {
    (async () => {
        const userId = (req as any).apiUser?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const { key } = req.params;
        // Only allow revocation if the key belongs to the user
        const keys = (await apiKeyService.listKeys()).filter(k => k.userId === userId);
        if (!keys.find(k => k.key === key)) {
            return res.status(404).json({ error: 'API key not found for user' });
        }
        await apiKeyService.revokeKey(key);
        res.status(204).send();
    })().catch(err => res.status(500).json({ error: err.message }));
}
