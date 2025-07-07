# Core Package Documentation

## Overview

The `@verseforge/core` package provides the foundational business logic, domain models, and shared utilities for the VerseForge application. This package serves as the central hub for type definitions, validation schemas, and core functionality that is used across all other packages and applications.

## Architecture

### Package Structure

```
packages/core/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── models/          # Domain models and entities
│   ├── validation/      # Zod validation schemas
│   ├── utils/           # Shared utility functions
│   ├── constants/       # Application constants
│   ├── errors/          # Custom error classes
│   └── __tests__/       # Unit tests
├── dist/                # Compiled JavaScript output
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # Package documentation
```

### Design Principles

1. **Framework Agnostic**: No dependencies on React, Express, or other framework-specific libraries
2. **Pure Business Logic**: Contains only domain logic without UI or infrastructure concerns
3. **Type Safety**: Comprehensive TypeScript types with strict validation
4. **Validation First**: Zod schemas for runtime validation and type generation
5. **Immutable Data**: Readonly types and immutable data structures where appropriate

## Domain Models

### Base Entity

All domain entities extend the base entity interface for consistent structure and metadata.

```typescript
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly metadata?: Record<string, unknown>;
}

export const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});
```

### Universe Domain

#### Universe Entity

```typescript
export interface Universe extends BaseEntity {
  readonly name: string;
  readonly description: string;
  readonly creatorId: string;
  readonly visibility: 'public' | 'private' | 'shared';
  readonly settings: UniverseSettings;
  readonly locations: readonly Location[];
  readonly timelines: readonly Timeline[];
  readonly tags: readonly string[];
}

export interface UniverseSettings {
  readonly allowCollaboration: boolean;
  readonly defaultLanguage: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly theme?: string;
}

export interface Location {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly coordinates?: Record<string, number>;
  readonly parentLocationId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface Timeline {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly events: readonly TimelineEvent[];
}

export interface TimelineEvent {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly description: string;
  readonly importance: 'low' | 'medium' | 'high' | 'critical';
  readonly participants?: readonly string[];
  readonly locationId?: string;
}
```

#### Universe Validation

```typescript
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Location name is required').max(100),
  description: z.string().max(2000),
  coordinates: z.record(z.number()).optional(),
  parentLocationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  participants: z.array(z.string()).optional(),
  locationId: z.string().optional(),
});

export const TimelineSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  events: z.array(TimelineEventSchema),
});

export const UniverseSettingsSchema = z.object({
  allowCollaboration: z.boolean().default(true),
  defaultLanguage: z.string().default('en'),
  timezone: z.string().default('UTC'),
  dateFormat: z.string().default('YYYY-MM-DD'),
  theme: z.string().optional(),
});

export const UniverseSchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Universe name is required').max(100),
  description: z.string().max(2000),
  creatorId: z.string(),
  visibility: z.enum(['public', 'private', 'shared']).default('private'),
  settings: UniverseSettingsSchema.default({}),
  locations: z.array(LocationSchema).default([]),
  timelines: z.array(TimelineSchema).default([]),
  tags: z.array(z.string()).default([]),
});
```

### Story Domain

#### Story Entity

```typescript
export interface Story extends BaseEntity {
  readonly title: string;
  readonly summary: string;
  readonly universeId: string;
  readonly authorId: string;
  readonly status: StoryStatus;
  readonly wordCount: number;
  readonly targetWordCount?: number;
  readonly chapters: readonly Chapter[];
  readonly characters: readonly Character[];
  readonly settings: StorySettings;
  readonly collaborators: readonly Collaborator[];
}

export type StoryStatus = 'draft' | 'in-progress' | 'review' | 'published' | 'archived';

export interface Chapter {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly order: number;
  readonly wordCount: number;
  readonly status: ChapterStatus;
  readonly notes?: string;
  readonly lastModified: Date;
  readonly lastModifiedBy: string;
}

export type ChapterStatus = 'draft' | 'in-progress' | 'review' | 'completed';

export interface StorySettings {
  readonly autoSave: boolean;
  readonly autoSaveInterval: number;
  readonly versionControl: boolean;
  readonly collaborativeEditing: boolean;
  readonly commentingEnabled: boolean;
  readonly trackChanges: boolean;
}

export interface Collaborator {
  readonly userId: string;
  readonly role: CollaboratorRole;
  readonly permissions: readonly Permission[];
  readonly addedAt: Date;
  readonly addedBy: string;
}

export type CollaboratorRole = 'owner' | 'editor' | 'reviewer' | 'reader';
export type Permission = 'read' | 'write' | 'comment' | 'review' | 'publish' | 'admin';
```

#### Story Validation

