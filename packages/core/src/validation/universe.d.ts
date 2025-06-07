import { z } from 'zod';
import { BaseValidator } from './index.js';
import type { Universe } from '../domains/universe/index.js';
/**
 * Location schema for universe validation
 */
export declare const LocationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    name: z.ZodString;
    description: z.ZodString;
    coordinates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    id: string;
    metadata?: Record<string, unknown> | undefined;
    coordinates?: Record<string, number> | undefined;
}, {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    id: string;
    metadata?: Record<string, unknown> | undefined;
    coordinates?: Record<string, number> | undefined;
}>;
/**
 * Timeline event schema
 */
export declare const TimelineEventSchema: z.ZodObject<{
    id: z.ZodString;
    date: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    description: string;
    id: string;
}, {
    date: string;
    description: string;
    id: string;
}>;
/**
 * Timeline schema
 */
export declare const TimelineSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    name: z.ZodString;
    events: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        date: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        date: string;
        description: string;
        id: string;
    }, {
        date: string;
        description: string;
        id: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    createdAt: Date;
    updatedAt: Date;
    events: {
        date: string;
        description: string;
        id: string;
    }[];
    id: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    name: string;
    createdAt: Date;
    updatedAt: Date;
    events: {
        date: string;
        description: string;
        id: string;
    }[];
    id: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const UniverseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    name: z.ZodString;
    description: z.ZodString;
    locations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    } & {
        name: z.ZodString;
        description: z.ZodString;
        coordinates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        coordinates?: Record<string, number> | undefined;
    }, {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        coordinates?: Record<string, number> | undefined;
    }>, "many">;
    timelines: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    } & {
        name: z.ZodString;
        events: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodString;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            id: string;
        }, {
            date: string;
            description: string;
            id: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        createdAt: Date;
        updatedAt: Date;
        events: {
            date: string;
            description: string;
            id: string;
        }[];
        id: string;
        metadata?: Record<string, unknown> | undefined;
    }, {
        name: string;
        createdAt: Date;
        updatedAt: Date;
        events: {
            date: string;
            description: string;
            id: string;
        }[];
        id: string;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    id: string;
    locations: {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        coordinates?: Record<string, number> | undefined;
    }[];
    timelines: {
        name: string;
        createdAt: Date;
        updatedAt: Date;
        events: {
            date: string;
            description: string;
            id: string;
        }[];
        id: string;
        metadata?: Record<string, unknown> | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
}, {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    id: string;
    locations: {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        metadata?: Record<string, unknown> | undefined;
        coordinates?: Record<string, number> | undefined;
    }[];
    timelines: {
        name: string;
        createdAt: Date;
        updatedAt: Date;
        events: {
            date: string;
            description: string;
            id: string;
        }[];
        id: string;
        metadata?: Record<string, unknown> | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
}>;
/**
 * Universe validator implementation
 */
export declare class UniverseValidator extends BaseValidator<Universe> {
    constructor();
}
//# sourceMappingURL=universe.d.ts.map