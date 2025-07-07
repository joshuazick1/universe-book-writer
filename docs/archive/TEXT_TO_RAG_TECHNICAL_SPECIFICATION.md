# TextToRAG Backend - Technical Implementation Specification

## Core Service Architecture

### Enhanced Entity Type System

```typescript
// ai-server/src/services/textToRagParser/core/entityTypes.ts

export enum EntityType {
    // Core narrative entities
    CHARACTER = 'character',
    LOCATION = 'location',
    EVENT = 'event',
    ORGANIZATION = 'organization',
    
    // Object hierarchy (GPT recommendation: promote lore artifacts)
    OBJECT = 'object',           // Generic objects
    ARTIFACT = 'artifact',       // Magical/significant items
    TECHNOLOGY = 'technology',   // Sci-fi tech, devices
    WEAPON = 'weapon',          // Combat items
    VEHICLE = 'vehicle',        // Transportation
    
    // Knowledge entities (promoted from lore)
    PROPHECY = 'prophecy',      // Predictions, visions
    GRIMOIRE = 'grimoire',      // Books, scrolls, knowledge repositories
    RITUAL = 'ritual',          // Ceremonies, practices
    LEGEND = 'legend',          // Stories, myths
    
    // Communication entities (expanded dialogue)
    DIALOGUE = 'dialogue',      // Spoken conversation
    QUOTE = 'quote',           // Important statements, mottos
    MESSAGE = 'message',        // Written communications
    TELEPATHY = 'telepathy',    // Mental communication
    
    // Story structure entities
    PLOT_POINT = 'plot_point',  // Major story developments
    THEME = 'theme',           // Thematic elements
    FORESHADOWING = 'foreshadowing', // Future hints
    FLASHBACK = 'flashback',   // Past events
    
    // Meta entities
    LORE = 'lore',             // General background info
    SOURCE_TEXT = 'source_text', // Original text chunks
    ANNOTATION = 'annotation'   // User notes, AI insights
}

export enum RelationshipType {
    // Character relationships (expanded)
    FAMILY_PARENT = 'family_parent',
    FAMILY_CHILD = 'family_child',
    FAMILY_SIBLING = 'family_sibling',
    FAMILY_SPOUSE = 'family_spouse',
    ROMANTIC_PARTNER = 'romantic_partner',
    FRIEND = 'friend',
    ALLY = 'ally',
    ENEMY = 'enemy',
    RIVAL = 'rival',
    MENTOR = 'mentor',
    STUDENT = 'student',
    SERVANT = 'servant',
    MASTER = 'master',
    
    // Object relationships (GPT recommendation: entity triples)
    OWNS = 'owns',              // Character → owns → Artifact
    SEEKS = 'seeks',            // Character → seeks → Object
    CREATED = 'created',        // Character → created → Artifact
    DESTROYED = 'destroyed',    // Character → destroyed → Location
    WIELDS = 'wields',         // Character → wields → Weapon
    REPRESENTS = 'represents',  // Object → represents → Concept
    CONTAINS = 'contains',      // Location → contains → Object
    
    // Knowledge relationships
    CITES = 'cites',           // Character → cites → Prophecy
    BELIEVES = 'believes',     // Character → believes → Legend
    KNOWS = 'knows',           // Character → knows → Information
    REMEMBERS = 'remembers',   // Character → remembers → Event
    STUDIES = 'studies',       // Character → studies → Grimoire
    TEACHES = 'teaches',       // Character → teaches → Knowledge
    
    // Location relationships
    RULES = 'rules',           // Character → rules → Location
    LIVES_IN = 'lives_in',     // Character → lives_in → Location
    BORN_IN = 'born_in',       // Character → born_in → Location
    TRAVELED_TO = 'traveled_to', // Character → traveled_to → Location
    CONQUERED = 'conquered',   // Character → conquered → Location
    FOUNDED = 'founded',       // Character → founded → Location
    
    // Event relationships
    PARTICIPATED_IN = 'participated_in', // Character → participated_in → Event
    WITNESSED = 'witnessed',   // Character → witnessed → Event
    CAUSED = 'caused',         // Character → caused → Event
    PREVENTED = 'prevented',   // Character → prevented → Event
    DIED_IN = 'died_in',      // Character → died_in → Event
    
    // Temporal relationships
    PRECEDES = 'precedes',     // Event → precedes → Event
    FOLLOWS = 'follows',       // Event → follows → Event
    CONCURRENT = 'concurrent', // Event → concurrent → Event
    
    // Generic fallback
    ASSOCIATED_WITH = 'associated_with'
}

export interface EntityRelationship {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationshipType: RelationshipType;
    description?: string;
    confidence: number;
    sourceContext: string;      // The text that established this relationship
    timelineAnchor?: string;    // When this relationship existed
    verified: boolean;          // Has this been confirmed by contextual analysis?
    verificationMethod: 'primary_parse' | 'contextual_update' | 'user_confirmed';
    createdAt: Date;
    updatedAt: Date;
}

export interface EnhancedParsedEntity {
    id: string;
    type: EntityType;
    name: string;
    description: string;
    confidence: number;
    
    // Source tracking
    sourceChunks: number[];
    originalText: string[];     // Actual text snippets that mention this entity
    
    // Relationships
    relationships: EntityRelationship[];
    
    // Enhanced metadata
    metadata: {
        // Timeline information
        timelineAnchors: string[];
        firstMention: number;     // Chunk number of first appearance
        lastMention: number;      // Chunk number of last appearance
        
        // Importance scoring
        mentionFrequency: number;
        contextualImportance: number; // Based on relationships and events
        narrativeSignificance: number; // Plot relevance
        
        // Entity-specific metadata
        aliases?: string[];       // Alternative names
        titles?: string[];        // Formal titles or epithets
        tags?: string[];         // User or AI-generated tags
        
        // Processing metadata
        extractionMethod: 'primary_parse' | 'contextual_update' | 'relationship_inference';
        needsReview: boolean;     // Flagged for human review
        lastUpdated: Date;
        updateCount: number;
    };
    
    createdAt: Date;
    updatedAt: Date;
}
```

