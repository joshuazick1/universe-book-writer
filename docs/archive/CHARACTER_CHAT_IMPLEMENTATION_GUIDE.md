# Character Chat System Implementation Guide

## Overview

This guide provides a step-by-step implementation plan for the AI character chat functionality, supporting both standalone character creation and story-extracted character interaction.

## Character Creation Modes

### 1. Standalone Character Creation

Creates a character from scratch based on user input.

```typescript
// ai-server/src/services/characterChat/creation/standaloneCreator.ts

export interface StandaloneCharacterRequest {
    name: string;
    description: string;          // Base personality description
    universeId: string;
    userId: string;
    
    // Optional starting parameters
    personality?: {
        traits?: string[];
        values?: string[];
        fears?: string[];
        goals?: string[];
        speechPatterns?: string[];
    };
    
    // Optional background
    backstory?: string;
    relationships?: Array<{
        name: string;
        relationship: string;
        description: string;
    }>;
    
    // Visual/physical description
    appearance?: string;
    age?: number;
    occupation?: string;
}

export class StandaloneCharacterCreator {
    async createCharacter(request: StandaloneCharacterRequest): Promise<CharacterProfile> {
        // 1. Generate core personality using AI
        const personality = await this.generatePersonality(request);
        
        // 2. Create baseline memories
        const memories = await this.generateBaselineMemories(request, personality);
        
        // 3. Initialize character profile
        const profile: CharacterProfile = {
            id: generateId(),
            name: request.name,
            universeId: request.universeId,
            creationMode: 'standalone',
            
            corePersonality: personality,
            memories: memories,
            conversations: [],
            
            interactionCount: 0,
            lastInteraction: new Date(),
            averageConversationLength: 0,
            
            memoryConsistency: 1.0,
            responseQuality: 0.5,
            characterAccuracy: 1.0,
            
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // 4. Save to database
        await this.characterRepository.save(profile);
        
        return profile;
    }
    
    private async generatePersonality(request: StandaloneCharacterRequest): Promise<CorePersonality> {
        const prompt = `
Create a detailed personality for a character named ${request.name}.

Description: ${request.description}
${request.backstory ? `Backstory: ${request.backstory}` : ''}
${request.appearance ? `Appearance: ${request.appearance}` : ''}
${request.age ? `Age: ${request.age}` : ''}
${request.occupation ? `Occupation: ${request.occupation}` : ''}

Generate a comprehensive personality profile with:

{
  "traits": ["5-7 core personality traits"],
  "values": ["3-5 fundamental beliefs/principles"],
  "fears": ["2-4 things they're afraid of"],
  "goals": ["3-5 things they want to achieve"],
  "speechPatterns": ["3-5 ways they typically speak"],
  "mannerisms": ["3-5 physical or behavioral quirks"],
  "flaws": ["2-3 character weaknesses"],
  "strengths": ["3-5 character strengths"]
}

Make the personality coherent, realistic, and engaging for conversation.
`;
        
        const response = await this.aiService.generate(prompt, {
            model: this.config.characterCreationModel,
            temperature: 0.8
        });
        
        return this.parsePersonalityResponse(response);
    }
    
    private async generateBaselineMemories(
        request: StandaloneCharacterRequest,
        personality: CorePersonality
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];
        
        // Core personality memories
        personality.traits.forEach(trait => {
            memories.push({
                id: generateId(),
                characterId: '', // Will be set when character is created
                memoryType: MemoryType.TRAIT,
                content: trait,
                importance: 0.9,
                reliability: 1.0,
                accessCount: 0,
                lastAccessed: new Date(),
                decayFactor: 1.0,
                relatedMemories: [],
                contradictedBy: [],
                confirmedBy: [],
                keywords: [trait.toLowerCase()],
                extractionConfidence: 1.0,
                userValidated: true,
                isCore: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });
        
        // Add other core memories for values, fears, goals, etc.
        // ...
        
        return memories;
    }
}
```

### 2. Story Extraction Character Creation

Extracts a character from specific story moments.

