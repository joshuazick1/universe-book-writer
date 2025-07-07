/**
 * Primary parser for immediate chunk processing
 */

import { EnhancedParsedEntity, ParsingContext, ChunkAnalysis } from '../core/interfaces.js';
import { EntityType, RelationshipType } from '../core/entityTypes.js';
import { JSONParser } from '../utils/jsonParser.js';
import { logInfo, logError, logDebug } from '../../../logger.js';

export interface PrimaryParseResult {
    entities: EnhancedParsedEntity[];
    chunkAnalysis: ChunkAnalysis;
    confidence: number;
    processingTime: number;
    requiresContextualUpdate: boolean;
}

export interface AIResponse {
    entities: Array<{
        type: string;
        name: string;
        description: string;
        confidence: number;
        relationships?: Array<{
            target: string;
            type: string;
            description?: string;
        }>;
        metadata?: Record<string, any>;
    }>;
    analysis: {
        summary: string;
        tags: string[];
        characters: string[];
        locations: string[];
        organizations: string[];
        objects: string[];
        themes: string[];
        mood: string;
        pov?: string;
        timelineAnchor?: string;
        dialogues?: Array<{
            speaker: string;
            quote: string;
        }>;
        unresolvedQuestions?: string[];
        settingDetails?: string;
    };
}

export class PrimaryParser {
    private aiServerUrl: string;

    constructor(aiServerUrl: string = 'http://localhost:5100') {
        this.aiServerUrl = aiServerUrl;
    }

    /**
     * Parse a single chunk with immediate processing
     */
    async parseChunk(
        chunkText: string,
        chunkIndex: number,
        context: ParsingContext,
        model: string = 'llama3.1:8b'
    ): Promise<PrimaryParseResult> {
        const startTime = Date.now();
        
        logDebug(`Primary parsing chunk ${chunkIndex} (${chunkText.length} chars)`);

        try {
            // Generate the parsing prompt
            const prompt = this.buildParsingPrompt(chunkText, context);
            
            // Call AI model for parsing
            const aiResponse = await this.callAIModel(prompt, model);
            
            // Parse and validate the response
            const parseResult = JSONParser.parseAIResponse<AIResponse>(aiResponse);
            if (!parseResult.success) {
                throw new Error(`Failed to parse AI response: ${parseResult.error}`);
            }

            const data = parseResult.data!;
            
            // Convert to enhanced entities
            const entities = this.convertToEnhancedEntities(
                data.entities || [],
                chunkIndex,
                chunkText
            );

            // Create chunk analysis
            const chunkAnalysis: ChunkAnalysis = {
                chunkIndex,
                entities,
                entitiesFound: entities.length,
                relationshipsFound: 0, // Primary parser doesn't extract relationships yet
                processingTime: Date.now() - startTime,
                confidence: this.calculateChunkConfidence(entities),
                summary: data.analysis?.summary || '',
                tags: data.analysis?.tags || [],
                characters: data.analysis?.characters || [],
                locations: data.analysis?.locations || [],
                organizations: data.analysis?.organizations || [],
                objects: data.analysis?.objects || [],
                themes: data.analysis?.themes || [],
                mood: data.analysis?.mood || 'neutral',
                pov: data.analysis?.pov,
                timelineAnchor: data.analysis?.timelineAnchor,
                dialogues: data.analysis?.dialogues || [],
                unresolvedQuestions: data.analysis?.unresolvedQuestions || [],
                settingDetails: data.analysis?.settingDetails
            };

            const processingTime = Date.now() - startTime;
            const avgConfidence = entities.length > 0 
                ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
                : 0;

            logInfo(`Primary parsing completed for chunk ${chunkIndex}: ${entities.length} entities, ${processingTime}ms`);

            return {
                entities,
                chunkAnalysis,
                confidence: avgConfidence,
                processingTime,
                requiresContextualUpdate: this.shouldUpdateWithContext(entities, context)
            };

        } catch (error) {
            logError(`Primary parsing failed for chunk ${chunkIndex}: ${error}`);
            throw error;
        }
    }

    /**
     * Build the parsing prompt for the AI model
     */
    private buildParsingPrompt(chunkText: string, context: ParsingContext): string {
        const entityTypes = Object.values(EntityType).join(', ');
        const relationshipTypes = Object.values(RelationshipType).join(', ');

        return `You are an expert at analyzing narrative text and extracting entities and relationships. Analyze the following text chunk and extract all relevant entities with their relationships.

TEXT TO ANALYZE:
"""
${chunkText}
"""

CONTEXT:
- This is chunk ${(context.chunkIndex || 0) + 1} of ${context.totalChunks || 1} total chunks
- Universe: ${context.universeId || 'unknown'}
- Previous entities found: ${(context.previousEntities || []).length}

INSTRUCTIONS:
1. Extract ALL entities of these types: ${entityTypes}
2. For each entity, identify relationships using these types: ${relationshipTypes}
3. Provide confidence scores (0.0-1.0) based on how clearly the entity is described
4. Include detailed analysis of the chunk's content

Respond with JSON in this exact format:
{
  "entities": [
    {
      "type": "entity_type",
      "name": "entity_name",
      "description": "detailed description",
      "confidence": 0.95,
      "relationships": [
        {
          "target": "other_entity_name",
          "type": "relationship_type",
          "description": "relationship description"
        }
      ],
      "metadata": {
        "importance": 0.8,
        "tags": ["tag1", "tag2"]
      }
    }
  ],
  "analysis": {
    "summary": "Brief summary of this chunk",
    "tags": ["theme1", "theme2"],
    "characters": ["character names mentioned"],
    "locations": ["location names mentioned"],
    "organizations": ["organization names mentioned"],
    "objects": ["important objects mentioned"],
    "themes": ["narrative themes"],
    "mood": "emotional tone",
    "pov": "point of view if identifiable",
    "timelineAnchor": "time reference if any",
    "dialogues": [
      {
        "speaker": "character_name",
        "quote": "exact quote"
      }
    ],
    "unresolvedQuestions": ["questions raised by this text"],
    "settingDetails": "environmental/setting details"
  }
}

Be thorough but precise. Focus on entities that are clearly described and relationships that are explicitly stated or strongly implied.`;
    }

