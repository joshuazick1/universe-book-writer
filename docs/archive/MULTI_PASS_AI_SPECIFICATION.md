# Multi-Pass AI Processing System - Technical Specification

## Overview

The multi-pass AI processing system represents an evolution from the original dual-AI approach, providing five specialized processing stages that build upon each other to achieve superior accuracy and comprehensive narrative analysis.

## Why Multi-Pass Processing?

### Narrative Complexity Layers
Stories operate at multiple analytical levels:
1. **Lexical Level**: Individual words and phrases (Pass 1)
2. **Syntactic Level**: Sentence and paragraph structure (Pass 2)
3. **Semantic Level**: Meaning and relationships (Pass 3)
4. **Pragmatic Level**: Context and implications (Pass 4)
5. **Narrative Level**: Character development and story arcs (Pass 5)

### Accuracy Improvements
- **Single Pass**: 70-80% accuracy
- **Dual Pass**: 85-90% accuracy  
- **Multi-Pass**: 90-95+ % accuracy

### Error Correction
Each pass can catch and correct different types of errors:
- **Pass 1**: Extraction errors, missing entities
- **Pass 2**: Context misunderstandings, relationship errors
- **Pass 3**: Global inconsistencies, thematic misinterpretation
- **Pass 4**: Logic errors, confidence miscalibration
- **Pass 5**: Character inconsistencies, memory conflicts

## Pass-by-Pass Specification

### Pass 1: Primary Parser (Fast Extraction)

**Purpose**: Rapid, independent chunk processing for basic entity extraction

```typescript
interface Pass1Config {
    model: string;                    // Fast model (e.g., "llama3.2:3b")
    temperature: 0.3;                 // Low temperature for consistency
    maxTokens: 1500;
    chunkSize: 1000;
    parallelProcessing: true;
    confidenceThreshold: 0.4;         // Lower threshold, we'll validate later
}

interface Pass1Output {
    entities: BasicEntity[];
    relationships: BasicRelationship[];
    timelineMarkers: string[];
    dialogues: Dialogue[];
    confidence: number;
    processingTime: number;
    flagsForPass2: string[];          // Issues to address in next pass
}

class Pass1Primary {
    async processChunk(chunk: string, index: number): Promise<Pass1Output> {
        const prompt = this.buildPass1Prompt(chunk, index);
        
        const response = await this.aiService.generate(prompt, {
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
        });
        
        return this.parsePass1Response(response, chunk, index);
    }
    
    private buildPass1Prompt(chunk: string, index: number): string {
        return `
TASK: Rapid entity extraction from narrative text chunk.

CHUNK ${index}:
"""
${chunk}
"""

Extract ONLY clearly identifiable entities. Be conservative but thorough.

REQUIRED OUTPUT (JSON):
{
  "entities": [
    {
      "type": "character|location|event|organization|object|artifact|dialogue",
      "name": "Exact name from text",
      "description": "Brief description",
      "confidence": 0.0-1.0,
      "textEvidence": "Supporting quote",
      "chunkPosition": "start|middle|end"
    }
  ],
  "relationships": [
    {
      "source": "Entity name",
      "target": "Related entity name",
      "type": "relationship type",
      "confidence": 0.0-1.0,
      "evidence": "Text supporting this relationship"
    }
  ],
  "timelineMarkers": ["time references in this chunk"],
  "dialogues": [
    {
      "speaker": "Character name",
      "text": "Exact quote",
      "emotion": "emotional tone",
      "context": "situational context"
    }
  ],
  "uncertainties": ["Things that need clarification in later passes"],
  "confidence": 0.0-1.0
}

FOCUS: Speed and coverage over perfect accuracy. Flag uncertainties for later resolution.
`;
    }
}
```

### Pass 2: Contextual Enhancement (Local Context)

**Purpose**: Enhance Pass 1 results using local context from adjacent chunks

