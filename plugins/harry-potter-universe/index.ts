/**
 * Harry Potter Universe Plugin - School-based Magical System Implementation
 * 
 * This plugin implements the Harry Potter universe with:
 * - House-based faction system (4 Hogwarts houses)
 * - School year progression instead of space/time travel
 * - Magical transport and communication systems
 * - Spell-based magic instead of technology
 * - Good vs Evil with more complex moral themes
 * - Educational focus instead of political/military focus
 */

import {
    PluginState,
    PluginType,
    type PluginConfig,
    type UniversePlugin,
    type UniverseValidation,
    type UniverseUIComponents,
    type UniverseAIPrompts,
} from '@verseforge/core';

// Import Harry Potter utilities and themes
import { MagicalCalculator } from './utils/index.js';
import { getAllThemes, getThemeByHouse } from './themes/index.js';

export const metadata = {
    name: 'harry-potter-universe',
    version: '1.0.0',
    description: 'Official Harry Potter Universe plugin with magical systems, Hogwarts houses, and wizarding world mechanics',
    author: 'VerseForge Team',
    homepage: 'https://github.com/verseforge/plugins/harry-potter',
    license: 'MIT',
    keywords: ['harry-potter', 'wizarding-world', 'magic', 'hogwarts', 'fantasy'],
    type: PluginType.UNIVERSE,
    dependencies: {} as Record<string, string>,
    engines: {
        node: '>=18.0.0',
    },
};

/**
 * School-based Magical Universe Plugin (different from both sci-fi and pure fantasy models)
 */
export default class HarryPotterUniversePlugin implements UniversePlugin {
    public readonly metadata = metadata;
    public state: PluginState = PluginState.UNLOADED;
    public config = {
        enabled: true,
        settings: {
            currentEra: 'harry-potter', // founders, marauders, harry-potter, next-generation
            schoolYear: 1991, // Starting year (Harry's first year)
            defaultHouse: 'gryffindor' as 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin',
            magicalSystem: 'wand-based', // wand-based, wandless, ancient-magic
            bloodStatus: 'mixed', // pure-blood, half-blood, muggle-born, mixed
            enableQuidditch: true,
            defaultTheme: 'hogwarts', // hogwarts, gryffindor, hufflepuff, ravenclaw, slytherin
            schoolTerm: 'autumn', // autumn, spring, summer
            enableMinistryLaw: true,
        },
    };

    // Required UniversePlugin properties
    public readonly universeType = 'harry-potter';

    // Harry Potter utilities
    private magicalCalculator: MagicalCalculator;

    constructor() {
        this.magicalCalculator = new MagicalCalculator();
    }

    // Harry Potter sub-universes with era-based organization
    public readonly subUniverses = {
        'books': {
            id: 'books',
            name: 'J.K. Rowling\'s Books',
            description: 'Original book canon including all seven Harry Potter books and related works',
            canonLevel: 'strict',
            primaryEras: ['founders', 'marauders', 'harry-potter', 'next-generation'],
            supportedHouses: ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'],
            defaultEra: 'harry-potter',
            magicSystem: 'wand-based',
            moralSystem: 'complex', // Good vs Evil but with gray areas
            focusArea: 'coming_of_age'
        },
        'films': {
            id: 'films',
            name: 'Warner Bros Films',
            description: 'Film adaptation universe with visual interpretations and some story changes',
            canonLevel: 'flexible',
            primaryEras: ['harry-potter'],
            supportedHouses: ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'],
            defaultEra: 'harry-potter',
            magicSystem: 'visual',
            moralSystem: 'clear',
            focusArea: 'adventure'
        },
        'extended': {
            id: 'extended',
            name: 'Extended Wizarding World',
            description: 'Includes Fantastic Beasts, Cursed Child, and all Pottermore content',
            canonLevel: 'flexible',
            primaryEras: ['founders', 'pre-harry', 'marauders', 'harry-potter', 'next-generation'],
            supportedHouses: ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'],
            defaultEra: 'marauders',
            magicSystem: 'expanded',
            moralSystem: 'nuanced',
            focusArea: 'world_exploration'
        },
        'custom': {
            id: 'custom',
            name: 'Custom Wizarding World',
            description: 'Fan-created content and original stories in the Harry Potter setting',
            canonLevel: 'open',
            primaryEras: ['founders', 'medieval', 'modern', 'future'],
            supportedHouses: ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin', 'custom'],
            defaultEra: 'next-generation',
            magicSystem: 'custom',
            moralSystem: 'custom',
            focusArea: 'original_stories'
        }
    };

