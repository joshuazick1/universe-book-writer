/**
 * Character Chat Message Processing Service
 * 
 * Implements a three-pass system for processing user messages:
 * Pass 1: Context Requirement Analysis
 * Pass 2: Context Gathering & Relevance Scoring
 * Pass 3: Final Response Generation

    private orchestrator: AIOrchestrator;
    private modelSelector: ModelSelectionService;
    constructor() {
/**
 * Character Chat Message Processing Service
 * 
 * Implements a three-pass system for processing user messages:
 * Pass 1: Context Requirement Analysis
 * Pass 2: Context Gathering & Relevance Scoring
 * Pass 3: Final Response Generation
 */
import { AIOrchestrator } from '../../orchestrator.js';
import { MockDataService, type CharacterInfo, type CharacterMemory } from './MockDataService.js';
import { ModelSelectionService, type TaskRequirements } from '../aiProcessing/ModelSelectionService.js';
import {
    AIRequest,
    AIResponse,
    UniversalProcessor,
    ProcessingContext,
    PassResult,
    QualityGate,
    PassAssessment,
    QualityIssue
} from '../aiProcessing/index.js';

// Minimal ChatMessage type for local use
export interface ChatMessage {
    role: string;
    content: string;
    [key: string]: any;
}

export interface CharacterChatRequest extends AIRequest {
    characterId: string;
    conversationId: string;
    conversationHistory: ChatMessage[];
    enableContextVisualization: boolean;
    character?: CharacterInfo;
    content: string; // Added to match usage in processor
}

export interface CharacterChatResponse extends AIResponse {
    contextAnalysis: ContextRequirementAnalysis;
    contextGathering: ContextGatheringResult;
    finalResponse: FinalResponseResult;
    totalProcessingTime: number;
    // Removed 'id' property, not present in interface
}

export interface ContextRequirementAnalysis {
    requiresContext: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    contextTypes: Array<'personality' | 'memories' | 'relationships' | 'knowledge' | 'recent_events'>;
    confidence: number;
    reasoning: string;
}

export interface ContextGatheringResult {
    selectedMemories: CharacterMemory[];
    relevanceScores: Map<string, number>;
    totalMemoriesEvaluated: number;
    contextSummary: string;
    processingTime: number;
}

export interface FinalResponseResult {
    response: string;
    emotionalState: string;
    confidence: number;
    modelUsed: string;
    memoryInfluence: Map<string, number>;
    processingTime: number;
    tokenUsage: {
        prompt: number;
        completion: number;
        total: number;
    };
}
export class CharacterChatMessageProcessor extends UniversalProcessor {
    private orchestrator: AIOrchestrator;
    private modelSelector: ModelSelectionService;
    constructor() {
        super();
        this.orchestrator = new AIOrchestrator();
        this.modelSelector = new ModelSelectionService();
    }

