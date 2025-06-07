import { z } from 'zod';
import { BaseEntitySchema, BaseValidator } from './index.js';
/**
 * Character schema for validation
 */
export const CharacterSchema = BaseEntitySchema.extend({
    name: z.string().min(1).max(100),
    description: z.string().max(2000),
    attributes: z.record(z.unknown()),
});
/**
 * Story chapter schema
 */
export const StoryChapterSchema = BaseEntitySchema.extend({
    title: z.string().min(1).max(200),
    content: z.string(),
    characters: z.array(z.string()), // Character IDs
    metadata: z.record(z.unknown()),
});
/**
 * Story schema for validation
 */
const storyCreationSchema = z.object({
    title: z.string().min(1).max(200),
    summary: z.string().max(2000),
    chapters: z.array(StoryChapterSchema),
    characters: z.array(CharacterSchema),
});
export const StorySchema = BaseEntitySchema.extend({ ...storyCreationSchema.shape });
/**
 * Story validator implementation
 */
export class StoryValidator extends BaseValidator {
    constructor() {
        super(StorySchema);
    }
}
/**
 * Character validator implementation
 */
export class CharacterValidator extends BaseValidator {
    constructor() {
        super(CharacterSchema);
    }
}
/**
 * Chapter validator implementation
 */
export class ChapterValidator extends BaseValidator {
    constructor() {
        super(StoryChapterSchema);
    }
}
//# sourceMappingURL=story.js.map