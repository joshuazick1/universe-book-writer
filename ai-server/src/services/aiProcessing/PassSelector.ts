/**
 * Pass Selection System for Universal AI Processing Framework
 * 
 * Determines which passes should be executed based on request complexity,
 * previous results, and quality requirements. Implements intelligent pass
 * skipping and optimization strategies.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

import {
    PassDecision,
    ProcessingContext,
    PassResult,
    AIRequest,
    TaskClassification,
    PassType
} from './types.js';

interface PassExecutionPlan {
    passNumber: number;
    passType: PassType;
    required: boolean;
    estimatedBenefit: number;
    dependencies: number[];
    conditions: string[];
}

/**
 * Manages intelligent pass selection and execution decisions
 */
export class PassSelector {
    private passPlans: Map<string, PassExecutionPlan[]> = new Map();
    private executionHistory: Map<string, number[]> = new Map(); // requestId -> executed passes

    /**
     * Determine if a specific pass should be executed
     */
    async shouldExecutePass(
        passNumber: number,
        context: ProcessingContext,
        previousResult: PassResult | null
    ): Promise<PassDecision> {
        const requestId = context.requestId;

        // Get or create execution plan for this request
        const plan = this.getOrCreateExecutionPlan(requestId, context);
        const passInfo = plan.find(p => p.passNumber === passNumber);

        if (!passInfo) {
            return {
                execute: false,
                reason: `Pass ${passNumber} not found in execution plan`,
                alternativeAction: 'skip_to_next'
            };
        }

        // Check if pass is required
        if (passInfo.required) {
            return {
                execute: true,
                reason: `Pass ${passNumber} (${passInfo.passType}) is required`,
                estimatedBenefit: passInfo.estimatedBenefit
            };
        }

        // Check dependencies
        const executedPasses = this.executionHistory.get(requestId) || [];
        const missingDependencies = passInfo.dependencies.filter(dep => !executedPasses.includes(dep));

        if (missingDependencies.length > 0) {
            return {
                execute: false,
                reason: `Missing dependencies: passes ${missingDependencies.join(', ')}`,
                alternativeAction: 'execute_dependencies_first',
                skipToPass: Math.min(...missingDependencies)
            };
        }

        // Evaluate conditions based on previous results
        const conditionResults = await this.evaluateConditions(
            passInfo.conditions,
            previousResult,
            context
        );

        if (!conditionResults.allMet) {
            return {
                execute: false,
                reason: `Conditions not met: ${conditionResults.failedConditions.join(', ')}`,
                alternativeAction: conditionResults.suggestedAction || 'skip_to_next'
            };
        }

        // Check if pass would provide significant benefit
        const estimatedBenefit = await this.estimatePassBenefit(
            passInfo,
            previousResult,
            context
        );

        if (estimatedBenefit < 0.3) {
            return {
                execute: false,
                reason: `Low estimated benefit (${(estimatedBenefit * 100).toFixed(1)}%)`,
                alternativeAction: 'skip_to_next',
                estimatedBenefit
            };
        }

        // Check for early success conditions
        if (await this.checkEarlySuccessConditions(previousResult, context, passNumber)) {
            return {
                execute: false,
                reason: 'Early success conditions met - remaining passes not needed',
                alternativeAction: 'complete_processing'
            };
        }

        // Execute the pass
        return {
            execute: true,
            reason: `Pass ${passNumber} (${passInfo.passType}) will provide benefit`,
            estimatedBenefit
        };
    }

    /**
     * Record that a pass has been executed
     */
    recordPassExecution(requestId: string, passNumber: number): void {
        const executed = this.executionHistory.get(requestId) || [];
        if (!executed.includes(passNumber)) {
            executed.push(passNumber);
            this.executionHistory.set(requestId, executed);
        }
    }

    /**
     * Get the recommended pass sequence for a request
     */
    getRecommendedPassSequence(context: ProcessingContext): number[] {
        const plan = this.getOrCreateExecutionPlan(context.requestId, context);
        return plan
            .filter(p => p.required || p.estimatedBenefit > 0.5)
            .sort((a, b) => a.passNumber - b.passNumber)
            .map(p => p.passNumber);
    }