### Character Memory System

```typescript
// ai-server/src/services/textToRagParser/memory/interfaces.ts

export enum MemoryType {
    // Personal attributes
    TRAIT = 'trait',             // Personality characteristics
    SKILL = 'skill',             // Abilities and talents
    FEAR = 'fear',               // What they're afraid of
    GOAL = 'goal',               // What they want to achieve
    VALUE = 'value',             // What they believe in
    
    // Relationships
    RELATIONSHIP = 'relationship', // How they feel about others
    REPUTATION = 'reputation',     // How others view them
    
    // Experiences
    EVENT_MEMORY = 'event_memory', // Things that happened to them
    TRAUMA = 'trauma',             // Significant negative experiences
    ACHIEVEMENT = 'achievement',   // Accomplishments
    
    // Knowledge
    FACT = 'fact',               // Things they know
    RUMOR = 'rumor',             // Unconfirmed information
    SECRET = 'secret',           // Hidden knowledge
    LEARNING = 'learning',       // Recently acquired knowledge
    
    // Communication
    DIALOGUE_STYLE = 'dialogue_style', // How they speak
    CATCHPHRASE = 'catchphrase',       // Recurring phrases
    CONVERSATION = 'conversation',     // Past interactions
    
    // Emotional state
    EMOTION = 'emotion',         // Current/past emotional states
    MOOD_PATTERN = 'mood_pattern', // Behavioral patterns
    TRIGGER = 'trigger',         // Things that provoke reactions
    
    // Physical/appearance
    APPEARANCE = 'appearance',   // How they look
    MANNERISM = 'mannerism',    // Physical habits
    HEALTH = 'health'           // Physical condition
}

export interface CharacterMemory {
    id: string;
    characterId: string;
    memoryType: MemoryType;
    content: string;
    importance: number;          // 0-1, how significant this memory is
    reliability: number;         // 0-1, how accurate this information is
    
    // Context
    timelineAnchor?: string;     // When this memory was formed/applies
    location?: string;           // Where this memory took place
    associatedEntities: string[]; // Other entities involved
    sourceChunk?: number;        // Which text chunk this came from
    sourceText?: string;         // Original text that created this memory
    
    // Access patterns
    accessCount: number;         // How often this memory has been retrieved
    lastAccessed: Date;          // When it was last used
    decayFactor: number;         // 0-1, how much this memory has faded
    
    // Relationships to other memories
    relatedMemories: string[];   // IDs of connected memories
    contradictedBy: string[];    // Memories that conflict with this one
    confirmedBy: string[];       // Memories that support this one
    
    // Semantic search
    embedding?: number[];        // Vector embedding for similarity search
    keywords: string[];          // Extracted keywords for search
    
    // Metadata
    extractionConfidence: number; // How confident the AI was when creating this
    userValidated: boolean;      // Has a user confirmed this memory?
    isCore: boolean;            // Is this a fundamental character trait?
    
    createdAt: Date;
    updatedAt: Date;
}

export interface CharacterProfile {
    id: string;
    name: string;
    universeId: string;
    
    // Identity core (most important memories)
    corePersonality: {
        traits: string[];        // Fundamental character traits
        values: string[];        // Core beliefs and principles
        goals: string[];         // Primary motivations
        fears: string[];         // Deep-seated fears
        speechPatterns: string[]; // Characteristic ways of speaking
    };
    
    // Current state (for story-extracted characters)
    currentState?: {
        timelineAnchor: string;  // Where they are in the story
        location?: string;       // Current location
        emotionalState?: string; // Current mood/emotion
        physicalState?: string;  // Health, condition, etc.
        knowledgeState: string[]; // What they know at this point
        relationships: CharacterRelationshipState[];
        goals: string[];         // Current objectives
        resources: string[];     // What they have access to
    };
    
    // All memories
    memories: CharacterMemory[];
    
    // Conversation history
    conversations: ConversationHistory[];
    
    // Source information
    creationMode: 'standalone' | 'story_extraction' | 'series_compilation';
    sourceBook?: string;
    sourceChapter?: string;
    extractionPoint?: string;    // Specific narrative moment
    
    // Usage statistics
    interactionCount: number;
    lastInteraction: Date;
    averageConversationLength: number;
    
    // Quality metrics
    memoryConsistency: number;   // 0-1, how well memories align
    responseQuality: number;     // 0-1, user-rated chat quality
    characterAccuracy: number;   // 0-1, how true to source material
    
    createdAt: Date;
    updatedAt: Date;
}

export interface CharacterRelationshipState {
    characterId: string;
    name: string;
    relationshipType: string;
    status: 'active' | 'estranged' | 'unknown' | 'deceased';
    trust: number;              // -1 to 1
    affection: number;          // -1 to 1
    respect: number;            // -1 to 1
    lastInteraction?: string;   // When they last met/spoke
    notes?: string;             // Additional relationship context
}
```

