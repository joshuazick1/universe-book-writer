/**
 * Gap-Filling Generator - Creates plausible character activities for narrative gaps
 * Handles "What was X doing while Y happened?" type queries
 */

import { CharacterMemory, GapFillingRequest, GapFillingResult } from '../core/interfaces.js';
import { DatabaseManager } from '../storage/databaseManager.js';
import { OllamaService } from '../ai/ollamaService.js';

export class GapFillingGenerator {
    private dbManager: DatabaseManager;
    private aiService: OllamaService;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
        this.aiService = new OllamaService();
    }

    /**
     * Generate a plausible scenario for what a character was doing during a specific event
     */
    async generateScenario(
        request: GapFillingRequest,
        characterMemories: CharacterMemory[],
        characterTraits: any[]
    ): Promise<GapFillingResult> {
        // Build context for AI generation
        const context = await this.buildGapFillingContext(request, characterMemories, characterTraits);
        
        // Generate the scenario using AI
        const generatedScenario = await this.generateWithAI(context);
        
        // Score the generated scenario
        const scores = await this.scoreGapFillingScenario(
            generatedScenario,
            request,
            characterMemories,
            characterTraits
        );

        // Create the gap-filling memory
        const memory: CharacterMemory = {
            id: this.generateMemoryId(),
            characterId: request.characterId,
            memoryType: 'event', // Gap-filling is typically event-based
            content: generatedScenario.content,
            importance: scores.overallImportance,
            timelineAnchor: request.timelineAnchor,
            associatedEntities: generatedScenario.associatedEntities,
            accessCount: 0,
            lastAccessed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            memorySource: 'ai_gap_filling',
            canonStatus: 'gap_filling',
            affectsTimeline: false, // Only becomes true if approved
            gapFillingContext: {
                triggerQuery: request.query,
                timelineEvent: request.timelineContext,
                scenarioContext: generatedScenario.scenarioContext,
                plausibilityScore: scores.plausibilityScore,
                characterConsistency: scores.characterConsistency,
                narrativeHarmony: scores.narrativeHarmony,
                evidenceSupport: scores.evidenceSupport,
                generatedAt: new Date()
            }
        };

        // Generate alternatives if requested
        const alternatives = await this.generateAlternatives(context, 2);

        return {
            memory,
            alternatives,
            reasoning: generatedScenario.reasoning,
            evidenceUsed: generatedScenario.evidenceUsed,
            conflictWarnings: generatedScenario.conflictWarnings
        };
    }

    /**
     * Build comprehensive context for AI generation
     */
    private async buildGapFillingContext(
        request: GapFillingRequest,
        characterMemories: CharacterMemory[],
        characterTraits: any[]
    ): Promise<string> {
        // Get character's name and basic info
        const character = await this.dbManager.getCharacterBasicInfo(request.characterId);
        
        // Extract relevant memories around the timeline
        const timelineMemories = characterMemories.filter(memory => 
            memory.timelineAnchor && 
            memory.canonStatus === 'canon' &&
            this.isTemporallyRelevant(memory.timelineAnchor, request.timelineAnchor || request.timelineContext)
        );

        // Extract character traits and patterns
        const traitSummary = this.summarizeCharacterTraits(characterTraits);
        const behaviorPatterns = this.extractBehaviorPatterns(characterMemories);

        // Build the context prompt
        return `
CONTEXT FOR GAP-FILLING SCENARIO GENERATION

CHARACTER: ${character?.name || 'Unknown Character'}
QUERY: "${request.query}"
MAIN EVENT: ${request.timelineContext}
TIMELINE ANCHOR: ${request.timelineAnchor || 'Concurrent with main event'}

CHARACTER TRAITS:
${traitSummary}

ESTABLISHED BEHAVIOR PATTERNS:
${behaviorPatterns}

RELEVANT TIMELINE MEMORIES:
${timelineMemories.map(memory => `- ${memory.content}`).join('\n')}

CONSTRAINTS:
${request.constraints ? this.formatConstraints(request.constraints) : 'None specified'}

TASK: Generate a plausible, character-consistent scenario for what this character was doing during the main event. Consider:
1. Character's established personality and behavior patterns
2. Their role and responsibilities in the story
3. The nature and scale of the main event
4. Logical activities that would fit their character
5. How this activity might indirectly support or relate to the main event

The scenario should be:
- Believable and in-character
- Consistent with established canon
- Narratively interesting but not overshadowing the main event
- Specific enough to be meaningful but flexible enough to fit into the larger narrative

Format your response as a detailed activity description.
`;
    }

    /**
     * Generate scenario using AI
     */
    private async generateWithAI(context: string): Promise<{
        content: string;
        scenarioContext: string;
        associatedEntities: string[];
        reasoning: string;
        evidenceUsed: string[];
        conflictWarnings: string[];
    }> {
        const prompt = `${context}

Please provide your response in the following JSON format:
{
    "content": "Detailed description of what the character was doing",
    "scenarioContext": "Brief summary of the scenario type",
    "associatedEntities": ["entity1", "entity2"],
    "reasoning": "Why this scenario makes sense for this character",
    "evidenceUsed": ["evidence1", "evidence2"],
    "conflictWarnings": ["potential_conflict1", "potential_conflict2"]
}`;

        try {
            const response = await this.aiService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 800
            });

            // Parse the JSON response
            const parsed = JSON.parse(response);
            return {
                content: parsed.content || 'Generated scenario',
                scenarioContext: parsed.scenarioContext || 'General activity',
                associatedEntities: parsed.associatedEntities || [],
                reasoning: parsed.reasoning || 'AI-generated reasoning',
                evidenceUsed: parsed.evidenceUsed || [],
                conflictWarnings: parsed.conflictWarnings || []
            };
        } catch (error) {
            console.error('Error generating gap-filling scenario:', error);
            // Fallback to basic generation
            return {
                content: `During ${context.split('MAIN EVENT: ')[1]?.split('\n')[0] || 'this event'}, the character was likely engaged in activities consistent with their established role and personality.`,
                scenarioContext: 'Fallback scenario',
                associatedEntities: [],
                reasoning: 'Fallback generation due to AI error',
                evidenceUsed: [],
                conflictWarnings: ['Generated using fallback method due to AI error']
            };
        }
    }

    /**
     * Score the generated gap-filling scenario on multiple dimensions
     */
    private async scoreGapFillingScenario(
        scenario: any,
        request: GapFillingRequest,
        characterMemories: CharacterMemory[],
        characterTraits: any[]
    ): Promise<{
        plausibilityScore: number;
        characterConsistency: number;
        narrativeHarmony: number;
        evidenceSupport: number;
        overallImportance: number;
    }> {
        // This would ideally use more sophisticated scoring
        // For now, provide reasonable default scores
        
        const plausibilityScore = Math.min(0.9, 0.6 + (scenario.evidenceUsed.length * 0.1));
        const characterConsistency = Math.min(0.95, 0.7 + (characterTraits.length * 0.05));
        const narrativeHarmony = scenario.conflictWarnings.length === 0 ? 0.85 : 0.65;
        const evidenceSupport = Math.min(0.9, 0.5 + (scenario.evidenceUsed.length * 0.15));
        
        const overallImportance = (plausibilityScore + characterConsistency + narrativeHarmony + evidenceSupport) / 4;

        return {
            plausibilityScore,
            characterConsistency,
            narrativeHarmony,
            evidenceSupport,
            overallImportance
        };
    }

    /**
     * Generate alternative scenarios
     */
    private async generateAlternatives(context: string, count: number): Promise<CharacterMemory[]> {
        // For now, return empty array - this could be expanded later
        return [];
    }

    private isTemporallyRelevant(memoryAnchor: string, targetAnchor: string): boolean {
        // Simple temporal relevance check - could be enhanced with more sophisticated timeline analysis
        return memoryAnchor.toLowerCase().includes(targetAnchor.toLowerCase()) ||
               targetAnchor.toLowerCase().includes(memoryAnchor.toLowerCase());
    }

    private summarizeCharacterTraits(traits: any[]): string {
        if (!traits || traits.length === 0) {
            return 'No established character traits available.';
        }
        return traits.map(trait => `- ${trait.description || trait.content || trait}`).join('\n');
    }

    private extractBehaviorPatterns(memories: CharacterMemory[]): string {
        const patterns = memories
            .filter(memory => memory.memoryType === 'trait' || memory.memoryType === 'event')
            .map(memory => memory.content)
            .slice(0, 5); // Limit to most relevant patterns

        if (patterns.length === 0) {
            return 'No established behavior patterns available.';
        }

        return patterns.map(pattern => `- ${pattern}`).join('\n');
    }

    private formatConstraints(constraints: any): string {
        const parts = [];
        if (constraints.mustInclude?.length) {
            parts.push(`Must include: ${constraints.mustInclude.join(', ')}`);
        }
        if (constraints.mustAvoid?.length) {
            parts.push(`Must avoid: ${constraints.mustAvoid.join(', ')}`);
        }
        if (constraints.characterFocus?.length) {
            parts.push(`Consider characters: ${constraints.characterFocus.join(', ')}`);
        }
        if (constraints.locationConstraints?.length) {
            parts.push(`Location constraints: ${constraints.locationConstraints.join(', ')}`);
        }
        return parts.join('\n');
    }

    private generateMemoryId(): string {
        return `gap_memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
