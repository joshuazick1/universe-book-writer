/**
 * Confidence Filter - Phase 2 Enhancement
 * Manages confidence-based filtering and adaptive thresholds
 */

import { ParsedEntity, EntityRelationship, EnhancedParsedEntity, FilteringResult } from '../core/interfaces.js';
import { EntityType, ConfidenceLevel, EntityTypeUtils } from '../core/entityTypes.js';
import { logInfo, logError, logDebug } from '../../../logger.js';

export interface ConfidenceThresholds {
    // Global thresholds
    globalMinimum: number;
    globalMaximum: number;
    
    // Per-entity-type thresholds
    entityTypeThresholds: Partial<Record<EntityType, number>>;
    
    // Relationship thresholds
    relationshipMinimum: number;
    relationshipTypeThresholds: Partial<Record<string, number>>;
    
    // Auto-processing thresholds
    autoCreateRAGNodes: number;
    autoMergeEntities: number;
    requireHumanReview: number;
}

export interface FilteringOptions {
    strictMode: boolean;
    allowLowConfidenceDialogue: boolean;
    prioritizeUniqueEntities: boolean;
    adaptiveThresholds: boolean;
    contextualAdjustment: boolean;
}

export interface FilteringStatistics {
    totalProcessed: number;
    acceptanceRate: number;
    rejectionRate: number;
    reviewRate: number;
    averageConfidence: number;
    confidenceDistribution: Record<ConfidenceLevel, number>;
    typeBreakdown: Record<EntityType, { accepted: number; rejected: number; reviewed: number }>;
}

export class ConfidenceFilter {
    private defaultThresholds: ConfidenceThresholds;
    private performanceHistory: PerformanceMetric[] = [];

    constructor() {
        this.defaultThresholds = this.initializeDefaultThresholds();
    }

    /**
     * Filter entities based on confidence thresholds
     */
    async filterEntities(
        entities: ParsedEntity[],
        relationships: EntityRelationship[] = [],
        options: FilteringOptions = this.getDefaultFilteringOptions(),
        customThresholds?: Partial<ConfidenceThresholds>
    ): Promise<FilteringResult> {
        const startTime = Date.now();
        
        logInfo(`Filtering ${entities.length} entities with confidence thresholds`);

        // Merge custom thresholds with defaults
        const thresholds = this.mergeThresholds(this.defaultThresholds, customThresholds);

        // Apply adaptive adjustments if enabled
        if (options.adaptiveThresholds) {
            this.adjustThresholdsBasedOnPerformance(thresholds);
        }

        // Apply contextual confidence adjustments if enabled
        let adjustedEntities = entities;
        const adjustedConfidences: Array<{ entityId: string; oldConfidence: number; newConfidence: number; reason: string }> = [];
        
        if (options.contextualAdjustment) {
            const { entities: adjusted, adjustments } = this.applyContextualAdjustments(entities, relationships);
            adjustedEntities = adjusted;
            adjustedConfidences.push(...adjustments);
        }

        // Filter entities into categories
        const accepted: ParsedEntity[] = [];
        const rejected: ParsedEntity[] = [];
        const flaggedForReview: ParsedEntity[] = [];

        for (const entity of adjustedEntities) {
            const filterDecision = this.evaluateEntity(entity, thresholds, options);
            
            switch (filterDecision.action) {
                case 'accept':
                    accepted.push(entity);
                    break;
                case 'reject':
                    rejected.push(entity);
                    break;
                case 'review':
                    flaggedForReview.push(entity);
                    break;
            }
        }

        // Calculate statistics
        const statistics = this.calculateStatistics(entities, accepted, rejected, flaggedForReview);

        // Record performance for adaptive learning
        this.recordPerformance({
            timestamp: new Date(),
            totalEntities: entities.length,
            acceptanceRate: statistics.acceptanceRate,
            averageConfidence: statistics.averageConfidence,
            thresholds: { ...thresholds },
            processingTime: Date.now() - startTime
        });

        logInfo(`Filtering completed: ${accepted.length} accepted, ${rejected.length} rejected, ${flaggedForReview.length} flagged for review`);

        return {
            entities: accepted as EnhancedParsedEntity[],
            relationships: relationships,
            statistics: {
                originalCount: entities.length,
                filteredCount: accepted.length,
                rejectedCount: rejected.length,
                rejectedEntities: rejected.map(entity => ({
                    entity: entity as EnhancedParsedEntity,
                    reason: 'Filtered out by confidence threshold'
                }))
            }
        };
    }

