import { z } from 'zod';
import type { Character, Story, StoryChapter } from '../domains/story/index.js';
import { BaseValidator } from './index.js';
/**
 * Character schema for validation
 */
export declare const CharacterSchema: z.ZodObject<
  {
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    name: z.ZodString;
    description: z.ZodString;
    attributes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    attributes: Record<string, unknown>;
    metadata?: Record<string, unknown> | undefined;
  },
  {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    attributes: Record<string, unknown>;
    metadata?: Record<string, unknown> | undefined;
  }
>;
/**
 * Story chapter schema
 */
export declare const StoryChapterSchema: z.ZodObject<
  {
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  } & {
    title: z.ZodString;
    content: z.ZodString;
    characters: z.ZodArray<z.ZodString, 'many'>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    characters: string[];
    title: string;
    content: string;
  },
  {
    id: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    characters: string[];
    title: string;
    content: string;
  }
>;
export declare const StorySchema: z.ZodObject<
  {
    id: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  } & {
    title: z.ZodString;
    summary: z.ZodString;
    chapters: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          createdAt: z.ZodDate;
          updatedAt: z.ZodDate;
        } & {
          title: z.ZodString;
          content: z.ZodString;
          characters: z.ZodArray<z.ZodString, 'many'>;
          metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string;
          metadata: Record<string, unknown>;
          createdAt: Date;
          updatedAt: Date;
          characters: string[];
          title: string;
          content: string;
        },
        {
          id: string;
          metadata: Record<string, unknown>;
          createdAt: Date;
          updatedAt: Date;
          characters: string[];
          title: string;
          content: string;
        }
      >,
      'many'
    >;
    characters: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          createdAt: z.ZodDate;
          updatedAt: z.ZodDate;
          metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        } & {
          name: z.ZodString;
          description: z.ZodString;
          attributes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string;
          name: string;
          description: string;
          createdAt: Date;
          updatedAt: Date;
          attributes: Record<string, unknown>;
          metadata?: Record<string, unknown> | undefined;
        },
        {
          id: string;
          name: string;
          description: string;
          createdAt: Date;
          updatedAt: Date;
          attributes: Record<string, unknown>;
          metadata?: Record<string, unknown> | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    characters: {
      id: string;
      name: string;
      description: string;
      createdAt: Date;
      updatedAt: Date;
      attributes: Record<string, unknown>;
      metadata?: Record<string, unknown> | undefined;
    }[];
    title: string;
    summary: string;
    chapters: {
      id: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      characters: string[];
      title: string;
      content: string;
    }[];
    metadata?: Record<string, unknown> | undefined;
  },
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    characters: {
      id: string;
      name: string;
      description: string;
      createdAt: Date;
      updatedAt: Date;
      attributes: Record<string, unknown>;
      metadata?: Record<string, unknown> | undefined;
    }[];
    title: string;
    summary: string;
    chapters: {
      id: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      characters: string[];
      title: string;
      content: string;
    }[];
    metadata?: Record<string, unknown> | undefined;
  }
>;
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
