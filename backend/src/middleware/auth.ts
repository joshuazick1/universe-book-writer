import { Request, Response, NextFunction } from 'express';

// Dummy middleware for demo; replace with real JWT/API key validation
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // In production, extract user from JWT or API key
    // For now, mock user for all requests
    (req as any).apiUser = { id: 'demo-user' };
    next();
}