    /**
     * Evaluate a single entity for filtering decision
     */
    private evaluateEntity(
        entity: ParsedEntity,
        thresholds: ConfidenceThresholds,
        options: FilteringOptions
    ): { action: 'accept' | 'reject' | 'review'; reason: string } {
        // Get the threshold for this entity type
        const entityThreshold = thresholds.entityTypeThresholds[entity.type] || thresholds.globalMinimum;

        // Basic confidence check
        if (entity.confidence < thresholds.globalMinimum) {
            return { action: 'reject', reason: 'Below global minimum confidence' };
        }

        if (entity.confidence >= thresholds.autoCreateRAGNodes) {
            return { action: 'accept', reason: 'Above auto-creation threshold' };
        }

        if (entity.confidence < thresholds.requireHumanReview) {
            return { action: 'review', reason: 'Below human review threshold' };
        }

        // Type-specific evaluation
        if (entity.confidence < entityThreshold) {
            if (options.strictMode) {
                return { action: 'reject', reason: `Below ${entity.type} threshold in strict mode` };
            } else {
                return { action: 'review', reason: `Below ${entity.type} threshold` };
            }
        }

        // Special cases
        if (entity.type === EntityType.DIALOGUE && options.allowLowConfidenceDialogue) {
            if (entity.confidence >= 0.4) { // Lower threshold for dialogue
                return { action: 'accept', reason: 'Dialogue with relaxed threshold' };
            }
        }

        // Check for unique entities that might be worth preserving
        if (options.prioritizeUniqueEntities) {
            const uniquenessScore = this.calculateUniquenessScore(entity);
            if (uniquenessScore > 0.8 && entity.confidence >= 0.5) {
                return { action: 'accept', reason: 'High uniqueness score' };
            }
        }

        // Default to accept if above entity threshold
        if (entity.confidence >= entityThreshold) {
            return { action: 'accept', reason: 'Above entity type threshold' };
        }

        return { action: 'review', reason: 'Uncertain confidence level' };
    }

    /**
     * Apply contextual confidence adjustments
     */
    private applyContextualAdjustments(
        entities: ParsedEntity[],
        relationships: EntityRelationship[]
    ): { entities: ParsedEntity[]; adjustments: Array<{ entityId: string; oldConfidence: number; newConfidence: number; reason: string }> } {
        const adjustedEntities: ParsedEntity[] = [];
        const adjustments: Array<{ entityId: string; oldConfidence: number; newConfidence: number; reason: string }> = [];

        for (const entity of entities) {
            let adjustedConfidence = entity.confidence;
            const reasons: string[] = [];

            // Boost confidence for entities with multiple relationships
            const entityRelationships = relationships.filter(rel => 
                rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id
            );

            if (entityRelationships.length > 0) {
                const relationshipBoost = Math.min(0.2, entityRelationships.length * 0.05);
                adjustedConfidence += relationshipBoost;
                reasons.push(`+${relationshipBoost.toFixed(2)} for ${entityRelationships.length} relationships`);
            }

            // Boost confidence for entities mentioned multiple times
            const mentionCount = this.countEntityMentions(entity);
            if (mentionCount > 1) {
                const mentionBoost = Math.min(0.15, (mentionCount - 1) * 0.03);
                adjustedConfidence += mentionBoost;
                reasons.push(`+${mentionBoost.toFixed(2)} for ${mentionCount} mentions`);
            }

            // Reduce confidence for very generic names
            if (this.isGenericName(entity.name)) {
                adjustedConfidence -= 0.1;
                reasons.push('-0.1 for generic name');
            }

            // Clamp to valid range
            adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));

            const adjustedEntity: ParsedEntity = {
                ...entity,
                confidence: adjustedConfidence
            };

            adjustedEntities.push(adjustedEntity);

