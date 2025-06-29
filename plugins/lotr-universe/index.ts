/**
 * Lord of the Rings Universe Plugin - Age-based Timeline Implementation
 * 
 * This plugin uses a different architecture than sci-fi plugins:
 * - Age-based timeline instead of precise dating systems
 * - Fantasy magic instead of technology
 * - Overland journeys instead of space travel
 * - Good vs Evil instead of political factions
 * - Fellowship focus instead of individual heroes
 */

import {
    PluginState,
    PluginType,
    type PluginConfig,
    type UniversePlugin,
    type UniverseValidation,
    type UniverseUIComponents,
    type UniverseAIPrompts,
} from '@universe-book-writer/core';

// Import LOTR utilities
import { MiddleEarthCalculator } from './utils/index.js';

export const metadata = {
    name: 'lotr-universe',
    version: '1.0.0',
    description: 'Official Lord of the Rings Universe plugin with Age-based timeline and Middle-earth geography',
    author: 'Universe Book Writer Team',
    homepage: 'https://github.com/universe-book-writer/plugins/lotr',
    license: 'MIT',
    keywords: ['lotr', 'lord-of-the-rings', 'middle-earth', 'fantasy', 'tolkien'],
    type: PluginType.UNIVERSE,
    dependencies: {} as Record<string, string>,
    engines: {
        node: '>=18.0.0',
    },
};

/**
 * Age-based Fantasy Universe Plugin (different from sci-fi faction models)
 */
export default class LOTRUniversePlugin implements UniversePlugin {
    public readonly metadata = metadata;
    public state: PluginState = PluginState.UNLOADED;
    public config = {
        enabled: true,
        settings: {
            currentAge: 'Third', // First, Second, Third, Fourth
            yearInAge: 3019, // Year of the War of the Ring
            enableMagic: true,
            fellowshipMode: true,
            moralComplexity: 'clear', // clear, nuanced (good vs evil vs complex morality)
            defaultRace: 'hobbit',
            travelMethod: 'walking',
        },
    };

    // Required UniversePlugin properties
    public readonly universeType = 'lotr';

    // LOTR utilities
    private middleEarthCalculator: MiddleEarthCalculator; constructor() {
        this.middleEarthCalculator = new MiddleEarthCalculator();
    }

    // LOTR sub-universes with age-based organization
    public readonly subUniverses = {
        'books': {
            id: 'books',
            name: 'Tolkien\'s Books',
            description: 'Original book canon including The Hobbit, LOTR, and Silmarillion',
            canonLevel: 'strict',
            primaryAges: ['First', 'Second', 'Third'],
            supportedRaces: ['hobbit', 'human', 'elf', 'dwarf', 'wizard'],
            defaultAge: 'Third',
            magicSystem: 'subtle',
            moralSystem: 'clear',
            focusArea: 'fellowship_journey'
        },
        'films': {
            id: 'films',
            name: 'Peter Jackson Films',
            description: 'Film adaptation universe with visual interpretations and some changes',
            canonLevel: 'flexible',
            primaryAges: ['Third'],
            supportedRaces: ['hobbit', 'human', 'elf', 'dwarf', 'wizard'],
            defaultAge: 'Third',
            magicSystem: 'visual',
            moralSystem: 'clear',
            focusArea: 'epic_battles'
        },
        'extended': {
            id: 'extended',
            name: 'Extended Middle-earth',
            description: 'Includes all Tolkien writings, notes, and reasonable extrapolations',
            canonLevel: 'flexible',
            primaryAges: ['First', 'Second', 'Third', 'Fourth'],
            supportedRaces: ['hobbit', 'human', 'elf', 'dwarf', 'wizard', 'ent', 'eagle'],
            defaultAge: 'Second',
            magicSystem: 'expanded',
            moralSystem: 'nuanced',
            focusArea: 'world_building'
        },
        'custom': {
            id: 'custom',
            name: 'Custom Middle-earth',
            description: 'Fan-created content and original stories in Middle-earth setting',
            canonLevel: 'open',
            primaryAges: ['First', 'Second', 'Third', 'Fourth', 'Fifth'],
            supportedRaces: ['hobbit', 'human', 'elf', 'dwarf', 'wizard', 'ent', 'eagle', 'custom'],
            defaultAge: 'Fourth',
            magicSystem: 'custom',
            moralSystem: 'custom',
            focusArea: 'original_stories'
        }
    };