```typescript
export const ChapterSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string(),
  order: z.number().int().min(1),
  wordCount: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'in-progress', 'review', 'completed']).default('draft'),
  notes: z.string().optional(),
  lastModified: z.date(),
  lastModifiedBy: z.string(),
});

export const CollaboratorSchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'editor', 'reviewer', 'reader']),
  permissions: z.array(z.enum(['read', 'write', 'comment', 'review', 'publish', 'admin'])),
  addedAt: z.date(),
  addedBy: z.string(),
});

export const StorySettingsSchema = z.object({
  autoSave: z.boolean().default(true),
  autoSaveInterval: z.number().int().min(30).max(600).default(60), // seconds
  versionControl: z.boolean().default(true),
  collaborativeEditing: z.boolean().default(false),
  commentingEnabled: z.boolean().default(true),
  trackChanges: z.boolean().default(false),
});

export const StorySchema = BaseEntitySchema.extend({
  title: z.string().min(1, 'Story title is required').max(200),
  summary: z.string().max(2000),
  universeId: z.string(),
  authorId: z.string(),
  status: z.enum(['draft', 'in-progress', 'review', 'published', 'archived']).default('draft'),
  wordCount: z.number().int().min(0).default(0),
  targetWordCount: z.number().int().min(1).optional(),
  chapters: z.array(ChapterSchema).default([]),
  characters: z.array(z.string()).default([]), // Character IDs
  settings: StorySettingsSchema.default({}),
  collaborators: z.array(CollaboratorSchema).default([]),
});
```

### Character Domain

#### Character Entity

```typescript
export interface Character extends BaseEntity {
  readonly name: string;
  readonly description?: string;
  readonly universeId: string;
  readonly creatorId: string;
  readonly attributes: CharacterAttributes;
  readonly relationships: readonly CharacterRelationship[];
  readonly appearances: readonly CharacterAppearance[];
  readonly tags: readonly string[];
}

export interface CharacterAttributes {
  readonly physical: PhysicalAttributes;
  readonly personality: PersonalityAttributes;
  readonly background: BackgroundAttributes;
  readonly skills: readonly Skill[];
  readonly custom: Record<string, unknown>;
}

export interface PhysicalAttributes {
  readonly age?: number;
  readonly height?: string;
  readonly weight?: string;
  readonly eyeColor?: string;
  readonly hairColor?: string;
  readonly distinguishingFeatures?: string;
}

export interface PersonalityAttributes {
  readonly traits: readonly string[];
  readonly motivations: readonly string[];
  readonly fears: readonly string[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
}

export interface BackgroundAttributes {
  readonly birthplace?: string;
  readonly family?: string;
  readonly education?: string;
  readonly occupation?: string;
  readonly history?: string;
}

export interface Skill {
  readonly name: string;
  readonly level: number; // 1-10 scale
  readonly description?: string;
}

export interface CharacterRelationship {
  readonly targetCharacterId: string;
  readonly type: RelationshipType;
  readonly description?: string;
  readonly strength: number; // -10 to 10 scale
}

export type RelationshipType = 
  | 'family' | 'friend' | 'enemy' | 'romantic' | 'mentor' | 'rival' 
  | 'colleague' | 'ally' | 'neutral' | 'unknown';

export interface CharacterAppearance {
  readonly storyId: string;
  readonly chapterId?: string;
  readonly role: AppearanceRole;
  readonly description?: string;
}

export type AppearanceRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'cameo';
```

#### Character Validation

```typescript
export const PhysicalAttributesSchema = z.object({
  age: z.number().int().min(0).max(1000).optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  distinguishingFeatures: z.string().max(500).optional(),
});

export const PersonalityAttributesSchema = z.object({
  traits: z.array(z.string()).default([]),
  motivations: z.array(z.string()).default([]),
  fears: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
});

export const BackgroundAttributesSchema = z.object({
  birthplace: z.string().optional(),
  family: z.string().max(1000).optional(),
  education: z.string().max(1000).optional(),
  occupation: z.string().optional(),
  history: z.string().max(2000).optional(),
});

export const SkillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.number().int().min(1).max(10),
  description: z.string().max(500).optional(),
});

export const CharacterRelationshipSchema = z.object({
  targetCharacterId: z.string(),
  type: z.enum(['family', 'friend', 'enemy', 'romantic', 'mentor', 'rival', 
                'colleague', 'ally', 'neutral', 'unknown']),
  description: z.string().max(500).optional(),
  strength: z.number().int().min(-10).max(10).default(0),
});

export const CharacterAppearanceSchema = z.object({
  storyId: z.string(),
  chapterId: z.string().optional(),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor', 'cameo']),
  description: z.string().max(500).optional(),
});

export const CharacterAttributesSchema = z.object({
  physical: PhysicalAttributesSchema.default({}),
  personality: PersonalityAttributesSchema.default({}),
  background: BackgroundAttributesSchema.default({}),
  skills: z.array(SkillSchema).default([]),
  custom: z.record(z.unknown()).default({}),
});

export const CharacterSchema = BaseEntitySchema.extend({
  name: z.string().min(1, 'Character name is required').max(100),
  description: z.string().max(2000).optional(),
  universeId: z.string(),
  creatorId: z.string(),
  attributes: CharacterAttributesSchema.default({}),
  relationships: z.array(CharacterRelationshipSchema).default([]),
  appearances: z.array(CharacterAppearanceSchema).default([]),
  tags: z.array(z.string()).default([]),
});
```

