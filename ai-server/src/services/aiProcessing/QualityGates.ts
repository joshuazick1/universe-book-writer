/**
 * Quality Gates System for Universal AI Processing Framework
 * 
 * Manages quality assessment and gate validation for multi-pass processing.
 * Determines whether a pass meets quality standards and can proceed to the next pass.
 * 
 * @author Universe Book Writer Team
 * @version 1.0.0
 */

import {
    PassAssessment,
    QualityGate,
    ImprovementPlan,
    QualityIssue,
    ImprovementArea,
    PassResult
} from './types.js';

/**
 * Manages quality gates and assessments throughout the processing pipeline
 */
export class QualityGates {
    private qualityThreshold: number;
    private strictMode: boolean;

    constructor(qualityThreshold: number = 0.8, strictMode: boolean = false) {
        this.qualityThreshold = qualityThreshold;
        this.strictMode = strictMode;
    }

    /**
     * Determine if processing should proceed to the next pass based on quality assessment
     */
    shouldProceedToNextPass(assessment: PassAssessment): boolean {
        // Check overall score
        if (assessment.overallScore < this.qualityThreshold) {
            return false;
        }

        // Check for blocking issues
        const blockingIssues = assessment.issues.filter(issue => issue.blocking);
        if (blockingIssues.length > 0) {
            return false;
        }

        // In strict mode, check for critical severity issues
        if (this.strictMode) {
            const criticalIssues = assessment.issues.filter(issue => issue.severity === 'critical');
            if (criticalIssues.length > 0) {
                return false;
            }
        }

        // Check confidence level
        if (assessment.confidence < 0.7) {
            return false;
        }

        return true;
    }

    /**
     * Identify areas for improvement and create an action plan
     */
    identifyImprovementAreas(assessment: PassAssessment): ImprovementPlan {
        const areas: ImprovementArea[] = [];
        let retryCurrentPass = false;
        let proceedWithWarning = false;

        // Analyze issues by severity and type
        const criticalIssues = assessment.issues.filter(i => i.severity === 'critical');
        const highSeverityIssues = assessment.issues.filter(i => i.severity === 'high');
        const mediumSeverityIssues = assessment.issues.filter(i => i.severity === 'medium');

        // Critical issues require immediate retry
        if (criticalIssues.length > 0) {
            retryCurrentPass = true;
            areas.push({
                area: 'critical_fixes',
                description: 'Address critical quality issues before proceeding',
                priority: 'high',
                suggestedActions: criticalIssues.map(issue => issue.suggestedFix),
                estimatedImpact: 0.9
            });
        }

        // High severity issues might require retry depending on count and impact
        if (highSeverityIssues.length > 2) {
            retryCurrentPass = true;
            areas.push({
                area: 'high_priority_fixes',
                description: 'Multiple high-severity issues detected',
                priority: 'high',
                suggestedActions: highSeverityIssues.map(issue => issue.suggestedFix),
                estimatedImpact: 0.7
            });
        } else if (highSeverityIssues.length > 0) {
            proceedWithWarning = true;
            areas.push({
                area: 'high_priority_improvements',
                description: 'High-severity issues to address in next pass',
                priority: 'medium',
                suggestedActions: highSeverityIssues.map(issue => issue.suggestedFix),
                estimatedImpact: 0.5
            });
        }

        // Medium severity issues create improvement opportunities
        if (mediumSeverityIssues.length > 0) {
            areas.push({
                area: 'quality_improvements',
                description: 'General quality improvements',
                priority: 'medium',
                suggestedActions: mediumSeverityIssues.map(issue => issue.suggestedFix),
                estimatedImpact: 0.3
            });
        }

        // Build prioritized action list
        const prioritizedActions: string[] = [];

        // Add critical actions first
        areas.filter(area => area.priority === 'high')
            .forEach(area => prioritizedActions.push(...area.suggestedActions));

        // Add medium priority actions
        areas.filter(area => area.priority === 'medium')
            .forEach(area => prioritizedActions.push(...area.suggestedActions));

        return {
            areas,
            prioritizedActions,
            estimatedTime: this.estimateImprovementTime(areas),
            resourceRequirements: {
                modelCalls: Math.ceil(areas.length * 1.5),
                estimatedTokens: areas.length * 500,
                estimatedTime: this.estimateImprovementTime(areas),
                requiredCapabilities: ['analysis', 'revision', 'quality_assessment']
            },
            retryCurrentPass,
            proceedWithWarning
        } as ImprovementPlan & { retryCurrentPass: boolean; proceedWithWarning: boolean };
    }

