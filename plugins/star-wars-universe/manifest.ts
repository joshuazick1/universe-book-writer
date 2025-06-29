/**
 * Star Wars Universe Plugin Manifest
 * Simplified plugin metadata focusing on key architectural differences from Star Trek
 */

export const StarWarsManifest = {
    // Basic Information
    id: 'star-wars-universe',
    name: 'Star Wars Universe',
    description: 'Comprehensive Star Wars universe plugin with faction-based architecture and galactic politics',
    version: '1.0.0',
    author: 'Universe Book Writer Team',
    license: 'MIT',

    // Architecture Type - Key Difference from Star Trek
    architecture: {
        type: 'faction-based', // vs Star Trek's 'federation-centric'
        focus: 'galactic-politics', // vs Star Trek's 'exploration-diplomacy'
        organization: 'multi-faction', // vs Star Trek's 'hierarchical-ranks'
        conflict_model: 'eternal-struggle', // vs Star Trek's 'diplomatic-solutions'
    },

    // Plugin Type and Features
    type: 'universe',
    capabilities: [
        'faction-system',
        'force-powers',
        'galactic-politics',
        'planetary-systems',
        'conflict-mechanics',
        'theme-contribution',
    ],

    // Sub-universes with Different Focus than Star Trek
    subUniverses: {
        canon: {
            name: 'Galactic Canon',
            description: 'Official Disney/Lucasfilm timeline',
            factionSystem: 'dynamic',
            forceSystem: true,
            politicalComplexity: 'moderate',
            primaryFactions: ['empire', 'rebel', 'republic'],
        },
        legends: {
            name: 'Expanded Universe (Legends)',
            description: 'Classic EU with complex faction dynamics',
            factionSystem: 'complex',
            forceSystem: true,
            politicalComplexity: 'high',
            primaryFactions: ['empire', 'rebel', 'republic', 'sith-empire', 'mandalorian'],
        },
        oldRepublic: {
            name: 'Old Republic Era',
            description: 'Ancient Jedi vs Sith conflicts',
            factionSystem: 'warfare',
            forceSystem: true,
            politicalComplexity: 'high',
            primaryFactions: ['republic', 'sith-empire', 'jedi-order', 'mandalorian'],
        },
        custom: {
            name: 'Custom Galaxy',
            description: 'User-defined factions and politics',
            factionSystem: 'user-defined',
            forceSystem: true,
            politicalComplexity: 'custom',
            primaryFactions: [],
        },
    },

    // Themes Contributed to Global System
    themes: {
        imperial: {
            name: 'Imperial',
            description: 'Dark, authoritarian military aesthetics',
            type: 'dark',
            primaryColor: '#cc0000',
            filePath: './themes/imperial.js',
        },
        rebel: {
            name: 'Rebel Alliance',
            description: 'Hopeful, organic resistance aesthetics',
            type: 'balanced',
            primaryColor: '#ff6600',
            filePath: './themes/rebel.js',
        },
    },

    // Data Models - Faction-focused vs Star Trek's rank-focused
    dataModels: {
        character: {
            name: 'StarWarsCharacter',
            keyFields: ['faction', 'homeworld', 'species', 'force_sensitive'],
            validationFocus: 'faction-alignment',
            uniqueFeatures: ['force-powers', 'political-stance'],
        },
        location: {
            name: 'StarWarsSystem',
            keyFields: ['sector', 'region', 'controlling_faction', 'strategic_value'],
            validationFocus: 'galactic-coordinates',
            uniqueFeatures: ['political-status', 'trade-routes'],
        },
        organization: {
            name: 'StarWarsFaction',
            keyFields: ['alignment', 'territory', 'military_strength'],
            validationFocus: 'faction-dynamics',
            uniqueFeatures: ['political-relationships', 'resource-control'],
        },
    },

    // UI Components
    components: {
        CharacterForm: 'GalacticCitizenForm',
        LocationForm: 'PlanetarySystemRegistry',
        TimelineView: 'GalacticHistoryHolonet',
        ThemeProvider: 'ImperialThemeProvider',
    },

    // Settings
    defaultSettings: {
        primaryTheme: 'imperial',
        era: 'empire',
        enableForceSystem: true,
        enableFactionWarfare: true,
        politicalComplexity: 'moderate',
        defaultFaction: 'neutral',
    },

    // Key Architectural Differences from Star Trek
    differentiators: {
        organizationModel: 'multiple-competing-factions', // vs Star Trek's 'unified-federation'
        conflictApproach: 'eternal-good-vs-evil', // vs Star Trek's 'diplomatic-solutions'
        characterFocus: 'faction-loyalty-and-force', // vs Star Trek's 'rank-and-species'
        locationFocus: 'political-control-and-resources', // vs Star Trek's 'exploration-and-science'
        storyThemes: 'political-intrigue-and-destiny', // vs Star Trek's 'exploration-and-ethics'
        validationPriority: 'faction-consistency', // vs Star Trek's 'protocol-compliance'
    },
};

export default StarWarsManifest;
