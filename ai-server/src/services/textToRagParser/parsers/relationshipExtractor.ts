/**
 * Relationship Extractor - Phase 2 Enhancement
 * Extracts relationships between entities using advanced AI processing
 */

import { ParsedEntity, EntityRelationship, ParsingOptions } from '../core/interfaces.js';
import { RelationshipType, EntityType, EntityTypeUtils } from '../core/entityTypes.js';
import { logger } from '../../../../../shared/logging/logger.js';

export interface RelationshipExtractionResult {
    relationships: EntityRelationship[];
    confidence: number;
    processingTime: number;
    extractionMethod: 'direct' | 'inferential' | 'contextual';
}

export interface RelationshipExtractionOptions {
    model: string;
    aiServerUrl: string;
    confidenceThreshold: number;
    maxRelationshipsPerEntity: number;
    includeInferredRelationships: boolean;
    contextWindow: number; // Number of sentences around entity mentions
}

export class RelationshipExtractor {
    private aiServerUrl: string;

    constructor(aiServerUrl: string) {
        this.aiServerUrl = aiServerUrl;
    }

    /**
     * Extract relationships between entities in the given text
     */
    async extractRelationships(
        entities: ParsedEntity[],
        sourceText: string,
        options: RelationshipExtractionOptions
    ): Promise<RelationshipExtractionResult> {
        const startTime = Date.now();

        logger.info(`Extracting relationships for ${entities.length} entities`);

        try {
            // Group entities by type for more efficient processing
            const entityGroups = this.groupEntitiesByType(entities);

            // Extract direct relationships from text
            const directRelationships = await this.extractDirectRelationships(
                entities, sourceText, options
            );

            // Extract inferential relationships if enabled
            const inferredRelationships = options.includeInferredRelationships
                ? await this.extractInferredRelationships(entities, sourceText, options)
                : [];

            // Combine and deduplicate relationships
            const allRelationships = [...directRelationships, ...inferredRelationships];
            const deduplicatedRelationships = this.deduplicateRelationships(allRelationships);

            // Filter by confidence threshold
            const filteredRelationships = deduplicatedRelationships.filter(
                rel => rel.confidence >= options.confidenceThreshold
            );

            const processingTime = Date.now() - startTime;

            logger.info(`Extracted ${filteredRelationships.length} relationships in ${processingTime}ms`);

            return {
                relationships: filteredRelationships,
                confidence: this.calculateOverallConfidence(filteredRelationships),
                processingTime,
                extractionMethod: 'direct'
            };

        } catch (error) {
            logger.error(`Relationship extraction failed: ${error}`);
            throw error;
        }
    }

    /**
     * Extract direct relationships explicitly mentioned in the text
     */
    private async extractDirectRelationships(
        entities: ParsedEntity[],
        sourceText: string,
        options: RelationshipExtractionOptions
    ): Promise<EntityRelationship[]> {
        const relationships: EntityRelationship[] = [];

        // Create entity pairs for relationship analysis
        const entityPairs = this.generateEntityPairs(entities);

        logger.debug(`Analyzing ${entityPairs.length} entity pairs for relationships`);

        // Process pairs in batches to avoid overwhelming the AI
        const batchSize = 10;
        for (let i = 0; i < entityPairs.length; i += batchSize) {
            const batch = entityPairs.slice(i, i + batchSize);
            const batchRelationships = await this.processBatchRelationships(
                batch, sourceText, options
            );
            relationships.push(...batchRelationships);
        }

        return relationships;
    }

