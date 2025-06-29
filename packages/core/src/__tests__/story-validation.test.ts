import { describe, expect, it } from '@jest/globals';
import {
  CharacterSchema,
  StoryChapterSchema,
  StorySchema,
  StoryValidator,
  CharacterValidator,
  ChapterValidator
} from '../validation/story.js';

describe('Story Validation', () => {
  describe('Character Schema', () => {
    it('should validate a valid character', () => {
      const validCharacter = {
        id: '123',
        name: 'Test Character',
        description: 'A test character',
        attributes: { strength: 10 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = CharacterSchema.safeParse(validCharacter);
      expect(result.success).toBe(true);
    });

    it('should reject invalid character name', () => {
      const invalidCharacter = {
        id: '123',
        name: '', // Empty name
        description: 'A test character',
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = CharacterSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });
  });

  describe('Chapter Schema', () => {
    it('should validate a valid chapter', () => {
      const validChapter = {
        id: '123',
        title: 'Test Chapter',
        content: 'Chapter content',
        characters: ['char1', 'char2'],
        metadata: { status: 'draft' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = StoryChapterSchema.safeParse(validChapter);
      expect(result.success).toBe(true);
    });
  });

  describe('Story Schema', () => {
    it('should validate a valid story', () => {
      const validStory = {
        id: '123',
        title: 'Test Story',
        summary: 'A test story',
        chapters: [],
        characters: [],
        metadata: { status: 'draft' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = StorySchema.safeParse(validStory);
      expect(result.success).toBe(true);
    });

    it('should reject invalid story data', () => {
      const invalidStory = {
        id: '123',
        title: '', // Empty title
        summary: 'A test story',
        chapters: [],
        characters: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = StorySchema.safeParse(invalidStory);
      expect(result.success).toBe(false);
    });
  });

  describe('Validator Classes', () => {
    it('should create StoryValidator instance', () => {
      const validator = new StoryValidator();
      expect(validator).toBeInstanceOf(StoryValidator);
    });

    it('should create CharacterValidator instance', () => {
      const validator = new CharacterValidator();
      expect(validator).toBeInstanceOf(CharacterValidator);
    });

    it('should create ChapterValidator instance', () => {
      const validator = new ChapterValidator();
      expect(validator).toBeInstanceOf(ChapterValidator);
    });
  });
});
