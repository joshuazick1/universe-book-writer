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

// Common generator types
export interface BaseGenerationRequest {
    userId: string;
    detailLevel: 'basic' | 'standard' | 'comprehensive' | 'exhaustive';
}

export interface BaseGeneratedContent {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    generationPrompt: string;
    qualityScore: number;
}

export interface GenerationResult<T> {
    success: boolean;
    content?: T;
    validation?: ValidationResult;
    memoryIntegration?: MemoryIntegrationResult;
    error?: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    qualityScore: number;
    issues: ValidationIssue[];
    suggestions: string[];
    validatedAt: Date;
}

export interface ValidationIssue {
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
}

export interface MemoryIntegrationResult {
    success: boolean;
    memoriesCreated: number;
    memoryIds: string[];
    characterId: string;
    errors?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Health check types
export interface ServiceHealthStatus {
    universeEngine: 'available' | 'unavailable' | 'degraded';
    characterEngine: 'available' | 'unavailable' | 'degraded';
    memoryIntegration: 'available' | 'unavailable' | 'degraded';
    validationService: 'available' | 'unavailable' | 'degraded';
}

export interface SystemHealth {
    status: 'healthy' | 'unhealthy' | 'degraded';
    services: ServiceHealthStatus;
    timestamp: string;
}

// Statistics types
export interface GeneratorStatistics {
    charactersGenerated: number;
    universesGenerated: number;
    memoriesIntegrated: number;
    validationsPerformed: number;
    averageQualityScore: number;
    lastActivity: Date;
}

// Template types
export interface GeneratorTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    defaults: Record<string, any>;
    tags: string[];
    isPublic: boolean;
    createdBy: string;
    createdAt: Date;
}

export interface CharacterTemplate extends GeneratorTemplate {
    defaults: Partial<any>; // Will be properly typed when imported
}

export interface UniverseTemplate extends GeneratorTemplate {
    defaults: Partial<any>; // Will be properly typed when imported
}

// Batch processing types
export interface BatchGenerationRequest<T> {
    requests: T[];
    batchSize?: number;
    parallelProcessing?: boolean;
    integrateMemories?: boolean;
    validateResults?: boolean;
}

export interface BatchGenerationResult<T> {
    success: boolean;
    results: GenerationResult<T>[];
    summary: {
        total: number;
        successful: number;
        failed: number;
        averageQualityScore: number;
    };
    completedAt: Date;
}

// Error types
export interface GeneratorError extends Error {
    code: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    retryable: boolean;
}

// Configuration types
export interface GeneratorConfig {
    ai: {
        model: string;
        temperature: number;
        maxTokens: number;
        timeoutMs: number;
    };
    validation: {
        enabled: boolean;
        strictMode: boolean;
        minQualityScore: number;
    };
    memory: {
        autoIntegrate: boolean;
        defaultImportanceThreshold: number;
        maxMemoriesPerCharacter: number;
    };
    processing: {
        maxConcurrent: number;
        retryAttempts: number;
        backoffMs: number;
    };
}
