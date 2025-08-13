/**
 * Consolidated Generator Types
 * 
 * All type definitions for the character and universe generator system.
 * Provides comprehensive interfaces for AI-powered content generation.
 */

// Re-export from individual type files with explicit exports to avoid conflicts
export type {
    CharacterGenerationRequest,
    GeneratedCharacter,
    CharacterMemory,
    PersonalityTrait,
    LifeEvent,
    RelationshipHistory,
    Skill,
    KnowledgeArea,
    CharacterValidationResult,
    CharacterExpansionRequest,
    CharacterExpansion
} from '../services/characterGenerator/types.js';

export type {
    UniverseGenerationRequest,
    GeneratedUniverse,
    UniverseExpansionRequest,
    UniverseExpansion,
    UniverseValidationResult
} from '../services/universeGenerator/types.js';

// Import all generator types from shared
export type {
    BaseGenerationRequest,
    BaseGeneratedContent,
    GenerationResult,
    ValidationResult,
    ValidationIssue,
    MemoryIntegrationResult,
    PaginatedResponse,
    ServiceHealthStatus,
    SystemHealth,
    GeneratorStatistics,
    GeneratorTemplate,
    CharacterTemplate,
    UniverseTemplate,
    BatchGenerationRequest,
    BatchGenerationResult,
    GeneratorError,
    GeneratorConfig
} from '../../../shared/types/generatorTypes.js';
