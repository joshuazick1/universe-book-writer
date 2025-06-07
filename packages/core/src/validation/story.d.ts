import { z } from 'zod';
import { BaseValidator } from './index.js';
import type { Story, Character, StoryChapter } from '../domains/story/index.js';
/**
 * Character schema for validation
 */
export declare const CharacterSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    name: z.ZodString;
    description: z.ZodString;
    attributes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    id: string;
    attributes: Record<string, unknown>;
    metadata?: Record<string, unknown> | undefined;
}, {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    id: string;
    attributes: Record<string, unknown>;
    metadata?: Record<string, unknown> | undefined;
}>;
/**
 * Story chapter schema
 */
export declare const StoryChapterSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
} & {
    title: z.ZodString;
    content: z.ZodString;
    characters: z.ZodArray<z.ZodString, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    characters: string[];
    title: string;
    metadata: Record<string, unknown>;
    content: string;
}, {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    characters: string[];
    title: string;
    metadata: Record<string, unknown>;
    content: string;
}>;
export declare const StorySchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    title: z.ZodString;
    summary: z.ZodString;
    chapters: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    } & {
        title: z.ZodString;
        content: z.ZodString;
        characters: z.ZodArray<z.ZodString, "many">;
        metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        characters: string[];
        title: string;
        metadata: Record<string, unknown>;
        content: string;
    }, {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        characters: string[];
        title: string;
        metadata: Record<string, unknown>;
        content: string;
    }>, "many">;
    characters: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    } & {
        name: z.ZodString;
        description: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        attributes: Record<string, unknown>;
        metadata?: Record<string, unknown> | undefined;
    }, {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        attributes: Record<string, unknown>;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    characters: {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        attributes: Record<string, unknown>;
        metadata?: Record<string, unknown> | undefined;
    }[];
    title: string;
    summary: string;
    chapters: {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        characters: string[];
        title: string;
        metadata: Record<string, unknown>;
        content: string;
    }[];
    metadata?: Record<string, unknown> | undefined;
}, {
    createdAt: Date;
    updatedAt: Date;
    id: string;
    characters: {
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        attributes: Record<string, unknown>;
        metadata?: Record<string, unknown> | undefined;
    }[];
    title: string;
    summary: string;
    chapters: {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        characters: string[];
        title: string;
        metadata: Record<string, unknown>;
        content: string;
    }[];
    metadata?: Record<string, unknown> | undefined;
}>;
/**
 * Story validator implementation
 */
export declare class StoryValidator extends BaseValidator<Story> {
    constructor();
}
/**
 * Character validator implementation
 */
export declare class CharacterValidator extends BaseValidator<Character> {
    constructor();
}
/**
 * Chapter validator implementation
 */
export declare class ChapterValidator extends BaseValidator<StoryChapter> {
    constructor();
}
//# sourceMappingURL=story.d.ts.map