            if (Math.abs(adjustedConfidence - entity.confidence) > 0.01) {
                adjustments.push({
                    entityId: entity.id,
                    oldConfidence: entity.confidence,
                    newConfidence: adjustedConfidence,
                    reason: reasons.join('; ')
                });
            }
        }

        return { entities: adjustedEntities, adjustments };
    }

    /**
     * Calculate uniqueness score for an entity
     */
    private calculateUniquenessScore(entity: ParsedEntity): number {
        let score = 0.5; // Base score

        // Longer, more descriptive names are more unique
        if (entity.name.length > 20) score += 0.2;
        if (entity.name.split(' ').length > 2) score += 0.1;

        // Detailed descriptions suggest higher quality
        if (entity.description.length > 100) score += 0.2;

        // Certain entity types are inherently more unique
        if ([EntityType.CHARACTER, EntityType.ARTIFACT, EntityType.PROPHECY].includes(entity.type)) {
            score += 0.1;
        }

        // Proper nouns and capitalized words suggest real entities
        const capitalizedWords = entity.name.match(/[A-Z][a-z]+/g);
        if (capitalizedWords && capitalizedWords.length > 0) {
            score += capitalizedWords.length * 0.05;
        }

        return Math.min(1, score);
    }

    /**
     * Count how many times an entity is mentioned
     */
    private countEntityMentions(entity: ParsedEntity): number {
        // This would need access to the source text or chunk information
        // For now, return 1 as default - can be enhanced with actual counting
        return entity.metadata?.mentionCount || 1;
    }

    /**
     * Check if an entity name is generic
     */
    private isGenericName(name: string): boolean {
        const genericPatterns = [
            /^(the|a|an)\s+\w+$/i,
            /^(person|character|man|woman|guy|girl)\d*$/i,
            /^(place|location|area|spot)\d*$/i,
            /^(thing|object|item)\d*$/i,
            /^(event|happening|occurrence)\d*$/i
        ];

        return genericPatterns.some(pattern => pattern.test(name.trim()));
    }

    /**
     * Calculate comprehensive filtering statistics
     */
    private calculateStatistics(
        original: ParsedEntity[],
        accepted: ParsedEntity[],
        rejected: ParsedEntity[],
        flagged: ParsedEntity[]
    ): FilteringStatistics {
        const total = original.length;
        
        // Calculate confidence distribution
        const confidenceDistribution: Record<ConfidenceLevel, number> = {
            [ConfidenceLevel.VERY_LOW]: 0,
            [ConfidenceLevel.LOW]: 0,
            [ConfidenceLevel.MEDIUM]: 0,
            [ConfidenceLevel.HIGH]: 0,
            [ConfidenceLevel.VERY_HIGH]: 0
        };

        for (const entity of original) {
            const level = EntityTypeUtils.getConfidenceLevel(entity.confidence) as keyof typeof confidenceDistribution;
            if (level in confidenceDistribution) {
                confidenceDistribution[level]++;
            }
        }

        // Calculate type breakdown
        const typeBreakdown: Record<EntityType, { accepted: number; rejected: number; reviewed: number }> = 
            {} as Record<EntityType, { accepted: number; rejected: number; reviewed: number }>;

        for (const type of Object.values(EntityType)) {
            typeBreakdown[type] = { accepted: 0, rejected: 0, reviewed: 0 };
        }

        for (const entity of accepted) {
            typeBreakdown[entity.type].accepted++;
        }
        for (const entity of rejected) {
            typeBreakdown[entity.type].rejected++;
        }
        for (const entity of flagged) {
            typeBreakdown[entity.type].reviewed++;
        }

        const averageConfidence = total > 0 
            ? original.reduce((sum, e) => sum + e.confidence, 0) / total 
            : 0;

        return {
            totalProcessed: total,
            acceptanceRate: total > 0 ? accepted.length / total : 0,
            rejectionRate: total > 0 ? rejected.length / total : 0,
            reviewRate: total > 0 ? flagged.length / total : 0,
            averageConfidence,
            confidenceDistribution,
            typeBreakdown
        };
    }

    /**
     * Initialize default confidence thresholds
     */
    private initializeDefaultThresholds(): ConfidenceThresholds {
        return {
            globalMinimum: 0.3,
            globalMaximum: 1.0,
            entityTypeThresholds: {
                [EntityType.CHARACTER]: 0.7,
                [EntityType.LOCATION]: 0.6,
                [EntityType.EVENT]: 0.5,
                [EntityType.DIALOGUE]: 0.8,
                [EntityType.ARTIFACT]: 0.7,
                [EntityType.ORGANIZATION]: 0.6,
                [EntityType.CONCEPT]: 0.4,
                [EntityType.EMOTION]: 0.3
            },
            relationshipMinimum: 0.5,
            relationshipTypeThresholds: {},
            autoCreateRAGNodes: 0.8,
            autoMergeEntities: 0.9,
            requireHumanReview: 0.6
        };
    }

    /**
     * Get default filtering options
     */
    private getDefaultFilteringOptions(): FilteringOptions {
        return {
            strictMode: false,
            allowLowConfidenceDialogue: true,
            prioritizeUniqueEntities: true,
            adaptiveThresholds: true,
            contextualAdjustment: true
        };
    }

    /**
     * Merge custom thresholds with defaults
     */
    private mergeThresholds(
        defaults: ConfidenceThresholds,
        custom?: Partial<ConfidenceThresholds>
    ): ConfidenceThresholds {
        if (!custom) return { ...defaults };

        return {
            globalMinimum: custom.globalMinimum ?? defaults.globalMinimum,
            globalMaximum: custom.globalMaximum ?? defaults.globalMaximum,
            entityTypeThresholds: { ...defaults.entityTypeThresholds, ...custom.entityTypeThresholds },
            relationshipMinimum: custom.relationshipMinimum ?? defaults.relationshipMinimum,
            relationshipTypeThresholds: { ...defaults.relationshipTypeThresholds, ...custom.relationshipTypeThresholds },
            autoCreateRAGNodes: custom.autoCreateRAGNodes ?? defaults.autoCreateRAGNodes,
            autoMergeEntities: custom.autoMergeEntities ?? defaults.autoMergeEntities,
            requireHumanReview: custom.requireHumanReview ?? defaults.requireHumanReview
        };
    }

    /**
     * Adjust thresholds based on historical performance
     */
    private adjustThresholdsBasedOnPerformance(thresholds: ConfidenceThresholds): void {
        if (this.performanceHistory.length < 5) return; // Need enough data

        const recentMetrics = this.performanceHistory.slice(-10);
        const avgAcceptanceRate = recentMetrics.reduce((sum, m) => sum + m.acceptanceRate, 0) / recentMetrics.length;

        // If acceptance rate is too low, lower thresholds slightly
        if (avgAcceptanceRate < 0.6) {
            thresholds.globalMinimum = Math.max(0.2, thresholds.globalMinimum - 0.05);
            thresholds.requireHumanReview = Math.max(0.4, thresholds.requireHumanReview - 0.05);
            logDebug('Lowered thresholds due to low acceptance rate');
        }
        // If acceptance rate is too high, raise thresholds slightly
        else if (avgAcceptanceRate > 0.9) {
            thresholds.globalMinimum = Math.min(0.5, thresholds.globalMinimum + 0.02);
            thresholds.requireHumanReview = Math.min(0.8, thresholds.requireHumanReview + 0.02);
            logDebug('Raised thresholds due to high acceptance rate');
        }
    }

    /**
     * Record performance metrics for adaptive learning
     */
    private recordPerformance(metric: PerformanceMetric): void {
        this.performanceHistory.push(metric);
        
        // Keep only last 50 metrics
        if (this.performanceHistory.length > 50) {
            this.performanceHistory = this.performanceHistory.slice(-50);
        }
    }

    /**
     * Get current performance statistics
     */
    getPerformanceStats(): {
        averageAcceptanceRate: number;
        averageProcessingTime: number;
        totalProcessed: number;
        recentTrends: string[];
    } {
        if (this.performanceHistory.length === 0) {
            return {
                averageAcceptanceRate: 0,
                averageProcessingTime: 0,
                totalProcessed: 0,
                recentTrends: []
            };
        }

        const recent = this.performanceHistory.slice(-10);
        const avgAcceptanceRate = recent.reduce((sum, m) => sum + m.acceptanceRate, 0) / recent.length;
        const avgProcessingTime = recent.reduce((sum, m) => sum + m.processingTime, 0) / recent.length;
        const totalProcessed = this.performanceHistory.reduce((sum, m) => sum + m.totalEntities, 0);

        const trends: string[] = [];
        if (recent.length >= 5) {
            const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
            const secondHalf = recent.slice(Math.floor(recent.length / 2));
            
            const firstAvg = firstHalf.reduce((sum, m) => sum + m.acceptanceRate, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, m) => sum + m.acceptanceRate, 0) / secondHalf.length;
            
            if (secondAvg > firstAvg + 0.05) {
                trends.push('Increasing acceptance rate');
            } else if (secondAvg < firstAvg - 0.05) {
                trends.push('Decreasing acceptance rate');
            }
        }

        return {
            averageAcceptanceRate: avgAcceptanceRate,
            averageProcessingTime: avgProcessingTime,
            totalProcessed,
            recentTrends: trends
        };
    }
}

interface PerformanceMetric {
    timestamp: Date;
    totalEntities: number;
    acceptanceRate: number;
    averageConfidence: number;
    thresholds: ConfidenceThresholds;
    processingTime: number;
}
