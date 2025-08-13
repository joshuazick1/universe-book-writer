/**
 * @fileoverview Shared generator types for AI-powered content generation.
 * @module shared/types/generatorTypes
 *
 * Provides comprehensive interfaces for character and universe generation, validation, memory integration, health, statistics, templates, batch processing, errors, and config.
 *
 * @example
 * import type { BaseGenerationRequest, GenerationResult } from 'shared/types/generatorTypes';
 */

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

export interface PaginatedResponse<T> {
    success: boolean;
    data?: T[];
    error?: string;
    metadata?: Record<string, unknown>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

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

export interface GeneratorStatistics {
    charactersGenerated: number;
    universesGenerated: number;
    memoriesIntegrated: number;
    validationsPerformed: number;
    averageQualityScore: number;
    lastActivity: Date;
}

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

export interface GeneratorError extends Error {
    code: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
    retryable: boolean;
}

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
