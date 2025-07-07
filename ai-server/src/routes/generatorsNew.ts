/**
 * Character & Universe Generator API Routes
 * 
 * REST API endpoints for AI-powered character and universe generation.
 * Supports creation, refinement, validation, and integration with memory systems.
 */

import express, { Request, Response, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { UniverseGenerationEngine } from '../services/aiGeneration/universeGenerationEngine.js';
import { CharacterGenerationEngine } from '../services/aiGeneration/characterGenerationEngine.js';
import { MemoryIntegrationService } from '../services/aiGeneration/memoryIntegrationService.js';
import { GeneratorValidationService } from '../services/aiGeneration/validationService.js';

const router = express.Router();

// Service instances
const universeEngine = new UniverseGenerationEngine();
const characterEngine = new CharacterGenerationEngine();
const memoryIntegration = new MemoryIntegrationService();
const validationService = new GeneratorValidationService();

// ============================================
// UNIVERSE GENERATION ENDPOINTS
// ============================================

/**
 * Generate New Universe
 * POST /api/generate/universe
 */
const generateUniverse: RequestHandler = async (req, res): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const request = req.body;

        // Add user ID from auth context
        request.userId = req.user?.id || 'anonymous';

        console.log('Generating universe with request:', request);

        // Generate the universe
        const universe = await universeEngine.generateUniverse(request);

        // Validate the generated universe
        const validation = await validationService.validateUniverse(universe);

        res.status(201).json({
            success: true,
            universe,
            validation,
            message: `Universe "${universe.name}" generated successfully`
        });

    } catch (error: any) {
        console.error('Error generating universe:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate universe',
            details: error.message
        });
    }
};

/**
 * Get Universe by ID
 * GET /api/generate/universe/:id
 */
const getUniverse: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const universe = await universeEngine.getUniverse(id);

        if (!universe) {
            res.status(404).json({
                success: false,
                error: 'Universe not found'
            });
            return;
        }

        res.json({
            success: true,
            universe
        });

    } catch (error: any) {
        console.error('Error retrieving universe:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve universe',
            details: error.message
        });
    }
};

/**
 * Expand Universe Element
 * POST /api/generate/universe/:id/expand
 */
const expandUniverseElement: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const expansionRequest = { ...req.body, universeId: id };

        const expansion = await universeEngine.expandUniverseElement(expansionRequest);

        res.json({
            success: true,
            expansion,
            message: 'Universe element expanded successfully'
        });

    } catch (error: any) {
        console.error('Error expanding universe element:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to expand universe element',
            details: error.message
        });
    }
};

/**
 * Validate Universe
 * POST /api/generate/universe/:id/validate
 */
const validateUniverseEndpoint: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const universe = await universeEngine.getUniverse(id);

        if (!universe) {
            res.status(404).json({
                success: false,
                error: 'Universe not found'
            });
            return;
        }

        const validation = await validationService.validateUniverse(universe);

        res.json({
            success: true,
            validation,
            message: `Universe validation completed`
        });

    } catch (error: any) {
        console.error('Error validating universe:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate universe',
            details: error.message
        });
    }
};

// ============================================
// CHARACTER GENERATION ENDPOINTS
// ============================================

/**
 * Generate New Character
 * POST /api/generate/character
 */
const generateCharacter: RequestHandler = async (req, res): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const request = req.body;

        // Add user ID from auth context
        request.userId = req.user?.id || 'anonymous';

        console.log('Generating character with request:', request);

        // Generate the character
        const character = await characterEngine.generateCharacter(request);

        // Validate the generated character
        const validation = await validationService.validateCharacter(character);

        // Integrate with memory system if requested
        let memoryIntegrationResult = null;
        if (request.integrateMemories !== false) {
            const memoryRequest = {
                characterId: character.id,
                universeId: character.universeId,
                memoryTypes: ['trait', 'knowledge', 'event', 'goal'] as ('trait' | 'knowledge' | 'event' | 'relationship' | 'goal')[],
                importance_threshold: 0.4
            };

            memoryIntegrationResult = await memoryIntegration.integrateCharacterMemories(
                character,
                memoryRequest
            );
        }

        res.status(201).json({
            success: true,
            character,
            validation,
            memoryIntegration: memoryIntegrationResult,
            message: `Character "${character.name}" generated successfully`
        });

    } catch (error: any) {
        console.error('Error generating character:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate character',
            details: error.message
        });
    }
};

/**
 * Get Character by ID
 * GET /api/generate/character/:id
 */
const getCharacter: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const character = await characterEngine.getCharacter(id);

        if (!character) {
            res.status(404).json({
                success: false,
                error: 'Character not found'
            });
            return;
        }

        // Optionally include memories
        const includeMemories = req.query.includeMemories === 'true';
        let memories = null;

        if (includeMemories) {
            memories = await memoryIntegration.getCharacterMemories(id);
        }

        res.json({
            success: true,
            character,
            memories
        });

    } catch (error: any) {
        console.error('Error retrieving character:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve character',
            details: error.message
        });
    }
};

