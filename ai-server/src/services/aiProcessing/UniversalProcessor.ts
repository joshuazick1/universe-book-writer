/**
 * Universal AI Processing Framework - Base Abstract Class
 * 
 * This is the foundational class that all AI processing implementations extend.
 * It provides the core multi-pass processing architecture with quality gates,
 * progress tracking, and intelligent pass selection.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

import {
    AIRequest,
    ProcessingContext,
    PassResult,
    QualityGate,
    PassAssessment,
    ProgressUpdate,
    PassProgress,
    ProcessingSettings,
    AIResponse,
    ProcessingMetrics,
    PassDecision
} from './types.js';
import { QualityGates } from './QualityGates.js';
import { ProgressTracker } from './ProgressTracker.js';
import { PassSelector } from './PassSelector.js';

/**
 * Abstract base class implementing the universal AI processing framework.
 * All AI processing implementations must extend this class and implement
 * the required abstract methods for their specific domain.
 */
export abstract class UniversalProcessor {
    protected qualityGates: QualityGates;
    protected progressTracker: ProgressTracker;
    protected passSelector: PassSelector;
    protected settings: ProcessingSettings;

    constructor(settings?: Partial<ProcessingSettings>) {
        this.qualityGates = new QualityGates();
        this.progressTracker = new ProgressTracker();
        this.passSelector = new PassSelector();
        this.settings = {
            maxPasses: 7,
            qualityThreshold: 0.8,
            timeoutPerPass: 30000, // 30 seconds
            enableProgressTracking: true,
            enableQualityGates: true,
            fallbackOnFailure: true,
            ...settings
        };
    }

    /**
     * Main processing method that orchestrates the multi-pass AI processing
     * workflow with quality gates and progress tracking.
     */
    async process(request: AIRequest): Promise<AIResponse> {
        const startTime = Date.now();
        const context = await this.initializeContext(request);

        try {
            // Determine required passes based on request complexity and type
            const requiredPasses = await this.determineRequiredPasses(request);

            if (this.settings.enableProgressTracking) {
                this.progressTracker.initializeProgress(request.id, requiredPasses);
            }

            let currentResult: PassResult | null = null;
            const allResults: PassResult[] = [];

            // Execute passes sequentially with quality gates
            for (let passNumber = 1; passNumber <= requiredPasses; passNumber++) {
                // Check if this pass should be executed
                const passDecision = await this.passSelector.shouldExecutePass(
                    passNumber,
                    context,
                    currentResult
                );

                if (!passDecision.execute) {
                    if (this.settings.enableProgressTracking) {
                        this.progressTracker.trackPassProgress(request.id, {
                            passNumber,
                            status: 'skipped',
                            reason: passDecision.reason,
                            timestamp: Date.now()
                        });
                    }
                    continue;
                }

                // Execute the pass
                try {
                    const passStartTime = Date.now();
                    currentResult = await this.executePassWithTimeout(
                        passNumber,
                        request,
                        context,
                        this.settings.timeoutPerPass
                    );

                    const passEndTime = Date.now();
                    currentResult.metrics = {
                        totalExecutionTime: passEndTime - passStartTime,
                        passesExecuted: 1,
                        totalTokens: currentResult.tokensUsed || 0,
                        averageConfidence: currentResult.confidence || 0,
                        memoryUsage: 0
                    };

                    allResults.push(currentResult);

                    // Track progress
                    if (this.settings.enableProgressTracking) {
                        this.progressTracker.trackPassProgress(request.id, {
                            passNumber,
                            status: 'completed',
                            result: currentResult,
                            timestamp: Date.now()
                        });
                    }

                    // Quality gate assessment (if enabled)
                    if (this.settings.enableQualityGates && passNumber < requiredPasses) {
                        const qualityGate = await this.getQualityGateForPass(passNumber, request);
                        const assessment = await this.assessPassQuality(currentResult, qualityGate);

                        // Check if quality is sufficient to proceed
                        if (!this.qualityGates.shouldProceedToNextPass(assessment)) {
                            // Quality threshold not met - decide how to proceed
                            const improvementPlan = this.qualityGates.identifyImprovementAreas(assessment);

                            if (improvementPlan.retryCurrentPass) {
                                // Retry current pass with improvements
                                context.improvementPlan = improvementPlan;
                                passNumber--; // Will be incremented by loop
                                continue;
                            } else if (improvementPlan.proceedWithWarning) {
                                // Proceed but track quality warning
                                context.qualityWarnings.push({
                                    passNumber,
                                    assessment,
                                    improvementPlan
                                });
                            } else {
                                // Stop processing - quality too low
                                throw new Error(`Quality threshold not met at pass ${passNumber}. Assessment: ${JSON.stringify(assessment)}`);
                            }
                        }
                    }

                } catch (passError) {
                    // Handle pass failure
                    const errorResult: PassResult = {
                        passNumber,
                        passType: 'initial_generation', // Default pass type
                        success: false,
                        result: null,
                        content: '',
                        confidence: 0,
                        qualityScore: 0,
                        processingTime: 0,
                        error: passError instanceof Error ? passError.message : String(passError),
                        errors: [{
                            code: 'PASS_EXECUTION_ERROR',
                            message: passError instanceof Error ? passError.message : String(passError),
                            severity: 'critical',
                            passNumber,
                            recoverable: false
                        }],
                        metrics: {
                            totalExecutionTime: 0,
                            passesExecuted: 0,
                            totalTokens: 0,
                            averageConfidence: 0,
                            memoryUsage: 0
                        }
                    };

                    allResults.push(errorResult);

                    if (this.settings.enableProgressTracking) {
                        this.progressTracker.trackPassProgress(request.id, {
                            passNumber,
                            status: 'failed',
                            error: errorResult.error,
                            timestamp: Date.now()
                        });
                    }

                    // Decide whether to continue or fail
                    if (this.settings.fallbackOnFailure && passNumber > 1) {
                        // Use result from previous pass
                        break;
                    } else {
                        throw passError;
                    }
                }
            }

            // Compile final response
            const finalResult = currentResult || allResults[allResults.length - 1];
            const endTime = Date.now();

            const response: AIResponse = {
                id: request.id,
                content: finalResult?.content || finalResult?.result || '',
                success: finalResult?.success || false,
                confidence: finalResult?.confidence || 0,
                qualityScore: finalResult?.qualityScore || 0,
                processingMetrics: {
                    totalExecutionTime: endTime - startTime,
                    passesExecuted: allResults.length,
                    totalTokens: allResults.reduce((sum, result) =>
                        sum + (result.metrics?.totalTokens || result.tokensUsed || 0), 0),
                    averageConfidence: allResults.reduce((sum, result) =>
                        sum + (result.confidence || 0), 0) / Math.max(1, allResults.length),
                    memoryUsage: Math.max(...allResults.map(result =>
                        result.metrics?.memoryUsage || 0), 0)
                },
                passResults: allResults,
                qualityWarnings: context.qualityWarnings
            };

            // Final progress update
            if (this.settings.enableProgressTracking) {
                this.progressTracker.finalizeProgress(request.id, response);
            }

            return response;

        } catch (error) {
            // Handle processing failure
            const errorResponse: AIResponse = {
                id: request.id,
                content: '',
                success: false,
                confidence: 0,
                qualityScore: 0,
                error: error instanceof Error ? error.message : String(error),
                processingMetrics: {
                    totalExecutionTime: Date.now() - startTime,
                    passesExecuted: 0,
                    totalTokens: 0,
                    averageConfidence: 0,
                    memoryUsage: 0
                },
                passResults: [],
                qualityWarnings: context.qualityWarnings || []
            };

            if (this.settings.enableProgressTracking) {
                this.progressTracker.finalizeProgress(request.id, errorResponse);
            }

            return errorResponse;
        }
    }

