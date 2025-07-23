/**
 * Universe Generator Types
 * 
 * Comprehensive type definitions for AI-powered universe generation system.
 * Supports creation of detailed fictional worlds with rich lore, history, and context.
 */

export interface UniverseGenerationRequest {
    userId: string;
    
    // Basic parameters
    name?: string;
    genre: 'fantasy' | 'sci-fi' | 'modern' | 'historical' | 'horror' | 'mystery' | 'custom';
    subgenres?: string[]; // e.g., ['urban fantasy', 'space opera', 'cyberpunk']
    tone: 'light' | 'dark' | 'balanced' | 'gritty' | 'whimsical';
    scope: 'city' | 'region' | 'continent' | 'world' | 'galaxy' | 'multiverse';
    
    // Thematic elements
    themes: string[]; // e.g., ['redemption', 'power corruption', 'family bonds']
    technologies: 'none' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'futuristic' | 'magical';
    magicSystem?: 'none' | 'rare' | 'common' | 'dominant' | 'science-based';
    
    // Detailed customization
    seedPrompt?: string; // User's initial idea or inspiration
    influencedBy?: string[]; // Other fictional universes as inspiration
    avoidElements?: string[]; // Elements to explicitly avoid
    
    // Generation options
    detailLevel: 'basic' | 'standard' | 'comprehensive' | 'exhaustive';
    generateMaps: boolean;
    generateTimeline: boolean;
    generateCultures: boolean;
    generatePolitics: boolean;
    generateReligions: boolean;
    generateLanguages: boolean;
}

export interface GeneratedUniverse {
    id: string;
    name: string;
    userId: string;
    
    // Core foundation
    premise: string; // 2-3 sentence universe concept
    genres: string[];
    themes: string[];
    
    // Historical framework
    history: {
        ancientEra?: UniverseEra;
        classicalEra?: UniverseEra;
        modernEra: UniverseEra;
        currentEra: UniverseEra;
        futurePotential?: UniverseEra;
    };
    
    // World building
    geography: {
        worlds: WorldDescription[];
        notableLocations: Location[];
        climate: string;
        naturalResources: string[];
        environmentalChallenges: string[];
    };
    
    // Social structures
    cultures: Culture[];
    governments: Government[];
    religions?: Religion[];
    languages?: Language[];
    economies: Economy[];
    
    // Systems and rules
    magicSystem?: MagicSystem;
    technology: TechnologyLevel;
    physicsRules: PhysicsRule[];
    socialNorms: SocialNorm[];
    
    // Conflicts and tensions
    currentConflicts: Conflict[];
    underlyingTensions: string[];
    prophecies?: Prophecy[];
    mysteries: Mystery[];
    
    // Story potential
    storySeeds: StorySeed[];
    importantFigures: ImportantFigure[];
    legendaryItems?: LegendaryItem[];
    significantEvents: HistoricalEvent[];
    
    // Metadata
    createdAt: Date;
    updatedAt: Date;
    generationPrompt: string;
    generationSettings: UniverseGenerationRequest;
    qualityScore: number; // 0-1, AI-assessed universe coherence
    pluginCompatibility: string[]; // Which plugins (Star Trek, Star Wars, etc.) this universe works with
}

export interface UniverseEra {
    name: string;
    timespan: string;
    description: string;
    keyEvents: string[];
    dominantForces: string[];
    technology: string;
    culturalHighlights: string[];
    majorFigures: string[];
    definingConflicts: string[];
}

export interface WorldDescription {
    name: string;
    type: 'planet' | 'moon' | 'space_station' | 'dimension' | 'realm';
    size: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
    environment: string[];
    inhabitants: string[];
    uniqueFeatures: string[];
    significance: string;
}