```typescript
// ai-server/src/services/characterChat/creation/storyExtractor.ts

export interface StoryExtractionRequest {
    characterName: string;
    sourceText: string;
    timelineAnchor?: string;      // "Chapter 5", "After the battle"
    extractionPoint?: string;     // Specific narrative moment
    universeId: string;
    userId: string;
    
    // Optional context
    sourceBook?: string;
    sourceChapter?: string;
    previousContext?: string;     // Text before this excerpt
    followingContext?: string;    // Text after this excerpt
}

export class StoryExtractionCreator {
    async extractCharacter(request: StoryExtractionRequest): Promise<CharacterProfile> {
        // 1. Parse source text for character information
        const extractedData = await this.extractCharacterData(request);
        
        // 2. Build comprehensive memory set
        const memories = await this.buildMemoriesFromText(extractedData, request);
        
        // 3. Determine current state at extraction point
        const currentState = await this.determineCurrentState(extractedData, request);
        
        // 4. Create character profile
        const profile: CharacterProfile = {
            id: generateId(),
            name: request.characterName,
            universeId: request.universeId,
            creationMode: 'story_extraction',
            
            corePersonality: extractedData.personality,
            currentState: currentState,
            memories: memories,
            conversations: [],
            
            sourceBook: request.sourceBook,
            sourceChapter: request.sourceChapter,
            extractionPoint: request.extractionPoint,
            
            // ... other fields
        };
        
        await this.characterRepository.save(profile);
        return profile;
    }
    
    private async extractCharacterData(request: StoryExtractionRequest): Promise<ExtractedCharacterData> {
        const prompt = this.buildExtractionPrompt(request);
        const response = await this.aiService.generate(prompt, {
            model: this.config.extractionModel,
            temperature: 0.3 // Lower temperature for more factual extraction
        });
        
        return this.parseExtractionResponse(response);
    }
    
    private buildExtractionPrompt(request: StoryExtractionRequest): string {
        return `
You are analyzing a character from a story. Extract comprehensive information about ${request.characterName}.

${request.previousContext ? `PREVIOUS CONTEXT:\n${request.previousContext}\n\n` : ''}

MAIN TEXT TO ANALYZE:
${request.sourceText}

${request.followingContext ? `\nFOLLOWING CONTEXT:\n${request.followingContext}` : ''}

${request.timelineAnchor ? `\nTIMELINE: This excerpt takes place ${request.timelineAnchor}` : ''}
${request.extractionPoint ? `\nEXTRACTION POINT: Character state at ${request.extractionPoint}` : ''}

Extract the following about ${request.characterName}:

{
  "personality": {
    "traits": ["observable personality traits"],
    "values": ["beliefs and principles they express"],
    "fears": ["things they're afraid of"],
    "goals": ["what they want to achieve"],
    "speechPatterns": ["how they speak - formal/casual/dialect/etc"],
    "emotionalPatterns": ["how they express emotions"]
  },
  "knowledge": {
    "facts": ["things they know"],
    "secrets": ["hidden information they possess"],
    "skills": ["abilities they demonstrate"],
    "relationships": ["people they know and how they feel about them"]
  },
  "currentState": {
    "location": "where they are",
    "emotionalState": "how they're feeling",
    "physicalState": "their physical condition",
    "circumstances": "their current situation",
    "resources": ["what they have access to"],
    "goals": ["immediate objectives"]
  },
  "memories": [
    {
      "type": "trait|relationship|event_memory|fact|dialogue_style|emotion",
      "content": "specific memory content",
      "importance": 0.0-1.0,
      "evidence": "text that supports this memory",
      "timelineAnchor": "when this memory applies"
    }
  ],
  "dialogueExamples": [
    {
      "quote": "exact quote from text",
      "context": "situation when said",
      "emotion": "emotional state",
      "reveals": "what this quote reveals about character"
    }
  ]
}

Focus on concrete, evidence-based information. Include text evidence for major claims.
`;
    }
}
```

## Chat System Implementation

### Core Chat Engine

