/**
 * Universal AI Processing Framework - Core Types
 * 
 * Defines the fundamental interfaces and types used throughout the framework
 * for multi-pass AI request processing across all domains.
 */

// =============================================================================
// Core Request Types
// =============================================================================

export interface AIRequest {
    id: string;
    type: 'chat' | 'writing' | 'character-generation' | 'world-building' | 'analysis' | 'editing';
    complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    domain: string;
    scope: 'atomic' | 'chapter' | 'multi-chapter' | 'book' | 'series';
    qualityRequirement: 'draft' | 'standard' | 'publication' | 'professional';
    ragDomain: string; // 'none' | 'universe:{id}' | 'character:{id}' | 'project:{id}' | 'custom:{name}'
    content: string;
    context?: any;
    userPreferences?: UserProcessingPreferences;
    metadata?: RequestMetadata;
    timestamp?: Date;
}

export interface RequestMetadata {
    userId?: string;
    sessionId?: string;
    clientInfo?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    source?: string;
}

export interface UserProcessingPreferences {
    defaultQualityLevel: 'draft' | 'standard' | 'publication' | 'professional';
    maxProcessingTime: number; // in seconds
    prioritizeSpeed: boolean;
    autoRefine: boolean;
    manualQualityGates: boolean;
    preferredModels?: string[];
    customSettings?: Record<string, any>;
}

// =============================================================================
// Processing Context Types
// =============================================================================

export interface ProcessingContext {
    requestId: string;
    startTime: number; // Changed from Date to number for timestamp
    settings: ProcessingSettings;
    qualityWarnings: QualityWarning[];
    cache: Map<string, any>;
    metadata: Record<string, any>;
    improvementPlan?: ImprovementPlan;
    // Legacy fields for backward compatibility
    request?: AIRequest;
    passNumber?: number;
    totalPasses?: number;
    previousResults?: PassResult[];
    gatheredContext?: any;
    resources?: ResourceUsage;
    processingHistory?: ProcessingEvent[];
}

export interface ProcessingEvent {
    timestamp: Date;
    type: 'pass_started' | 'pass_completed' | 'quality_check' | 'error' | 'decision';
    passNumber?: number;
    details: any;
    duration?: number;
}

export interface ResourceUsage {
    tokensUsed: number;
    modelCalls: number;
    processingTime: number;
    memoryUsage?: number;
    costEstimate?: number;
}

// =============================================================================
// Pass Processing Types
// =============================================================================

export interface PassResult {
    passNumber: number;
    passType: PassType;
    success: boolean;
    result: any;
    content?: string; // Add content property
    qualityScore?: number;
    confidence?: number;
    processingTime: number;
    tokensUsed?: number;
    modelUsed?: string;
    errors?: ProcessingError[];
    error?: string; // Add single error property for compatibility
    warnings?: string[];
    metadata?: PassMetadata;
    metrics?: ProcessingMetrics; // Add metrics property
}

export interface PassMetadata {
    reasoningSteps?: string[];
    alternativesConsidered?: any[];
    confidenceFactors?: Record<string, number>;
    improvements?: string[];
    nextPassRecommendations?: string[];
}

export type PassType =
    | 'analysis_classification'
    | 'context_gathering'
    | 'initial_generation'
    | 'quality_assessment'
    | 'targeted_improvement'
    | 'cross_reference_validation'
    | 'final_polish_integration';

export interface ProcessingError {
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    passNumber: number;
    recoverable: boolean;
    suggestedFix?: string;
}

// =============================================================================
// Quality Assessment Types
// =============================================================================

export interface QualityGate {
    name: string;
    minimumScore: number;
    minimumConfidence?: number; // Add missing property
    minimumQualityScore?: number; // Add missing property
    requiredElements: string[];
    blockingIssues: string[];
    assessmentCriteria: QualityAssessmentCriteria;
    passNumber: number;
    customValidation?: (result: PassResult) => Promise<{ valid: boolean; issues: string[] }>; // Add custom validation
}

export interface QualityAssessmentCriteria {
    consistency: number; // Weight 0-1
    quality: number; // Weight 0-1
    completeness: number; // Weight 0-1
    integration: number; // Weight 0-1
    customCriteria?: Record<string, number>;
}

export interface PassAssessment {
    passNumber: number;
    overallScore: number;
    criteriaScores: Record<string, number>;
    passGate: boolean; // Whether it meets the quality gate
    issues: QualityIssue[];
    strengths: string[];
    improvementAreas: ImprovementArea[];
    recommendation: 'proceed' | 'retry' | 'escalate' | 'abort';
    confidence: number;
}

export interface QualityIssue {
    type: 'consistency' | 'quality' | 'completeness' | 'integration' | 'custom';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedFix: string;
    affectedElements: string[];
    blocking: boolean;
}

export interface ImprovementArea {
    area: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    suggestedActions: string[];
    estimatedImpact: number; // 0-1
}

export interface ImprovementPlan {
    areas: ImprovementArea[];
    prioritizedActions: string[];
    estimatedTime: number;
    resourceRequirements: ResourceRequirements;
    retryCurrentPass?: boolean; // Add missing property
    proceedWithWarning?: boolean; // Add missing property
}

export interface ResourceRequirements {
    modelCalls: number;
    estimatedTokens: number;
    estimatedTime: number;
    requiredCapabilities: string[];
}

// =============================================================================
// Task Classification Types
// =============================================================================