    // Required plugin lifecycle methods
    async initialize(): Promise<void> {
        this.state = PluginState.LOADED;
        console.log('Harry Potter Universe Plugin initialized');
    }

    async activate(): Promise<void> {
        this.state = PluginState.ACTIVE;
        console.log('Harry Potter Universe Plugin activated');
    }

    async deactivate(): Promise<void> {
        this.state = PluginState.LOADED;
        console.log('Harry Potter Universe Plugin deactivated');
    }

    async dispose(): Promise<void> {
        this.state = PluginState.UNLOADED;
        console.log('Harry Potter Universe Plugin disposed');
    }

    async destroy(): Promise<void> {
        this.state = PluginState.UNLOADED;
        console.log('Harry Potter Universe Plugin destroyed');
    }

    async validateConfig(config: PluginConfig): Promise<boolean> {
        return typeof config.enabled === 'boolean' &&
            config.settings &&
            typeof config.settings === 'object';
    }

    async updateConfig(newConfig: Partial<PluginConfig>): Promise<void> {
        this.config = {
            ...this.config,
            ...newConfig,
            settings: { ...this.config.settings, ...(newConfig.settings as Record<string, unknown> || {}) }
        };
        console.log('Harry Potter Universe Plugin configuration updated');
    }

    canActivate(): boolean {
        return this.state === PluginState.LOADED;
    }

    canDeactivate(): boolean {
        return this.state === PluginState.ACTIVE;
    }

    // Required validation interface
    public readonly validation: UniverseValidation = {
        async validateCharacter(character: unknown): Promise<boolean> {
            if (!character || typeof character !== 'object') return false;
            const char = character as Record<string, unknown>;

            // Validate wizarding world elements
            if (char.house) {
                const validHouses = ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin'];
                if (!validHouses.includes(char.house as string)) {
                    console.warn(`Invalid house: ${char.house}. Must be one of the four Hogwarts houses.`);
                    return false;
                }
            }

            if (char.bloodStatus) {
                const validStatuses = ['pure-blood', 'half-blood', 'muggle-born', 'squib'];
                if (!validStatuses.includes(char.bloodStatus as string)) {
                    console.warn(`Invalid blood status: ${char.bloodStatus}.`);
                }
            }

            // Validate character has a name
            return typeof char.name === 'string' && char.name.length > 0;
        },

        async validateLocation(location: unknown): Promise<boolean> {
            if (!location || typeof location !== 'object') return false;
            const loc = location as Record<string, unknown>;

            // Validate wizarding world locations
            if (loc.type) {
                const validTypes = ['school', 'ministry', 'shop', 'home', 'magical-location', 'muggle-location'];
                if (!validTypes.includes(loc.type as string)) {
                    console.warn(`Unknown location type: ${loc.type}.`);
                }
            }

            return typeof loc.name === 'string' && loc.name.length > 0;
        },

        async validateTimeline(timeline: unknown): Promise<boolean> {
            if (!timeline || typeof timeline !== 'object') return false;
            const tl = timeline as Record<string, unknown>;

            // Validate school year-based timeline
            if (tl.schoolYear && typeof tl.schoolYear === 'number') {
                if (tl.schoolYear < 990 || tl.schoolYear > 2030) {
                    console.warn(`School year ${tl.schoolYear} seems outside reasonable Hogwarts timeline.`);
                }
            }

            return typeof tl.name === 'string' && tl.name.length > 0;
        },

        async validateStory(story: unknown): Promise<boolean> {
            if (!story || typeof story !== 'object') return false;
            const st = story as Record<string, unknown>;

            // Basic story validation
            return typeof st.title === 'string' && st.title.length > 0;
        }
    };

    // Required UI components
    get ui(): UniverseUIComponents {
        return {
            CharacterForm: { name: 'WizardingCharacterForm' },
            LocationForm: { name: 'WizardingLocationForm' },
            TimelineView: { name: 'SchoolYearTimelineView' },
            ThemeProvider: { name: 'HogwartsThemeProvider' }
        };
    }

