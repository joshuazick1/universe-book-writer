/**
 * Character Generator Types
 * 
 * Comprehensive type definitions for AI-powered character generation system.
 * Supports creation of detailed characters with rich backstories, personalities, and relationships.
 */

export interface CharacterGenerationRequest {
    userId: string;
    universeId: string;
    
    // Basic parameters
    name?: string;
    role?: 'protagonist' | 'antagonist' | 'supporting' | 'background' | 'neutral';
    
    // Demographics and background
    species?: string; // Human, Elf, Android, etc. (universe-dependent)
    age?: number | 'child' | 'young_adult' | 'adult' | 'middle_aged' | 'elderly';
    gender?: string;
    socialClass?: 'nobility' | 'upper' | 'middle' | 'working' | 'outcast';
    occupation?: string;
    birthLocation?: string;
    
    // Personality seeds
    personalityType?: 'MBTI' | 'Enneagram' | 'custom';
    personalityHints?: string; // e.g., "INTJ" or "Type 8" or custom description
    coreTraits?: string[]; // e.g., ['brave', 'impulsive', 'loyal']
    motivation?: string; // Primary driving force
    flaw?: string; // Character's key weakness/blind spot
    
    // Relationships and connections
    family?: 'close' | 'distant' | 'complicated' | 'none' | 'unknown';
    allies?: number; // How many close allies to generate
    enemies?: number; // How many personal enemies
    romanticInterest?: boolean;
    mentor?: boolean; // Has or is a mentor
    
    // Story integration
    entryPoint?: string; // How they enter the story
    storyImportance: 'major' | 'moderate' | 'minor' | 'cameo';
    secretsLevel: 'none' | 'minor' | 'significant' | 'world_changing';
    plotRelevance?: string[]; // Types of plots this character should be involved in
    
    // Generation options
    detailLevel: 'basic' | 'standard' | 'comprehensive' | 'exhaustive';
    generateBackstory: boolean;
    generateRelationships: boolean;
    generateSecrets: boolean;
    generateGoals: boolean;
    generateDialogueSamples: boolean;
    generateMemories: boolean; // Auto-populate character memory system
    
    // Archetype and inspiration
    archetype?: string; // 'hero', 'mentor', 'trickster', 'shadow', etc.
    inspirationCharacters?: string[]; // Other fictional characters as inspiration
    avoidTraits?: string[]; // Traits to explicitly avoid
}

export interface GeneratedCharacter {
    id: string;
    name: string;
    universeId: string;
    userId: string;
    
    // Identity and appearance
    fullName: string;
    aliases: string[];
    titles?: string[];
    species: string;
    age: number;
    gender: string;
    physicalDescription: string;
    distinctiveFeatures: string[];
    style: CharacterStyle;
    
    // Core personality
    personality: {
        type?: string; // MBTI, Enneagram, etc.
        traits: PersonalityTrait[];
        values: string[];
        fears: string[];
        desires: string[];
        habits: string[];
        speechPatterns: string[];
        mannerisms: string[];
        emotionalProfile: EmotionalProfile;
        moralAlignment: MoralAlignment;
    };
    
    // Background and history
    backstory: {
        childhood: string;
        formativeEvents: LifeEvent[];
        education: string;
        career: string;
        relationships: RelationshipHistory[];
        traumas: string[];
        achievements: string[];
        failures: string[];
        turningPoints: TurningPoint[];
    };
    
    // Current situation
    currentStatus: {
        location: string;
        occupation: string;
        livingArrangement: string;
        financialSituation: string;
        healthStatus: string;
        mentalState: string;
        socialStanding: string;
        reputation: string;
    };
    
    // Abilities and skills
    skills: Skill[];
    talents: string[];
    weaknesses: string[];
    knowledge: KnowledgeArea[];
    languages: string[];
    combatAbilities?: CombatAbility[];
    magicalAbilities?: MagicalAbility[];
    
    // Psychological depth
    psyche: {
        coreBeliefs: string[];
        worldview: string;
        prejudices: string[];
        blindSpots: string[];
        defenseMechanisms: string[];
        triggers: EmotionalTrigger[];
        copingStrategies: string[];
    };
    
