/**
 * Validation for gap-filling memory generation (POST /characters/:characterId/gap-filling)
 */
export const validateGapFillingRequest = [
    body('query').isString().notEmpty().withMessage('Gap-filling query is required'),
    body('context').optional().isString().withMessage('Context must be a string'),
    body('timeFrame').optional().isString().withMessage('Time frame must be a string'),
    body('relatedEntities').optional().isArray().withMessage('Related entities must be an array'),
    body('traits').optional().isArray().withMessage('Traits must be an array')
];

/**
 * Validation for gap-filling memory approval (POST /characters/:characterId/gap-filling/approval)
 */
export const validateGapFillingApproval = [
    body('memoryId').isString().notEmpty().withMessage('Memory ID is required'),
    body('approved').isBoolean().withMessage('Approval status is required'),
    body('reviewNotes').optional().isString().withMessage('Review notes must be a string'),
    body('modifiedContent').optional().isString().withMessage('Modified content must be a string')
];

// Validation middleware for generator and memory routes
// Extracted from generatorsNew.ts, generators.ts, and memoryController.ts
import { body, param } from 'express-validator';

/**
 * Validation for universe generation requests
 */
export const validateUniverseRequest = [
    body('genre').isIn(['fantasy', 'sci-fi', 'modern', 'historical', 'horror', 'mystery', 'custom'])
        .withMessage('Invalid genre'),
    body('tone').isIn(['light', 'dark', 'balanced', 'gritty', 'whimsical'])
        .withMessage('Invalid tone'),
    body('scope').isIn(['city', 'region', 'continent', 'world', 'galaxy', 'multiverse'])
        .withMessage('Invalid scope'),
    body('detailLevel').isIn(['basic', 'standard', 'comprehensive', 'exhaustive'])
        .withMessage('Invalid detail level'),
    body('themes').optional().isArray().withMessage('Themes must be an array'),
    body('technologies').optional().isIn(['none', 'medieval', 'renaissance', 'industrial', 'modern', 'futuristic', 'magical'])
        .withMessage('Invalid technology level'),
    body('magicSystem').optional().isIn(['none', 'rare', 'common', 'dominant', 'science-based'])
        .withMessage('Invalid magic system')
];

/**
 * Validation for RAG text ingestion requests
 * POST /api/rag/ingest/text
 */
export const validateRagTextIngestion = [
    body('content').isString().notEmpty().withMessage('Text content is required'),
    body('title').optional().isString().withMessage('Title must be a string'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    body('chunkSize').optional().isInt({ min: 1, max: 10000 }).withMessage('chunkSize must be a positive integer')
];

/**
 * Validation for RAG code ingestion requests
 * POST /api/rag/ingest/code
 */
export const validateRagCodeIngestion = [
    body('content').isString().notEmpty().withMessage('Code content is required'),
    body('type').isIn(['python', 'javascript', 'typescript', 'markdown', 'json', 'custom'])
        .withMessage('Invalid or missing code type'),
    body('language').optional().isString().withMessage('Language must be a string'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    body('chunkStrategy').optional().isIn(['function', 'class', 'block', 'line', 'custom'])
        .withMessage('Invalid chunk strategy'),
    body('chunkSize').optional().isInt({ min: 1, max: 10000 }).withMessage('chunkSize must be a positive integer')
];

/**
 * Validation for character generation requests
 */
export const validateCharacterRequest = [
    body('universeId').isString().notEmpty().withMessage('Universe ID is required'),
    body('role').optional().isIn(['protagonist', 'antagonist', 'supporting', 'background', 'neutral'])
        .withMessage('Invalid character role'),
    body('age').optional().isNumeric().withMessage('Age must be a number'),
    body('storyImportance').isIn(['major', 'moderate', 'minor', 'cameo'])
        .withMessage('Invalid story importance'),
    body('detailLevel').isIn(['basic', 'standard', 'comprehensive', 'exhaustive'])
        .withMessage('Invalid detail level'),
    body('secretsLevel').optional().isIn(['none', 'minor', 'significant', 'world_changing'])
        .withMessage('Invalid secrets level'),
    body('coreTraits').optional().isArray().withMessage('Core traits must be an array'),
    body('generateBackstory').optional().isBoolean().withMessage('Generate backstory must be boolean'),
    body('generateRelationships').optional().isBoolean().withMessage('Generate relationships must be boolean'),
    body('generateSecrets').optional().isBoolean().withMessage('Generate secrets must be boolean'),
    body('generateGoals').optional().isBoolean().withMessage('Generate goals must be boolean')
];

/**
 * Validation for characterId param in memory/chat routes
 */
export const validateCharacterId = [
    param('characterId').isString().notEmpty().withMessage('characterId param is required')
];

/**
 * Validation for character memory creation (POST /characters/:characterId/memories)
 */
export const validateCharacterMemory = [
    body('content').isString().notEmpty().withMessage('Memory content is required'),
    body('type').isString().notEmpty().withMessage('Memory type is required'),
    body('importance').optional().isFloat({ min: 0, max: 1 }).withMessage('Importance must be between 0 and 1'),
    body('tags').optional().isArray().withMessage('Tags must be an array of strings'),
    body('timestamp').optional().isISO8601().withMessage('Timestamp must be a valid ISO8601 date'),
    body('emotional_impact').optional().isFloat({ min: 0, max: 1 }).withMessage('Emotional impact must be between 0 and 1'),
    body('context').optional().isObject().withMessage('Context must be an object')
];