## Validation Framework

### Base Validator Class

```typescript
export abstract class BaseValidator<T extends BaseEntity> {
  protected schema: z.ZodSchema<T>;

  constructor(schema: z.ZodSchema<T>) {
    this.schema = schema;
  }

  /**
   * Validate a complete entity
   */
  validate(data: unknown): T {
    try {
      return this.schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate partial data for updates
   */
  validatePartial(data: unknown): Partial<T> {
    try {
      return this.schema.partial().parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Partial validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate specific fields
   */
  validateFields(data: unknown, fields: (keyof T)[]): Pick<T, keyof T> {
    const pickSchema = this.schema.pick(
      fields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as Record<keyof T, true>)
    );

    try {
      return pickSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Field validation failed for: ${fields.join(', ')}`, error.errors);
      }
      throw error;
    }
  }

  /**
   * Get the TypeScript type from the schema
   */
  getType(): z.infer<typeof this.schema> {
    return this.schema._type;
  }
}
```

### Domain Validators

```typescript
export class UniverseValidator extends BaseValidator<Universe> {
  constructor() {
    super(UniverseSchema);
  }

  /**
   * Validate universe creation request
   */
  validateCreation(data: unknown): Omit<Universe, 'id' | 'createdAt' | 'updatedAt'> {
    const creationSchema = this.schema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    });

    try {
      return creationSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Universe creation validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate location addition
   */
  validateLocation(data: unknown): Location {
    try {
      return LocationSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Location validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate timeline addition
   */
  validateTimeline(data: unknown): Timeline {
    try {
      return TimelineSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Timeline validation failed', error.errors);
      }
      throw error;
    }
  }
}

export class StoryValidator extends BaseValidator<Story> {
  constructor() {
    super(StorySchema);
  }

  /**
   * Validate chapter content
   */
  validateChapter(data: unknown): Chapter {
    try {
      return ChapterSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Chapter validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate collaborator addition
   */
  validateCollaborator(data: unknown): Collaborator {
    try {
      return CollaboratorSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Collaborator validation failed', error.errors);
      }
      throw error;
    }
  }
}

export class CharacterValidator extends BaseValidator<Character> {
  constructor() {
    super(CharacterSchema);
  }

  /**
   * Validate character attributes
   */
  validateAttributes(data: unknown): CharacterAttributes {
    try {
      return CharacterAttributesSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Character attributes validation failed', error.errors);
      }
      throw error;
    }
  }

  /**
   * Validate character relationship
   */
  validateRelationship(data: unknown): CharacterRelationship {
    try {
      return CharacterRelationshipSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Character relationship validation failed', error.errors);
      }
      throw error;
    }
  }
}
```

## Error Handling

### Custom Error Classes

```typescript
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly details: z.ZodIssue[];

  constructor(message: string, details: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }

  /**
   * Get formatted error messages
   */
  getFormattedErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    
    for (const detail of this.details) {
      const path = detail.path.join('.');
      errors[path] = detail.message;
    }
    
    return errors;
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: string): string[] {
    return this.details
      .filter(detail => detail.path.join('.').startsWith(field))
      .map(detail => detail.message);
  }
}

export class DomainError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.context = context;
  }
}

export class UniverseNotFoundError extends DomainError {
  constructor(universeId: string) {
    super(`Universe not found: ${universeId}`, 'UNIVERSE_NOT_FOUND', { universeId });
  }
}

export class StoryNotFoundError extends DomainError {
  constructor(storyId: string) {
    super(`Story not found: ${storyId}`, 'STORY_NOT_FOUND', { storyId });
  }
}

export class CharacterNotFoundError extends DomainError {
  constructor(characterId: string) {
    super(`Character not found: ${characterId}`, 'CHARACTER_NOT_FOUND', { characterId });
  }
}

export class InsufficientPermissionsError extends DomainError {
  constructor(operation: string, requiredPermissions: Permission[]) {
    super(
      `Insufficient permissions for operation: ${operation}`,
      'INSUFFICIENT_PERMISSIONS',
      { operation, requiredPermissions }
    );
  }
}
```

## Utility Functions

### Data Transformation

```typescript
/**
 * Calculate word count for text content
 */