```typescript
// ai-server/src/services/characterChat/engine/chatEngine.ts

export interface ChatRequest {
    characterId: string;
    message: string;
    userId: string;
    
    context?: {
        setting?: string;         // Where conversation takes place
        timeframe?: string;       // When in the story
        mood?: string;           // Desired emotional tone
        purpose?: string;        // Why you're talking to them
    };
    
    memoryMode: 'timeline_aware' | 'current_knowledge' | 'omniscient';
    responseStyle?: 'in_character' | 'analysis' | 'mixed';
}

export interface ChatResponse {
    response: string;
    emotionalState: string;
    confidence: number;
    
    // Memory system
    memoryReferences: Array<{
        memoryId: string;
        relevance: number;
        content: string;
    }>;
    
    newMemories?: CharacterMemory[];
    
    // Character changes
    characterChanges?: {
        mood?: string;
        knowledge?: string[];
        relationships?: Array<{
            target: string;
            change: string;
            newValue: number;
        }>;
    };
    
    // Metadata
    processingTime: number;
    tokensUsed: number;
    memoryRetrievalTime: number;
}

export class ChatEngine {
    constructor(
        private memoryRetrieval: MemoryRetrieval,
        private aiService: AIService,
        private characterRepository: CharacterRepository,
        private conversationRepository: ConversationRepository
    ) {}
    
    async chat(request: ChatRequest): Promise<ChatResponse> {
        const startTime = Date.now();
        
        // 1. Load character profile
        const character = await this.characterRepository.findById(request.characterId);
        if (!character) {
            throw new Error('Character not found');
        }
        
        // 2. Retrieve relevant memories
        const memoryStartTime = Date.now();
        const relevantMemories = await this.getRelevantMemories(character, request);
        const memoryRetrievalTime = Date.now() - memoryStartTime;
        
        // 3. Build conversation prompt
        const prompt = await this.buildChatPrompt(character, request, relevantMemories);
        
        // 4. Generate response
        const aiResponse = await this.aiService.generate(prompt, {
            model: this.selectModelForCharacter(character),
            temperature: this.calculateTemperature(character, request),
            maxTokens: 500
        });
        
        // 5. Parse and process response
        const parsedResponse = await this.parseAIResponse(aiResponse, character);
        
        // 6. Update character memories and state
        await this.updateCharacterFromConversation(character, request, parsedResponse);
        
        // 7. Save conversation
        await this.saveConversation(character.id, request, parsedResponse);
        
        const processingTime = Date.now() - startTime;
        
        return {
            response: parsedResponse.response,
            emotionalState: parsedResponse.emotionalState,
            confidence: parsedResponse.confidence,
            memoryReferences: relevantMemories.map(mem => ({
                memoryId: mem.id,
                relevance: mem.relevance,
                content: mem.content
            })),
            newMemories: parsedResponse.newMemories,
            characterChanges: parsedResponse.characterChanges,
            processingTime,
            tokensUsed: aiResponse.tokensUsed,
            memoryRetrievalTime
        };
    }
    
    private async getRelevantMemories(
        character: CharacterProfile,
        request: ChatRequest
    ): Promise<RelevantMemory[]> {
        
        const memoryQuery = {
            characterId: character.id,
            query: request.message,
            context: request.context,
            memoryMode: request.memoryMode,
            limit: 15
        };
        
        // Get base relevant memories
        let relevantMemories = await this.memoryRetrieval.getRelevantMemories(memoryQuery);
        
        // Add timeline-specific memories if in timeline_aware mode
        if (request.memoryMode === 'timeline_aware' && character.currentState?.timelineAnchor) {
            const timelineMemories = await this.memoryRetrieval.getTimelineMemories(
                character.id,
                character.currentState.timelineAnchor,
                'around'
            );
            relevantMemories = this.mergeMemories(relevantMemories, timelineMemories);
        }
        
        // Always include core personality memories
        const coreMemories = await this.memoryRetrieval.getCoreMemories(character.id);
        relevantMemories = this.mergeMemories(relevantMemories, coreMemories);
        
        // Sort by relevance and importance
        return relevantMemories
            .sort((a, b) => (b.relevance * b.importance) - (a.relevance * a.importance))
            .slice(0, 10); // Limit to top 10 most relevant
    }
    
    private async buildChatPrompt(
        character: CharacterProfile,
        request: ChatRequest,
        memories: RelevantMemory[]
    ): string {
        
        const memoryContext = memories
            .map(mem => `- ${mem.memoryType}: ${mem.content}`)
            .join('\n');
            
        const currentStateContext = character.currentState ? `
CURRENT STATE:
- Timeline: ${character.currentState.timelineAnchor}
- Location: ${character.currentState.location || 'Unknown'}
- Emotional State: ${character.currentState.emotionalState || 'Neutral'}
- Physical State: ${character.currentState.physicalState || 'Normal'}
- Current Goals: ${character.currentState.goals?.join(', ') || 'None specified'}
` : '';

        const conversationContext = request.context ? `
CONVERSATION CONTEXT:
- Setting: ${request.context.setting || 'Unspecified'}
- Timeframe: ${request.context.timeframe || character.currentState?.timelineAnchor || 'Present'}
- Mood: ${request.context.mood || 'Natural'}
- Purpose: ${request.context.purpose || 'General conversation'}
` : '';

        return `