    // Story elements
    goals: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
        ultimate: string;
        conflictingGoals: string[];
    };
    
    secrets: Secret[];
    connections: Connection[];
    plotHooks: PlotHook[];
    prophecies?: string[]; // Prophecies involving this character
    
    // Character development potential
    characterArc: {
        startingPoint: string;
        internalConflict: string;
        growth: string;
        potentialEndings: string[];
        keyMoments: string[];
        characterTheme: string;
    };
    
    // Dialogue and voice
    dialogue?: {
        vocabulary: 'simple' | 'average' | 'sophisticated' | 'archaic' | 'technical';
        tone: string[];
        quirks: string[];
        catchphrases?: string[];
        samples: DialogueSample[];
    };
    
    // Memories for the memory system
    initialMemories: CharacterMemory[];
    
    // Metadata
    createdAt: Date;
    updatedAt: Date;
    generationPrompt: string;
    generationSettings: CharacterGenerationRequest;
    qualityScore: number; // AI-assessed character depth and consistency
    archetypeUsed?: string;
    inspirationSources: string[];
}

export interface CharacterStyle {
    clothingPreference: string;
    accessories: string[];
    colors: string[];
    grooming: string;
    distinctiveItems: string[];
    styleEvolution: string; // How their style has changed over time
}

export interface PersonalityTrait {
    name: string;
    strength: number; // 0-1, how prominent this trait is
    description: string;
    manifestations: string[]; // How this trait shows up in behavior
    situationalVariance: string; // When this trait is stronger/weaker
    origin?: string; // Where this trait came from
}

export interface EmotionalProfile {
    dominantEmotion: string;
    emotionalRange: 'narrow' | 'moderate' | 'wide' | 'extreme';
    expressiveness: 'reserved' | 'moderate' | 'expressive' | 'dramatic';
    emotionalIntelligence: 'low' | 'average' | 'high' | 'exceptional';
    triggers: { [emotion: string]: string[] };
    expressions: { [emotion: string]: string };
    recovery: { [emotion: string]: string }; // How they recover from each emotion
}

export interface MoralAlignment {
    ethical: 'good' | 'neutral' | 'evil';
    lawful: 'lawful' | 'neutral' | 'chaotic';
    description: string;
    flexibility: string; // How rigid or flexible their morals are
    exceptions: string[]; // Situations where they might act against alignment
}

export interface LifeEvent {
    age: number;
    event: string;
    type: 'positive' | 'negative' | 'neutral' | 'transformative';
    impact: 'minor' | 'moderate' | 'major' | 'life_changing';
    emotionalImpact: string;
    skillsGained?: string[];
    personalityChange?: string;
    relationshipsAffected?: string[];
    location?: string;
    witnesses?: string[];
    consequences: string[];
}

export interface TurningPoint {
    age: number;
    event: string;
    choiceMade: string;
    alternativeChoices: string[];
    reasoning: string;
    consequences: string[];
    regrets?: string;
    prideMoments?: string;
}

export interface RelationshipHistory {
    name: string;
    relationship: string;
    period: string; // When this relationship was active
    significance: 'minor' | 'moderate' | 'major' | 'defining';
    currentStatus: 'active' | 'ended' | 'complicated' | 'unknown';
    description: string;
    sharedExperiences: string[];
    conflictHistory?: string[];
    influence: string; // How this person influenced the character
    unfinishedBusiness?: string;
}

export interface Skill {
    name: string;
    level: 'novice' | 'beginner' | 'competent' | 'expert' | 'master' | 'legendary';
    experience: number; // Years of experience
    origin: string; // How they learned it
    applications: string[];
    limitations: string[];
    teachingAbility?: 'none' | 'basic' | 'good' | 'excellent';
    passion: number; // 0-1, how much they love this skill
}

export interface KnowledgeArea {
    subject: string;
    depth: 'surface' | 'moderate' | 'deep' | 'expert' | 'scholarly';
    source: string; // How they acquired this knowledge
    specializations: string[];
    gaps: string[]; // What they don't know in this area
    misinformation?: string[]; // Wrong beliefs they have
    practical: boolean; // Whether they can apply this knowledge
}