    /**
     * Process a batch of entity pairs for relationship extraction
     */
    private async processBatchRelationships(
        entityPairs: Array<{ source: ParsedEntity; target: ParsedEntity }>,
        sourceText: string,
        options: RelationshipExtractionOptions
    ): Promise<EntityRelationship[]> {
        const prompt = this.buildRelationshipExtractionPrompt(entityPairs, sourceText);

        try {
            const response = await fetch(`${this.aiServerUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: options.model,
                    messages: [{ role: 'user', content: prompt }],
                    stream: false,
                    temperature: 0.1 // Low temperature for consistency
                }),
            });

            if (!response.ok) {
                throw new Error(`AI API call failed: ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.message?.content || data.response || '';

            return this.parseRelationshipResponse(aiResponse, entityPairs);

        } catch (error) {
            logger.error(`Batch relationship processing failed: ${error}`);
            return [];
        }
    }

    /**
     * Build prompt for relationship extraction
     */
    private buildRelationshipExtractionPrompt(
        entityPairs: Array<{ source: ParsedEntity; target: ParsedEntity }>,
        sourceText: string
    ): string {
        const pairDescriptions = entityPairs.map((pair, index) =>
            `${index + 1}. "${pair.source.name}" (${pair.source.type}) → "${pair.target.name}" (${pair.target.type})`
        ).join('\n');

        return `
Analyze the following text and determine relationships between these entity pairs.

Entity Pairs to Analyze:
${pairDescriptions}

Text:
"""${sourceText}"""

For each pair, determine if there's a relationship mentioned in the text. Return ONLY a JSON array with this format:

[
  {
    "sourceEntity": "exact entity name",
    "targetEntity": "exact entity name", 
    "relationshipType": "relationship_type",
    "description": "brief description of the relationship",
    "confidence": 0.0-1.0,
    "evidence": "exact quote from text that shows this relationship",
    "bidirectional": true/false
  }
]

Relationship types to use:
- Character relationships: knows, loves, hates, serves, commands, allies_with, enemies_with, family, friend, mentor
- Location relationships: lives_in, rules, born_in, traveled_to, controls
- Object relationships: owns, wields, created, seeks, guards
- Knowledge relationships: believes, remembers, teaches, learns
- Event relationships: participated_in, witnessed, caused
- Generic: associated_with, part_of, member_of

Rules:
1. Only include relationships explicitly supported by the text
2. Use exact entity names from the pairs above
3. Confidence should reflect how clearly the relationship is stated
4. Include evidence quote that supports the relationship
5. Return empty array [] if no relationships found

JSON array:`;
    }

    /**
     * Parse AI response for relationships
     */
    private parseRelationshipResponse(
        aiResponse: string,
        entityPairs: Array<{ source: ParsedEntity; target: ParsedEntity }>
    ): EntityRelationship[] {
        try {
            // Clean and parse the response
            const cleanResponse = aiResponse.trim()
                .replace(/^.*?(\[.*\]).*$/s, '$1') // Extract JSON array
                .replace(/```json|```/g, ''); // Remove markdown

            const relationshipData = JSON.parse(cleanResponse);

            if (!Array.isArray(relationshipData)) {
                logger.error('AI response is not an array');
                return [];
            }

            const relationships: EntityRelationship[] = [];

            for (const relData of relationshipData) {
                // Find the corresponding entity pair
                const pair = entityPairs.find(p =>
                    p.source.name === relData.sourceEntity &&
                    p.target.name === relData.targetEntity
                );

                if (!pair) {
                    logger.debug(`Entity pair not found for relationship: ${relData.sourceEntity} -> ${relData.targetEntity}`);
                    continue;
                }

                // Validate relationship type
                const relationshipType = this.validateRelationshipType(
                    relData.relationshipType,
                    pair.source.type as EntityType,
                    pair.target.type as EntityType
                );

                if (!relationshipType) {
                    logger.debug(`Invalid relationship type: ${relData.relationshipType}`);
                    continue;
                }

                const relationship: EntityRelationship = {
                    id: this.generateRelationshipId(pair.source.id, pair.target.id, relationshipType),
                    sourceEntityId: pair.source.id,
                    targetEntityId: pair.target.id,
                    targetEntityName: pair.target.name,
                    relationshipType: relationshipType,
                    type: relationshipType,
                    description: relData.description || '',
                    confidence: Math.max(0, Math.min(1, relData.confidence || 0.5)),
                    sourceContext: relData.context || '',
                    evidence: relData.evidence || '',
                    bidirectional: relData.bidirectional || false
                };

                relationships.push(relationship);

                // Add reverse relationship if bidirectional
                if (relData.bidirectional) {
                    const reverseRelationship: EntityRelationship = {
                        ...relationship,
                        id: this.generateRelationshipId(pair.target.id, pair.source.id, relationshipType),
                        sourceEntityId: pair.target.id,
                        targetEntityId: pair.source.id
                    };
                    relationships.push(reverseRelationship);
                }
            }

            return relationships;

        } catch (error) {
            logger.error(`Failed to parse relationship response: ${error}`);
            return [];
        }
    }

    /**
     * Extract inferred relationships based on context and patterns
     */
    private async extractInferredRelationships(
        entities: ParsedEntity[],
        sourceText: string,
        options: RelationshipExtractionOptions
    ): Promise<EntityRelationship[]> {
        // This would implement more sophisticated inference
        // For now, return empty array - can be expanded later
        return [];
    }

    /**
     * Generate all possible entity pairs for relationship analysis
     */
    private generateEntityPairs(entities: ParsedEntity[]): Array<{ source: ParsedEntity; target: ParsedEntity }> {
        const pairs: Array<{ source: ParsedEntity; target: ParsedEntity }> = [];

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const source = entities[i];
                const target = entities[j];

                // Check if this entity pair combination makes sense
                if (this.isValidEntityPair(source, target)) {
                    pairs.push({ source, target });
                    // Also add reverse pair for directional relationships
                    pairs.push({ source: target, target: source });
                }
            }
        }