    /**
     * Create a default quality gate for a specific pass
     */
    createDefaultQualityGate(passNumber: number, passType: string): QualityGate {
        const baseGate: QualityGate = {
            name: `Pass ${passNumber} Quality Gate`,
            minimumScore: this.qualityThreshold,
            requiredElements: [],
            blockingIssues: ['critical_error', 'invalid_format', 'incomplete_output'],
            assessmentCriteria: {
                consistency: 0.25,
                quality: 0.35,
                completeness: 0.25,
                integration: 0.15
            },
            passNumber
        };

        // Customize gate based on pass type
        switch (passType) {
            case 'analysis_classification':
                baseGate.requiredElements = ['task_type', 'complexity_score', 'recommendations'];
                baseGate.assessmentCriteria.quality = 0.4;
                baseGate.assessmentCriteria.completeness = 0.3;
                break;

            case 'context_gathering':
                baseGate.requiredElements = ['relevant_context', 'context_quality', 'coverage_assessment'];
                baseGate.assessmentCriteria.completeness = 0.4;
                baseGate.assessmentCriteria.integration = 0.25;
                break;

            case 'initial_generation':
                baseGate.requiredElements = ['content', 'structure', 'initial_quality'];
                baseGate.assessmentCriteria.quality = 0.4;
                baseGate.assessmentCriteria.consistency = 0.3;
                break;

            case 'quality_assessment':
                baseGate.requiredElements = ['quality_metrics', 'issue_identification', 'improvement_suggestions'];
                baseGate.assessmentCriteria.quality = 0.5;
                baseGate.assessmentCriteria.completeness = 0.3;
                break;

            case 'targeted_improvement':
                baseGate.requiredElements = ['improvements_applied', 'quality_increase', 'validation_results'];
                baseGate.assessmentCriteria.quality = 0.45;
                baseGate.assessmentCriteria.consistency = 0.35;
                break;

            case 'final_polish_integration':
                baseGate.minimumScore = Math.max(this.qualityThreshold, 0.85);
                baseGate.requiredElements = ['final_content', 'quality_validation', 'integration_check'];
                baseGate.assessmentCriteria.quality = 0.4;
                baseGate.assessmentCriteria.integration = 0.3;
                break;

            default:
                // Use base configuration
                break;
        }

        return baseGate;
    }

    /**
     * Assess the quality of a pass result against a quality gate
     */
    async assessPassQuality(result: PassResult, gate: QualityGate): Promise<PassAssessment> {
        const issues: QualityIssue[] = [];
        const strengths: string[] = [];
        const criteriaScores: Record<string, number> = {};

        // Check required elements
        for (const element of gate.requiredElements) {
            if (!this.hasRequiredElement(result, element)) {
                issues.push({
                    type: 'completeness',
                    severity: 'high',
                    description: `Missing required element: ${element}`,
                    suggestedFix: `Ensure ${element} is included in the result`,
                    affectedElements: [element],
                    blocking: true
                });
            }
        }

        // Check for blocking issues
        for (const blockingIssue of gate.blockingIssues) {
            if (this.hasBlockingIssue(result, blockingIssue)) {
                issues.push({
                    type: 'quality',
                    severity: 'critical',
                    description: `Blocking issue detected: ${blockingIssue}`,
                    suggestedFix: `Address the ${blockingIssue} before proceeding`,
                    affectedElements: [blockingIssue],
                    blocking: true
                });
            }
        }

        // Calculate criteria scores
        criteriaScores.consistency = this.assessConsistency(result);
        criteriaScores.quality = this.assessQuality(result);
        criteriaScores.completeness = this.assessCompleteness(result, gate);
        criteriaScores.integration = this.assessIntegration(result);

        // Calculate overall score using weighted criteria
        const overallScore = Object.entries(gate.assessmentCriteria).reduce((sum, [criterion, weight]) => {
            return sum + (criteriaScores[criterion] || 0) * weight;
        }, 0);

        // Identify strengths
        Object.entries(criteriaScores).forEach(([criterion, score]) => {
            if (score > 0.8) {
                strengths.push(`Strong ${criterion} (${(score * 100).toFixed(1)}%)`);
            }
        });

        // Determine recommendation
        let recommendation: 'proceed' | 'retry' | 'escalate' | 'abort' = 'proceed';

        if (issues.some(i => i.blocking || i.severity === 'critical')) {
            recommendation = 'retry';
        } else if (overallScore < gate.minimumScore) {
            recommendation = overallScore < (gate.minimumScore * 0.7) ? 'retry' : 'proceed';
        }

        // Calculate confidence based on score consistency and issue count
        const confidence = Math.max(0, Math.min(1,
            overallScore - (issues.length * 0.1) + (strengths.length * 0.05)
        ));

        return {
            passNumber: gate.passNumber,
            overallScore,
            criteriaScores,
            passGate: overallScore >= gate.minimumScore && !issues.some(i => i.blocking),
            issues,
            strengths,
            improvementAreas: this.generateImprovementAreas(criteriaScores, issues),
            recommendation,
            confidence
        };
    }