### Dual-AI Processing System

```typescript
// ai-server/src/services/textToRagParser/processors/dualAiProcessor.ts

export interface ProcessingConfiguration {
    // Primary parser settings
    primary: {
        model: string;
        temperature: number;
        maxTokens: number;
        chunkOverlap: number;     // Overlap between chunks for context
        confidenceThreshold: number; // Minimum confidence to accept
    };
    
    // Contextual parser settings
    contextual: {
        model: string;            // Can be different/larger model
        temperature: number;
        maxTokens: number;
        contextWindow: number;    // How many previous chunks to consider
        delayChunks: number;      // How many chunks to lag behind
        relationshipFocus: boolean; // Emphasize relationship extraction
    };
    
    // Processing control
    enableParallelProcessing: boolean;
    maxConcurrentJobs: number;
    enableConfidenceFiltering: boolean;
    autoCreateCharacters: boolean; // Auto-create character profiles
    enableMemoryExtraction: boolean; // Extract character memories
}

export class DualAiProcessor {
    private primaryParser: PrimaryParser;
    private contextualParser: ContextualParser;
    private relationshipExtractor: RelationshipExtractor;
    private memoryExtractor: MemoryExtractor;
    private processingQueue: ProcessingQueue;
    
    async processText(
        text: string,
        universeId: string,
        config: ProcessingConfiguration
    ): Promise<ProcessingResult> {
        
        // Phase 1: Text preparation and chunking
        const chunks = await this.prepareChunks(text, config);
        
        // Phase 2: Primary parsing (immediate, independent)
        const primaryResults = await this.runPrimaryParsing(chunks, config);
        
        // Phase 3: Contextual enhancement (trailing, context-aware)
        const enhancedResults = await this.runContextualEnhancement(
            primaryResults, 
            config
        );
        
        // Phase 4: Relationship extraction and entity linking
        const linkedResults = await this.extractRelationships(
            enhancedResults, 
            config
        );
        
        // Phase 5: Character memory extraction (if enabled)
        const memoryResults = config.enableMemoryExtraction 
            ? await this.extractCharacterMemories(linkedResults, universeId)
            : null;
        
        // Phase 6: Quality assessment and confidence filtering
        const finalResults = await this.finalizeResults(
            linkedResults, 
            memoryResults, 
            config
        );
        
        return finalResults;
    }
    
    private async runPrimaryParsing(
        chunks: TextChunk[],
        config: ProcessingConfiguration
    ): Promise<PrimaryParseResult[]> {
        
        const results: PrimaryParseResult[] = [];
        
        if (config.enableParallelProcessing) {
            // Process chunks in parallel for speed
            const batchSize = config.maxConcurrentJobs;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(chunk => this.primaryParser.parseChunk(chunk, config.primary))
                );
                results.push(...batchResults);
                
                // Emit progress update
                this.emitProgress('primary_parsing', i + batch.length, chunks.length);
            }
        } else {
            // Sequential processing for memory efficiency
            for (let i = 0; i < chunks.length; i++) {
                const result = await this.primaryParser.parseChunk(chunks[i], config.primary);
                results.push(result);
                
                this.emitProgress('primary_parsing', i + 1, chunks.length);
            }
        }
        
        return results;
    }
    
    private async runContextualEnhancement(
        primaryResults: PrimaryParseResult[],
        config: ProcessingConfiguration
    ): Promise<EnhancedParseResult[]> {
        
        const enhancedResults: EnhancedParseResult[] = [];
        const contextWindow = config.contextual.contextWindow;
        const delayChunks = config.contextual.delayChunks;
        
        for (let i = 0; i < primaryResults.length; i++) {
            // Wait for enough context to build up
            if (i < delayChunks) {
                enhancedResults.push({
                    ...primaryResults[i],
                    contextuallyEnhanced: false
                });
                continue;
            }
            
            // Build context from previous chunks
            const contextStart = Math.max(0, i - contextWindow);
            const context = primaryResults.slice(contextStart, i);
            
            // Get the chunk to enhance (offset by delay)
            const targetIndex = i - delayChunks;
            const targetResult = primaryResults[targetIndex];
            
            // Run contextual enhancement
            const enhanced = await this.contextualParser.enhanceWithContext(
                targetResult,
                context,
                config.contextual
            );
            
            enhancedResults[targetIndex] = enhanced;
            
            this.emitProgress('contextual_enhancement', i + 1, primaryResults.length);
        }
        
        // Handle remaining chunks that haven't been contextually enhanced
        for (let i = enhancedResults.length; i < primaryResults.length; i++) {
            enhancedResults.push({
                ...primaryResults[i],
                contextuallyEnhanced: false
            });
        }
        
        return enhancedResults;
    }
}
```