        return pairs;
    }

    /**
     * Check if two entities can have a meaningful relationship
     */
    private isValidEntityPair(entity1: ParsedEntity, entity2: ParsedEntity): boolean {
        // Skip if same entity
        if (entity1.id === entity2.id) {
            return false;
        }

        // Skip if both are source text entities
        if (entity1.type === EntityType.SOURCE_TEXT && entity2.type === EntityType.SOURCE_TEXT) {
            return false;
        }

        // Get compatible relationships for this pair
        const compatibleRels = EntityTypeUtils.getCompatibleRelationships(
            entity1.type as EntityType,
            entity2.type as EntityType
        );

        // Valid if there are compatible relationship types
        return compatibleRels.length > 0;
    }

    /**
     * Validate and normalize relationship type
     */
    private validateRelationshipType(
        relationshipType: string,
        sourceType: EntityType,
        targetType: EntityType
    ): RelationshipType | null {
        // Normalize the relationship type string
        const normalizedType = relationshipType.toLowerCase().replace(/\s+/g, '_');

        // Check if it's a valid relationship type
        if (!Object.values(RelationshipType).includes(normalizedType as RelationshipType)) {
            return null;
        }

        const relType = normalizedType as RelationshipType;

        // Check if this relationship type is compatible with the entity types
        const compatibleTypes = EntityTypeUtils.getCompatibleRelationships(sourceType, targetType);

        if (compatibleTypes.includes(relType)) {
            return relType;
        }

        // If not compatible, use generic association
        return RelationshipType.ASSOCIATED_WITH;
    }

    /**
     * Remove duplicate relationships
     */
    private deduplicateRelationships(relationships: EntityRelationship[]): EntityRelationship[] {
        const seen = new Set<string>();
        const deduplicated: EntityRelationship[] = [];

        for (const rel of relationships) {
            const key = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.type}`;

            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(rel);
            }
        }

        return deduplicated;
    }

    /**
     * Group entities by type for more efficient processing
     */
    private groupEntitiesByType(entities: ParsedEntity[]): Record<EntityType, ParsedEntity[]> {
        const groups: Record<EntityType, ParsedEntity[]> = {} as Record<EntityType, ParsedEntity[]>;

        for (const entity of entities) {
            if (!groups[entity.type]) {
                groups[entity.type] = [];
            }
            groups[entity.type].push(entity);
        }

        return groups;
    }

    /**
     * Generate a unique relationship ID
     */
    private generateRelationshipId(sourceId: string, targetId: string, type: RelationshipType): string {
        return `rel_${sourceId}_${targetId}_${type}_${Date.now()}`;
    }

    /**
     * Calculate overall confidence from relationships
     */
    private calculateOverallConfidence(relationships: EntityRelationship[]): number {
        if (relationships.length === 0) return 0;

        const totalConfidence = relationships.reduce((sum, rel) => sum + rel.confidence, 0);
        return totalConfidence / relationships.length;
    }
}