export interface CombatAbility {
    type: 'melee' | 'ranged' | 'unarmed' | 'tactical' | 'defensive';
    name: string;
    skill: 'novice' | 'trained' | 'veteran' | 'expert' | 'master';
    specializations: string[];
    preferredWeapons?: string[];
    style: string;
    training: string;
    experience: string;
    limitations: string[];
}

export interface MagicalAbility {
    school: string;
    power: 'weak' | 'moderate' | 'strong' | 'exceptional' | 'legendary';
    abilities: string[];
    limitations: string[];
    cost: string; // What casting magic costs this character
    training: string;
    source: string; // Where their magic comes from
    control: 'poor' | 'fair' | 'good' | 'excellent' | 'perfect';
    specialization?: string;
}

export interface EmotionalTrigger {
    stimulus: string;
    emotion: string;
    intensity: 'mild' | 'moderate' | 'strong' | 'overwhelming';
    reaction: string;
    origin: string; // What caused this trigger
    coping: string; // How they deal with it
    avoidance: string[]; // What they do to avoid this trigger
}

export interface Secret {
    type: 'personal' | 'family' | 'professional' | 'supernatural' | 'criminal' | 'romantic' | 'political';
    description: string;
    severity: 'embarrassing' | 'damaging' | 'dangerous' | 'catastrophic';
    whoKnows: string[];
    howToDiscover: string;
    consequences: string;
    protection: string; // How they protect this secret
    revelation: string; // What would happen if revealed
    guilt: number; // 0-1, how much guilt this causes
}

export interface Connection {
    characterId?: string; // If connecting to another generated character
    name: string;
    relationship: string;
    status: 'alive' | 'dead' | 'missing' | 'unknown';
    importance: number; // 0-1
    description: string;
    currentContact: 'frequent' | 'occasional' | 'rare' | 'none';
    sharedHistory: string;
    emotionalSignificance: string;
    unresolvedIssues?: string[];
    mutalFeelings?: string; // How the other person feels about this character
}

export interface PlotHook {
    type: 'personal' | 'professional' | 'romantic' | 'mystery' | 'adventure' | 'conflict' | 'responsibility';
    title: string;
    description: string;
    urgency: 'immediate' | 'soon' | 'eventual' | 'background';
    complexity: 'simple' | 'moderate' | 'complex' | 'epic';
    involvedParties: string[];
    stakes: string[];
    potentialOutcomes: string[];
    obstacles: string[];
    requiredSkills: string[];
    characterMotivation: string; // Why this character would engage with this hook
}

export interface DialogueSample {
    situation: string;
    audience: string;
    mood: string;
    sample: string;
    analysis: string; // What this reveals about the character
}

/**
 * Character Memory and Integration Types
 * 
 * Defines the structure for character memories and their integration into the character
 * generation system. Memories can be traits, knowledge, skills, experiences, relationships,
 * secrets, or goals. Integration involves populating these memories into the character's
 * profile based on various factors like importance, emotional weight, and relevance.
 */

// Memory types for integration
export interface CharacterMemory {
    id: string;
    type: 'trait' | 'knowledge' | 'event' | 'relationship' | 'goal';
    content: string;
    importance: number;
    emotional_weight: number;
    related_entities: string[];
    timestamp: Date;
    source: string;
    tags?: string[];
    contextual_info?: Record<string, any>;
}

// Memory population request and result interfaces
export interface MemoryPopulationRequest {
    characterId: string;
    memoryCategories: string[];
    detailLevel: 'basic' | 'standard' | 'comprehensive';
    includeSecrets: boolean;
    includeTraumas: boolean;
    includeRelationships: boolean;
    prioritizeRecent: boolean;
}

export interface MemoryPopulationResult {
    characterId: string;
    memoriesCreated: number;
    memoryTypes: { [type: string]: number };
    integrationSuccess: boolean;
    issues: string[];
    recommendations: string[];
}

/**
 * Character Relationship and Interaction Types
 * 
 * Covers the relationships and interactions between characters, including the nature of
 * their relationships, the dynamics at play, and any relevant history or future
 * considerations. Also includes validation and quality assessment types for ensuring
 * character relationships are well-defined and meaningful.
 */