You are ${character.name}, a character from ${character.universeId}. Respond to the user's message in character.

CHARACTER MEMORIES:
${memoryContext}

${currentStateContext}

${conversationContext}

PERSONALITY CORE:
- Traits: ${character.corePersonality.traits.join(', ')}
- Values: ${character.corePersonality.values.join(', ')}
- Fears: ${character.corePersonality.fears.join(', ')}
- Goals: ${character.corePersonality.goals.join(', ')}
- Speech Patterns: ${character.corePersonality.speechPatterns.join(', ')}

USER MESSAGE: "${request.message}"

Respond as ${character.name} would, keeping in mind:
1. Stay true to your personality and memories
2. Respond based on what you would know at this point in time
3. Use your characteristic speech patterns
4. React emotionally based on your personality and current state
5. Reference relevant memories if appropriate

${request.responseStyle === 'analysis' ? `
Additionally, provide brief analysis of:
- What memories influenced your response
- Your current emotional state
- How this conversation affects you
` : ''}

Respond in character, naturally and authentically.
`;
    }
    
    private selectModelForCharacter(character: CharacterProfile): string {
        // Select AI model based on character complexity and interaction history
        if (character.memories.length > 100 && character.interactionCount > 50) {
            return this.config.advancedCharacterModel; // More sophisticated model for complex characters
        } else if (character.creationMode === 'story_extraction') {
            return this.config.literaryCharacterModel; // Model fine-tuned for literary characters
        } else {
            return this.config.standardCharacterModel; // General purpose model
        }
    }
    
    private calculateTemperature(character: CharacterProfile, request: ChatRequest): number {
        let baseTemperature = 0.7;
        
        // Adjust based on character personality
        if (character.corePersonality.traits.includes('unpredictable')) {
            baseTemperature += 0.2;
        }
        if (character.corePersonality.traits.includes('logical')) {
            baseTemperature -= 0.2;
        }
        
        // Adjust based on emotional state
        if (character.currentState?.emotionalState === 'angry') {
            baseTemperature += 0.1;
        }
        if (character.currentState?.emotionalState === 'calm') {
            baseTemperature -= 0.1;
        }
        
        // Adjust based on conversation context
        if (request.context?.mood === 'serious') {
            baseTemperature -= 0.1;
        }
        if (request.context?.mood === 'playful') {
            baseTemperature += 0.1;
        }
        
        return Math.max(0.1, Math.min(1.0, baseTemperature));
    }
}
```

### Memory Integration System