export function calculateWordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Generate unique ID with prefix
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${prefix}${prefix ? '_' : ''}${timestamp}_${random}`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Sanitize string for safe display
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day);
}
```

### Type Guards

```typescript
/**
 * Type guard for Universe
 */
export function isUniverse(obj: unknown): obj is Universe {
  try {
    UniverseSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for Story
 */
export function isStory(obj: unknown): obj is Story {
  try {
    StorySchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for Character
 */
export function isCharacter(obj: unknown): obj is Character {
  try {
    CharacterSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for BaseEntity
 */
export function isBaseEntity(obj: unknown): obj is BaseEntity {
  try {
    BaseEntitySchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}
```

## Constants

### Application Constants

```typescript
export const APP_CONSTANTS = {
  // Entity limits
  MAX_UNIVERSE_NAME_LENGTH: 100,
  MAX_STORY_TITLE_LENGTH: 200,
  MAX_CHARACTER_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
  
  // Content limits
  MAX_CHAPTER_WORD_COUNT: 50000,
  MAX_CHAPTERS_PER_STORY: 1000,
  MAX_CHARACTERS_PER_UNIVERSE: 10000,
  
  // Collaboration limits
  MAX_COLLABORATORS_PER_STORY: 50,
  MAX_UNIVERSES_PER_USER: 100,
  
  // Validation patterns
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]{3,30}$/,
  
  // Default values
  DEFAULT_AUTO_SAVE_INTERVAL: 60, // seconds
  DEFAULT_SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
  DEFAULT_PAGINATION_LIMIT: 20,
} as const;

export const STORY_STATUSES = [
  'draft',
  'in-progress', 
  'review',
  'published',
  'archived'
] as const;

export const COLLABORATION_ROLES = [
  'owner',
  'editor',
  'reviewer',
  'reader'
] as const;

export const PERMISSIONS = [
  'read',
  'write',
  'comment',
  'review',
  'publish',
  'admin'
] as const;
```

## Testing

### Unit Tests

The core package includes comprehensive unit tests for all validators, utilities, and type guards.

```typescript
describe('UniverseValidator', () => {
  let validator: UniverseValidator;

  beforeEach(() => {
    validator = new UniverseValidator();
  });

  describe('validate', () => {
    it('should validate a complete universe', () => {
      const validUniverse = {
        id: 'universe-1',
        name: 'Middle Earth',
        description: 'Tolkien fantasy world',
        creatorId: 'user-1',
        visibility: 'public',
        settings: {
          allowCollaboration: true,
          defaultLanguage: 'en',
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD'
        },
        locations: [],
        timelines: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(validUniverse);
      expect(result.name).toBe('Middle Earth');
      expect(result.visibility).toBe('public');
    });

    it('should throw ValidationError for invalid data', () => {
      const invalidUniverse = {
        name: '', // Empty name should fail
        description: 'A'.repeat(3000), // Too long
      };

      expect(() => validator.validate(invalidUniverse))
        .toThrow(ValidationError);
    });
  });

  describe('validateCreation', () => {
    it('should validate universe creation without id and timestamps', () => {
      const creationData = {
        name: 'New Universe',
        description: 'A new fictional universe',
        creatorId: 'user-1',
        visibility: 'private'
      };

      const result = validator.validateCreation(creationData);
      expect(result.name).toBe('New Universe');
      expect(result.visibility).toBe('private');
    });
  });
});
```

### Usage in Other Packages

The core package is imported and used throughout the application:

```typescript
// In backend API
import { UniverseValidator, ValidationError } from '@verseforge/core';

app.post('/api/universes', async (req, res) => {
  try {
    const validator = new UniverseValidator();
    const universeData = validator.validateCreation(req.body);
    
    const universe = await universeService.create(universeData);
    res.status(201).json(universe);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.getFormattedErrors()
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// In frontend components
import { Character, CharacterValidator } from '@verseforge/core';

const CharacterForm: React.FC = () => {
  const [character, setCharacter] = useState<Partial<Character>>({});
  const validator = new CharacterValidator();

  const handleSubmit = (data: unknown) => {
    try {
      const validatedCharacter = validator.validateCreation(data);
      onSave(validatedCharacter);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(error.getFormattedErrors());
      }
    }
  };

  // Component JSX...
};
```

## Build and Distribution

### Package Configuration

```json
{
  "name": "@verseforge/core",
  "version": "1.0.0",
  "description": "Core business logic and types for VerseForge",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.45.0",
    "jest": "^29.6.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.1.0"
  },
  "publishConfig": {
    "access": "restricted"
  }
}
```

### TypeScript Configuration

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

## Conclusion

The `@verseforge/core` package provides a solid foundation for the entire application with comprehensive type safety, validation, and domain modeling. It serves as the single source of truth for business logic and ensures consistency across all application layers while maintaining framework independence and reusability.
