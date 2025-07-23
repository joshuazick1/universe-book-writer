# Text-to-RAG Parser Multi-Pass Enhancement Plan

## Overview

This document provides a detailed implementation plan for enhancing the existing text-to-RAG parser to use the Universal AI Processing Framework's multi-pass approach. The goal is to improve entity extraction accuracy, relationship mapping, and overall knowledge graph quality through intelligent, iterative processing.

## Current Implementation Analysis

### Existing Components (Reusable)
- **`textChunker.ts`**: Basic text chunking functionality
- **`databaseManager.ts`**: Database storage and retrieval
- **`ollamaService.ts`**: AI service integration
- **`entityTypes.ts`**: Entity type definitions
- **`parserEngine.ts`**: Core parsing orchestration
- **`relationshipExtractor.ts`**: Basic relationship extraction

### Current Entity Types
Based on `entityTypes.ts`, the current system supports:
- **Characters**: Name, description, traits, relationships
- **Locations**: Name, description, type, significance
- **Organizations**: Name, type, purpose, members
- **Items/Objects**: Name, type, description, owner
- **Events**: Name, timeline, participants, significance
- **Concepts**: Abstract ideas, themes, technologies

## Multi-Pass RAG Processing Architecture

### Pass 1: Document Analysis & Intelligent Chunking

#### Purpose
Analyze document structure and create semantically meaningful chunks optimized for entity extraction.

#### Implementation Steps

1. **Document Structure Analysis**
   ```typescript
   interface DocumentStructure {
     genre: 'fantasy' | 'sci-fi' | 'mystery' | 'romance' | 'historical' | 'contemporary';
     narrativeStyle: 'first-person' | 'third-person' | 'omniscient' | 'multiple-pov';
     chapters: ChapterInfo[];
     dialogueDensity: number;
     descriptionDensity: number;
     entityDensity: EntityDensityMap;
     complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
   }
   ```

2. **Enhanced Text Chunker**
   ```typescript
   export class IntelligentChunker {
     async analyzeDocumentStructure(content: string): Promise<DocumentStructure> {
       // Use AI to analyze genre, style, and structure
       // Detect chapter breaks, scene transitions
       // Calculate entity density per section
     }

     async createSemanticChunks(content: string, structure: DocumentStructure): Promise<Chunk[]> {
       // Chunk based on semantic boundaries (scenes, conversations, descriptions)
       // Ensure chunks have sufficient context for entity extraction
       // Maintain narrative flow within chunks
       // Target chunk size: 1000-2000 words for complex entities, 500-1000 for simple
     }

     async optimizeChunkBoundaries(chunks: Chunk[]): Promise<Chunk[]> {
       // Adjust boundaries to avoid splitting character introductions
       // Ensure dialogue blocks stay together
       // Add contextual overlap between chunks (10-15%)
     }
   }
   ```

3. **Chunk Classification**
   ```typescript
   interface Chunk {
     id: string;
     content: string;
     startPosition: number;
     endPosition: number;
     type: 'dialogue' | 'description' | 'action' | 'exposition' | 'mixed';
     entityDensity: number;
     complexity: number;
     contextualRelevance: number;
     precedingContext: string; // 200-300 words from previous chunk
     followingContext: string; // 200-300 words from next chunk
   }
   ```

### Pass 2: Multi-Stage Entity Extraction

#### Purpose
Extract and classify entities with high accuracy using context-aware AI processing.

#### Stage 2.1: Initial Entity Identification
```typescript
export class InitialEntityExtractor {
  async identifyPotentialEntities(chunk: Chunk): Promise<PotentialEntity[]> {
    // Use AI to identify all potential entities in chunk
    // Include both explicit and implicit entities
    // Extract with confidence scores
    
    const prompt = `
    Analyze this text chunk and identify ALL potential entities:
    - Characters (people, beings, AI, etc.)
    - Locations (places, buildings, regions, etc.)
    - Organizations (groups, companies, governments, etc.)
    - Items/Objects (weapons, technology, artifacts, etc.)
    - Events (battles, ceremonies, discoveries, etc.)
    - Concepts (magic systems, technologies, philosophies, etc.)
    
    Context: ${chunk.precedingContext}
    
    Main Content: ${chunk.content}
    
    Following Context: ${chunk.followingContext}
    
    For each entity, provide:
    - Name/identifier
    - Type
    - Confidence score (0-1)
    - Brief description
    - Contextual importance (0-1)
    `;
  }
}
```