    /**
     * Execute a pass with timeout protection
     */
    private async executePassWithTimeout(
        passNumber: number,
        request: AIRequest,
        context: ProcessingContext,
        timeout: number
    ): Promise<PassResult> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Pass ${passNumber} timed out after ${timeout}ms`));
            }, timeout);

            this.executePass(passNumber, request, context)
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    /**
     * Initialize processing context with default values
     */
    protected async initializeContext(request: AIRequest): Promise<ProcessingContext> {
        return {
            requestId: request.id,
            startTime: Date.now(),
            settings: this.settings,
            qualityWarnings: [],
            cache: new Map(),
            metadata: {
                processorType: this.constructor.name,
                version: '1.0.0'
            }
        };
    }

    /**
     * Get the appropriate quality gate for a specific pass
     */
    protected async getQualityGateForPass(passNumber: number, request: AIRequest): Promise<QualityGate> {
        // Default quality gate - can be overridden by subclasses
        return {
            name: `Pass ${passNumber} Quality Gate`,
            passNumber,
            minimumScore: 0.7,
            minimumConfidence: 0.7,
            minimumQualityScore: 0.75,
            requiredElements: [],
            blockingIssues: ['critical_error', 'invalid_format', 'incomplete_output'],
            assessmentCriteria: {
                consistency: 0.25,
                quality: 0.35,
                completeness: 0.25,
                integration: 0.15
            },
            customValidation: async () => ({ valid: true, issues: [] })
        };
    }

    // ==========================================
    // ABSTRACT METHODS - Must be implemented by subclasses
    // ==========================================

    /**
     * Determine how many passes are required for this request.
     * This should be based on request complexity, type, and quality requirements.
     */
    abstract determineRequiredPasses(request: AIRequest): Promise<number>;

    /**
     * Execute a specific pass of the processing pipeline.
     * Each pass should build upon previous results and move toward the final goal.
     */
    abstract executePass(
        passNumber: number,
        request: AIRequest,
        context: ProcessingContext
    ): Promise<PassResult>;

    /**
     * Assess the quality of a pass result against the specified quality gate.
     * This determines whether processing can proceed to the next pass.
     */
    abstract assessPassQuality(
        result: PassResult,
        gate: QualityGate
    ): Promise<PassAssessment>;

    // ==========================================
    // OPTIONAL OVERRIDE METHODS
    // ==========================================

    /**
     * Validate request before processing begins.
     * Override to add specific validation logic.
     */
    protected async validateRequest(request: AIRequest): Promise<boolean> {
        return !!(request.id && request.type && request.content);
    }

    /**
     * Post-process the final response before returning.
     * Override to add specific post-processing logic.
     */
    protected async postProcessResponse(response: AIResponse): Promise<AIResponse> {
        return response;
    }

    /**
     * Handle errors that occur during processing.
     * Override to add specific error handling logic.
     */
    protected async handleProcessingError(error: Error, context: ProcessingContext): Promise<void> {
        console.error(`Processing error in ${this.constructor.name}:`, error);
    }

    /**
     * Cleanup resources after processing completes.
     * Override to add specific cleanup logic.
     */
    protected async cleanup(context: ProcessingContext): Promise<void> {
        // Default: clear cache
        context.cache?.clear();
    }
}
