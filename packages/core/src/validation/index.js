import { z } from 'zod';
/**
 * Base schema for entities with common fields
 */
export const BaseEntitySchema = z.object({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.unknown()).optional(),
});
/**
 * Error handling utilities for validation
 */
export class ValidationError extends Error {
    errors;
    constructor(errors) {
        super('Validation failed');
        this.errors = errors;
        this.name = 'ValidationError';
    }
}
/**
 * Base validator class that can be extended for specific domains
 */
export class BaseValidator {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    validate(data) {
        try {
            return this.schema.parse(data);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(error);
            }
            throw error;
        }
    }
    validatePartial(data) {
        try {
            return this.schema.partial().parse(data);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(error);
            }
            throw error;
        }
    }
}
//# sourceMappingURL=index.js.map