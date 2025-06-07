import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { UniverseSchema, LocationSchema, TimelineSchema, UniverseValidator } from '../validation/universe.js';
import { ValidationError } from '../validation/index.js';

describe('Universe Validation', () => {
  describe('Location Schema', () => {
    const validLocation = {
      id: '123',
      name: 'Test Location',
      description: 'A test location',
      coordinates: { x: 1, y: 2 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a valid location', () => {
      const result = LocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it('should reject invalid location data', () => {
      const testCases = [
        {
          data: { ...validLocation, name: '' },
          error: 'Empty name not allowed'
        },
        {
          data: { ...validLocation, name: 'A'.repeat(101) },
          error: 'Name too long'
        },
        {
          data: { ...validLocation, description: 'A'.repeat(2001) },
          error: 'Description too long'
        }
      ];

      for (const testCase of testCases) {
        const result = LocationSchema.safeParse(testCase.data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(testCase.error);
        }
      }
    });
  });

  describe('Timeline Schema', () => {
    const validEvent = {
      id: '1',
      date: '2025-01-01',
      description: 'Event 1',
    };

    const validTimeline = {
      id: '123',
      name: 'Test Timeline',
      events: [validEvent],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a valid timeline', () => {
      const result = TimelineSchema.safeParse(validTimeline);
      expect(result.success).toBe(true);
    });

    it('should reject invalid timeline data', () => {
      const testCases = [
        {
          data: { 
            ...validTimeline,
            name: ''
          },
          error: 'Empty name not allowed'
        },
        {
          data: {
            ...validTimeline,
            events: []
          },
          error: 'Must have at least one event'
        }
      ];

      for (const testCase of testCases) {
        const result = TimelineSchema.safeParse(testCase.data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe(testCase.error);
        }
      }
    });
  });

  describe('Universe Schema and Validator', () => {
    const validLocation = {
      id: '123',
      name: 'Test Location',
      description: 'A test location',
      coordinates: { x: 1, y: 2 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validTimeline = {
      id: '123',
      name: 'Test Timeline',
      events: [{
        id: '1',
        date: '2025-01-01',
        description: 'Event 1',
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validUniverse = {
      id: '123',
      name: 'Test Universe',
      description: 'A test universe',
      locations: [validLocation],
      timelines: [validTimeline],
      metadata: { key: 'value' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a complete valid universe', () => {
      const validator = new UniverseValidator();
      expect(() => validator.validate(validUniverse)).not.toThrow();
    });

    it('should validate partial universe updates', () => {
      const validPartialUpdate = {
        name: 'Updated Universe',
        metadata: { status: 'updated' }
      };

      const validator = new UniverseValidator();
      expect(() => validator.validatePartial(validPartialUpdate)).not.toThrow();
    });

    it('should reject invalid universe data with proper errors', () => {
      const testCases = [
        {
          data: { 
            ...validUniverse,
            name: 'A'.repeat(101)
          },
          error: 'Name too long'
        },
        {
          data: {
            ...validUniverse,
            description: 'A'.repeat(2001)
          },
          error: 'Description too long'
        },
        {
          data: {
            ...validUniverse,
            locations: [{ 
              ...validLocation,
              name: ''
            }]
          },
          error: 'Empty name not allowed'
        }
      ];

      const validator = new UniverseValidator();
      
      for (const testCase of testCases) {
        try {
          validator.validate(testCase.data);
          throw new Error('Expected validation to fail');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const zodError = (error as ValidationError).errors;
          expect(zodError.errors[0].message).toBe(testCase.error);
        }
      }
    });
  });
});