    // Required plugin lifecycle methods (simplified)
    async initialize(): Promise<void> {
        this.state = PluginState.LOADED;
        console.log('LOTR Universe Plugin initialized');
    }

    async activate(): Promise<void> {
        this.state = PluginState.ACTIVE;
        console.log('LOTR Universe Plugin activated');
    }

    async deactivate(): Promise<void> {
        this.state = PluginState.LOADED;
        console.log('LOTR Universe Plugin deactivated');
    } async dispose(): Promise<void> {
        this.state = PluginState.UNLOADED;
        console.log('LOTR Universe Plugin disposed');
    }

    async destroy(): Promise<void> {
        this.state = PluginState.UNLOADED;
        console.log('LOTR Universe Plugin destroyed');
    }

    async validateConfig(config: PluginConfig): Promise<boolean> {
        return typeof config.enabled === 'boolean' &&
            config.settings &&
            typeof config.settings === 'object';
    } async updateConfig(newConfig: Partial<PluginConfig>): Promise<void> {
        this.config = {
            ...this.config,
            ...newConfig,
            settings: { ...this.config.settings, ...(newConfig.settings as Record<string, unknown> || {}) }
        };
        console.log('LOTR Universe Plugin configuration updated');
    }

    canActivate(): boolean {
        return this.state === PluginState.LOADED;
    }

    canDeactivate(): boolean {
        return this.state === PluginState.ACTIVE;
    }// Required validation interface
    public readonly validation: UniverseValidation = {
        async validateCharacter(character: unknown): Promise<boolean> {
            if (!character || typeof character !== 'object') return false;
            const char = character as Record<string, unknown>;

            // Validate Middle-earth races
            if (char.race) {
                const validRaces = ['hobbit', 'human', 'elf', 'dwarf', 'wizard', 'ent', 'orc'];
                if (!validRaces.includes(char.race as string)) {
                    console.warn(`Unusual race: ${char.race}. Consider using standard Middle-earth races.`);
                }
            }

            // Validate character has a name
            return typeof char.name === 'string' && char.name.length > 0;
        },

        async validateLocation(location: unknown): Promise<boolean> {
            if (!location || typeof location !== 'object') return false;
            const loc = location as Record<string, unknown>;

            // Validate location has a name and is in Middle-earth
            return typeof loc.name === 'string' && loc.name.length > 0;
        },

        async validateTimeline(timeline: unknown): Promise<boolean> {
            if (!timeline || typeof timeline !== 'object') return false;
            const tl = timeline as Record<string, unknown>;

            // Validate age-based timeline
            if (tl.age && !['First', 'Second', 'Third', 'Fourth'].includes(tl.age as string)) {
                return false;
            }

            return typeof tl.name === 'string' && tl.name.length > 0;
        },

        async validateStory(story: unknown): Promise<boolean> {
            if (!story || typeof story !== 'object') return false;
            const st = story as Record<string, unknown>;

            // Basic story validation
            return typeof st.title === 'string' && st.title.length > 0;
        }
    };    // Required UI components
    get ui(): UniverseUIComponents {
        return {
            CharacterForm: { name: 'MiddleEarthCharacterForm' },
            LocationForm: { name: 'MiddleEarthLocationForm' },
            TimelineView: { name: 'MiddleEarthTimelineView' },
            ThemeProvider: { name: 'MiddleEarthThemeProvider' }
        };
    }