export interface TaskClassification {
    taskType: 'simple' | 'complex' | 'structured' | 'creative';
    latencyTolerance: 'realtime' | 'interactive' | 'batch';
    qualityRequirement: 'draft' | 'standard' | 'premium';
    structuredOutput: boolean;
    estimatedComplexity: number; // 1-10 scale
    recommendedPasses: number;
    suggestedModel: string;
    contextRequirements: ContextRequirements;
}

export interface ContextRequirements {
    ragRequired: boolean;
    ragDomains: string[];
    contextSize: 'small' | 'medium' | 'large' | 'extensive';
    historicalContext: boolean;
    crossReferences: boolean;
}

export interface ComplexityMetrics {
    contentLength: number;
    vocabularyComplexity: number;
    conceptualDensity: number;
    narrativeComplexity: number;
    technicalComplexity: number;
    overallScore: number;
}

// =============================================================================
// Pass Decision Types
// =============================================================================

export interface PassDecision {
    execute: boolean;
    skip?: boolean; // Add skip property
    reason: string;
    alternativeAction?: string;
    skipToPass?: number;
    requiredPreparation?: string[];
    estimatedBenefit?: number;
}

export interface PassProgress {
    requestId: string;
    passNumber: number;
    totalPasses: number;
    passType: PassType;
    status: 'starting' | 'in_progress' | 'quality_check' | 'completed' | 'failed' | 'skipped';
    progress: number; // 0-1
    estimatedTimeRemaining: number;
    currentActivity: string;
    qualityScore?: number;
}

export interface ProgressUpdate {
    requestId: string;
    passNumber: number;
    status: PassProgress['status'];
    progress: number;
    message: string;
    timestamp: Date;
    details?: any;
}

// =============================================================================
// Framework Configuration Types
// =============================================================================

export interface FrameworkConfig {
    defaultQualityGates: QualityGate[];
    modelPreferences: ModelPreferences;
    cachingEnabled: boolean;
    parallelProcessing: boolean;
    maxConcurrentRequests: number;
    timeouts: TimeoutConfig;
    monitoring: MonitoringConfig;
}

export interface ModelPreferences {
    defaultModel: string;
    lightweightModel: string; // For analysis and classification
    heavyweightModel: string; // For complex generation
    structuredOutputModel: string; // For structured/YAML output
    fallbackModels: string[];
}

export interface TimeoutConfig {
    analysisTimeout: number;
    contextGatheringTimeout: number;
    generationTimeout: number;
    qualityAssessmentTimeout: number;
    overallRequestTimeout: number;
}

export interface MonitoringConfig {
    enableMetrics: boolean;
    enableTracing: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsRetentionDays: number;
}

// =============================================================================
// Response Types
// =============================================================================

export interface FrameworkResponse {
    requestId: string;
    success: boolean;
    result: any;
    passResults: PassResult[];
    qualityAssessments: PassAssessment[];
    totalProcessingTime: number;
    resourceUsage: ResourceUsage;
    metadata: ResponseMetadata;
    error?: ProcessingError;
}

export interface ResponseMetadata {
    passesExecuted: number;
    passesPlanned: number;
    qualityImprovements: QualityImprovement[];
    modelUsage: ModelUsageInfo[];
    cacheHits: number;
    processingStrategy: string;
}

export interface QualityImprovement {
    passNumber: number;
    area: string;
    beforeScore: number;
    afterScore: number;
    improvement: number;
    description: string;
}

export interface ModelUsageInfo {
    model: string;
    passNumber: number;
    tokensUsed: number;
    processingTime: number;
    purpose: string;
}

// =============================================================================
// Event Types for Progress Tracking
// =============================================================================

export interface FrameworkEvent {
    type: 'processing_started' | 'pass_complete' | 'quality_check' | 'processing_complete' | 'error';
    requestId: string;
    timestamp: Date;
    data: any;
}

export interface ProcessingStartedEvent extends FrameworkEvent {
    type: 'processing_started';
    data: {
        totalPasses: number;
        estimatedTime: number;
        classification: TaskClassification;
    };
}

export interface PassCompleteEvent extends FrameworkEvent {
    type: 'pass_complete';
    data: {
        passNumber: number;
        passType: PassType;
        result: PassResult;
        nextPass?: PassProgress;
    };
}

export interface QualityCheckEvent extends FrameworkEvent {
    type: 'quality_check';
    data: {
        passNumber: number;
        qualityScore: number;
        issuesFound: string[];
        improvements: string[];
        decision: 'proceed' | 'retry' | 'escalate';
    };
}

// =============================================================================
// Additional Types for UniversalProcessor
// =============================================================================

export interface ProcessingSettings {
    maxPasses: number;
    qualityThreshold: number;
    timeoutPerPass: number;
    enableProgressTracking: boolean;
    enableQualityGates: boolean;
    fallbackOnFailure: boolean;
}

export interface AIResponse {
    id: string;
    content: string;
    success: boolean;
    confidence: number;
    qualityScore: number;
    error?: string;
    processingMetrics: ProcessingMetrics;
    passResults: PassResult[];
    qualityWarnings: QualityWarning[];
}

export interface ProcessingMetrics {
    totalExecutionTime: number;
    passesExecuted: number;
    totalTokens: number;
    averageConfidence: number;
    memoryUsage: number;
}

export interface QualityWarning {
    passNumber: number;
    assessment: PassAssessment;
    improvementPlan: ImprovementPlan;
}

// =============================================================================
// End Additional Types
// =============================================================================

// =============================================================================
// Utility Types
// =============================================================================

export type Awaitable<T> = T | Promise<T>;

export interface Cache<T> {
    get(key: string): Promise<T | null>;
    set(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface Logger {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}
