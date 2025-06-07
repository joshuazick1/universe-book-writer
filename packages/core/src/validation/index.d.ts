import { z } from 'zod';
import { BaseEntity } from '../shared/index.js';
/**
 * Base schema for entities with common fields
 */
export declare const BaseEntitySchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    metadata?: Record<string, unknown> | undefined;
}>;
/**
 * Error handling utilities for validation
 */
export declare class ValidationError extends Error {
    errors: z.ZodError;
    constructor(errors: z.ZodError);
}
/**
 * Base validator class that can be extended for specific domains
 */
export declare abstract class BaseValidator<T extends BaseEntity> {
    protected schema: z.ZodObject<any>;
    constructor(schema: z.ZodObject<any>);
    validate(data: unknown): T;
    validatePartial(data: unknown): Partial<T>;
}
//# sourceMappingURL=index.d.ts.map