#### Stage 2.2: Entity Classification & Validation
```typescript
export class EntityClassifier {
  async classifyEntities(entities: PotentialEntity[]): Promise<ClassifiedEntity[]> {
    // Use AI to refine entity types and eliminate false positives
    // Merge duplicate entities identified in overlapping contexts
    // Validate entity relevance to the narrative
    
    const prompt = `
    Review these potential entities and:
    1. Confirm or correct entity types
    2. Eliminate false positives (common nouns mistaken for proper entities)
    3. Merge duplicate entities
    4. Assess narrative importance
    5. Identify missing entities that should be included
    
    Entities to review: ${JSON.stringify(entities)}
    `;
  }
}
```

#### Stage 2.3: Context Enhancement
```typescript
export class EntityContextEnhancer {
  async enhanceEntityContext(entities: ClassifiedEntity[], chunk: Chunk): Promise<EnhancedEntity[]> {
    // Extract additional context for each entity
    // Identify entity attributes, relationships, and significance
    // Prepare entities for detailed node creation
    
    for (const entity of entities) {
      const prompt = `
      Extract detailed information about this ${entity.type}:
      
      Entity: ${entity.name}
      Type: ${entity.type}
      Context: ${chunk.content}
      
      Please provide:
      - Detailed description
      - Key attributes/properties
      - Relationships mentioned in this context
      - Significance to the narrative
      - Any special characteristics or abilities
      - Timeline/temporal information if relevant
      `;
    }
  }
}
```

### Pass 3: AI-Powered Individual Node Creation

#### Purpose
Create detailed, comprehensive nodes for each entity using AI analysis of relevant text chunks.

#### Implementation Strategy

1. **Node Creation Queue**
   ```typescript
   export class NodeCreationQueue {
     async queueNodeCreation(entity: EnhancedEntity, relevantChunks: Chunk[]): Promise<string> {
       // Queue entity for detailed node creation
       // Prioritize based on narrative importance and entity complexity
       // Group related entities for batch processing efficiency
     }

     async prioritizeCreation(entities: EnhancedEntity[]): Promise<PriorityQueue> {
       // Prioritization factors:
       // 1. Main characters > supporting > background
       // 2. Important locations > minor locations
       // 3. Central concepts > peripheral concepts
       // 4. Entities with many relationships > isolated entities
     }
   }
   ```

2. **AI Node Creator**
   ```typescript
   export class AINodeCreator {
     async createDetailedNode(entity: EnhancedEntity, relevantChunks: Chunk[]): Promise<DetailedNode> {
       // Combine all relevant chunks mentioning the entity
       // Use AI to synthesize comprehensive entity information
       // Generate missing details that would be consistent with the narrative
       
       const combinedContext = this.combineRelevantChunks(relevantChunks, entity.name);
       
       const prompt = `
       Create a comprehensive profile for this ${entity.type}:
       
       Entity Name: ${entity.name}
       Type: ${entity.type}
       
       All relevant text excerpts:
       ${combinedContext}
       
       Please create a detailed profile including:
       
       For Characters:
       - Full name and any aliases
       - Physical description
       - Personality traits
       - Background/history
       - Motivations and goals
       - Fears and weaknesses
       - Skills and abilities
       - Relationships with other entities
       - Character arc progression
       - Dialogue patterns/speech style
       
       For Locations:
       - Full name and any alternate names
       - Geographic details
       - Physical description
       - Cultural/historical significance
       - Inhabitants or frequent visitors
       - Important events that occurred there
       - Strategic or narrative importance
       - Atmosphere and mood
       
       For Organizations:
       - Official name and any informal names
       - Type and structure
       - Purpose and goals
       - Leadership hierarchy
       - Members and affiliations
       - Resources and capabilities
       - History and founding
       - Current status and activities
       
       For Items/Objects:
       - Name and any aliases
       - Physical description
       - Origin and creator
       - Properties and capabilities
       - Current owner/location
       - Historical significance
       - Condition and state
       - Related items or sets
       
       For Events:
       - Event name/description
       - Timeline and duration
       - Participants and witnesses
       - Location and setting
       - Causes and consequences
       - Significance to the narrative
       - Aftermath and long-term effects
       
       For Concepts:
       - Concept name and definition
       - How it manifests in the world
       - Rules and limitations
       - Historical development
       - Practitioners or users
       - Related concepts
       - Impact on the narrative
       
       Ensure all information is:
       - Consistent with the source text
       - Logically coherent
       - Narratively relevant
       - Properly attributed to the source
       `;
     }
   }
   ```