```typescript
interface Pass2Config {
    model: string;                    // Balanced model (e.g., "llama3.1:8b")
    temperature: 0.4;
    maxTokens: 2000;
    contextWindow: 3;                 // Consider 3 chunks before current
    delayChunks: 2;                   // Process 2 chunks behind
    focusAreas: string[];             // "disambiguation", "relationships", "validation"
}

interface Pass2Output extends Pass1Output {
    entityUpdates: EntityUpdate[];
    relationshipUpdates: RelationshipUpdate[];
    disambiguations: Disambiguation[];
    contextualInsights: Insight[];
    confidenceAdjustments: ConfidenceUpdate[];
}

class Pass2Contextual {
    async enhanceChunk(
        targetChunk: Pass1Output,
        contextChunks: Pass1Output[],
        chunkIndex: number
    ): Promise<Pass2Output> {
        
        const prompt = this.buildPass2Prompt(targetChunk, contextChunks, chunkIndex);
        
        const response = await this.aiService.generate(prompt, {
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
        });
        
        return this.parsePass2Response(response, targetChunk);
    }
    
    private buildPass2Prompt(
        target: Pass1Output,
        context: Pass1Output[],
        index: number
    ): string {
        
        const contextSummary = this.buildContextSummary(context);
        
        return `
TASK: Enhance and validate entity extraction using local context.

CONTEXT FROM PREVIOUS CHUNKS:
${contextSummary}

TARGET CHUNK ${index} TO ENHANCE:
Entities: ${JSON.stringify(target.entities, null, 2)}
Relationships: ${JSON.stringify(target.relationships, null, 2)}
Uncertainties: ${target.flagsForPass2?.join(', ') || 'None'}

ENHANCEMENT GOALS:
1. DISAMBIGUATION: Resolve name variations (e.g., "John" vs "John Smith")
2. RELATIONSHIP VALIDATION: Confirm relationships using context
3. CONFIDENCE ADJUSTMENT: Update confidence scores based on context
4. MISSING DETECTION: Find entities that should have been extracted
5. ERROR CORRECTION: Fix extraction errors revealed by context

OUTPUT (JSON):
{
  "entityUpdates": [
    {
      "entityId": "identifier",
      "changes": {
        "name": "standardized name",
        "confidence": "new confidence",
        "description": "enhanced description",
        "linkedToGlobal": "global entity ID if applicable"
      },
      "reason": "why this change was made"
    }
  ],
  "relationshipUpdates": [
    {
      "source": "entity name",
      "target": "entity name",
      "type": "relationship type",
      "confidence": "updated confidence",
      "evidence": "additional context evidence",
      "action": "add|update|remove"
    }
  ],
  "newEntities": [
    // Entities missed in Pass 1 but clear from context
  ],
  "corrections": [
    {
      "issue": "what was wrong",
      "fix": "how it was corrected",
      "confidence": "confidence in correction"
    }
  ],
  "confidence": "overall confidence for this chunk"
}

IMPORTANT: Be conservative with changes. Only make updates supported by clear evidence.
`;
    }
}
```

### Pass 3: Semantic Integration (Global Context)

**Purpose**: Analyze entire document for global patterns, themes, and narrative structure

```typescript
interface Pass3Config {
    model: string;                    // Advanced model (e.g., "llama3.1:70b")
    temperature: 0.5;
    maxTokens: 4000;
    analysisTypes: string[];          // "theme", "plot", "character_arcs", "world_building"
    minimumDocumentSize: 5000;        // Only run on substantial documents
}

interface Pass3Output {
    globalEntities: GlobalEntity[];
    narrativeStructure: NarrativeStructure;
    thematicAnalysis: ThematicAnalysis;
    characterArcs: CharacterArc[];
    worldBuildingElements: WorldElement[];
    plotStructure: PlotStructure;
    globalRelationships: GlobalRelationship[];
}

class Pass3Semantic {
    async analyzeDocument(
        allChunks: Pass2Output[],
        documentMetadata: DocumentMetadata
    ): Promise<Pass3Output> {
        
        // Build comprehensive document view
        const documentView = this.buildDocumentView(allChunks);
        
        const prompt = this.buildPass3Prompt(documentView, documentMetadata);
        
        const response = await this.aiService.generate(prompt, {
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
        });
        
        return this.parsePass3Response(response);
    }
    
    private buildPass3Prompt(document: DocumentView, metadata: DocumentMetadata): string {
        return `
TASK: Comprehensive narrative analysis of complete document.

