// Unified controller for character and universe generation endpoints
// Extracted and merged from generators.ts and generatorsNew.ts
import { Request, Response, RequestHandler } from 'express';
import { UniverseGenerationEngine } from '../services/aiGeneration/universeGenerationEngine.js';
import { CharacterGenerationEngine } from '../services/aiGeneration/characterGenerationEngine.js';
import { MemoryIntegrationService } from '../services/aiGeneration/memoryIntegrationService.js';
import { GeneratorValidationService } from '../services/aiGeneration/validationService.js';

const universeEngine = new UniverseGenerationEngine();
const characterEngine = new CharacterGenerationEngine();
const memoryIntegration = new MemoryIntegrationService();
const validationService = new GeneratorValidationService();

// Universe endpoints
export const generateUniverse: RequestHandler = async (req, res): Promise<void> => {
    try {
        const request = req.body;
        request.userId = req.user?.id || 'anonymous';
        const universe = await universeEngine.generateUniverse(request);
        const validation = await validationService.validateUniverse(universe);
        res.status(201).json({ success: true, universe, validation, message: `Universe \"${universe.name}\" generated successfully` });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to generate universe', details: error.message });
        return;
    }
};

export const getUniverse: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const universe = await universeEngine.getUniverse(id);
        if (!universe) {
            res.status(404).json({ success: false, error: 'Universe not found' });
            return;
        }
        res.json({ success: true, universe });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to retrieve universe', details: error.message });
        return;
    }
};

export const expandUniverseElement: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const expansionRequest = { ...req.body, universeId: id };
        const expansion = await universeEngine.expandUniverseElement(expansionRequest);
        res.json({ success: true, expansion, message: 'Universe element expanded successfully' });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to expand universe element', details: error.message });
        return;
    }
};

export const validateUniverse: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const universe = await universeEngine.getUniverse(id);
        if (!universe) {
            res.status(404).json({ success: false, error: 'Universe not found' });
            return;
        }
        const validation = await validationService.validateUniverse(universe);
        res.json({ success: true, validation, message: 'Universe validation completed' });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to validate universe', details: error.message });
        return;
    }
};

// Character endpoints
export const generateCharacter: RequestHandler = async (req, res): Promise<void> => {
    try {
        const request = req.body;
        request.userId = req.user?.id || 'anonymous';
        const character = await characterEngine.generateCharacter(request);
        const validation = await validationService.validateCharacter(character);
        let memoryIntegrationResult = null;
        if (request.integrateMemories !== false) {
            const memoryRequest = {
                characterId: character.id,
                universeId: character.universeId,
                memoryTypes: ['trait', 'knowledge', 'event', 'goal'] as ('trait' | 'knowledge' | 'event' | 'goal' | 'relationship')[],
                importance_threshold: 0.4
            };
            memoryIntegrationResult = await memoryIntegration.integrateCharacterMemories(character, memoryRequest);
        }
        res.status(201).json({ success: true, character, validation, memoryIntegration: memoryIntegrationResult, message: `Character \"${character.name}\" generated successfully` });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to generate character', details: error.message });
        return;
    }
};

export const getCharacter: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const character = await characterEngine.getCharacter(id);
        if (!character) {
            res.status(404).json({ success: false, error: 'Character not found' });
            return;
        }
        const includeMemories = req.query.includeMemories === 'true';
        let memories = null;
        if (includeMemories) memories = await memoryIntegration.getCharacterMemories(id);
        res.json({ success: true, character, memories });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to retrieve character', details: error.message });
        return;
    }
};

export const expandCharacterElement: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const expansionRequest = { ...req.body, characterId: id };
        const expansion = await characterEngine.expandCharacterElement(expansionRequest);
        res.json({ success: true, expansion, message: 'Character element expanded successfully' });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to expand character element', details: error.message });
        return;
    }
};

export const validateCharacter: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const character = await characterEngine.getCharacter(id);
        if (!character) {
            res.status(404).json({ success: false, error: 'Character not found' });
            return;
        }
        const validation = await validationService.validateCharacter(character);
        res.json({ success: true, validation, message: 'Character validation completed' });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to validate character', details: error.message });
        return;
    }
};

// Memory integration endpoints
export const integrateCharacterMemories: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const character = await characterEngine.getCharacter(id);
        if (!character) {
            res.status(404).json({ success: false, error: 'Character not found' });
            return;
        }
        const memoryRequest = {
            characterId: id,
            universeId: character.universeId,
            memoryTypes: (req.body.memoryTypes || ['trait', 'knowledge', 'event', 'goal']) as ('trait' | 'knowledge' | 'event' | 'goal' | 'relationship')[],
            importance_threshold: req.body.importance_threshold || 0.3
        };
        const result = await memoryIntegration.integrateCharacterMemories(character, memoryRequest);
        res.json({ success: result.success, memoryIntegration: result, message: `Integrated ${result.memoriesCreated} memories for character \"${character.name}\"` });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to integrate character memories', details: error.message });
        return;
    }
};

export const integrateUniverseMemories: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { characterId, universeId } = req.params;
        const character = await characterEngine.getCharacter(characterId);
        const universe = await universeEngine.getUniverse(universeId);
        if (!character) {
            res.status(404).json({ success: false, error: 'Character not found' });
            return;
        }
        if (!universe) {
            res.status(404).json({ success: false, error: 'Universe not found' });
            return;
        }
        const universeRequest = {
            universeId,
            characterId,
            elements: (req.body.elements || ['history', 'geography', 'cultures']) as ('history' | 'geography' | 'cultures' | 'conflicts' | 'mysteries')[],
            detail_level: (req.body.detail_level || 'standard') as 'basic' | 'standard' | 'comprehensive',
        };
        const result = await memoryIntegration.integrateUniverseMemories(universe, character, universeRequest);
        res.json({ success: result.success, memoryIntegration: result, message: `Integrated ${result.memoriesCreated} universe memories for character \"${character.name}\"` });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to integrate universe memories', details: error.message });
        return;
    }
};

export const getCharacterMemories: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const memories = await memoryIntegration.getCharacterMemories(id);
        res.json({ success: true, memories, count: memories.length });
        return;
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to retrieve character memories', details: error.message });
        return;
    }
};