    /**
     * Private helper methods
     */

    private hasRequiredElement(result: PassResult, element: string): boolean {
        // Check if the result contains the required element
        if (result.metadata && typeof result.metadata === 'object') {
            const metadata = result.metadata as Record<string, any>;
            if (metadata[element]) return true;
        }
        if (result.result && typeof result.result === 'object' && result.result !== null) {
            const resultData = result.result as Record<string, any>;
            if (resultData[element]) return true;
        }
        return false;
    }

    private hasBlockingIssue(result: PassResult, issue: string): boolean {
        // Check for specific blocking issues
        if (result.errors && result.errors.some(error => error.message && error.message.includes(issue))) return true;
        if (!result.success && issue === 'critical_error') return true;
        return false;
    }

    private assessConsistency(result: PassResult): number {
        // Basic consistency assessment
        let score = 0.7; // Base score

        if (result.success) score += 0.2;
        if (result.qualityScore && result.qualityScore > 0.7) score += 0.1;
        if (!result.errors || result.errors.length === 0) score += 0.1;

        return Math.min(1, score);
    }

    private assessQuality(result: PassResult): number {
        // Return the quality score if available, otherwise estimate
        if (result.qualityScore !== undefined) {
            return result.qualityScore;
        }

        // Estimate quality based on success and errors
        let score = result.success ? 0.6 : 0.3;
        if (!result.errors || result.errors.length === 0) score += 0.2;
        if (result.confidence && result.confidence > 0.7) score += 0.2;

        return Math.min(1, score);
    }

    private assessCompleteness(result: PassResult, gate: QualityGate): number {
        // Check how many required elements are present
        const requiredCount = gate.requiredElements.length;
        if (requiredCount === 0) return 0.8; // Default if no specific requirements

        const presentCount = gate.requiredElements.filter(element =>
            this.hasRequiredElement(result, element)
        ).length;

        return presentCount / requiredCount;
    }

    private assessIntegration(result: PassResult): number {
        // Basic integration assessment
        let score = 0.7; // Base score

        if (result.metadata && Object.keys(result.metadata).length > 0) score += 0.1;
        if (result.result && typeof result.result === 'object') score += 0.1;
        if (result.confidence && result.confidence > 0.6) score += 0.1;

        return Math.min(1, score);
    }

    private generateImprovementAreas(criteriaScores: Record<string, number>, issues: QualityIssue[]): ImprovementArea[] {
        const areas: ImprovementArea[] = [];

        // Generate areas based on low-scoring criteria
        Object.entries(criteriaScores).forEach(([criterion, score]) => {
            if (score < 0.7) {
                areas.push({
                    area: criterion,
                    description: `Improve ${criterion} (current score: ${(score * 100).toFixed(1)}%)`,
                    priority: score < 0.5 ? 'high' : 'medium',
                    suggestedActions: this.getSuggestedActionsForCriterion(criterion),
                    estimatedImpact: 1 - score
                });
            }
        });

        return areas;
    }

    private getSuggestedActionsForCriterion(criterion: string): string[] {
        const actionMap: Record<string, string[]> = {
            consistency: [
                'Review for internal contradictions',
                'Ensure consistent terminology',
                'Verify logical flow'
            ],
            quality: [
                'Enhance detail and depth',
                'Improve clarity and precision',
                'Add supporting evidence'
            ],
            completeness: [
                'Add missing required elements',
                'Expand insufficient sections',
                'Ensure comprehensive coverage'
            ],
            integration: [
                'Improve connections between elements',
                'Ensure coherent overall structure',
                'Validate cross-references'
            ]
        };

        return actionMap[criterion] || ['Review and improve this area'];
    }

    private estimateImprovementTime(areas: ImprovementArea[]): number {
        // Estimate time in seconds based on improvement areas
        const baseTime = 30; // 30 seconds base
        const timePerArea = 45; // 45 seconds per area
        const priorityMultiplier = {
            'high': 1.5,
            'medium': 1.0,
            'low': 0.7
        };

        return baseTime + areas.reduce((total, area) => {
            const multiplier = priorityMultiplier[area.priority as keyof typeof priorityMultiplier] || 1.0;
            return total + (timePerArea * multiplier);
        }, 0);
    }
}