    /**
     * Optimize the execution plan based on request characteristics
     */
    optimizeExecutionPlan(requestId: string, classification: TaskClassification): void {
        const plan = this.passPlans.get(requestId);
        if (!plan) return;

        // Adjust plan based on task classification
        plan.forEach(passInfo => {
            switch (classification.taskType) {
                case 'simple':
                    // For simple tasks, reduce passes
                    if (passInfo.passNumber > 4) {
                        passInfo.required = false;
                        passInfo.estimatedBenefit *= 0.5;
                    }
                    break;

                case 'complex':
                    // For complex tasks, ensure all quality passes
                    if (passInfo.passType === 'quality_assessment' ||
                        passInfo.passType === 'targeted_improvement') {
                        passInfo.required = true;
                        passInfo.estimatedBenefit = Math.max(0.8, passInfo.estimatedBenefit);
                    }
                    break;

                case 'creative':
                    // For creative tasks, emphasize generation and polish
                    if (passInfo.passType === 'initial_generation' ||
                        passInfo.passType === 'final_polish_integration') {
                        passInfo.estimatedBenefit = Math.max(0.9, passInfo.estimatedBenefit);
                    }
                    break;

                case 'structured':
                    // For structured tasks, emphasize validation
                    if (passInfo.passType === 'cross_reference_validation') {
                        passInfo.required = true;
                        passInfo.estimatedBenefit = Math.max(0.85, passInfo.estimatedBenefit);
                    }
                    break;
            }

            // Adjust for quality requirements
            if (classification.qualityRequirement === 'premium') {
                passInfo.estimatedBenefit = Math.max(0.7, passInfo.estimatedBenefit);
            } else if (classification.qualityRequirement === 'draft') {
                passInfo.estimatedBenefit *= 0.7;
                if (passInfo.passNumber > 5) {
                    passInfo.required = false;
                }
            }

            // Adjust for latency tolerance
            if (classification.latencyTolerance === 'realtime') {
                passInfo.estimatedBenefit *= 0.6;
                if (passInfo.passNumber > 3) {
                    passInfo.required = false;
                }
            }
        });
    }

    /**
     * Clean up resources for completed requests
     */
    cleanup(requestId: string): void {
        this.passPlans.delete(requestId);
        this.executionHistory.delete(requestId);
    }

    /**
     * Private helper methods
     */

    private getOrCreateExecutionPlan(requestId: string, context: ProcessingContext): PassExecutionPlan[] {
        let plan = this.passPlans.get(requestId);

        if (!plan) {
            plan = this.createDefaultExecutionPlan(context);
            this.passPlans.set(requestId, plan);
        }

        return plan;
    }

    private createDefaultExecutionPlan(context: ProcessingContext): PassExecutionPlan[] {
        const plans: PassExecutionPlan[] = [
            {
                passNumber: 1,
                passType: 'analysis_classification',
                required: true,
                estimatedBenefit: 0.9,
                dependencies: [],
                conditions: []
            },
            {
                passNumber: 2,
                passType: 'context_gathering',
                required: true,
                estimatedBenefit: 0.85,
                dependencies: [1],
                conditions: ['requires_context']
            },
            {
                passNumber: 3,
                passType: 'initial_generation',
                required: true,
                estimatedBenefit: 0.95,
                dependencies: [1, 2],
                conditions: []
            },
            {
                passNumber: 4,
                passType: 'quality_assessment',
                required: false,
                estimatedBenefit: 0.7,
                dependencies: [3],
                conditions: ['quality_below_threshold']
            },
            {
                passNumber: 5,
                passType: 'targeted_improvement',
                required: false,
                estimatedBenefit: 0.6,
                dependencies: [4],
                conditions: ['improvement_opportunities_identified']
            },
            {
                passNumber: 6,
                passType: 'cross_reference_validation',
                required: false,
                estimatedBenefit: 0.5,
                dependencies: [3],
                conditions: ['has_references_to_validate']
            },
            {
                passNumber: 7,
                passType: 'final_polish_integration',
                required: false,
                estimatedBenefit: 0.4,
                dependencies: [3],
                conditions: ['multiple_passes_executed']
            }
        ];

        return plans;
    }