    // Required AI prompts
    get ai(): UniverseAIPrompts {
        const age = this.config.settings.currentAge; const prompts: UniverseAIPrompts = {
            characterCreation: [
                'Create characters with clear moral alignment and personal growth arcs',
                'Consider the character\'s race and how it affects their perspective and abilities',
                'Focus on themes of courage, friendship, and sacrifice',
                'Remember that power corrupts - show the temptation and resistance to evil'
            ],
            worldBuilding: [
                'Draw from the rich geography and history of Middle-earth',
                'Consider the different ages and how they affect the world',
                'Include the influence of the Valar and the Music of Creation',
                'Show the decline of magic and the rise of the Age of Men'
            ],
            storyGeneration: [
                'Focus on journeys - both physical and spiritual transformation',
                'Include themes of hope in the face of overwhelming darkness',
                'Show the power of small acts of kindness and courage',
                'Remember that victory often comes with sacrifice'
            ],
            consistency: [
                'Maintain consistency with Tolkien\'s established timeline and geography',
                'Respect the moral framework of clear good vs evil',
                'Keep magic subtle and mysterious, not flashy',
                'Honor the themes of decline, sacrifice, and the passing of ages'
            ]
        };

        // Add age-specific prompts
        switch (age) {
            case 'First':
                prompts.storyGeneration.push(
                    'Setting: First Age. Epic battles against Morgoth, Elven kingdoms at their height.'
                );
                break;
            case 'Second':
                prompts.storyGeneration.push(
                    'Setting: Second Age. Rise and fall of Númenor, forging of the Rings of Power.'
                );
                break;
            case 'Third':
                prompts.storyGeneration.push(
                    'Setting: Third Age. The time of LOTR, decline of great powers, rise of Men.'
                );
                break;
            case 'Fourth':
                prompts.storyGeneration.push(
                    'Setting: Fourth Age. Age of Men begins, magic fades, new adventures.'
                );
                break;
        }

        return prompts;
    }

    // No theme configuration needed as specified
    getThemeConfig(): Record<string, unknown> {
        return {
            message: 'LOTR plugin does not require themes - uses default application styling',
            philosophy: 'Natural, timeless design that doesn\'t distract from storytelling',
            recommendation: 'Use clean, readable fonts and earth-tone colors'
        };
    }

    /**
     * LOTR-specific utility methods
     */

    /**
     * Calculate Middle-earth journey time and requirements
     */
    public calculateJourney(
        distance: number,
        travelMethod: 'walking' | 'riding' | 'sailing' | 'eagle',
        terrain: 'easy' | 'moderate' | 'difficult' | 'treacherous',
        fellowshipSize: number = 1
    ) {
        const age = this.middleEarthCalculator.convertMiddleEarthAge(
            this.config.settings.yearInAge,
            this.config.settings.currentAge as 'First' | 'Second' | 'Third' | 'Fourth'
        );

        return this.middleEarthCalculator.calculateJourney(
            distance,
            travelMethod,
            terrain,
            fellowshipSize,
            age
        );
    }

    /**
     * Convert between Ages of Middle-earth
     */
    public convertAge(
        years: number,
        age: 'First' | 'Second' | 'Third' | 'Fourth'
    ) {
        return this.middleEarthCalculator.convertMiddleEarthAge(years, age);
    }

    /**
     * Get famous Middle-earth routes
     */
    public getMiddleEarthRoutes() {
        return this.middleEarthCalculator.getMiddleEarthRoutes();
    }

    /**
     * Calculate the One Ring's influence on a journey
     */
    public calculateRingInfluence(hasRing: boolean, daysTraveling: number) {
        return this.middleEarthCalculator.calculateRingInfluence(hasRing, daysTraveling);
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
                currentAge: subUniverse.defaultAge,
                enableMagic: subUniverse.magicSystem !== 'none',
                moralComplexity: subUniverse.moralSystem
            }
        };
    }
}

// Export the plugin class
export { LOTRUniversePlugin };
