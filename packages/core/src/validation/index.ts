import { z } from 'zod';
import type { BaseEntity } from '../shared/index.js';

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
  constructor(public errors: z.ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

/**
 * Base validator class that can be extended for specific domains
 */
export abstract class BaseValidator<T extends BaseEntity> {
  constructor(protected schema: z.ZodObject<any>) {}

  validate(data: unknown): T {
    try {
      return this.schema.parse(data) as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }
  }

  validatePartial(data: unknown): Partial<T> {
    try {
      return this.schema.partial().parse(data) as Partial<T>;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }
  }
}
