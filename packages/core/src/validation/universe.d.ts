import { z } from 'zod';
import type { Universe } from '../domains/universe/index.js';
import { BaseValidator } from './index.js';
/**
 * Location schema for universe validation
 */
export declare const LocationSchema: z.ZodObject<
  {
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    name: z.ZodString;
    description: z.ZodString;
    coordinates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    metadata?: Record<string, unknown> | undefined;
    coordinates?: Record<string, number> | undefined;
  },
  {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    metadata?: Record<string, unknown> | undefined;
    coordinates?: Record<string, number> | undefined;
  }
>;
/**
 * Timeline event schema
 */
export declare const TimelineEventSchema: z.ZodObject<
  {
    id: z.ZodString;
    date: z.ZodString;
    description: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    description: string;
    date: string;
  },
  {
    id: string;
    description: string;
    date: string;
  }
>;
/**
 * Timeline schema
 */
export declare const TimelineSchema: z.ZodObject<
  {
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    name: z.ZodString;
    events: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          date: z.ZodString;
          description: z.ZodString;
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string;
          description: string;
          date: string;
        },
        {
          id: string;
          description: string;
          date: string;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    events: {
      id: string;
      description: string;
      date: string;
    }[];
    id: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown> | undefined;
  },
  {
    name: string;
    events: {
      id: string;
      description: string;
      date: string;
    }[];
    id: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown> | undefined;
  }
>;
export declare const UniverseSchema: z.ZodObject<
  {
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    name: z.ZodString;
    description: z.ZodString;
    locations: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          createdAt: z.ZodDate;
          updatedAt: z.ZodDate;
          metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        } & {
          name: z.ZodString;
          description: z.ZodString;
          coordinates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          description: string;
          metadata?: Record<string, unknown> | undefined;
          coordinates?: Record<string, number> | undefined;
        },
        {
          name: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          description: string;
          metadata?: Record<string, unknown> | undefined;
          coordinates?: Record<string, number> | undefined;
        }
      >,
      'many'
    >;
    timelines: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          createdAt: z.ZodDate;
          updatedAt: z.ZodDate;
          metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        } & {
          name: z.ZodString;
          events: z.ZodArray<
            z.ZodObject<
              {
                id: z.ZodString;
                date: z.ZodString;
                description: z.ZodString;
              },
              'strip',
              z.ZodTypeAny,
              {
                id: string;
                description: string;
                date: string;
              },
              {
                id: string;
                description: string;
                date: string;
              }
            >,
            'many'
          >;
        },
        'strip',
        z.ZodTypeAny,
        {
          name: string;
          events: {
            id: string;
            description: string;
            date: string;
          }[];
          id: string;
          createdAt: Date;
          updatedAt: Date;
          metadata?: Record<string, unknown> | undefined;
        },
        {
          name: string;
          events: {
            id: string;
            description: string;
            date: string;
          }[];
          id: string;
          createdAt: Date;
          updatedAt: Date;
          metadata?: Record<string, unknown> | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    locations: {
      name: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      description: string;
      metadata?: Record<string, unknown> | undefined;
      coordinates?: Record<string, number> | undefined;
    }[];
    timelines: {
      name: string;
      events: {
        id: string;
        description: string;
        date: string;
      }[];
      id: string;
      createdAt: Date;
      updatedAt: Date;
      metadata?: Record<string, unknown> | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
  },
  {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    locations: {
      name: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      description: string;
      metadata?: Record<string, unknown> | undefined;
      coordinates?: Record<string, number> | undefined;
    }[];
    timelines: {
      name: string;
      events: {
        id: string;
        description: string;
        date: string;
      }[];
      id: string;
      createdAt: Date;
      updatedAt: Date;
      metadata?: Record<string, unknown> | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
  }
>;
/**
 * Universe validator implementation
 */
export declare class UniverseValidator extends BaseValidator<Universe> {
  constructor();
}
//# sourceMappingURL=universe.d.ts.map
