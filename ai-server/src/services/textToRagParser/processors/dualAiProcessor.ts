/**
 * Dual-AI Processor - Phase 2 Enhancement
 * Coordinates primary and contextual parsing for enhanced accuracy
 */

import { EventEmitter } from 'events';
import { ProcessingJob, ProcessingResult, ParsingOptions, ParsedEntity, DualAiProcessingOptions } from '../core/interfaces.js';
import { PrimaryParser } from '../parsers/primaryParser.js';
import { RelationshipExtractor, RelationshipExtractionOptions } from '../parsers/relationshipExtractor.js';
import { logInfo, logError, logDebug } from '../../../logger.js';

export interface ProcessingStage {
    stage: 'primary' | 'contextual' | 'relationship' | 'validation' | 'completed';
    progress: number; // 0-1
    currentChunk?: number;
    totalChunks?: number;
    entitiesFound?: number;
    relationshipsFound?: number;
    processingTime?: number;
}

export interface DualAiResult extends ProcessingResult {
    primaryResults: ProcessingResult;
    contextualUpdates?: ProcessingResult;
    relationshipExtractionResult?: {
        relationships: any[];
        confidence: number;
        processingTime: number;
    };
    stages: ProcessingStage[];
    totalProcessingTime: number;
}

export class DualAiProcessor extends EventEmitter {
    private primaryParser: PrimaryParser;
    private relationshipExtractor: RelationshipExtractor;
    private aiServerUrl: string;

    constructor(aiServerUrl: string) {
        super();
        this.aiServerUrl = aiServerUrl;
        this.primaryParser = new PrimaryParser(aiServerUrl);
        this.relationshipExtractor = new RelationshipExtractor(aiServerUrl);
    }

    /**
     * Process a job using dual-AI pipeline
     */
    async processJob(
        job: ProcessingJob,
        options: DualAiProcessingOptions
    ): Promise<DualAiResult> {
        const startTime = Date.now();
        const stages: ProcessingStage[] = [];
        
        logInfo(`Starting dual-AI processing for job ${job.id}`);

        try {
            // Stage 1: Primary parsing
            this.emitStage('primary', 0, stages);
            const primaryResults = await this.runPrimaryParsing(job, options, stages);
            
            // Stage 2: Relationship extraction (if enabled)
            let relationshipExtractionResult;
            if (options.enableRelationshipExtraction && primaryResults.entities.length > 1) {
                this.emitStage('relationship', 0.4, stages);
                relationshipExtractionResult = await this.runRelationshipExtraction(
                    primaryResults.entities,
                    job.sourceText,
                    options
                );
            }

            // Stage 3: Contextual updates (if enabled)
            let contextualUpdates;
            if (options.enableContextualUpdates && primaryResults.entities.length > 0) {
                this.emitStage('contextual', 0.6, stages);
                contextualUpdates = await this.runContextualUpdates(
                    primaryResults,
                    job,
                    options,
                    relationshipExtractionResult?.relationships || []
                );
            }

            // Stage 4: Validation and finalization
            this.emitStage('validation', 0.8, stages);
            const finalResult = await this.finalizeResults(
                primaryResults,
                contextualUpdates,
                relationshipExtractionResult,
                options
            );

            // Stage 5: Completed
            this.emitStage('completed', 1.0, stages);

            const totalProcessingTime = Date.now() - startTime;
            
            logInfo(`Dual-AI processing completed for job ${job.id} in ${totalProcessingTime}ms`);

            return {
                ...finalResult,
                primaryResults,
                contextualUpdates,
                relationshipExtractionResult,
                stages,
                totalProcessingTime
            };

        } catch (error) {
            logError(`Dual-AI processing failed for job ${job.id}: ${error}`);
            throw error;
        }
    }

    /**
     * Run primary parsing stage
     */
    private async runPrimaryParsing(
        job: ProcessingJob,
        options: DualAiProcessingOptions,
        stages: ProcessingStage[]
    ): Promise<ProcessingResult> {
        logDebug(`Running primary parsing for job ${job.id}`);

        // Configure primary parser options
        const primaryOptions = {
            ...options,
            model: options.primaryModel,
            temperature: options.primaryTemperature
        };

        // Use existing primary parser
        const result = await this.primaryParser.parseChunk(
            job.sourceText,
            0, // chunkIndex for single text processing
            {
                universeId: job.universeId,
                previousEntities: []
            },
            options.primaryModel
        );

        stages.push({
            stage: 'primary',
            progress: 1.0,
            entitiesFound: result.entities.length,
            processingTime: result.processingTime
        });

        // Convert PrimaryParseResult to ProcessingResult
        return {
            jobId: job.id,
            entities: result.entities,
            chunkAnalyses: [result.chunkAnalysis],
            statistics: {
                totalEntities: result.entities.length,
                entityTypes: this.calculateEntityTypeBreakdown(result.entities),
                avgConfidence: this.calculateAverageConfidence(result.entities),
                processingTime: result.processingTime,
                chunksProcessed: 1
            },
            processingTime: result.processingTime
        };
    }