/**
 * Expand Character Element
 * POST /api/generate/character/:id/expand
 */
const expandCharacterElement: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const expansionRequest = { ...req.body, characterId: id };

        const expansion = await characterEngine.expandCharacterElement(expansionRequest);

        res.json({
            success: true,
            expansion,
            message: 'Character element expanded successfully'
        });

    } catch (error: any) {
        console.error('Error expanding character element:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to expand character element',
            details: error.message
        });
    }
};

/**
 * Validate Character
 * POST /api/generate/character/:id/validate
 */
const validateCharacterEndpoint: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const character = await characterEngine.getCharacter(id);

        if (!character) {
            res.status(404).json({
                success: false,
                error: 'Character not found'
            });
            return;
        }

        const validation = await validationService.validateCharacter(character);

        res.json({
            success: true,
            validation,
            message: `Character validation completed`
        });

    } catch (error: any) {
        console.error('Error validating character:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate character',
            details: error.message
        });
    }
};

// ============================================
// MEMORY INTEGRATION ENDPOINTS
// ============================================

/**
 * Integrate Character with Memory System
 * POST /api/generate/character/:id/integrate-memories
 */
const integrateCharacterMemories: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const character = await characterEngine.getCharacter(id);

        if (!character) {
            res.status(404).json({
                success: false,
                error: 'Character not found'
            });
            return;
        }

        const memoryRequest = {
            characterId: id,
            universeId: character.universeId,
            memoryTypes: req.body.memoryTypes || ['trait', 'knowledge', 'event', 'goal'] as const,
            importance_threshold: req.body.importance_threshold || 0.3
        };

        const result = await memoryIntegration.integrateCharacterMemories(character, memoryRequest);

        res.json({
            success: result.success,
            memoryIntegration: result,
            message: `Integrated ${result.memoriesCreated} memories for character "${character.name}"`
        });

    } catch (error: any) {
        console.error('Error integrating character memories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to integrate character memories',
            details: error.message
        });
    }
};

/**
 * Integrate Universe Context into Character Memories
 * POST /api/generate/character/:characterId/integrate-universe/:universeId
 */
const integrateUniverseMemories: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { characterId, universeId } = req.params;

        const character = await characterEngine.getCharacter(characterId);
        const universe = await universeEngine.getUniverse(universeId);

        if (!character) {
            res.status(404).json({
                success: false,
                error: 'Character not found'
            });
            return;
        }

        if (!universe) {
            res.status(404).json({
                success: false,
                error: 'Universe not found'
            });
            return;
        }

        const universeRequest = {
            universeId,
            characterId,
            elements: req.body.elements || ['history', 'geography', 'cultures'] as const,
            detail_level: req.body.detail_level || 'standard' as const
        };

        const result = await memoryIntegration.integrateUniverseMemories(
            universe,
            character,
            universeRequest
        );

        res.json({
            success: result.success,
            memoryIntegration: result,
            message: `Integrated ${result.memoriesCreated} universe memories for character "${character.name}"`
        });

    } catch (error: any) {
        console.error('Error integrating universe memories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to integrate universe memories',
            details: error.message
        });
    }
};

/**
 * Get Character Memories
 * GET /api/generate/character/:id/memories
 */
const getCharacterMemories: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const memories = await memoryIntegration.getCharacterMemories(id);

        res.json({
            success: true,
            memories,
            count: memories.length
        });

    } catch (error: any) {
        console.error('Error retrieving character memories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve character memories',
            details: error.message
        });
    }
};

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

const validateUniverseRequest = [
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

const validateCharacterRequest = [
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

// ============================================
// ROUTE DEFINITIONS
// ============================================

// Universe routes
router.post('/universe', validateUniverseRequest, generateUniverse);
router.get('/universe/:id', param('id').isString(), getUniverse);
router.post('/universe/:id/expand', param('id').isString(), expandUniverseElement);
router.post('/universe/:id/validate', param('id').isString(), validateUniverseEndpoint);

// Character routes
router.post('/character', validateCharacterRequest, generateCharacter);
router.get('/character/:id', param('id').isString(), getCharacter);
router.post('/character/:id/expand', param('id').isString(), expandCharacterElement);
router.post('/character/:id/validate', param('id').isString(), validateCharacterEndpoint);

// Memory integration routes
router.post('/character/:id/integrate-memories',
    param('id').isString(),
    body('memoryTypes').optional().isArray(),
    body('importance_threshold').optional().isNumeric(),
    integrateCharacterMemories
);

router.post('/character/:characterId/integrate-universe/:universeId',
    param('characterId').isString(),
    param('universeId').isString(),
    body('elements').optional().isArray(),
    body('detail_level').optional().isIn(['basic', 'standard', 'comprehensive']),
    integrateUniverseMemories
);

router.get('/character/:id/memories', param('id').isString(), getCharacterMemories);

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

/**
 * Generator System Health Check
 * GET /api/generate/health
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            status: 'healthy',
            services: {
                universeEngine: 'available',
                characterEngine: 'available',
                memoryIntegration: 'available',
                validationService: 'available'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

export default router;