// Character relationship and interaction types
export interface RelationshipMatrix {
    universeId: string;
    characters: string[]; // Character IDs
    relationships: CharacterRelationship[];
    networkAnalysis: {
        centralCharacters: string[];
        isolatedCharacters: string[];
        factionGroups: CharacterFaction[];
        conflictPairs: string[][];
        alliancePairs: string[][];
    };
}

export interface CharacterRelationship {
    character1Id: string;
    character2Id: string;
    relationshipType: string;
    intensity: number; // 0-1
    history: string;
    currentDynamic: string;
    futureTrajectory: 'strengthening' | 'weakening' | 'stable' | 'uncertain';
    sharedSecrets: string[];
    conflicts: string[];
    commonGoals: string[];
}

export interface CharacterFaction {
    name: string;
    members: string[];
    purpose: string;
    dynamics: string;
    leadership: string;
    conflicts: string[];
    goals: string[];
}

// Validation and quality types
export interface CharacterValidationResult {
    isValid: boolean;
    qualityScore: number;
    issues: ValidationIssue[];
    suggestions: string[];
    consistencyChecks: {
        personalityCoherence: boolean;
        backstoryLogic: boolean;
        skillsRealistic: boolean;
        goalsAchievable: boolean;
        relationshipsConsistent?: boolean;
    };
    qualityAssessment?: QualityAssessment;
    validatedAt: Date;
}

export interface ValidationIssue {
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
}

export interface QualityAssessment {
    score: number;
    categories: {
        completeness: number;
        coherence: number;
        originality: number;
        depth: number;
    };
    strengths: string[];
    weaknesses: string[];
    overallAssessment: string;
}

/**
 * Expansion and Refinement Types
 * 
 * For expanding and refining existing characters, including adding new backstory elements,
 * relationships, skills, secrets, goals, or personality traits. Also covers the integration
 * of these expansions into the character's existing profile.
 */

export interface CharacterExpansionRequest {
    characterId: string;
    expansionType: 'backstory' | 'relationships' | 'skills' | 'secrets' | 'goals' | 'personality';
    focus: string;
    detailLevel: 'basic' | 'detailed' | 'comprehensive';
    integrationRequirements: string[];
}

export interface CharacterExpansion {
    expansionType: string;
    newContent: any; // Specific type depends on expansionType
    integrationPoints: string[];
    qualityScore: number;
    consistencyImpact: number; // How this affects character consistency
}

/**
 * Template and Archetype Types
 * 
 * Defines templates and archetypes for character generation, including default settings,
 * common traits, and example characters. Templates provide a starting point for character
 * creation, while archetypes offer a broader categorization of character types.
 */

export interface CharacterTemplate {
    id: string;
    name: string;
    description: string;
    archetype: string;
    defaultSettings: Partial<CharacterGenerationRequest>;
    personality: Partial<PersonalityTrait[]>;
    commonTraits: string[];
    avoidTraits: string[];
    exampleCharacters: string[];
    tags: string[];
    complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface CharacterArchetype {
    name: string;
    description: string;
    coreFunction: string;
    typicalTraits: string[];
    commonMotivations: string[];
    classicFlaws: string[];
    storyRole: string[];
    examples: string[];
    variations: string[];
}

/**
 * Character Interaction and Chat Preparation Types
 * 
 * For preparing characters for interaction in the system, including defining their speech
 * style, topics of knowledge, behavioral traits, and memory integration. Ensures characters
 * are consistent and coherent in their interactions.
 */

export interface CharacterChatProfile {
    characterId: string;
    personality: {
        speechStyle: string;
        topics: string[];
        avoidedTopics: string[];
        knowledgeAreas: string[];
        opinions: { [topic: string]: string };
        reactions: { [situation: string]: string };
    };
    background: {
        experiences: string[];
        relationships: string[];
        secrets: string[];
        goals: string[];
    };
    behavioral: {
        mannerisms: string[];
        habits: string[];
        triggers: string[];
        comfort: string[];
    };
    memoryIntegration: {
        coreMemories: string[];
        accessibleMemories: string[];
        hiddenMemories: string[];
    };
}