    /**
     * Call the AI model via the orchestrator
     */
    private async callAIModel(prompt: string, model: string): Promise<string> {
        try {
            const response = await fetch(`${this.aiServerUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.1, // Low temperature for consistent parsing
                        top_p: 0.9,
                        num_predict: 4000 // Allow for detailed responses
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`AI request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || data.text || '';

        } catch (error) {
            logError(`AI model call failed: ${error}`);
            throw error;
        }
    }

    /**
     * Convert AI response entities to enhanced entities
     */
    private convertToEnhancedEntities(
        aiEntities: any[],
        chunkIndex: number,
        sourceText: string
    ): EnhancedParsedEntity[] {
        const now = new Date();
        
        return aiEntities.map((entity, index) => {
            // Validate and convert entity type
            const entityType = this.validateEntityType(entity.type);
            
            // Convert relationships
            const relationships = (entity.relationships || []).map((rel: any, relIndex: number) => ({
                id: `rel_${chunkIndex}_${index}_${relIndex}`,
                targetEntityId: `${chunkIndex}_${rel.target}`, // Temporary ID
                targetEntityName: rel.target,
                relationshipType: this.validateRelationshipType(rel.type),
                description: rel.description || '',
                confidence: entity.confidence * 0.9, // Slightly lower confidence for relationships
                sourceContext: sourceText.slice(0, 200), // First 200 chars as context
                bidirectional: false
            }));

            return {
                id: `entity_${chunkIndex}_${index}`,
                type: entityType,
                name: entity.name || 'Unknown',
                description: entity.description || '',
                confidence: Math.max(0, Math.min(1, entity.confidence || 0.5)),
                relationships,
                metadata: {
                    ...entity.metadata,
                    sourceChunkIndex: chunkIndex,
                    importance: entity.metadata?.importance || 0.5
                },
                sourceChunk: {
                    index: chunkIndex,
                    text: sourceText,
                    startPosition: 0,
                    endPosition: sourceText.length
                },
                sourceText: sourceText,
                updatedAt: now,
                createdAt: now
            };
        });
    }

    /**
     * Validate and convert entity type
     */
    private validateEntityType(type: string): EntityType {
        const normalizedType = type.toLowerCase().replace(/[^a-z_]/g, '_');
        
        // Try to match to known entity types
        for (const entityType of Object.values(EntityType)) {
            if (entityType === normalizedType || entityType.includes(normalizedType)) {
                return entityType;
            }
        }

        // Default to custom for unknown types
        return EntityType.CUSTOM;
    }

    /**
     * Validate and convert relationship type
     */
    private validateRelationshipType(type: string): RelationshipType {
        const normalizedType = type.toLowerCase().replace(/[^a-z_]/g, '_');
        
        // Try to match to known relationship types
        for (const relationshipType of Object.values(RelationshipType)) {
            if (relationshipType === normalizedType || relationshipType.includes(normalizedType)) {
                return relationshipType;
            }
        }

        // Default to associated_with for unknown types
        return RelationshipType.ASSOCIATED_WITH;
    }

    /**
     * Calculate overall confidence for a chunk based on its entities
     */
    private calculateChunkConfidence(entities: EnhancedParsedEntity[]): number {
        if (entities.length === 0) return 0;
        const total = entities.reduce((sum, entity) => sum + entity.confidence, 0);
        return total / entities.length;
    }

    /**
     * Determine if this chunk should be updated with contextual information
     */
    private shouldUpdateWithContext(entities: EnhancedParsedEntity[], context: ParsingContext): boolean {
        // Always update if there are previous entities to cross-reference
        if ((context.previousEntities || []).length > 0) {
            return true;
        }

        // Update if there are many entities that might need disambiguation
        if (entities.length > 5) {
            return true;
        }

        // Update if there are low-confidence entities
        const lowConfidenceEntities = entities.filter(e => e.confidence < 0.7);
        if (lowConfidenceEntities.length > 0) {
            return true;
        }

        // Update if there are complex relationships
        const hasComplexRelationships = entities.some(e => 
            e.relationships && e.relationships.length > 2
        );
        if (hasComplexRelationships) {
            return true;
        }

        return false;
    }
}