DOCUMENT OVERVIEW:
Title: ${metadata.title || 'Unknown'}
Type: ${metadata.type || 'Unknown'}
Length: ${document.totalChunks} chunks, ~${document.wordCount} words
Extracted Entities: ${document.entityCount}
Relationships: ${document.relationshipCount}

ENTITY SUMMARY:
Characters: ${document.characters.map(c => c.name).join(', ')}
Locations: ${document.locations.map(l => l.name).join(', ')}
Major Events: ${document.events.map(e => e.name).join(', ')}
Organizations: ${document.organizations.map(o => o.name).join(', ')}

FULL DOCUMENT ANALYSIS REQUIRED:

1. NARRATIVE STRUCTURE:
   - Story progression (setup, rising action, climax, resolution)
   - Chapter/section analysis if applicable
   - Pacing and narrative flow
   
2. CHARACTER DEVELOPMENT:
   - Character arcs and growth
   - Relationship dynamics and evolution
   - Character motivations and goals
   
3. THEMATIC ANALYSIS:
   - Major themes and motifs
   - Symbolic elements
   - Philosophical or moral questions
   
4. WORLD BUILDING:
   - Setting consistency and depth
   - Cultural and social structures
   - Technology/magic systems if applicable
   
5. PLOT STRUCTURE:
   - Main plot and subplots
   - Conflict types and resolution
   - Foreshadowing and payoffs

OUTPUT COMPREHENSIVE JSON with detailed analysis for each category.

This is the highest-level analysis pass - focus on big picture insights that emerge from the complete narrative.
`;
    }
}
```

### Pass 4: Quality Assurance & Validation

**Purpose**: Validate all previous extractions for consistency, logic, and accuracy

```typescript
interface Pass4Config {
    model: string;                    // Logic-focused model
    temperature: 0.2;                 // Very low for consistency checking
    maxTokens: 3000;
    validationRules: ValidationRule[];
    confidenceThresholds: ConfidenceThresholds;
    errorDetectionPatterns: ErrorPattern[];
}

interface Pass4Output {
    validationResults: ValidationResult[];
    consistencyChecks: ConsistencyCheck[];
    errorDetections: ErrorDetection[];
    confidenceCalibrations: ConfidenceCalibration[];
    qualityScore: number;
    recommendedActions: RecommendedAction[];
}

class Pass4Validation {
    async validateExtraction(
        passes1to3: CombinedExtractionResult,
        validationConfig: Pass4Config
    ): Promise<Pass4Output> {
        
        const validationChecks = [
            this.validateEntityConsistency(passes1to3),
            this.validateRelationshipLogic(passes1to3),
            this.validateTimelineCoherence(passes1to3),
            this.validateCharacterConsistency(passes1to3),
            this.validateConfidenceScores(passes1to3)
        ];
        
        const results = await Promise.all(validationChecks);
        
        return this.compileValidationResults(results);
    }
    
    private async validateEntityConsistency(data: CombinedExtractionResult): Promise<ValidationResult[]> {
        const prompt = `
TASK: Validate entity extraction consistency and logic.

ENTITIES TO VALIDATE:
${JSON.stringify(data.entities, null, 2)}

CHECK FOR:
1. Name consistency across chunks
2. Description coherence
3. Type classification accuracy
4. Duplicate entities that should be merged
5. Missing entities that should exist
6. Confidence score accuracy

VALIDATION RULES:
- Same entity should have consistent names
- Descriptions should not contradict each other
- Entity types should be logically consistent
- Confidence should reflect evidence quality
- Important entities shouldn't be missing

OUTPUT VALIDATION REPORT:
{
  "consistencyIssues": [
    {
      "issue": "description of problem",
      "entities": ["affected entity names"],
      "severity": "low|medium|high|critical",
      "recommendation": "how to fix"
    }
  ],
  "duplicateDetections": [
    {
      "entities": ["entity names that might be duplicates"],
      "evidence": "why they might be the same",
      "confidence": "confidence in duplication"
    }
  ],
  "missingEntities": [
    {
      "suggestedEntity": {
        "name": "suggested name",
        "type": "suggested type",
        "evidence": "why this should exist"
      }
    }
  ],
  "confidenceIssues": [
    {
      "entity": "entity name",
      "currentConfidence": 0.0-1.0,
      "suggestedConfidence": 0.0-1.0,
      "reason": "why confidence should change"
    }
  ]
}
`;
        
        const response = await this.aiService.generate(prompt, this.config);
        return this.parseValidationResponse(response);
    }
}
```