    /**
     * Run relationship extraction stage
     */
    private async runRelationshipExtraction(
        entities: ParsedEntity[],
        sourceText: string,
        options: DualAiProcessingOptions
    ): Promise<{ relationships: any[]; confidence: number; processingTime: number }> {
        logDebug(`Running relationship extraction for ${entities.length} entities`);

        const extractionOptions: RelationshipExtractionOptions = {
            model: options.contextualModel || options.primaryModel,
            aiServerUrl: this.aiServerUrl,
            confidenceThreshold: options.relationshipConfidenceThreshold || 0.7,
            maxRelationshipsPerEntity: options.maxRelationshipsPerEntity || 10,
            includeInferredRelationships: true,
            contextWindow: 3
        };

        return await this.relationshipExtractor.extractRelationships(
            entities,
            sourceText,
            extractionOptions
        );
    }

    /**
     * Run contextual updates stage
     */
    private async runContextualUpdates(
        primaryResults: ProcessingResult,
        job: ProcessingJob,
        options: DualAiProcessingOptions,
        relationships: any[]
    ): Promise<ProcessingResult> {
        logDebug(`Running contextual updates for job ${job.id}`);

        // For now, this is a placeholder for contextual processing
        // In a full implementation, this would:
        // 1. Use a different AI model or different prompts
        // 2. Consider broader context from previous chunks
        // 3. Refine entity descriptions and confidence scores
        // 4. Merge similar entities found across chunks
        // 5. Validate entity consistency

        const updatedEntities = await this.runEntityRefinement(
            primaryResults.entities,
            job.sourceText,
            relationships,
            options
        );

        return {
            jobId: job.id,
            entities: updatedEntities,
            relationships,
            chunkAnalyses: primaryResults.chunkAnalyses || [],
            statistics: {
                totalEntities: updatedEntities.length,
                entityTypes: this.calculateEntityTypeBreakdown(updatedEntities),
                avgConfidence: this.calculateAverageConfidence(updatedEntities),
                processingTime: 0, // Will be set by caller
                chunksProcessed: primaryResults.statistics?.chunksProcessed || 1
            },
            processingTime: 0, // Will be set by caller
            confidence: this.calculateUpdatedConfidence(updatedEntities),
            metadata: {
                ...primaryResults.metadata,
                contextuallyUpdated: true,
                originalEntityCount: primaryResults.entities.length,
                updatedEntityCount: updatedEntities.length
            }
        };
    }