    private async evaluateConditions(
        conditions: string[],
        previousResult: PassResult | null,
        context: ProcessingContext
    ): Promise<{ allMet: boolean; failedConditions: string[]; suggestedAction?: string }> {
        const failedConditions: string[] = [];

        for (const condition of conditions) {
            const met = await this.evaluateCondition(condition, previousResult, context);
            if (!met) {
                failedConditions.push(condition);
            }
        }

        let suggestedAction: string | undefined;

        if (failedConditions.length > 0) {
            // Determine suggested action based on failed conditions
            if (failedConditions.includes('requires_context')) {
                suggestedAction = 'gather_context_first';
            } else if (failedConditions.includes('quality_below_threshold')) {
                suggestedAction = 'skip_to_next';
            } else {
                suggestedAction = 'skip_to_next';
            }
        }

        return {
            allMet: failedConditions.length === 0,
            failedConditions,
            suggestedAction
        };
    }

    private async evaluateCondition(
        condition: string,
        previousResult: PassResult | null,
        context: ProcessingContext
    ): Promise<boolean> {
        switch (condition) {
            case 'requires_context':
                // Check if the request needs additional context
                return (context.request?.ragDomain !== 'none' && context.request?.ragDomain !== undefined) ||
                    (context.request?.content !== undefined && context.request.content.length > 1000);

            case 'quality_below_threshold':
                // Check if previous result quality is below threshold
                return previousResult?.qualityScore !== undefined &&
                    previousResult.qualityScore < (context.settings?.qualityThreshold || 0.8);

            case 'improvement_opportunities_identified':
                // Check if there are specific improvement opportunities
                return !!(previousResult?.metadata &&
                    (previousResult.metadata as any).improvementOpportunities?.length > 0);

            case 'has_references_to_validate':
                // Check if there are references that need validation
                return previousResult?.result &&
                    typeof previousResult.result === 'string' &&
                    (previousResult.result.includes('@ref:') ||
                        previousResult.result.includes('[') ||
                        previousResult.result.includes('see also'));

            case 'multiple_passes_executed':
                // Check if multiple passes have been executed
                const executed = this.executionHistory.get(context.requestId) || [];
                return executed.length >= 3;

            default:
                // Unknown condition - assume not met
                console.warn(`Unknown condition: ${condition}`);
                return false;
        }
    }

    private async estimatePassBenefit(
        passInfo: PassExecutionPlan,
        previousResult: PassResult | null,
        context: ProcessingContext
    ): Promise<number> {
        let benefit = passInfo.estimatedBenefit;

        // Adjust based on previous result quality
        if (previousResult?.qualityScore !== undefined) {
            if (previousResult.qualityScore > 0.9) {
                // High quality - reduce benefit of further passes
                benefit *= 0.7;
            } else if (previousResult.qualityScore < 0.6) {
                // Low quality - increase benefit of improvement passes
                if (passInfo.passType === 'quality_assessment' ||
                    passInfo.passType === 'targeted_improvement') {
                    benefit = Math.min(1.0, benefit * 1.3);
                }
            }
        }

        // Adjust based on confidence
        if (previousResult?.confidence !== undefined) {
            if (previousResult.confidence > 0.85) {
                benefit *= 0.8;
            } else if (previousResult.confidence < 0.5) {
                benefit = Math.min(1.0, benefit * 1.2);
            }
        }

        // Adjust based on errors
        if (previousResult?.errors && previousResult.errors.length > 0) {
            if (passInfo.passType === 'quality_assessment' ||
                passInfo.passType === 'targeted_improvement') {
                benefit = Math.min(1.0, benefit * 1.4);
            }
        }

        return Math.max(0, Math.min(1, benefit));
    }

    private async checkEarlySuccessConditions(
        previousResult: PassResult | null,
        context: ProcessingContext,
        currentPass: number
    ): Promise<boolean> {
        // Don't check early success before pass 3
        if (currentPass < 3) return false;

        // Check if we have a high-quality result
        if (previousResult?.qualityScore !== undefined &&
            previousResult.qualityScore > 0.95 &&
            previousResult.confidence !== undefined &&
            previousResult.confidence > 0.9 &&
            (!previousResult.errors || previousResult.errors.length === 0)) {

            // For draft quality, this is sufficient
            if (context.request?.qualityRequirement === 'draft') {
                return true;
            }

            // For standard quality, need to check pass 4 or higher
            if (context.request?.qualityRequirement === 'standard' && currentPass >= 4) {
                return true;
            }
        }

        return false;
    }
}