```typescript
// ai-server/src/services/characterChat/memory/memoryRetrieval.ts

export interface MemoryQuery {
    characterId: string;
    query: string;
    context?: ChatContext;
    memoryMode: 'timeline_aware' | 'current_knowledge' | 'omniscient';
    limit: number;
}

export interface RelevantMemory extends CharacterMemory {
    relevance: number;        // 0-1 how relevant to current query
    recency: number;         // 0-1 how recent the memory is
    accessFrequency: number; // 0-1 how often this memory is accessed
}

export class MemoryRetrieval {
    constructor(
        private memoryRepository: MemoryRepository,
        private embeddingService: EmbeddingService
    ) {}
    
    async getRelevantMemories(query: MemoryQuery): Promise<RelevantMemory[]> {
        // 1. Get all memories for character
        const allMemories = await this.memoryRepository.findByCharacterId(query.characterId);
        
        // 2. Filter by memory mode
        let candidateMemories = this.filterByMemoryMode(allMemories, query);
        
        // 3. Calculate semantic similarity
        const queryEmbedding = await this.embeddingService.embed(query.query);
        candidateMemories = await this.addSemanticScores(candidateMemories, queryEmbedding);
        
        // 4. Calculate keyword relevance
        candidateMemories = this.addKeywordScores(candidateMemories, query.query);
        
        // 5. Apply recency and frequency weighting
        candidateMemories = this.addTemporalScores(candidateMemories);
        
        // 6. Calculate final relevance scores
        candidateMemories = this.calculateFinalRelevance(candidateMemories);
        
        // 7. Sort and limit results
        return candidateMemories
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, query.limit);
    }
    
    private filterByMemoryMode(
        memories: CharacterMemory[], 
        query: MemoryQuery
    ): CharacterMemory[] {
        switch (query.memoryMode) {
            case 'timeline_aware':
                // Only memories that would be accessible at the current timeline point
                return memories.filter(memory => 
                    !memory.timelineAnchor || 
                    this.isTimelineAccessible(memory.timelineAnchor, query.context?.timeframe)
                );
                
            case 'current_knowledge':
                // Only memories marked as current knowledge, not future events
                return memories.filter(memory => 
                    memory.memoryType !== MemoryType.FORESHADOWING &&
                    !this.isFutureMemory(memory, query.context?.timeframe)
                );
                
            case 'omniscient':
                // All memories available
                return memories;
                
            default:
                return memories;
        }
    }
    
    private async addSemanticScores(
        memories: CharacterMemory[],
        queryEmbedding: number[]
    ): Promise<CharacterMemory[]> {
        for (const memory of memories) {
            if (memory.embedding) {
                memory.semanticScore = this.calculateCosineSimilarity(
                    queryEmbedding, 
                    memory.embedding
                );
            } else {
                // Generate embedding if missing
                memory.embedding = await this.embeddingService.embed(memory.content);
                memory.semanticScore = this.calculateCosineSimilarity(
                    queryEmbedding, 
                    memory.embedding
                );
                
                // Update memory in database with new embedding
                await this.memoryRepository.update(memory.id, { embedding: memory.embedding });
            }
        }
        
        return memories;
    }
    
    private addKeywordScores(memories: CharacterMemory[], query: string): CharacterMemory[] {
        const queryWords = query.toLowerCase().split(' ');
        
        for (const memory of memories) {
            let keywordScore = 0;
            const memoryText = memory.content.toLowerCase();
            const memoryKeywords = memory.keywords.map(k => k.toLowerCase());
            
            // Direct keyword matches
            for (const keyword of memoryKeywords) {
                if (queryWords.includes(keyword)) {
                    keywordScore += 0.3;
                }
            }
            
            // Content text matches
            for (const word of queryWords) {
                if (memoryText.includes(word)) {
                    keywordScore += 0.1;
                }
            }
            
            memory.keywordScore = Math.min(1.0, keywordScore);
        }
        
        return memories;
    }
    
    private calculateFinalRelevance(memories: CharacterMemory[]): RelevantMemory[] {
        return memories.map(memory => ({
            ...memory,
            relevance: this.weightedRelevanceScore(memory),
            recency: this.calculateRecency(memory),
            accessFrequency: this.calculateAccessFrequency(memory)
        }));
    }
    
    private weightedRelevanceScore(memory: CharacterMemory): number {
        const weights = {
            semantic: 0.4,
            keyword: 0.2,
            importance: 0.2,
            recency: 0.1,
            frequency: 0.1
        };
        
        return (
            (memory.semanticScore || 0) * weights.semantic +
            (memory.keywordScore || 0) * weights.keyword +
            memory.importance * weights.importance +
            this.calculateRecency(memory) * weights.recency +
            this.calculateAccessFrequency(memory) * weights.frequency
        );
    }
}
```

## API Endpoints

### RESTful Character API

```typescript
// ai-server/src/routes/characters.ts

router.post('/characters', async (req, res) => {
    const { mode, ...characterData } = req.body;
    
    try {
        let character: CharacterProfile;
        
        switch (mode) {
            case 'standalone':
                character = await standaloneCreator.createCharacter(characterData);
                break;
            case 'story_extraction':
                character = await storyExtractor.extractCharacter(characterData);
                break;
            default:
                return res.status(400).json({ error: 'Invalid creation mode' });
        }
        
        res.status(201).json(character);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/characters/:id/chat', async (req, res) => {
    const { id } = req.params;
    const chatRequest: ChatRequest = {
        characterId: id,
        userId: req.user.id,
        ...req.body
    };
    
    try {
        const response = await chatEngine.chat(chatRequest);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/characters/:id/memories', async (req, res) => {
    const { id } = req.params;
    const { type, importance, limit = 50 } = req.query;
    
    try {
        const memories = await memoryRepository.findByCharacterId(id, {
            type: type as MemoryType,
            minImportance: importance ? parseFloat(importance as string) : undefined,
            limit: parseInt(limit as string)
        });
        
        res.json(memories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/characters/:id/memories', async (req, res) => {
    const { id } = req.params;
    const memoryData = {
        characterId: id,
        ...req.body
    };
    
    try {
        const memory = await memoryService.createMemory(memoryData);
        res.status(201).json(memory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

This comprehensive implementation guide provides the foundation for a sophisticated character chat system that can handle both standalone character creation and story-extracted character interaction, with a robust memory system that maintains character consistency and enables engaging conversations.