    /**
     * Refine entities using contextual information
     */
    private async runEntityRefinement(
        entities: ParsedEntity[],
        sourceText: string,
        relationships: any[],
        options: DualAiProcessingOptions
    ): Promise<ParsedEntity[]> {
        const refinedEntities: ParsedEntity[] = [];

        for (const entity of entities) {
            // Get relationships for this entity
            const entityRelationships = relationships.filter(rel => 
                rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id
            );

            // Build contextual refinement prompt
            const refinementPrompt = this.buildRefinementPrompt(
                entity,
                entityRelationships,
                sourceText
            );

            try {
                const response = await fetch(`${this.aiServerUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: options.contextualModel || options.primaryModel,
                        messages: [{ role: 'user', content: refinementPrompt }],
                        stream: false,
                        temperature: options.contextualTemperature
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const aiResponse = data.message?.content || data.response || '';
                    
                    const refinedEntity = this.parseRefinementResponse(aiResponse, entity);
                    refinedEntities.push(refinedEntity);
                } else {
                    // If refinement fails, keep original entity
                    refinedEntities.push(entity);
                }

            } catch (error) {
                logError(`Entity refinement failed for ${entity.name}: ${error}`);
                refinedEntities.push(entity);
            }
        }

        return refinedEntities;
    }

    /**
     * Build prompt for entity refinement
     */
    private buildRefinementPrompt(
        entity: ParsedEntity,
        relationships: any[],
        sourceText: string
    ): string {
        const relationshipDescriptions = relationships.map(rel => 
            `- ${rel.type}: ${rel.description} (confidence: ${rel.confidence})`
        ).join('\n');

        return `
Refine and enhance the following entity based on additional context and relationships.

Current Entity:
Name: ${entity.name}
Type: ${entity.type}
Description: ${entity.description}
Confidence: ${entity.confidence}

Relationships:
${relationshipDescriptions || 'None found'}

Source Text Context:
"""${sourceText.substring(0, 1500)}${sourceText.length > 1500 ? '...' : ''}"""

Please refine this entity and return ONLY a JSON object:
{
  "name": "refined or original name",
  "description": "enhanced description incorporating relationships and context",
  "confidence": 0.0-1.0,
  "metadata": {
    "refinementReason": "explanation of what was refined",
    "additionalTags": ["tag1", "tag2"],
    "importance": 0.0-1.0
  }
}

Guidelines:
- Enhance the description with relationship context
- Adjust confidence based on relationship validation
- Add relevant metadata tags
- Assess importance in the overall narrative
- Keep the core entity identity intact

JSON object:`;
    }

    /**
     * Parse refinement response from AI
     */
    private parseRefinementResponse(aiResponse: string, originalEntity: ParsedEntity): ParsedEntity {
        try {
            const cleanResponse = aiResponse.trim()
                .replace(/^.*?(\{.*\}).*$/s, '$1')
                .replace(/```json|```/g, '');

            const refinementData = JSON.parse(cleanResponse);

            return {
                ...originalEntity,
                name: refinementData.name || originalEntity.name,
                description: refinementData.description || originalEntity.description,
                confidence: refinementData.confidence || originalEntity.confidence,
                metadata: {
                    ...originalEntity.metadata,
                    ...refinementData.metadata,
                    contextuallyRefined: true,
                    refinementTimestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            logError(`Failed to parse refinement response: ${error}`);
            return originalEntity;
        }
    }

    /**
     * Finalize and merge all processing results
     */
    private async finalizeResults(
        primaryResults: ProcessingResult,
        contextualUpdates?: ProcessingResult,
        relationshipExtraction?: any,
        options?: DualAiProcessingOptions
    ): Promise<ProcessingResult> {
        // Use contextual updates if available, otherwise primary results
        const finalEntities = contextualUpdates?.entities || primaryResults.entities;
        const finalRelationships = relationshipExtraction?.relationships || [];

        return {
            jobId: primaryResults.jobId,
            entities: finalEntities,
            relationships: finalRelationships,
            chunkAnalyses: primaryResults.chunkAnalyses || [],
            statistics: {
                totalEntities: finalEntities.length,
                entityTypes: this.calculateEntityTypeBreakdown(finalEntities),
                avgConfidence: this.calculateAverageConfidence(finalEntities),
                processingTime: (primaryResults.processingTime || 0) + (contextualUpdates?.processingTime || 0),
                chunksProcessed: primaryResults.statistics?.chunksProcessed || 1
            },
            processingTime: (primaryResults.processingTime || 0) + (contextualUpdates?.processingTime || 0),
            confidence: this.calculateOverallConfidence(finalEntities, finalRelationships),
            metadata: {
                processingMode: 'dual_ai',
                primaryEntityCount: primaryResults.entities.length,
                finalEntityCount: finalEntities.length,
                relationshipCount: finalRelationships.length,
                contextualUpdatesApplied: !!contextualUpdates,
                relationshipExtractionApplied: !!relationshipExtraction
            }
        };
    }

    /**
     * Emit processing stage updates
     */
    private emitStage(stage: ProcessingStage['stage'], progress: number, stages: ProcessingStage[]): void {
        const stageInfo: ProcessingStage = { stage, progress };
        stages.push(stageInfo);
        this.emit('stageUpdate', stageInfo);
    }

    /**
     * Emit progress updates within a stage
     */
    private emitProgress(stage: string, progress: any, stages: ProcessingStage[]): void {
        // Update the latest stage with progress information
        const latestStage = stages[stages.length - 1];
        if (latestStage && latestStage.stage === stage) {
            Object.assign(latestStage, progress);
            this.emit('progressUpdate', latestStage);
        }
    }

    /**
     * Calculate overall confidence from entities and relationships
     */
    private calculateOverallConfidence(entities: ParsedEntity[], relationships: any[]): number {
        const entityConfidence = entities.length > 0 
            ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
            : 0;

        const relationshipConfidence = relationships.length > 0
            ? relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length
            : 0;

        // Weight entities more heavily than relationships
        return entities.length > 0 
            ? (entityConfidence * 0.7) + (relationshipConfidence * 0.3)
            : 0;
    }

    /**
     * Calculate updated confidence after contextual processing
     */
    private calculateUpdatedConfidence(entities: ParsedEntity[]): number {
        if (entities.length === 0) return 0;
        
        const totalConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0);
        return totalConfidence / entities.length;
    }

    /**
     * Calculate entity type breakdown
     */
    private calculateEntityTypeBreakdown(entities: ParsedEntity[]): Record<string, number> {
        const breakdown: Record<string, number> = {};
        for (const entity of entities) {
            const type = entity.type;
            breakdown[type] = (breakdown[type] || 0) + 1;
        }
        return breakdown;
    }

    /**
     * Calculate average confidence
     */
    private calculateAverageConfidence(entities: ParsedEntity[]): number {
        if (entities.length === 0) return 0;
        const total = entities.reduce((sum, entity) => sum + entity.confidence, 0);
        return total / entities.length;
    }
}