### Advanced Prompt Engineering

```typescript
// ai-server/src/services/textToRagParser/utils/promptBuilder.ts

export class AdvancedPromptBuilder {
    
    static buildPrimaryParsePrompt(
        chunk: string,
        chunkIndex: number,
        previousContext?: ContextSummary
    ): string {
        return `
You are an expert narrative analyst. Extract entities from this text chunk with high precision.

${previousContext ? `
PREVIOUS CONTEXT (chunks ${previousContext.startChunk}-${previousContext.endChunk}):
Characters mentioned: ${previousContext.characters.join(', ')}
Locations: ${previousContext.locations.join(', ')}
Key events: ${previousContext.events.join(', ')}
Timeline anchors: ${previousContext.timelineAnchors.join(', ')}
` : ''}

CHUNK ${chunkIndex} TO ANALYZE:
"""
${chunk}
"""

Extract ONLY entities clearly present in this chunk. Return a JSON object with:

{
  "entities": [
    {
      "type": "character|location|event|organization|object|artifact|prophecy|dialogue|quote|plot_point|theme|lore",
      "name": "Exact name as it appears",
      "description": "What this entity is/does in this specific chunk",
      "confidence": 0.0-1.0,
      "textEvidence": "The exact phrase(s) that support this entity",
      "aliases": ["alternative names mentioned"],
      "relationships": [
        {
          "target": "Name of related entity",
          "type": "owns|seeks|rules|cites|believes|family_parent|friend|enemy|etc",
          "evidence": "Text that shows this relationship"
        }
      ]
    }
  ],
  "dialogues": [
    {
      "speaker": "Character name or 'Unknown'",
      "addressee": "Who they're speaking to or null",
      "quote": "Exact dialogue text",
      "context": "Situation when this was said",
      "emotion": "angry|sad|happy|excited|fearful|calm|etc",
      "significance": "low|medium|high|critical"
    }
  ],
  "timeline": {
    "anchor": "Any time reference in this chunk",
    "sequence": "before|during|after previous events",
    "duration": "How long events in this chunk take"
  },
  "themes": ["Major themes present in this chunk"],
  "mood": "Overall emotional tone of this chunk",
  "events": [
    {
      "name": "Event name",
      "description": "What happened",
      "participants": ["Character names involved"],
      "significance": "low|medium|high|critical",
      "consequences": ["What this event leads to"]
    }
  ]
}

