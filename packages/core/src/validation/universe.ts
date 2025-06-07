import { z } from 'zod';
import type { Universe } from '../domains/universe/index.js';
import { BaseEntitySchema, BaseValidator } from './index.js';

/**
 * Location schema for universe validation
 */
export const LocationSchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Empty name not allowed').max(100, 'Name too long'),
  description: z.string().max(2000, 'Description too long'),
  coordinates: z.record(z.number()).optional(),
});

/**
 * Timeline event schema
 */
export const TimelineEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string().max(2000, 'Event description too long'),
});

/**
 * Timeline schema
 */
export const TimelineSchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Empty name not allowed').max(100, 'Name too long'),
  events: z.array(TimelineEventSchema).min(1, 'Must have at least one event'),
});

/**
 * Universe schema for validation
 */
const creationSchema = z.object({
  name: z.string().min(1, 'Empty name not allowed').max(100, 'Name too long'),
  description: z.string().max(2000, 'Description too long'),
  locations: z.array(LocationSchema),
  timelines: z.array(TimelineSchema),
});

export const UniverseSchema = BaseEntitySchema.extend({ ...creationSchema.shape });

/**
 * Universe validator implementation
 */
export class UniverseValidator extends BaseValidator<Universe> {
  constructor() {
    super(UniverseSchema);
  }
}