    // Required AI prompts
    get ai(): UniverseAIPrompts {
        const era = this.config.settings.currentEra;
        const prompts: UniverseAIPrompts = {
            characterCreation: [
                'Create characters with house-appropriate traits but avoid stereotypes',
                'Consider the character\'s magical background and blood status sensitively',
                'Focus on personal growth through education and friendship',
                'Show how house loyalty and school bonds shape identity'
            ],
            worldBuilding: [
                'Draw from the rich magical world established by J.K. Rowling',
                'Balance magical wonder with realistic teenage experiences',
                'Include the complexity of wizarding society and its problems',
                'Show both the magical and mundane aspects of wizarding life'
            ],
            storyGeneration: [
                'Focus on coming-of-age themes and personal growth',
                'Include school life, friendships, and academic challenges',
                'Balance magical adventure with emotional development',
                'Show how young people can make a difference in the world'
            ],
            consistency: [
                'Maintain consistency with established magical rules and limitations',
                'Respect the school calendar and Hogwarts traditions',
                'Keep magic logical within the established system',
                'Honor the themes of love, sacrifice, and the power of choice'
            ]
        };

        // Add era-specific prompts
        switch (era) {
            case 'founders':
                prompts.storyGeneration.push(
                    'Setting: Founders Era (~1000 AD). Early days of Hogwarts, medieval magical society.'
                );
                break;
            case 'marauders':
                prompts.storyGeneration.push(
                    'Setting: Marauders Era (1971-1978). James Potter, Lily Evans, Severus Snape school years.'
                );
                break;
            case 'harry-potter':
                prompts.storyGeneration.push(
                    'Setting: Harry Potter Era (1991-1998). The main story timeline, Voldemort\'s return.'
                );
                break;
            case 'next-generation':
                prompts.storyGeneration.push(
                    'Setting: Next Generation (2017+). Harry\'s children at Hogwarts, post-war wizarding world.'
                );
                break;
        }

        return prompts;
    }

    // Theme configuration with house-based options
    getThemeConfig(): Record<string, unknown> {
        const themes = getAllThemes();
        const currentTheme = this.config.settings.defaultTheme;

        return {
            currentTheme,
            availableThemes: Object.keys(themes),
            houseThemes: {
                gryffindor: getThemeByHouse('gryffindor'),
                hufflepuff: getThemeByHouse('hufflepuff'),
                ravenclaw: getThemeByHouse('ravenclaw'),
                slytherin: getThemeByHouse('slytherin')
            },
            themeDescription: 'Harry Potter themes include the general Hogwarts theme and individual house themes',
            recommendation: 'Choose a house theme to match your character\'s Hogwarts house or stick with the general Hogwarts theme'
        };
    }

    /**
     * Harry Potter-specific utility methods
     */

    /**
     * Calculate magical transport time and requirements
     */
    public calculateMagicalTransport(
        method: 'floo' | 'apparition' | 'portkey' | 'knight_bus' | 'flying' | 'hogwarts_express',
        distance: number,
        passengerAge: number = 17,
        hasPermits: boolean = true
    ) {
        return this.magicalCalculator.calculateMagicalTransport(method, distance, passengerAge, hasPermits);
    }

    /**
     * Calculate current school year and term
     */
    public calculateSchoolYear(currentDate: Date, startingYear: number = 1991) {
        return this.magicalCalculator.calculateSchoolYear(currentDate, startingYear);
    }

    /**
     * Calculate house points and standings
     */
    public calculateHousePoints(
        house: 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin',
        currentPoints: number,
        pointsChange: number,
        reason: string,
        awardedBy: string,
        allHousePoints: Record<string, number>
    ) {
        return this.magicalCalculator.calculateHousePoints(house, currentPoints, pointsChange, reason, awardedBy, allHousePoints);
    }

    /**
     * Get famous wizarding world routes
     */
    public getWizardingRoutes() {
        return this.magicalCalculator.getWizardingRoutes();
    }

    /**
     * Calculate Sorting Hat house probability
     */
    public calculateSortingHat(traits: {
        courage: number;
        intelligence: number;
        loyalty: number;
        ambition: number;
    }) {
        return this.magicalCalculator.calculateHouseProbability(traits);
    }

    /**
     * Get available sub-universes for this plugin
     */
    getSubUniverseConfig(subUniverseId: string): Record<string, unknown> {
        const subUniverse = this.subUniverses[subUniverseId as keyof typeof this.subUniverses];
        if (!subUniverse) {
            throw new Error(`Unknown sub-universe: ${subUniverseId}`);
        }

        return {
            ...subUniverse,
            recommendedSettings: {
                currentEra: subUniverse.defaultEra,
                magicalSystem: subUniverse.magicSystem,
                moralComplexity: subUniverse.moralSystem
            }
        };
    }

    /**
     * Get theme for specific house
     */
    public getHouseTheme(house: 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin') {
        return getThemeByHouse(house);
    }

    /**
     * Get all available Harry Potter themes
     */
    public getAllHarryPotterThemes() {
        return getAllThemes();
    }
}

// Export the plugin class
export { HarryPotterUniversePlugin };