CRITICAL RULES:
1. Only extract entities explicitly mentioned in this chunk
2. Be conservative with confidence scores
3. Provide exact text evidence for each entity
4. Character names must be consistent with previous context
5. Relationships must be directly stated or strongly implied
6. Mark uncertainty with lower confidence scores
`;
    }
    
    static buildContextualEnhancementPrompt(
        targetChunk: PrimaryParseResult,
        context: PrimaryParseResult[],
        globalEntities: EntityCatalog
    ): string {
        
        const contextSummary = this.buildContextSummary(context);
        const entityCatalog = this.buildEntityCatalog(globalEntities);
        
        return `
You are a narrative consistency analyst. Review and enhance entity extraction using broader context.

GLOBAL ENTITY CATALOG:
${entityCatalog}

RECENT CONTEXT (${context.length} previous chunks):
${contextSummary}

TARGET CHUNK TO ENHANCE:
Original entities: ${JSON.stringify(targetChunk.entities, null, 2)}
Original chunk text: "${targetChunk.sourceText}"

Your tasks:
1. DISAMBIGUATION: Resolve entity name variations (e.g., "John" vs "John Smith" vs "Commander Smith")
2. CONFIDENCE ADJUSTMENT: Increase confidence for entities confirmed by context, decrease for contradicted ones
3. RELATIONSHIP ENHANCEMENT: Add relationships that become clear from broader context
4. ENTITY LINKING: Connect entities to previously established ones
5. MISSING ENTITY DETECTION: Find entities that should have been extracted but weren't
6. CONTRADICTION RESOLUTION: Flag inconsistencies between chunks

