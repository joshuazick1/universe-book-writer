/**
 * Character Generation Engine
 * 
 * AI-powered character generation service that creates detailed characters
 * with comprehensive backstories, personalities, relationships, and integration with memory systems.
 */

import {
    CharacterGenerationRequest,
    GeneratedCharacter,
    CharacterExpansionRequest,
    CharacterExpansion,
    CharacterValidationResult,
    CharacterTemplate,
    PersonalityTrait,
    LifeEvent,
    RelationshipHistory,
    Skill,
    KnowledgeArea,
    CharacterMemory
} from '../characterGenerator/types.js';
import { OllamaService } from '../textToRagParser/ai/ollamaService.js';
import { mongoGeneratorService } from '../database/mongoGeneratorService.js';
import { v4 as uuidv4 } from 'uuid';

export class CharacterGenerationEngine {
    private ollamaService: OllamaService;
    private templates: CharacterTemplate[] = [];

    constructor() {
        this.ollamaService = new OllamaService();
        this.loadTemplates();
    }

    /**
     * Generate a complete character based on user specifications
     */
    async generateCharacter(request: CharacterGenerationRequest): Promise<GeneratedCharacter> {
        console.log('Generating character with parameters:', request);

        try {
            // Step 1: Generate core identity and appearance
            const coreIdentity = await this.generateCoreIdentity(request);

            // Step 2: Generate personality profile
            const personality = await this.generatePersonality(request);

            // Step 3: Generate backstory if requested
            const backstory = request.generateBackstory ?
                await this.generateBackstory(request, coreIdentity, personality) :
                this.createBasicBackstory();

            // Step 4: Generate current situation
            const currentStatus = await this.generateCurrentStatus(request, backstory);

            // Step 5: Generate abilities and skills
            const abilities = await this.generateAbilities(request, backstory);

            // Step 6: Generate story elements and goals
            const storyElements = request.generateGoals ?
                await this.generateStoryElements(request, personality, backstory) :
                this.createBasicStoryElements();

            // Step 7: Generate relationships if requested
            const relationships = request.generateRelationships ?
                await this.generateRelationships(request, personality) : [];

            // Step 8: Generate secrets if requested
            const secrets = request.generateSecrets ?
                await this.generateSecrets(request, backstory) : [];

            // Step 9: Generate dialogue samples if requested
            const dialogueSamples = request.generateDialogueSamples ?
                await this.generateDialogueSamples(request, personality) : [];

            const character: GeneratedCharacter = {
                id: this.generateId(),
                universeId: request.universeId,
                userId: request.userId,

                ...coreIdentity,
                personality,
                backstory,
                currentStatus,
                ...abilities,
                ...storyElements,

                relationships,
                secrets,
                dialogueSamples,

                initialMemories: await this.generateInitialMemories(request, coreIdentity, personality, backstory),

                createdAt: new Date(),
                updatedAt: new Date(),
                generationPrompt: this.buildPrompt(request),
                generationSettings: request,
                qualityScore: 0, // Will be set after character creation
                tags: this.generateTags(request, personality, backstory)
            };

            // Assess quality after character is fully created
            character.qualityScore = await this.assessQuality(character);

            // Store character in database
            await mongoGeneratorService.saveCharacter(character);

            return character;
        } catch (error) {
            console.error('Error generating character:', error);
            throw new Error(`Character generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Generate core identity and appearance
     */
    private async generateCoreIdentity(request: CharacterGenerationRequest) {
        const prompt = this.buildCoreIdentityPrompt(request);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.8,
            maxTokens: 800
        });

        return this.parseCoreIdentityResponse(response, request);
    }

    /**
     * Generate personality profile using AI
     */
    private async generatePersonality(request: CharacterGenerationRequest) {
        const prompt = this.buildPersonalityPrompt(request);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.7,
            maxTokens: 1000
        });

        return this.parsePersonalityResponse(response, request);
    }

    /**
     * Generate detailed backstory
     */
    private async generateBackstory(
        request: CharacterGenerationRequest,
        coreIdentity: any,
        personality: any
    ) {
        const prompt = this.buildBackstoryPrompt(request, coreIdentity, personality);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.8,
            maxTokens: 1500
        });

        return this.parseBackstoryResponse(response, request);
    }

    /**
     * Generate current status and situation
     */
    private async generateCurrentStatus(request: CharacterGenerationRequest, backstory: any) {
        const prompt = this.buildCurrentStatusPrompt(request, backstory);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.6,
            maxTokens: 600
        });

        return this.parseCurrentStatusResponse(response);
    }

    /**
     * Generate abilities and skills
     */
    private async generateAbilities(request: CharacterGenerationRequest, backstory: any) {
        const prompt = this.buildAbilitiesPrompt(request, backstory);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.7,
            maxTokens: 800
        });

        return this.parseAbilitiesResponse(response);
    }

    /**
     * Generate story elements and goals
     */
    private async generateStoryElements(
        request: CharacterGenerationRequest,
        personality: any,
        backstory: any
    ) {
        const prompt = this.buildStoryElementsPrompt(request, personality, backstory);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.8,
            maxTokens: 1000
        });

        return this.parseStoryElementsResponse(response);
    }

    /**
     * Generate relationships
     */
    private async generateRelationships(request: CharacterGenerationRequest, personality: any) {
        if (!request.generateRelationships) return [];

        const prompt = this.buildRelationshipsPrompt(request, personality);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.8,
            maxTokens: 1200
        });

        return this.parseRelationshipsResponse(response);
    }

    /**
     * Generate secrets and hidden elements
     */
    private async generateSecrets(request: CharacterGenerationRequest, backstory: any) {
        if (request.secretsLevel === 'none') return [];

        const prompt = this.buildSecretsPrompt(request, backstory);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.9,
            maxTokens: 800
        });

        return this.parseSecretsResponse(response, request.secretsLevel);
    }

    /**
     * Generate dialogue samples
     */
    private async generateDialogueSamples(request: CharacterGenerationRequest, personality: any) {
        const prompt = this.buildDialoguePrompt(request, personality);

        const response = await this.ollamaService.generateText(prompt, {
            model: 'mistral-nemo:12b',
            temperature: 0.9,
            maxTokens: 1000
        });

        return this.parseDialogueResponse(response);
    }

    /**
     * Generate initial character memories for the memory system
     */
    private async generateInitialMemories(
        request: CharacterGenerationRequest,
        coreIdentity: any,
        personality: any,
        backstory: any
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Core identity memories
        memories.push({
            id: this.generateId(),
            type: 'trait',
            content: `My name is ${coreIdentity.name} and I am a ${coreIdentity.species || 'human'}.`,
            importance: 1.0,
            emotional_weight: 0.5,
            related_entities: [coreIdentity.name],
            timestamp: new Date(),
            source: 'character_generation'
        });

        // Personality trait memories
        if (personality.traits) {
            for (const trait of personality.traits.slice(0, 5)) {
                memories.push({
                    id: this.generateId(),
                    type: 'trait',
                    content: `I am ${trait.name}: ${trait.description}`,
                    importance: trait.strength,
                    emotional_weight: trait.emotional_impact || 0.5,
                    related_entities: [coreIdentity.name],
                    timestamp: new Date(),
                    source: 'character_generation'
                });
            }
        }

        // Key backstory memories
        if (backstory.formativeEvents) {
            for (const event of backstory.formativeEvents.slice(0, 3)) {
                memories.push({
                    id: this.generateId(),
                    type: 'event',
                    content: event.description,
                    importance: event.impact,
                    emotional_weight: event.emotional_impact,
                    related_entities: [coreIdentity.name, ...(event.people_involved || [])],
                    timestamp: new Date(),
                    source: 'character_generation'
                });
            }
        }

        return memories;
    }

    // ============================================
    // PROMPT BUILDERS
    // ============================================

    private buildCoreIdentityPrompt(request: CharacterGenerationRequest): string {
        return `Generate a detailed character identity based on these specifications:

UNIVERSE: ${request.universeId}
ROLE: ${request.role || 'supporting'}
STORY IMPORTANCE: ${request.storyImportance}

SPECIFICATIONS:
${request.name ? `- Name: ${request.name}` : '- Generate an appropriate name'}
${request.species ? `- Species: ${request.species}` : '- Species: Human (or universe-appropriate)'}
${request.age ? `- Age: ${request.age}` : '- Generate appropriate age'}
${request.gender ? `- Gender: ${request.gender}` : '- Generate appropriate gender'}
${request.socialClass ? `- Social Class: ${request.socialClass}` : ''}
${request.occupation ? `- Occupation: ${request.occupation}` : ''}
${request.birthLocation ? `- Birth Location: ${request.birthLocation}` : ''}

Generate the character's core identity including:
1. Full name (if not provided)
2. Aliases or nicknames
3. Physical description (height, build, distinctive features)
4. Age and apparent age
5. Species/race details if relevant
6. Any distinctive markings, scars, or unique features

Format as JSON with fields: name, fullName, aliases, species, age, physicalDescription, distinctiveFeatures.

Ensure the character fits the universe context and role specified.`;
    }

    private buildPersonalityPrompt(request: CharacterGenerationRequest): string {
        return `Generate a comprehensive personality profile for this character:

CONTEXT:
- Role: ${request.role || 'supporting'}
- Story Importance: ${request.storyImportance}
- Detail Level: ${request.detailLevel}

PERSONALITY GUIDANCE:
${request.personalityHints ? `- Type Hints: ${request.personalityHints}` : ''}
${request.coreTraits ? `- Core Traits: ${request.coreTraits.join(', ')}` : ''}
${request.motivation ? `- Primary Motivation: ${request.motivation}` : ''}
${request.flaw ? `- Character Flaw: ${request.flaw}` : ''}

Generate a detailed personality including:
1. Core personality traits (5-7 traits with descriptions and strength ratings)
2. Values and moral principles
3. Fears and anxieties
4. Desires and aspirations
5. Behavioral habits and quirks
6. Speech patterns and communication style
7. Social tendencies and interaction style

Format as JSON with structured fields for each category.
Make the personality cohesive and internally consistent.`;
    }

    private buildBackstoryPrompt(
        request: CharacterGenerationRequest,
        coreIdentity: any,
        personality: any
    ): string {
        return `Generate a detailed backstory for ${coreIdentity.name}:

CHARACTER CONTEXT:
- Name: ${coreIdentity.name}
- Age: ${coreIdentity.age}
- Species: ${coreIdentity.species}
- Role: ${request.role}
- Universe: ${request.universeId}

PERSONALITY CONTEXT:
- Key Traits: ${personality.traits?.slice(0, 3).map((t: any) => t.name).join(', ') || 'To be determined'}
- Primary Motivation: ${request.motivation || 'To be explored'}

FAMILY CONTEXT: ${request.family || 'standard'}
DETAIL LEVEL: ${request.detailLevel}

Generate a comprehensive backstory including:
1. Childhood and early years (formative experiences)
2. Key life events that shaped the character
3. Education and learning experiences
4. Career development and achievements
5. Significant relationships and their impact
6. Traumas or challenges overcome
7. Major accomplishments and failures

For each formative event, include:
- Age when it occurred
- Detailed description
- People involved
- Impact on character development (1-10 scale)
- Emotional impact and lasting effects

Format as JSON with structured fields.
Ensure events logically flow and explain current personality traits.`;
    }

    private buildCurrentStatusPrompt(request: CharacterGenerationRequest, backstory: any): string {
        return `Generate the current life situation for this character:

BACKSTORY CONTEXT:
- Recent major events: ${backstory.formativeEvents?.slice(-2).map((e: any) => e.description).join('; ') || 'Standard development'}
- Career history: ${backstory.career || 'To be determined'}

CURRENT CONTEXT:
- Universe: ${request.universeId}
- Role in story: ${request.role}
- Entry point: ${request.entryPoint || 'Standard introduction'}

Generate current status including:
1. Current location and living arrangement
2. Occupation and work situation
3. Financial status and resources
4. Health and physical condition
5. Mental and emotional state
6. Daily routines and lifestyle
7. Current challenges and concerns

Format as JSON with appropriate fields.
Ensure consistency with backstory and personality.`;
    }

    private buildAbilitiesPrompt(request: CharacterGenerationRequest, backstory: any): string {
        return `Generate abilities and skills for this character:

BACKSTORY CONTEXT:
- Education: ${backstory.education || 'Standard'}
- Career: ${backstory.career || 'To be determined'}
- Life experiences: ${backstory.formativeEvents?.map((e: any) => e.description).join('; ') || 'Standard development'}

ROLE CONTEXT:
- Character role: ${request.role}
- Story importance: ${request.storyImportance}
- Universe: ${request.universeId}

Generate comprehensive abilities including:
1. Professional skills (related to occupation)
2. Learned skills (from education/training)
3. Natural talents and aptitudes
4. Combat/survival abilities if relevant
5. Social and interpersonal skills
6. Knowledge areas and expertise
7. Languages known
8. Weaknesses and limitations

For each skill, include proficiency level (beginner/intermediate/advanced/expert).
For knowledge areas, include depth and breadth of understanding.

Format as JSON with structured arrays.
Ensure abilities logically derive from backstory and support character role.`;
    }

    private buildStoryElementsPrompt(
        request: CharacterGenerationRequest,
        personality: any,
        backstory: any
    ): string {
        return `Generate story-relevant elements for this character:

CHARACTER CONTEXT:
- Personality: ${personality.traits?.slice(0, 3).map((t: any) => t.name).join(', ') || 'To be determined'}
- Key experiences: ${backstory.formativeEvents?.map((e: any) => e.description).slice(0, 2).join('; ') || 'Standard development'}
- Role: ${request.role}
- Story importance: ${request.storyImportance}

PLOT CONTEXT:
- Plot relevance: ${request.plotRelevance?.join(', ') || 'General story involvement'}
- Entry point: ${request.entryPoint || 'Standard introduction'}

Generate story elements including:
1. Immediate goals (what they want right now)
2. Short-term goals (next few weeks/months)
3. Long-term goals (life ambitions)
4. Internal conflicts and dilemmas
5. External conflicts and obstacles
6. Character arc potential
7. Plot hooks and story connections
8. Relationship dynamics potential

Format as JSON with structured fields.
Ensure goals and conflicts create compelling story opportunities.`;
    }

    private buildRelationshipsPrompt(request: CharacterGenerationRequest, personality: any): string {
        return `Generate relationships for this character:

CHARACTER CONTEXT:
- Personality: ${personality.traits?.slice(0, 3).map((t: any) => t.name).join(', ') || 'To be determined'}
- Social tendencies: ${personality.socialTendencies || 'To be determined'}
- Family situation: ${request.family || 'standard'}

RELATIONSHIP REQUIREMENTS:
- Allies to generate: ${request.allies || 2}
- Enemies to generate: ${request.enemies || 1}
- Romantic interest: ${request.romanticInterest ? 'Yes' : 'No'}
- Mentor relationship: ${request.mentor ? 'Yes' : 'No'}

Generate diverse relationships including:
1. Family members (based on family setting)
2. Close friends and allies
3. Professional relationships
4. Romantic connections (if requested)
5. Rivals and enemies
6. Mentors or mentees
7. Acquaintances and contacts

For each relationship, include:
- Name and basic description
- Relationship type and status
- How they met
- Current dynamic
- Potential for story development

Format as JSON array with relationship objects.
Ensure relationships reflect personality and create story potential.`;
    }

    private buildSecretsPrompt(request: CharacterGenerationRequest, backstory: any): string {
        const secretsLevel = request.secretsLevel || 'minor';

        return `Generate secrets and hidden elements for this character:

CONTEXT:
- Secrets level: ${secretsLevel}
- Character role: ${request.role}
- Backstory highlights: ${backstory.formativeEvents?.map((e: any) => e.description).slice(0, 2).join('; ') || 'Standard development'}

SECRETS LEVEL GUIDE:
- minor: Personal embarrassments, small lies, hidden talents
- significant: Major life events, secret relationships, hidden motivations
- world_changing: Universe-altering knowledge, hidden identities, cosmic secrets

Generate appropriate secrets including:
1. Personal secrets (hidden aspects of identity/past)
2. Knowledge secrets (information they possess)
3. Relationship secrets (hidden connections)
4. Skill secrets (hidden abilities)
5. Goal secrets (hidden motivations)

For each secret:
- Description of the secret
- Why it's hidden
- Potential consequences of revelation
- Story potential and dramatic impact

Format as JSON array with secret objects.
Ensure secrets match the specified level and create story tension.`;
    }

    private buildDialoguePrompt(request: CharacterGenerationRequest, personality: any): string {
        return `Generate dialogue samples for this character:

CHARACTER CONTEXT:
- Personality traits: ${personality.traits?.slice(0, 3).map((t: any) => t.name).join(', ') || 'To be determined'}
- Speech patterns: ${personality.speechPatterns?.join(', ') || 'To be determined'}
- Social style: ${personality.socialTendencies || 'To be determined'}
- Role: ${request.role}

Generate diverse dialogue samples including:
1. Casual conversation
2. Under pressure/stress
3. Expressing anger or frustration
4. Showing compassion or care
5. Being deceptive or evasive
6. Revealing something important
7. In their professional role
8. With different relationship types (friend, enemy, stranger)

For each sample, include:
- Context/situation
- The dialogue
- Tone and delivery notes
- What it reveals about character

Format as JSON array with dialogue objects.
Ensure dialogue reflects personality, speech patterns, and role consistently.`;
    }

    // ============================================
    // RESPONSE PARSERS
    // ============================================

    private parseCoreIdentityResponse(response: string, request: CharacterGenerationRequest) {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    name: parsed.name || request.name || this.generateRandomName(),
                    fullName: parsed.fullName || parsed.name,
                    aliases: parsed.aliases || [],
                    species: parsed.species || request.species || 'Human',
                    age: parsed.age || request.age || this.generateRandomAge(),
                    physicalDescription: parsed.physicalDescription || 'Average build and appearance',
                    distinctiveFeatures: parsed.distinctiveFeatures || []
                };
            }
        } catch (error) {
            console.warn('Failed to parse core identity JSON, using fallback');
        }

        // Fallback parsing
        return {
            name: request.name || this.generateRandomName(),
            fullName: request.name || this.generateRandomName(),
            aliases: [],
            species: request.species || 'Human',
            age: request.age || this.generateRandomAge(),
            physicalDescription: 'Average build and appearance',
            distinctiveFeatures: []
        };
    }

    private parsePersonalityResponse(response: string, request: CharacterGenerationRequest) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    traits: this.normalizeTraits(parsed.traits || []),
                    values: parsed.values || [],
                    fears: parsed.fears || [],
                    desires: parsed.desires || [],
                    habits: parsed.habits || [],
                    speechPatterns: parsed.speechPatterns || [],
                    mannerisms: parsed.mannerisms || [],
                    socialTendencies: parsed.socialTendencies || 'balanced'
                };
            }
        } catch (error) {
            console.warn('Failed to parse personality JSON, using fallback');
        }

        return this.generateFallbackPersonality(request);
    }

    private parseBackstoryResponse(response: string, request: CharacterGenerationRequest) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    childhood: parsed.childhood || 'Standard childhood development',
                    formativeEvents: this.normalizeLifeEvents(parsed.formativeEvents || []),
                    education: parsed.education || 'Basic education',
                    career: parsed.career || 'Various work experiences',
                    relationships: parsed.relationships || [],
                    traumas: parsed.traumas || [],
                    achievements: parsed.achievements || []
                };
            }
        } catch (error) {
            console.warn('Failed to parse backstory JSON, using fallback');
        }

        return this.createBasicBackstory();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private generateRandomName(): string {
        const names = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage'];
        return names[Math.floor(Math.random() * names.length)];
    }

    private generateRandomAge(): number {
        return Math.floor(Math.random() * 50) + 20; // 20-70
    }

    private createBasicBackstory() {
        return {
            childhood: 'Had a relatively normal childhood with typical experiences.',
            formativeEvents: [],
            education: 'Received a standard education.',
            career: 'Has had various work experiences.',
            relationships: [],
            traumas: [],
            achievements: []
        };
    }

    private createBasicStoryElements() {
        return {
            goals: {
                immediate: ['Survive the current situation'],
                shortTerm: ['Improve their circumstances'],
                longTerm: ['Find their place in the world']
            },
            internalConflicts: ['Self-doubt'],
            externalConflicts: ['Environmental challenges'],
            characterArcPotential: ['Growth through adversity'],
            plotHooks: ['Mysterious past'],
            relationshipDynamics: ['Forming new connections']
        };
    }

    private normalizeTraits(traits: any[]): PersonalityTrait[] {
        return traits.map(trait => ({
            name: typeof trait === 'string' ? trait : trait.name || 'Unknown',
            description: typeof trait === 'object' ? trait.description || '' : `Trait: ${trait}`,
            strength: typeof trait === 'object' ? trait.strength || 0.7 : 0.7,
            manifestations: typeof trait === 'object' ? trait.manifestations || [`Shows ${trait.name || trait} in behavior`] : [`Shows ${trait} in behavior`],
            situationalVariance: typeof trait === 'object' ? trait.situationalVariance || 'Consistent across situations' : 'Consistent across situations',
            origin: typeof trait === 'object' ? trait.origin : undefined
        }));
    }

    private normalizeLifeEvents(events: any[]): LifeEvent[] {
        return events.map(event => ({
            age: event.age || 18,
            event: event.event || event.description || 'Significant life event',
            type: event.type || 'neutral' as 'positive' | 'negative' | 'neutral' | 'transformative',
            impact: event.impact || 'moderate' as 'minor' | 'moderate' | 'major' | 'life_changing',
            emotionalImpact: event.emotionalImpact || event.emotional_impact || 'Moderate emotional significance',
            location: event.location || 'Unknown',
            witnesses: event.witnesses || event.people_involved || [],
            consequences: event.consequences || ['Changed personal perspective']
        }));
    }

    private generateFallbackPersonality(request: CharacterGenerationRequest) {
        return {
            traits: [
                { name: 'Determined', description: 'Shows persistence in achieving goals', strength: 0.7, emotional_impact: 0.6 },
                { name: 'Curious', description: 'Interested in learning new things', strength: 0.6, emotional_impact: 0.4 }
            ],
            values: ['Honesty', 'Loyalty'],
            fears: ['Failure', 'Isolation'],
            desires: ['Understanding', 'Connection'],
            habits: ['Early riser', 'Thoughtful decision-making'],
            speechPatterns: ['Clear communication'],
            mannerisms: ['Attentive listening'],
            socialTendencies: 'balanced'
        };
    }

    private generateTags(request: CharacterGenerationRequest, personality: any, backstory: any): string[] {
        const tags = [];

        if (request.role) tags.push(request.role);
        if (request.storyImportance) tags.push(request.storyImportance);
        if (personality.traits) {
            tags.push(...personality.traits.slice(0, 3).map((t: any) => t.name.toLowerCase()));
        }

        return [...new Set(tags)]; // Remove duplicates
    }

    private async assessQuality(character: GeneratedCharacter): Promise<number> {
        // Simple quality assessment based on completeness
        let score = 0.5; // Base score

        if (character.personality?.traits?.length > 0) score += 0.1;
        if (character.backstory?.formativeEvents?.length > 0) score += 0.1;
        if (character.skills?.length > 0) score += 0.1;
        if (character.goals?.immediate?.length > 0) score += 0.1;
        if (character.initialMemories?.length > 0) score += 0.1;

        return Math.min(score, 1.0);
    }

    private buildPrompt(request: CharacterGenerationRequest): string {
        return `Character Generation Request: ${JSON.stringify(request, null, 2)}`;
    }

    // Remove this method since we're using mongoGeneratorService directly
    // private async saveCharacter(character: GeneratedCharacter): Promise<void> {
    //     // Now handled by mongoGeneratorService.saveCharacter()
    // }

    private loadTemplates(): void {
        // TODO: Load character templates from database or files
        console.log('Loading character templates...');
    }

    /**
     * Retrieve an existing character by ID
     */
    async getCharacter(id: string): Promise<GeneratedCharacter | null> {
        return await mongoGeneratorService.getCharacter(id);
    }

    /**
     * Expand specific elements of an existing character
     */
    async expandCharacterElement(request: CharacterExpansionRequest): Promise<CharacterExpansion> {
        console.log('Expanding character element:', request);

        // TODO: Implement AI-powered expansion
        const expansion: CharacterExpansion = {
            expansionType: request.expansionType,
            newContent: `Expanded content for ${request.expansionType}: ${request.focus}`,
            integrationPoints: request.integrationRequirements || [],
            qualityScore: 0.8,
            consistencyImpact: 0.1
        };

        return expansion;
    }

    /**
     * Validate character consistency and quality
     */
    async validateCharacter(character: GeneratedCharacter): Promise<CharacterValidationResult> {
        console.log('Validating character:', character.name);

        // TODO: Implement comprehensive validation
        const result: CharacterValidationResult = {
            isValid: true,
            qualityScore: character.qualityScore,
            issues: [],
            suggestions: [],
            consistencyChecks: {
                personalityCoherence: true,
                backstoryLogic: true,
                skillsRealistic: true,
                goalsAchievable: true
            },
            validatedAt: new Date()
        };

        return result;
    }

    /**
     * Additional parsing methods for other response types
     */
    private parseCurrentStatusResponse(response: string) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse current status JSON, using fallback');
        }

        return {
            location: 'Current location unknown',
            occupation: 'Occupation undefined',
            livingArrangement: 'Living situation unclear',
            financialSituation: 'Financial status unknown',
            healthStatus: 'Health status normal',
            mentalState: 'Mental state stable'
        };
    }

    private parseAbilitiesResponse(response: string) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    skills: parsed.skills || [],
                    talents: parsed.talents || [],
                    weaknesses: parsed.weaknesses || [],
                    knowledge: parsed.knowledge || [],
                    languages: parsed.languages || []
                };
            }
        } catch (error) {
            console.warn('Failed to parse abilities JSON, using fallback');
        }

        return {
            skills: [],
            talents: [],
            weaknesses: [],
            knowledge: [],
            languages: ['Common']
        };
    }

    private parseStoryElementsResponse(response: string) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse story elements JSON, using fallback');
        }

        return this.createBasicStoryElements();
    }

    private parseRelationshipsResponse(response: string): RelationshipHistory[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse relationships JSON, using fallback');
        }

        return [];
    }

    private parseSecretsResponse(response: string, secretsLevel: string): any[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse secrets JSON, using fallback');
        }

        return [];
    }

    private parseDialogueResponse(response: string): any[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse dialogue JSON, using fallback');
        }

        return [];
    }
}
