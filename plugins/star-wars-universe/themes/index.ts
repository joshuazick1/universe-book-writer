/**
 * Star Wars Universe Plugin Themes
 * Exports all themes contributed by the Star Wars plugin
 */

export { default as ImperialTheme } from './imperial.js';
export { default as RebelTheme } from './rebel.js';

// Theme mapping for plugin system
export const StarWarsThemes = {
    imperial: 'ImperialTheme',
    rebel: 'RebelTheme',
} as const;

// Theme metadata for registration
export const ThemeMetadata = {
    imperial: {
        name: 'Imperial',
        description: 'Dark, authoritarian, military-focused interface styling',
        category: 'dark',
        primaryColor: '#cc0000',
        author: 'Star Wars Universe Plugin',
    },
    rebel: {
        name: 'Rebel Alliance',
        description: 'Hopeful, organic, resistance-focused interface styling',
        category: 'balanced',
        primaryColor: '#ff6600',
        author: 'Star Wars Universe Plugin',
    },
} as const;