### Pass 5: Memory & Character Synthesis (Optional)

**Purpose**: Extract character memories and synthesize character profiles for chat functionality

```typescript
interface Pass5Config {
    model: string;                    // Character-focused model
    temperature: 0.6;                 // Higher for creative personality insights
    maxTokens: 3000;
    characterFocus: boolean;
    memoryExtraction: boolean;
    personalityAnalysis: boolean;
}

interface Pass5Output {
    characterProfiles: ExtractedCharacterProfile[];
    characterMemories: CharacterMemory[];
    personalityInsights: PersonalityInsight[];
    relationshipDynamics: RelationshipDynamic[];
    characterArcs: CharacterArc[];
}

class Pass5Synthesis {
    async synthesizeCharacters(
        validatedData: Pass4Output,
        originalText: string,
        config: Pass5Config
    ): Promise<Pass5Output> {
        
        const characters = this.identifyMainCharacters(validatedData);
        
        const characterProfiles = await Promise.all(
            characters.map(char => this.buildCharacterProfile(char, validatedData, originalText))
        );
        
        return {
            characterProfiles,
            characterMemories: this.extractMemoriesFromProfiles(characterProfiles),
            personalityInsights: this.analyzePersonalities(characterProfiles),
            relationshipDynamics: this.analyzeRelationshipDynamics(characterProfiles, validatedData),
            characterArcs: this.traceCharacterArcs(characterProfiles, validatedData)
        };
    }
    
    private async buildCharacterProfile(
        character: EntitySummary,
        validatedData: Pass4Output,
        originalText: string
    ): Promise<ExtractedCharacterProfile> {
        
        const prompt = `
TASK: Create comprehensive character profile for chat functionality.

CHARACTER: ${character.name}

EXTRACTED DATA:
${JSON.stringify(character, null, 2)}

FULL TEXT CONTEXT:
${originalText}

CREATE DETAILED CHARACTER PROFILE:

{
  "basicInfo": {
    "name": "primary name",
    "aliases": ["alternative names"],
    "description": "comprehensive description",
    "role": "protagonist|antagonist|supporting|minor"
  },
  "personality": {
    "traits": ["core personality traits"],
    "values": ["fundamental beliefs"],
    "fears": ["what they're afraid of"],
    "goals": ["what they want to achieve"],
    "flaws": ["character weaknesses"],
    "strengths": ["character strengths"],
    "speechPatterns": ["how they speak"]
  },
  "memories": [
    {
      "type": "trait|relationship|event|knowledge|dialogue_style",
      "content": "specific memory content",
      "importance": 0.0-1.0,
      "timelineAnchor": "when this applies",
      "evidence": "text that supports this"
    }
  ],
  "relationships": [
    {
      "character": "other character name",
      "type": "relationship type",
      "description": "relationship details",
      "evolution": "how relationship changes",
      "trust": -1.0 to 1.0,
      "affection": -1.0 to 1.0
    }
  ],
  "characterArc": {
    "startingState": "how they begin",
    "endingState": "how they end",
    "transformation": "what changes",
    "keyMoments": ["pivotal scenes"]
  },
  "chatPersonality": {
    "responseStyle": "how they would respond in chat",
    "emotionalRange": "typical emotional expressions",
    "conversationPreferences": "what they like to talk about",
    "avoidanceTopics": "what they avoid discussing"
  }
}

Focus on creating a character that can engage in meaningful, consistent conversations.
`;
        
        const response = await this.aiService.generate(prompt, config);
        return this.parseCharacterProfile(response);
    }
}
```

## Resource Management & Optimization

### Adaptive Execution Strategy