Return enhanced JSON with:
{
  "enhancedEntities": [
    {
      ...originalEntityFields,
      "confidence": "adjusted confidence 0.0-1.0",
      "linkedToGlobal": "ID if this matches a known global entity",
      "disambiguatedName": "Standardized name if different from original",
      "contextualEvidence": "Evidence from other chunks that supports this entity",
      "enhancementReason": "Why confidence/details were changed"
    }
  ],
  "newRelationships": [
    {
      "source": "Source entity name",
      "target": "Target entity name", 
      "type": "relationship type",
      "evidence": "Cross-chunk evidence for this relationship",
      "confidence": 0.0-1.0
    }
  ],
  "corrections": [
    {
      "issue": "What was wrong",
      "fix": "How it was corrected",
      "confidence": "Confidence in the correction"
    }
  ],
  "contradictions": [
    {
      "description": "What contradicts between chunks",
      "chunks": ["Chunk numbers involved"],
      "severity": "low|medium|high"
    }
  ]
}

Focus on consistency, accuracy, and building a coherent narrative understanding.
`;
    }
    
    static buildCharacterMemoryExtractionPrompt(
        characterName: string,
        textChunks: string[],
        existingMemories?: CharacterMemory[]
    ): string {
        
        const existingMemoriesText = existingMemories 
            ? `\nEXISTING MEMORIES:\n${existingMemories.map(m => `- ${m.memoryType}: ${m.content}`).join('\n')}`
            : '';
            
        return `
You are a character psychologist. Extract detailed memories and personality traits for ${characterName}.

SOURCE TEXT:
${textChunks.map((chunk, i) => `CHUNK ${i + 1}:\n${chunk}\n`).join('\n')}
${existingMemoriesText}

Extract memories that would shape how ${characterName} thinks, speaks, and acts. Focus on:

PERSONALITY TRAITS:
- Core values and beliefs
- Fears and insecurities  
- Goals and motivations
- Speech patterns and mannerisms
- Behavioral quirks

RELATIONSHIPS:
- How they feel about other characters
- Trust levels and emotional bonds
- Past interactions and their impact
- Loyalty and betrayal experiences

EXPERIENCES:
- Formative events
- Traumatic experiences
- Achievements and failures
- Lessons learned
- Skills developed

KNOWLEDGE:
- Facts they know
- Secrets they keep
- Rumors they've heard
- Areas of expertise
- Misconceptions they hold

Return JSON with:
{
  "memories": [
    {
      "type": "trait|relationship|event_memory|fact|dialogue_style|emotion|etc",
      "content": "Detailed memory description",
      "importance": 0.0-1.0,
      "reliability": 0.0-1.0,
      "timelineAnchor": "When this memory applies",
      "evidence": "Text that supports this memory",
      "keywords": ["searchable", "keywords"],
      "relatedEntities": ["other characters/entities involved"]
    }
  ],
  "personalityCore": {
    "traits": ["fundamental character traits"],
    "values": ["core beliefs"],
    "fears": ["deep-seated fears"],
    "goals": ["primary motivations"],
    "speechPatterns": ["how they typically speak"]
  },
  "currentState": {
    "emotionalState": "Current mood/emotion",
    "knowledgeState": ["what they know at this point"],
    "relationships": [
      {
        "character": "Other character name",
        "relationship": "friend|enemy|family|etc",
        "trust": -1.0 to 1.0,
        "affection": -1.0 to 1.0
      }
    ]
  }
}

Make memories specific, actionable, and true to the character as portrayed in the text.
`;
    }
}
```

This technical specification provides the detailed implementation structure for moving the TextToRAGParser to the backend with all the requested enhancements. The system would support:

1. **Enhanced Entity Types**: Including promoted artifacts, events, and relationship triples as recommended
2. **Character Memory System**: Comprehensive personality and experience tracking
3. **Dual-AI Processing**: Parallel immediate parsing and trailing contextual enhancement
4. **Advanced Relationship Extraction**: Support for complex entity relationships
5. **Character Chat Functionality**: Both standalone and story-extracted character interaction

The architecture is designed to be scalable, maintainable, and extensible for future enhancements while following the project's clean architecture principles.