### Pass 4: Relationship Mapping & Network Creation

#### Purpose
Identify and validate relationships between entities, creating a comprehensive knowledge graph.

#### Implementation

1. **Relationship Identification**
   ```typescript
   export class RelationshipMapper {
     async identifyRelationships(nodes: DetailedNode[]): Promise<PotentialRelationship[]> {
       // Cross-reference all nodes to identify relationships
       // Use AI to understand implicit relationships
       // Consider temporal relationships (before/after events)
       
       const nodeContexts = nodes.map(node => ({
         id: node.id,
         name: node.name,
         type: node.type,
         context: node.extractedContexts.join(' ')
       }));
       
       const prompt = `
       Analyze these entities and identify ALL relationships between them:
       
       Entities:
       ${JSON.stringify(nodeContexts, null, 2)}
       
       For each relationship, provide:
       - Source entity ID
       - Target entity ID
       - Relationship type (parent, friend, enemy, owns, located_in, member_of, created_by, etc.)
       - Relationship strength (0-1)
       - Description of the relationship
       - Evidence from the text
       - Temporal nature (past, present, future, changing)
       
       Consider both explicit relationships (directly stated) and implicit ones (inferred from context).
       `;
     }
   }
   ```

2. **Relationship Validation**
   ```typescript
   export class RelationshipValidator {
     async validateRelationships(relationships: PotentialRelationship[]): Promise<ValidatedRelationship[]> {
       // Check for contradictory relationships
       // Validate relationship consistency across the narrative
       // Score relationship confidence based on evidence
       
       const prompt = `
       Review these relationships for:
       1. Logical consistency
       2. Mutual compatibility (if A is parent of B, B should be child of A)
       3. Timeline consistency
       4. Strength of evidence
       5. Potential conflicts or contradictions
       
       Relationships to validate:
       ${JSON.stringify(relationships, null, 2)}
       `;
     }
   }
   ```

### Pass 5: Quality Enhancement & Validation

#### Purpose
Final quality check, gap filling, and optimization of the knowledge graph.

#### Implementation

1. **Quality Assessment**
   ```typescript
   export class RAGQualityAssessor {
     async assessKnowledgeGraphQuality(nodes: DetailedNode[], relationships: ValidatedRelationship[]): Promise<QualityAssessment> {
       // Evaluate completeness of entity information
       // Check for orphaned nodes (entities with no relationships)
       // Validate narrative coherence
       // Identify missing entities that should be present
       
       return {
         completenessScore: number,
         consistencyScore: number,
         coherenceScore: number,
         coverageScore: number,
         identifiedGaps: QualityGap[],
         recommendations: string[]
       };
     }
   }
   ```

2. **Gap Filling**
   ```typescript
   export class KnowledgeGapFiller {
     async fillIdentifiedGaps(gaps: QualityGap[], originalText: string): Promise<Enhancement[]> {
       // Use AI to fill missing information
       // Infer logical details that aren't explicitly stated
       // Ensure all inferences are marked as generated vs. extracted
       
       for (const gap of gaps) {
         const prompt = `
         The knowledge graph is missing information about: ${gap.description}
         
         Based on this text, can you infer the missing information?
         Text: ${gap.relevantContext}
         
         Please provide:
         - The missing information (if inferable)
         - Confidence level in the inference
         - Supporting evidence from the text
         - Mark as [INFERRED] vs [EXTRACTED]
         `;
       }
     }
   }
   ```

## Database Schema Enhancements