export interface Location {
    name: string;
    type: 'city' | 'town' | 'village' | 'fortress' | 'temple' | 'ruins' | 'landmark' | 'institution';
    worldId?: string;
    description: string;
    population?: number;
    government?: string;
    culture?: string;
    economy?: string;
    defenses?: string;
    notableFeatures: string[];
    connections: string[]; // Links to other locations
    significance: 'minor' | 'moderate' | 'major' | 'legendary';
}

export interface Culture {
    name: string;
    description: string;
    values: string[];
    traditions: string[];
    taboos: string[];
    artForms: string[];
    cuisine: string[];
    clothingStyle: string;
    architecture: string;
    language?: string;
    religion?: string;
    government: string;
    economy: string;
    militaryTradition?: string;
    relationshipWithOthers: CulturalRelationship[];
}

export interface CulturalRelationship {
    cultureName: string;
    relationship: 'allied' | 'neutral' | 'tense' | 'hostile' | 'unknown';
    description: string;
    history: string;
}

export interface Government {
    name: string;
    type: 'monarchy' | 'republic' | 'democracy' | 'theocracy' | 'oligarchy' | 'anarchy' | 'federation' | 'empire';
    structure: string;
    leadership: string;
    lawSystem: string;
    militaryOrganization: string;
    taxation: string;
    citizenRights: string[];
    corruptionLevel: 'low' | 'moderate' | 'high' | 'extreme';
    stability: 'stable' | 'unstable' | 'collapsing' | 'emerging';
    territory: string[];
}

export interface Religion {
    name: string;
    type: 'monotheistic' | 'polytheistic' | 'pantheistic' | 'animistic' | 'philosophical' | 'ancestor_worship';
    coreBeliefs: string[];
    deities?: Deity[];
    practices: string[];
    clergy: string;
    holyTexts?: string[];
    holySites: string[];
    festivals: string[];
    influence: 'minimal' | 'moderate' | 'significant' | 'dominant';
    relationship: { [religionName: string]: 'allied' | 'neutral' | 'competing' | 'hostile' };
}

export interface Deity {
    name: string;
    domain: string[];
    description: string;
    symbolism: string[];
    worship: string;
}

export interface Language {
    name: string;
    family: string;
    speakers: string[];
    writingSystem: string;
    difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
    uniqueFeatures: string[];
    culturalSignificance: string;
    examples?: {
        commonPhrases: { [phrase: string]: string };
        namingConventions: string;
    };
}

export interface Economy {
    name: string;
    type: 'agricultural' | 'mercantile' | 'industrial' | 'technological' | 'service' | 'resource' | 'mixed';
    currency: string;
    majorIndustries: string[];
    tradeRoutes: string[];
    tradePartners: string[];
    wealthDistribution: 'equal' | 'moderate' | 'unequal' | 'extreme';
    economicChallenges: string[];
}

export interface MagicSystem {
    name: string;
    type: 'elemental' | 'divine' | 'arcane' | 'runic' | 'blood' | 'nature' | 'psychic' | 'technological';
    source: string;
    rules: string[];
    limitations: string[];
    practitioners: MagicPractitioner[];
    schools?: string[];
    artifacts?: string[];
    consequences: string[];
    publicPerception: 'revered' | 'accepted' | 'feared' | 'forbidden';
}

export interface MagicPractitioner {
    title: string;
    requirements: string[];
    abilities: string[];
    training: string;
    socialStatus: string;
    restrictions: string[];
}

export interface TechnologyLevel {
    era: string;
    level: number; // 1-10 scale
    specializations: string[];
    breakthroughs: string[];
    limitations: string[];
    militaryTech: string[];
    civilianTech: string[];
    communicationTech: string[];
    transportationTech: string[];
    medicalTech: string[];
    energySources: string[];
}

export interface PhysicsRule {
    name: string;
    description: string;
    implications: string[];
    exceptions?: string[];
}

export interface SocialNorm {
    category: 'etiquette' | 'hierarchy' | 'gender' | 'family' | 'profession' | 'religion' | 'economics';
    description: string;
    enforcement: 'strict' | 'moderate' | 'loose' | 'ignored';
    violations: string;
    culturalOrigin: string;
}