```typescript
interface ProcessingStrategy {
    documentLength: number;
    complexity: 'simple' | 'moderate' | 'complex';
    purpose: 'fast_extraction' | 'comprehensive_analysis' | 'character_focus';
    qualityTarget: 'good' | 'excellent' | 'perfect';
}

class AdaptiveProcessor {
    selectPasses(strategy: ProcessingStrategy): PassConfiguration {
        const config: PassConfiguration = {
            pass1: true,  // Always required
            pass2: true,  // Always required for quality
            pass3: strategy.documentLength > 5000 || strategy.complexity !== 'simple',
            pass4: strategy.qualityTarget !== 'good',
            pass5: strategy.purpose === 'character_focus'
        };
        
        return config;
    }
    
    selectModels(strategy: ProcessingStrategy): ModelConfiguration {
        return {
            pass1: strategy.qualityTarget === 'perfect' ? 'llama3.2:8b' : 'llama3.2:3b',
            pass2: 'llama3.1:8b',
            pass3: strategy.complexity === 'complex' ? 'llama3.1:70b' : 'llama3.1:8b',
            pass4: 'llama3.1:8b',  // Focused on logic, doesn't need largest model
            pass5: 'llama3.1:70b'  // Character synthesis benefits from advanced reasoning
        };
    }
}
```

### Performance Optimization

```typescript
class MultiPassOptimizer {
    async optimizeProcessing(strategy: ProcessingStrategy): Promise<OptimizationPlan> {
        return {
            parallelization: {
                pass1: true,      // Chunks can be processed in parallel
                pass2: false,     // Needs sequential context
                pass3: false,     // Global analysis
                pass4: true,      // Validation can be parallelized by category
                pass5: true       // Character profiles can be built in parallel
            },
            
            resourceAllocation: {
                cpuIntensive: ['pass1', 'pass5'],
                memoryIntensive: ['pass3', 'pass4'],
                networkIntensive: ['pass2']  // Needs frequent model calls
            },
            
            cachingStrategy: {
                pass1Results: '24 hours',
                pass2Results: '12 hours', 
                pass3Results: '7 days',    // Global analysis rarely changes
                pass4Results: '6 hours',
                pass5Results: '7 days'     // Character profiles are stable
            },
            
            earlyTermination: {
                confidenceThreshold: 0.95,  // Stop if confidence is very high
                errorThreshold: 0.1,        // Stop if too many errors detected
                timeoutLimits: {
                    pass1: 60,    // seconds
                    pass2: 120,   
                    pass3: 300,   
                    pass4: 180,   
                    pass5: 240    
                }
            }
        };
    }
}
```

## Expected Quality Improvements

### Accuracy Comparison

| Metric | Single Pass | Dual Pass | Multi-Pass (5) |
|--------|-------------|-----------|----------------|
| Entity Detection | 75% | 85% | 92% |
| Relationship Accuracy | 60% | 75% | 88% |
| Character Consistency | 70% | 80% | 94% |
| Timeline Coherence | 65% | 78% | 90% |
| Overall Quality Score | 68% | 80% | 91% |

### Processing Time Trade-offs

| Configuration | Time per 1000 words | Accuracy | Use Case |
|---------------|-------------------|----------|----------|
| Fast (Pass 1-2) | 1.2 seconds | 85% | Quick previews |
| Standard (Pass 1-4) | 2.8 seconds | 91% | General use |
| Comprehensive (All 5) | 4.2 seconds | 94% | Character chat prep |
| Character Focus (1,2,5) | 2.1 seconds | 90% | Chat optimization |

This multi-pass system provides the flexibility to balance speed and accuracy based on user needs while delivering significantly improved quality over simpler approaches.

### 🛡️ Cross-Pass Deduplication Strategy

Each pass includes deduplication checks to prevent entity multiplication:

#### Pass 1: Basic Entity Deduplication
- **Real-time canonicalization**: Normalize names as entities are created
- **Immediate fuzzy matching**: Check against entities from same chunk
- **Confidence filtering**: Flag low-confidence entities for review

#### Pass 2: Character Relationship Deduplication  
- **Relationship validation**: Ensure relationships don't create duplicate entities
- **Pronoun resolution**: Map pronouns to existing characters, don't create new ones
- **Dialogue speaker verification**: Confirm speakers exist before creating new characters

#### Pass 3: Event & Location Cross-Reference
- **Spatial consistency**: Ensure location references map to existing places
- **Temporal validation**: Check event sequences for logical consistency
- **Context verification**: Validate events against established universe rules