### Enhanced Node Structure
```typescript
interface EnhancedRAGNode {
  // Existing fields
  id: string;
  nodeType: EntityType;
  title: string;
  content: string;
  
  // New framework fields
  processingPasses: PassResult[];
  qualityScores: QualityMetrics;
  confidenceScore: number;
  extractionSource: 'direct' | 'inferred' | 'generated';
  textReferences: TextReference[];
  contextualImportance: number;
  narrativeRole: 'primary' | 'secondary' | 'background';
  
  // Enhanced properties
  properties: {
    // Core properties (existing)
    name: string;
    description: string;
    
    // Enhanced properties (new)
    aliases: string[];
    physicalDescription?: string;
    personality?: PersonalityTraits;
    background?: string;
    timeline?: TimelineEvent[];
    attributes: Record<string, any>;
    capabilities?: string[];
    limitations?: string[];
    
    // Processing metadata
    extractedFromChunks: string[];
    processingTimestamp: Date;
    lastValidated: Date;
  };
  
  // Enhanced relationships
  relationships: EnhancedRelationship[];
}
```

### Enhanced Relationship Structure
```typescript
interface EnhancedRelationship {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipType;
  strength: number; // 0-1
  confidence: number; // 0-1
  description: string;
  evidence: TextReference[];
  temporal: 'past' | 'present' | 'future' | 'timeless';
  bidirectional: boolean;
  
  // Processing metadata
  extractedFromPass: number;
  validatedBy: ValidationMethod;
  inferenceLevel: 'explicit' | 'implicit' | 'inferred';
}
```

## Performance Optimizations

### Parallel Processing
```typescript
export class ParallelRAGProcessor {
  async processInParallel(chunks: Chunk[]): Promise<ProcessingResult> {
    // Process multiple chunks simultaneously for entity extraction
    // Batch similar entity types for efficient AI processing
    // Use worker threads for CPU-intensive analysis tasks
    
    const chunkBatches = this.createOptimalBatches(chunks);
    const entityExtractionPromises = chunkBatches.map(batch => 
      this.extractEntitiesFromBatch(batch)
    );
    
    const extractedEntities = await Promise.all(entityExtractionPromises);
    return this.mergeAndDeduplicateEntities(extractedEntities);
  }
}
```

### Caching Strategy
```typescript
export class RAGProcessingCache {
  // Cache entity extractions for similar text patterns
  async cacheEntityExtraction(textHash: string, entities: ExtractedEntity[]): Promise<void>;
  
  // Cache relationship patterns between entity types
  async cacheRelationshipPattern(pattern: RelationshipPattern, relationships: Relationship[]): Promise<void>;
  
  // Cache AI-generated descriptions for reuse
  async cacheGeneratedContent(contentHash: string, content: GeneratedContent): Promise<void>;
}
```

## Testing Strategy

### Quality Validation Tests
```typescript
describe('Multi-Pass RAG Processor', () => {
  test('Entity extraction accuracy', async () => {
    // Test entity identification accuracy against manually annotated text
    // Minimum 95% precision and 90% recall for primary entities
  });
  
  test('Relationship mapping accuracy', async () => {
    // Test relationship identification accuracy
    // Minimum 90% accuracy for explicit relationships
    // Minimum 75% accuracy for implicit relationships
  });
  
  test('Knowledge graph completeness', async () => {
    // Test that no major entities are missed
    // Test that entity descriptions are comprehensive
  });
  
  test('Processing performance', async () => {
    // Test processing time vs. quality trade-offs
    // Ensure processing time scales linearly with text length
  });
});
```

## Deployment & Migration

### Migration Plan
1. **Phase 1**: Deploy new system alongside existing system
2. **Phase 2**: A/B test with new text inputs
3. **Phase 3**: Migrate existing RAG database entries
4. **Phase 4**: Full deployment with fallback capability

### Configuration
```typescript
interface RAGProcessingConfig {
  enableMultiPass: boolean;
  maxProcessingPasses: number;
  qualityThreshold: number;
  useParallelProcessing: boolean;
  cacheEnabled: boolean;
  aiModel: string;
  processingTimeout: number;
}
```

This enhanced text-to-RAG parser will provide significantly improved entity extraction accuracy, relationship mapping, and overall knowledge graph quality through the systematic application of the Universal AI Processing Framework's multi-pass approach.
