import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiKeyService } from '../services/database/apiKeyService.js';
import { getUserById } from '../services/database/userService.js';

/**
 * Extends Express Request to include authenticated user info for API key/JWT auth.
 */
export interface ApiUser {
    readonly id: string;
    readonly email?: string;
    readonly apiKeyId?: string;
    readonly isApiKey: boolean;
}

declare module 'express-serve-static-core' {
    interface Request {
        apiUser?: ApiUser;
    }
}

/**
 * Authentication middleware for JWT or API key (header: x-api-key or Authorization: Bearer ...).
 * Sets req.apiUser if valid, else returns 401.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // Wrap the async logic in a promise to make it compatible with Express
    (async () => {
        const apiKeyHeader = req.header('x-api-key');
        const authHeader = req.header('Authorization');
        let token: string | undefined;

        // API Key authentication
        if (apiKeyHeader) {
            const apiKey = apiKeyHeader.trim();
            // ApiKeyService is a class, so instantiate it
            const apiKeyService = new ApiKeyService();
            const apiKeyMeta = await apiKeyService.findByKey(apiKey);
            if (!apiKeyMeta) {
                return res.status(401).json({ error: 'Invalid API key' });
            }
            req.apiUser = {
                id: apiKeyMeta.userId,
                apiKeyId: apiKeyMeta._id?.toString(),
                isApiKey: true,
            };
            await apiKeyService.updateLastUsedAt(apiKey);
            return next();
        }

        // JWT authentication
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            try {
                const payload = jwt.verify(token, process.env.JWT_SECRET!);
                // Defensive: payload.sub may be undefined or not a string
                const userId = typeof payload === 'object' && payload && typeof payload.sub === 'string' ? payload.sub : undefined;
                if (!userId) {
                    return res.status(401).json({ error: 'Invalid token payload' });
                }
                const user = await getUserById(userId);
                if (!user) {
                    return res.status(401).json({ error: 'Invalid user' });
                }
                req.apiUser = {
                    id: user._id.toString(),
                    email: user.email,
                    isApiKey: false,
                };
                return next();
            } catch (err) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        }

        return res.status(401).json({ error: 'Authentication required' });
    })().catch(next);
}