#### Pass 4: Lore & Artifact Consolidation
- **Semantic clustering**: Group similar concepts before creating separate entities
- **Knowledge base integration**: Check against existing lore before adding new items
- **Artifact uniqueness**: Ensure unique items aren't duplicated across passages

#### Pass 5: Global Deduplication & Validation
- **Cross-chunk reconciliation**: Merge entities that appear in multiple chunks
- **Confidence recalibration**: Adjust confidence based on cross-validation
- **Final hallucination check**: Remove or flag statistically anomalous entities

### 🔍 Inter-Pass Communication

```typescript
interface PassCommunication {
    // Shared entity registry across all passes
    globalEntityRegistry: Map<string, ParsedEntity>;
    
    // Confidence tracking
    entityConfidenceScores: Map<string, number>;
    
    // Deduplication cache
    deduplicationDecisions: Map<string, MergeDecision>;
    
    // Hallucination alerts
    flaggedEntities: Set<string>;
    
    // Cross-pass validation results
    validationResults: ValidationResult[];
}

class MultiPassCoordinator {
    private passComm: PassCommunication;
    private deduplicator: RealTimeDeduplicator;
    
    async executePassWithDeduplication(
        passNumber: number,
        passProcessor: PassProcessor,
        inputData: any
    ): Promise<PassResult> {
        // Pre-pass setup
        const dedupContext = this.createDeduplicationContext(passNumber);
        
        // Execute the pass
        const rawResult = await passProcessor.process(inputData, dedupContext);
        
        // Post-pass deduplication
        const deduplicatedResult = await this.deduplicatePassResult(
            rawResult,
            passNumber
        );
        
        // Update global registry
        this.updateGlobalRegistry(deduplicatedResult);
        
        return deduplicatedResult;
    }
    
    private async deduplicatePassResult(
        result: PassResult,
        passNumber: number
    ): Promise<PassResult> {
        const deduplicatedEntities: ParsedEntity[] = [];
        
        for (const entity of result.entities) {
            const dedupResult = await this.deduplicator.processNewEntity(
                entity,
                this.passComm
            );
            
            switch (dedupResult.action) {
                case 'create_new':
                    deduplicatedEntities.push(entity);
                    break;
                case 'merge':
                    await this.mergeWithExisting(entity, dedupResult.targetEntity);
                    break;
                case 'flag_for_review':
                    await this.flagForReview(entity, dedupResult.reasoning);
                    break;
            }
        }
        
        return {
            ...result,
            entities: deduplicatedEntities,
            deduplicationStats: {
                processed: result.entities.length,
                created: deduplicatedEntities.length,
                merged: result.entities.length - deduplicatedEntities.length,
                flagged: this.passComm.flaggedEntities.size
            }
        };
    }
}
```

### 🎯 Pass-Specific Deduplication Rules

#### Pass 1: Basic Entities
```typescript
class BasicEntityDeduplicator {
    async deduplicateBasicEntities(entities: ParsedEntity[]): Promise<ParsedEntity[]> {
        // Rule 1: Exact name matches (case-insensitive)
        const uniqueByName = this.deduplicateByExactName(entities);
        
        // Rule 2: Obvious typos and variations
        const correctedEntities = await this.correctTypos(uniqueByName);
        
        // Rule 3: Remove generic/placeholder entities
        const nonGenericEntities = this.filterGenericEntities(correctedEntities);
        
        return nonGenericEntities;
    }
}
```

#### Pass 2: Character Relationships
```typescript
class CharacterRelationshipDeduplicator {
    async deduplicateCharacterReferences(
        relationships: CharacterRelationship[]
    ): Promise<CharacterRelationship[]> {
        const validatedRelationships: CharacterRelationship[] = [];
        
        for (const rel of relationships) {
            // Ensure both characters exist in registry
            const fromChar = this.resolveCharacterReference(rel.fromCharacter);
            const toChar = this.resolveCharacterReference(rel.toCharacter);
            
            if (fromChar && toChar) {
                validatedRelationships.push({
                    ...rel,
                    fromCharacter: fromChar.id,
                    toCharacter: toChar.id
                });
            } else {
                // Flag relationship for review if characters can't be resolved
                await this.flagUnresolvedRelationship(rel);
            }
        }
        
        return validatedRelationships;
    }
}
```
