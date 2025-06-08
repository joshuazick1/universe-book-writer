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
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    attributes: Record<string, unknown>;
    metadata?: Record<string, unknown> | undefined;
  },
  {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
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
    characters: string[];
    title: string;
    content: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
  },
  {
    characters: string[];
    title: string;
    content: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
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
          characters: string[];
          title: string;
          content: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          metadata: Record<string, unknown>;
        },
        {
          characters: string[];
          title: string;
          content: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          metadata: Record<string, unknown>;
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
          name: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          description: string;
          attributes: Record<string, unknown>;
          metadata?: Record<string, unknown> | undefined;
        },
        {
          name: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          description: string;
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
    characters: {
      name: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      description: string;
      attributes: Record<string, unknown>;
      metadata?: Record<string, unknown> | undefined;
    }[];
    title: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    chapters: {
      characters: string[];
      title: string;
      content: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      metadata: Record<string, unknown>;
    }[];
    metadata?: Record<string, unknown> | undefined;
  },
  {
    characters: {
      name: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      description: string;
      attributes: Record<string, unknown>;
      metadata?: Record<string, unknown> | undefined;
    }[];
    title: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    summary: string;
    chapters: {
      characters: string[];
      title: string;
      content: string;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      metadata: Record<string, unknown>;
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