    /**
     * Pass 1: Analyze if context is required for this message
     * 
     * Simple messages like "Hi", "Hello", "How are you?" typically only need
     * basic personality traits and don't require deep memory context.
     */
    async analyzeContextRequirement(
        message: string,
        character: CharacterInfo,
        recentMessages: ChatMessage[] = []
    ): Promise<ContextRequirementAnalysis> {

        const trimmedMessage = message.trim().toLowerCase();

        // Simple greeting patterns that typically don't need context
        const simpleGreetings = [
            /^(hi|hello|hey|greetings?)\.?$/,
            /^(good (morning|afternoon|evening))\.?$/,
            /^(how are you\??)$/,
            /^(what's up\??)$/,
            /^(how's it going\??)$/
        ];

        // Simple responses that only need personality
        const simpleResponses = [
            /^(yes|no|maybe|sure|okay|ok)\.?$/,
            /^(thanks?|thank you)\.?$/,
            /^(goodbye|bye|see you)\.?$/,
            /^(sorry|excuse me)\.?$/
        ];

        // Check for simple patterns first
        const isSimpleGreeting = simpleGreetings.some(pattern => pattern.test(trimmedMessage));
        const isSimpleResponse = simpleResponses.some(pattern => pattern.test(trimmedMessage));

        if (isSimpleGreeting || isSimpleResponse) {
            return {
                requiresContext: false,
                complexity: 'simple',
                contextTypes: ['personality'],
                confidence: 0.9,
                reasoning: 'Simple greeting or response requires only basic personality context'
            };
        }

        // Analyze message complexity using AI for more nuanced cases
        const complexityAnalysis = await this.analyzeMessageComplexity(message, character, recentMessages);

        return complexityAnalysis;
    }

    /**
     * Pass 2: Gather relevant context based on analysis
     * 
     * Only runs if Pass 1 determines context is needed.
     * Performs semantic search through character memories and knowledge.
     */
    async gatherRelevantContext(
        message: string,
        character: CharacterInfo,
        requirement: ContextRequirementAnalysis,
        allMemories: CharacterMemory[]
    ): Promise<ContextGatheringResult> {

        if (!requirement.requiresContext) {
            return {
                selectedMemories: [],
                relevanceScores: new Map(),
                totalMemoriesEvaluated: 0,
                contextSummary: 'No additional context required',
                processingTime: 0
            };
        }

        const startTime = Date.now();

        // Filter memories by type based on requirements
        const filteredMemories = allMemories.filter(memory => {
            // Map context types to memory types
            const contextTypeMap: Record<string, string[]> = {
                'personality': ['trait', 'emotion', 'preference'],
                'memories': ['knowledge', 'event', 'skill'],
                'relationships': ['relationship'],
                'knowledge': ['knowledge'],
                'recent_events': ['event']
            };

            return requirement.contextTypes.some(contextType => {
                const allowedMemoryTypes = contextTypeMap[contextType] || [contextType];
                return allowedMemoryTypes.includes(memory.memoryType);
            });
        });

        // Perform semantic search and relevance scoring
        const relevanceScores = new Map<string, number>();
        const selectedMemories: CharacterMemory[] = [];

        for (const memory of filteredMemories) {
            const relevance = await this.calculateRelevanceScore(message, memory, character);
            relevanceScores.set(memory.id, relevance);

            // Include memories with relevance > 0.3 for moderate complexity
            // Include memories with relevance > 0.5 for complex queries
            const threshold = requirement.complexity === 'complex' ? 0.5 : 0.3;

            if (relevance > threshold) {
                selectedMemories.push(memory);
            }
        }

        // Sort by relevance and limit to prevent context overflow
        selectedMemories.sort((a, b) =>
            (relevanceScores.get(b.id) || 0) - (relevanceScores.get(a.id) || 0)
        );

        // Limit context based on complexity
        const maxMemories = requirement.complexity === 'complex' ? 15 : 8;
        const finalSelectedMemories = selectedMemories.slice(0, maxMemories);

        const processingTime = Date.now() - startTime;

        return {
            selectedMemories: finalSelectedMemories,
            relevanceScores,
            totalMemoriesEvaluated: filteredMemories.length,
            contextSummary: this.generateContextSummary(finalSelectedMemories, relevanceScores),
            processingTime
        };
    }

    /**
     * Pass 3: Generate final response with character and context
     * 
     * Uses appropriate model based on context complexity and character traits.
     * Includes memory influence tracking for visualization.
     */
    async generateFinalResponse(
        message: string,
        character: CharacterInfo,
        contextResult: ContextGatheringResult,
        requirement: ContextRequirementAnalysis
    ): Promise<FinalResponseResult> {

        const startTime = Date.now();

        // Select appropriate model based on complexity and character
        const modelSelection = await this.selectModelForContext(requirement, character);

        // Build context-aware prompt
        const prompt = this.buildContextAwarePrompt(
            message,
            character,
            contextResult.selectedMemories,
            requirement
        );

        // Calculate temperature based on character personality and context
        const temperature = this.calculateTemperature(character, requirement);

        // Generate response using selected model
        const response = await this.generateWithModel({
            model: modelSelection.model,
            prompt,
            temperature,
            maxTokens: this.getMaxTokensForComplexity(requirement.complexity)
        });

        // Calculate memory influence for visualization
        const memoryInfluence = this.calculateMemoryInfluence(
            contextResult.selectedMemories,
            contextResult.relevanceScores,
            response
        );

        const processingTime = Date.now() - startTime;

        return {
            response: response.content,
            emotionalState: this.detectEmotionalState(response.content, character),
            confidence: response.confidence || 0.8,
            modelUsed: modelSelection.model,
            memoryInfluence,
            processingTime,
            tokenUsage: response.usage || { prompt: 0, completion: 0, total: 0 }
        };
    }

    /**
     * Main processing method that orchestrates all three passes
     */
    async processMessage(request: CharacterChatRequest): Promise<CharacterChatResponse> {

        const overallStartTime = Date.now();

        // Load character data
        const character = await this.loadCharacter(request.characterId);
        const allMemories = await this.loadCharacterMemories(request.characterId);

        // Pass 1: Analyze context requirements
        const contextAnalysis = await this.analyzeContextRequirement(
            request.content,
            character,
            request.conversationHistory.slice(-5) // Last 5 messages for context
        );

        // Pass 2: Gather context if needed
        const contextGathering = await this.gatherRelevantContext(
            request.content,
            character,
            contextAnalysis,
            allMemories
        );

        // Pass 3: Generate final response
        const finalResponse = await this.generateFinalResponse(
            request.content,
            character,
            contextGathering,
            contextAnalysis
        );

        const totalProcessingTime = Date.now() - overallStartTime;

        return {
            id: request.id,
            content: finalResponse.response,
            success: true,
            confidence: finalResponse.confidence,
            qualityScore: finalResponse.confidence,
            processingMetrics: {
                totalExecutionTime: totalProcessingTime,
                passesExecuted: 3,
                totalTokens: finalResponse.tokenUsage.total,
                averageConfidence: finalResponse.confidence,
                memoryUsage: 0
            },
            passResults: [], // Will be populated when we implement the framework methods
            qualityWarnings: [],
            contextAnalysis,
            contextGathering,
            finalResponse,
            totalProcessingTime
        };
    }

    // ==========================================
    // UNIVERSAL PROCESSOR ABSTRACT METHOD IMPLEMENTATIONS
    // ==========================================

    /**
     * Determine how many passes are required for this character chat request.
     * Based on message complexity and context requirements.
     */
    async determineRequiredPasses(request: AIRequest): Promise<number> {
        const chatRequest = request as CharacterChatRequest;

        // Quick complexity analysis to determine passes needed
        const trimmedMessage = chatRequest.content.trim().toLowerCase();

        // Simple greetings only need 1 pass (basic response)
        const simpleGreetings = [
            /^(hi|hello|hey|greetings?)\.?$/,
            /^(good (morning|afternoon|evening))\.?$/,
            /^(how are you\??)$/,
            /^(yes|no|maybe|sure|okay|ok)\.?$/,
            /^(thanks?|thank you)\.?$/
        ];

        if (simpleGreetings.some(pattern => pattern.test(trimmedMessage))) {
            return 1; // Simple response, no context needed
        }

        // Medium complexity messages need 2 passes (context + response)
        if (chatRequest.content.length < 100) {
            return 2;
        }

        // Complex or long messages need full 3-pass treatment
        return 3;
    }

    /**
     * Execute a specific pass of the character chat processing pipeline.
     */
    async executePass(
        passNumber: number,
        request: AIRequest,
        context: ProcessingContext
    ): Promise<PassResult> {
        const chatRequest = request as CharacterChatRequest;
        const character = await this.loadCharacter(chatRequest.characterId);

        switch (passNumber) {
            case 1:
                return await this.executeContextAnalysisPass(chatRequest, character, context);
            case 2:
                return await this.executeContextGatheringPass(chatRequest, character, context);
            case 3:
                return await this.executeFinalResponsePass(chatRequest, character, context);
            default:
                throw new Error(`Invalid pass number: ${passNumber}`);
        }
    }

    /**
     * Assess the quality of a pass result against the specified quality gate.
     */
    async assessPassQuality(
        result: PassResult,
        gate: QualityGate
    ): Promise<PassAssessment> {
        const qualityScore = result.qualityScore || 0;
        const meetsThreshold = qualityScore >= gate.minimumScore;

        const issues: QualityIssue[] = result.errors?.map(e => ({
            type: 'quality' as const,
            severity: 'medium' as const,
            description: typeof e === 'string' ? e : e.message,
            suggestedFix: 'Review and retry the operation',
            affectedElements: [],
            blocking: true
        })) || [];

        return {
            passNumber: result.passNumber,
            overallScore: qualityScore,
            criteriaScores: { quality: qualityScore },
            passGate: meetsThreshold,
            issues,
            strengths: result.success ? ['Successfully completed pass'] : [],
            improvementAreas: issues.length > 0 ? [{
                area: 'quality',
                description: 'Pass quality below threshold',
                priority: 'high' as const,
                suggestedActions: ['Review input parameters', 'Retry with different approach'],
                estimatedImpact: 0.8
            }] : [],
            recommendation: result.success && meetsThreshold ? 'proceed' : 'retry',
            confidence: result.confidence || 0
        };
    }

    // ==========================================
    // PASS EXECUTION METHODS
    // ==========================================

    private async executeContextAnalysisPass(
        request: CharacterChatRequest,
        character: CharacterInfo,
        context: ProcessingContext
    ): Promise<PassResult> {
        const startTime = Date.now();

        try {
            const analysis = await this.analyzeContextRequirement(
                request.content,
                character,
                request.conversationHistory.slice(-5)
            );

            return {
                passNumber: 1,
                passType: 'analysis_classification',
                success: true,
                result: analysis,
                content: JSON.stringify(analysis),
                qualityScore: analysis.confidence,
                confidence: analysis.confidence,
                processingTime: Date.now() - startTime,
                modelUsed: 'context-analyzer'
            };
        } catch (error) {
            return {
                passNumber: 1,
                passType: 'analysis_classification',
                success: false,
                result: null,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                processingTime: Date.now() - startTime
            };
        }
    }

    private async executeContextGatheringPass(
        request: CharacterChatRequest,
        character: CharacterInfo,
        context: ProcessingContext
    ): Promise<PassResult> {
        const startTime = Date.now();

        try {
            // Get the context analysis from previous pass
            const previousResult = context.previousResults?.[0];
            if (!previousResult || !previousResult.success) {
                throw new Error('Context analysis pass failed or missing');
            }

            const contextAnalysis = previousResult.result as ContextRequirementAnalysis;
            const allMemories = await this.loadCharacterMemories(request.characterId);

            const contextGathering = await this.gatherRelevantContext(
                request.content,
                character,
                contextAnalysis,
                allMemories
            );

            // Calculate quality score based on context relevance
            const qualityScore = contextGathering.selectedMemories.length > 0 ?
                Array.from(contextGathering.relevanceScores.values())
                    .reduce((sum, score) => sum + score, 0) / contextGathering.relevanceScores.size :
                0.8; // Default good score for simple messages that don't need context

            return {
                passNumber: 2,
                passType: 'context_gathering',
                success: true,
                result: contextGathering,
                processingTime: Date.now() - startTime,
                modelUsed: 'context-gatherer'
            };
        } catch (error) {
            return {
                passNumber: 2,
                passType: 'context_gathering',
                success: false,
                result: null,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                processingTime: Date.now() - startTime
            };
        }
    }

    private async executeFinalResponsePass(
        request: CharacterChatRequest,
        character: CharacterInfo,
        context: ProcessingContext
    ): Promise<PassResult> {
        const startTime = Date.now();

        try {
            // Get results from previous passes
            const contextAnalysis = context.previousResults?.[0]?.result as ContextRequirementAnalysis;
            const contextGathering = context.previousResults?.[1]?.result as ContextGatheringResult;

            if (!contextAnalysis) {
                throw new Error('Context analysis result missing');
            }

            const finalResponse = await this.generateFinalResponse(
                request.content,
                character,
                contextGathering,
                contextAnalysis
            );

            return {
                passNumber: 3,
                passType: 'initial_generation',
                success: true,
                result: finalResponse,
                content: finalResponse.response,
                qualityScore: finalResponse.confidence,
                confidence: finalResponse.confidence,
                processingTime: Date.now() - startTime,
                tokensUsed: finalResponse.tokenUsage.total,
                modelUsed: finalResponse.modelUsed
            };
        } catch (error) {
            return {
                passNumber: 3,
                passType: 'initial_generation',
                success: false,
                result: null,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                processingTime: Date.now() - startTime
            };
        }
    }

    // ==========================================
    // EXISTING HELPER METHODS
    // ==========================================

    private async analyzeMessageComplexity(
        message: string,
        character: CharacterInfo,
        recentMessages: ChatMessage[]
    ): Promise<ContextRequirementAnalysis> {

        // Use intelligent model selection for analysis
        const analysisRequirements: TaskRequirements = {
            complexity: 'simple', // Analysis is typically a simple task
            qualityLevel: 'standard',
            maxLatency: 1000, // Fast analysis
            contextSize: 200,
            domain: 'analysis'
        };

        let selectedModel = 'llama3.2'; // Default fallback
        try {
            const modelSelection = await this.modelSelector.selectModel(analysisRequirements);
            selectedModel = modelSelection.selectedModel.endpoint;
        } catch (error) {
            console.warn('[MessageProcessor] Model selection failed for analysis, using fallback');
        }

        // Use a lightweight model for quick analysis
        const analysisPrompt = `
Analyze this message to determine if it needs character memory context:

Message: "${message}"
Character: ${character.name}
Recent conversation: ${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Classify as:
- SIMPLE: Basic greetings, yes/no responses, simple questions about character's immediate state
- MODERATE: Questions about character's background, relationships, or general knowledge  
- COMPLEX: References to specific events, detailed character history, or complex reasoning

Return JSON: {
  "requiresContext": boolean,
  "complexity": "simple|moderate|complex", 
  "contextTypes": ["personality", "memories", "relationships", "knowledge", "recent_events"],
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}`;

        const response = await this.generateWithModel({
            model: selectedModel,
            prompt: analysisPrompt,
            temperature: 0.3, // Low temperature for consistent analysis
            maxTokens: 200
        });

        try {
            return JSON.parse(response.content);
        } catch (error) {
            // Fallback to moderate complexity if parsing fails
            return {
                requiresContext: true,
                complexity: 'moderate',
                contextTypes: ['personality', 'memories'],
                confidence: 0.5,
                reasoning: 'Failed to parse analysis, defaulting to moderate complexity'
            };
        }
    }

    private async calculateRelevanceScore(
        message: string,
        memory: CharacterMemory,
        character: CharacterInfo
    ): Promise<number> {

        // Implement semantic similarity + keyword matching + importance weighting
        const semanticScore = await this.calculateSemanticSimilarity(message, memory.content);
        const keywordScore = this.calculateKeywordOverlap(message, memory.content);
        const importanceScore = memory.importance || 0.5;
        const recencyScore = this.calculateRecencyScore(memory.createdAt);

        // Weighted combination
        return (
            semanticScore * 0.4 +
            keywordScore * 0.3 +
            importanceScore * 0.2 +
            recencyScore * 0.1
        );
    }

    private async selectModelForContext(
        requirement: ContextRequirementAnalysis,
        character: CharacterInfo
    ): Promise<{ model: string; confidence: number; reasoning: string }> {
        // Create task requirements for model selection
        const taskRequirements: TaskRequirements = {
            complexity: requirement.complexity,
            qualityLevel: 'standard', // TODO: Make this configurable
            maxLatency: requirement.complexity === 'simple' ? 1000 : 3000,
            contextSize: this.estimateContextSize(requirement, character),
            domain: 'character-chat'
        };

        try {
            const selection = await this.modelSelector.selectModel(taskRequirements);

            console.log(`[MessageProcessor] Model selected: ${selection.selectedModel.name}`);
            console.log(`[MessageProcessor] Selection reasoning: ${selection.reasoning}`);
            console.log(`[MessageProcessor] Expected latency: ${selection.expectedLatency}ms`);
            console.log(`[MessageProcessor] Selection confidence: ${selection.confidence}`);

            return {
                model: selection.selectedModel.endpoint,
                confidence: selection.confidence,
                reasoning: selection.reasoning
            };
        } catch (error) {
            console.error('[MessageProcessor] Model selection failed, using fallback:', error);

            // Fallback to simple heuristic selection
            return {
                model: await this.getFallbackModel(requirement.complexity),
                confidence: 0.5,
                reasoning: 'Fallback selection due to model selection service failure'
            };
        }
    }

    private estimateContextSize(requirement: ContextRequirementAnalysis, character: CharacterInfo): number {
        // Rough estimate of context size in tokens
        let contextSize = 200; // Base character description

        if (character.personality) {
            contextSize += 100; // Personality traits
        }

        if (requirement.requiresContext) {
            contextSize += requirement.contextTypes.length * 150; // Memory context
        }

        return contextSize;
    }

    private async getFallbackModel(complexity: string): Promise<string> {
        // Use ModelSelectionService for intelligent model selection
        const taskRequirements: TaskRequirements = {
            complexity: complexity === 'complex' ? 'complex' : complexity === 'simple' ? 'simple' : 'moderate',
            qualityLevel: 'standard',
            maxLatency: 5000, // 5 second max for fallback
            contextSize: 2000, // Estimated token count
            domain: 'character_chat'
        };

        try {
            const selection = await this.modelSelector.selectModel(taskRequirements);
            return selection.selectedModel.endpoint;
        } catch (error) {
            // Ultimate fallback if model selection fails
            console.warn('Model selection failed, using default fallback:', error);
            return 'llama3.1:8b';
        }
    }

    private buildContextAwarePrompt(
        message: string,
        character: CharacterInfo,
        selectedMemories: CharacterMemory[],
        requirement: ContextRequirementAnalysis
    ): string {

        let prompt = `You are ${character.name}. `;

        // Always include core personality
        if (character.personality) {
            const traitNames = character.personality.traits.map(trait => trait.name);
            prompt += `Your personality: ${traitNames.join(', ')}. `;
        }

        // Add memory context if available
        if (selectedMemories.length > 0) {
            prompt += `\n\nRelevant memories:\n`;
            selectedMemories.forEach(memory => {
                prompt += `- ${memory.content}\n`;
            });
        }

        prompt += `\n\nUser message: "${message}"\n\n`;

        // Adjust instructions based on complexity
        if (requirement.complexity === 'simple') {
            prompt += `Respond naturally and briefly as ${character.name}.`;
        } else {
            prompt += `Respond as ${character.name} would, drawing on your memories and personality. Be authentic and consistent with your character.`;
        }

        return prompt;
    }

    private calculateTemperature(
        character: CharacterInfo,
        requirement: ContextRequirementAnalysis
    ): number {

        let baseTemperature = 0.7;

        // Adjust for complexity
        if (requirement.complexity === 'simple') {
            baseTemperature = 0.4; // More predictable for simple responses
        } else if (requirement.complexity === 'complex') {
            baseTemperature = 0.8; // Allow more creativity for complex interactions
        }

        // Adjust for character traits
        if (character.personality?.traits.some(trait => trait.name === 'unpredictable')) {
            baseTemperature += 0.2;
        }
        if (character.personality?.traits.some(trait => trait.name === 'logical')) {
            baseTemperature -= 0.2;
        }

        return Math.max(0.1, Math.min(1.0, baseTemperature));
    }

    private getMaxTokensForComplexity(complexity: string): number {
        switch (complexity) {
            case 'simple': return 100;
            case 'moderate': return 300;
            case 'complex': return 500;
            default: return 300;
        }
    }

    // Service methods - replace with actual implementations in production
    private async loadCharacter(characterId: string): Promise<CharacterInfo> {
        // TODO: Replace with actual database/RAG service call
        return MockDataService.getMockCharacter(characterId);
    }

    private async loadCharacterMemories(characterId: string): Promise<CharacterMemory[]> {
        // TODO: Replace with actual memory database service call
        return MockDataService.getMockCharacterMemories(characterId);
    }

    private async generateWithModel(options: {
        model: string;
        prompt: string;
        temperature: number;
        maxTokens: number;
    }): Promise<{
        content: string;
        confidence: number;
        usage: { prompt: number; completion: number; total: number };
    }> {
        const selectedModel = options.model;
        console.log(`[MessageProcessor] Generating with orchestrator model: ${selectedModel}`);
        try {
            // Call orchestrator.runModel for inference
            const result = await this.orchestrator.runModel(
                selectedModel,
                options.prompt,
                { options: { temperature: options.temperature, maxTokens: options.maxTokens } },
                {} // plugin suggestions, can be extended
            );
            // Expect result to have { content, usage, confidence } or similar
            const responseContent = result.content || result.response || '';
            const promptTokens = Math.ceil(options.prompt.length / 4);
            const completionTokens = Math.ceil(responseContent.length / 4);
            return {
                content: responseContent,
                confidence: result.confidence || this.calculateResponseConfidence(responseContent, selectedModel),
                usage: result.usage || {
                    prompt: promptTokens,
                    completion: completionTokens,
                    total: promptTokens + completionTokens
                }
            };
        } catch (error) {
            console.error('[MessageProcessor] Error generating with orchestrator:', error);
            // Fallback to mock response
            return {
                content: this.generateFallbackResponse(options.prompt),
                confidence: 0.3,
                usage: { prompt: 50, completion: 30, total: 80 }
            };
        }
    }

    private calculateResponseConfidence(response: string, model: string): number {
        // Use ModelSelectionService to get model-specific confidence
        const modelConfig = this.modelSelector.getModelByEndpoint(model);

        let baseConfidence = 0.7; // Default fallback

        if (modelConfig) {
            // Calculate base confidence from model capabilities
            baseConfidence = (modelConfig.qualityRating + modelConfig.reliabilityScore * 10) / 20;
        }

        // Adjust based on response characteristics
        let confidenceAdjustment = 0;

        if (response.length < 20) confidenceAdjustment -= 0.1; // Very short responses
        if (response.length > 200) confidenceAdjustment += 0.05; // Detailed responses
        if (response.includes('I don\'t know') || response.includes('not sure')) confidenceAdjustment -= 0.1;

        return Math.max(0.1, Math.min(0.95, baseConfidence + confidenceAdjustment));
    }

    private generateFallbackResponse(prompt: string): string {
        const characterMatch = prompt.match(/You are ([^.]+)/);
        const characterName = characterMatch?.[1] || 'the character';

        return `Hello! As ${characterName}, I appreciate you reaching out to me. I'd be happy to help with whatever you'd like to discuss! (Note: This is a fallback response due to AI service unavailability)`;
    }

    private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
        // Simple keyword-based similarity for testing
        const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        const commonWords = words1.filter(word => words2.includes(word));
        const similarity = commonWords.length / Math.max(words1.length, words2.length, 1);

        // Add some randomness to simulate semantic analysis
        return Math.min(0.95, similarity + Math.random() * 0.2);
    }

    private calculateKeywordOverlap(text1: string, text2: string): number {
        // Simple keyword overlap calculation
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        return intersection.length / Math.max(words1.length, words2.length);
    }

    private calculateRecencyScore(timestamp: Date): number {
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        // Exponential decay: more recent memories score higher
        return Math.exp(-diffDays / 30); // 30-day half-life
    }

    private generateContextSummary(
        memories: CharacterMemory[],
        relevanceScores: Map<string, number>
    ): string {
        if (memories.length === 0) return 'No context selected';

        const totalRelevance = Array.from(relevanceScores.values()).reduce((a, b) => a + b, 0);
        const avgRelevance = totalRelevance / relevanceScores.size;

        return `Selected ${memories.length} memories with average relevance ${avgRelevance.toFixed(2)}`;
    }

    private calculateMemoryInfluence(
        memories: CharacterMemory[],
        relevanceScores: Map<string, number>,
        response: any
    ): Map<string, number> {
        // Calculate how much each memory influenced the final response
        const influence = new Map<string, number>();

        memories.forEach(memory => {
            const relevance = relevanceScores.get(memory.id) || 0;
            // Influence could be calculated based on keyword matching with response
            // For now, use relevance as proxy
            influence.set(memory.id, relevance);
        });

        return influence;
    }

    private detectEmotionalState(response: string, character: CharacterInfo): string {
        // Simple emotional state detection based on response content
        const lowerResponse = response.toLowerCase();

        if (lowerResponse.includes('!') || lowerResponse.includes('excited')) return 'excited';
        if (lowerResponse.includes('sorry') || lowerResponse.includes('sad')) return 'sad';
        if (lowerResponse.includes('angry') || lowerResponse.includes('frustrated')) return 'angry';
        if (lowerResponse.includes('confused') || lowerResponse.includes('?')) return 'confused';

        return 'neutral';
    }
}