export interface Conflict {
    name: string;
    type: 'war' | 'civil_war' | 'rebellion' | 'territorial' | 'religious' | 'economic' | 'ideological' | 'resource';
    participants: string[];
    cause: string;
    currentStatus: 'brewing' | 'active' | 'stalemate' | 'ending' | 'aftermath';
    stakes: string[];
    potentialOutcomes: string[];
    civilianImpact: string;
}

export interface Prophecy {
    name: string;
    origin: string;
    text: string;
    interpretation: string[];
    fulfillmentSigns: string[];
    timeframe: string;
    believers: string[];
    skeptics: string[];
    implications: string[];
}

export interface Mystery {
    name: string;
    type: 'historical' | 'supernatural' | 'technological' | 'personal' | 'cosmic';
    description: string;
    clues: string[];
    theories: string[];
    investigators: string[];
    dangers: string[];
    potentialSolutions: string[];
    significance: 'local' | 'regional' | 'global' | 'universal';
}

export interface StorySeed {
    title: string;
    genre: string[];
    premise: string;
    mainConflict: string;
    potentialCharacters: string[];
    keyLocations: string[];
    estimatedLength: 'short' | 'novella' | 'novel' | 'series';
    themes: string[];
    hooks: string[];
}

export interface ImportantFigure {
    name: string;
    title?: string;
    status: 'alive' | 'dead' | 'missing' | 'legendary' | 'mythical';
    significance: 'local' | 'regional' | 'global' | 'historical' | 'legendary';
    description: string;
    achievements: string[];
    influence: string[];
    location?: string;
    affiliations: string[];
    secrets?: string[];
}

export interface LegendaryItem {
    name: string;
    type: 'weapon' | 'armor' | 'artifact' | 'tool' | 'knowledge' | 'location';
    description: string;
    powers: string[];
    origin: string;
    currentLocation: 'known' | 'unknown' | 'lost' | 'destroyed';
    history: string[];
    seekers: string[];
    guardians?: string[];
    curses?: string[];
}

export interface HistoricalEvent {
    name: string;
    date: string;
    type: 'battle' | 'discovery' | 'disaster' | 'founding' | 'transformation' | 'contact' | 'betrayal';
    description: string;
    participants: string[];
    location: string;
    causes: string[];
    consequences: string[];
    significance: 'minor' | 'moderate' | 'major' | 'world_changing';
    legacyImpact: string[];
}

// Validation and quality types
export interface UniverseValidationResult {
    isValid: boolean;
    qualityScore: number;
    issues: ValidationIssue[];
    suggestions: string[];
    consistencyChecks: {
        historyCoherent: boolean;
        geographyLogical: boolean;
        culturesDistinct: boolean;
        conflictsRealistic: boolean;
        timelineConsistent: boolean;
    };
    qualityAssessment?: QualityAssessment;
    validatedAt: Date;
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

export interface ValidationIssue {
    type: 'consistency' | 'logic' | 'originality' | 'depth' | 'balance';
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    description: string;
    location: string; // Where in the universe this issue appears
    suggestion: string;
}

// Expansion and refinement types
export interface UniverseExpansionRequest {
    universeId: string;
    elementType: 'location' | 'culture' | 'conflict' | 'history' | 'technology' | 'religion' | 'mystery';
    expansionFocus: string;
    detailLevel: 'basic' | 'detailed' | 'comprehensive';
    integrationRequirements: string[];
}

export interface UniverseExpansion {
    elementType: string;
    newContent: any; // Specific type depends on elementType
    integrationPoints: string[];
    qualityScore: number;
    coherenceImpact: number; // How this affects overall universe coherence
}

// Template and preset types
export interface UniverseTemplate {
    id: string;
    name: string;
    description: string;
    genre: string;
    defaultSettings: Partial<UniverseGenerationRequest>;
    examplePrompts: string[];
    tags: string[];
    complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
