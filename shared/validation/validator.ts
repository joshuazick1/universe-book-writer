/**
 * Express middleware to validate character memory payload.
 * Responds with 400 if payload is missing or invalid.
 */
import type { Request, Response, NextFunction } from 'express';
export function validateCharacterMemory(req: Request, res: Response, next: NextFunction): void {
    const memory = req.body;
    if (!memory || typeof memory !== 'object' || !memory.content || typeof memory.content !== 'string') {
        res.status(400).json({ error: 'Invalid or missing character memory payload.' });
        return;
    }
    next();
}

/**
 * Express middleware to validate gap-filling request payload.
 */
export function validateGapFillingRequest(req: Request, res: Response, next: NextFunction): void {
    const { gapType, details } = req.body;
    if (!gapType || typeof gapType !== 'string' || !details || typeof details !== 'string') {
        res.status(400).json({ error: 'Invalid or missing gap-filling request payload.' });
        return;
    }
    next();
}

/**
 * Express middleware to validate gap-filling approval payload.
 */
export function validateGapFillingApproval(req: Request, res: Response, next: NextFunction): void {
    const { approval } = req.body;
    if (typeof approval !== 'boolean') {
        res.status(400).json({ error: 'Invalid or missing approval value.' });
        return;
    }
    next();
}

/**
 * Express middleware to validate RAG code ingestion payload.
 */
export function validateRagCodeIngestion(req: Request, res: Response, next: NextFunction): void {
    const { code, language } = req.body;
    if (!code || typeof code !== 'string' || !language || typeof language !== 'string') {
        res.status(400).json({ error: 'Invalid or missing code ingestion payload.' });
        return;
    }
    next();
}

/**
 * Express middleware to validate RAG text ingestion payload.
 */
export function validateRagTextIngestion(req: Request, res: Response, next: NextFunction): void {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Invalid or missing text ingestion payload.' });
        return;
    }
    next();
}
/**
 * Express middleware to validate characterId route param.
 * Responds with 400 if characterId is missing or invalid.
 * @example
 * import { validateCharacterId } from 'shared/validation/validator';
 * router.get('/character/:characterId', validateCharacterId, handler);
 */
export function validateCharacterId(req: Request, res: Response, next: NextFunction): void {
    const { characterId } = req.params;
    if (!characterId || typeof characterId !== 'string' || characterId.trim().length === 0) {
        res.status(400).json({ error: 'Invalid or missing characterId parameter.' });
        return;
    }
    next();
}
/**
 * @fileoverview Shared validation service for input and schema validation.
 * @module shared/validation/validator
 *
 * Provides validate and isValid helpers for objects and types.
 *
 * @example
 * import { validate } from 'shared/validation/validator';
 * const result = validate(myObject, mySchema);
 */

export function validate<T extends Record<string, unknown>>(obj: T, schema: Record<string, (value: unknown) => boolean>): boolean {
    for (const key in schema) {
        if (!schema[key](obj[key])) return false;
    }
    return true;
}

export function isValid<T extends Record<string, unknown>>(obj: T, schema: Record<string, (value: unknown) => boolean>): boolean {
    return validate(obj, schema);
}
