/**
 * Star Wars Universe Plugin Frontend Components
 * Exports all UI components for the Star Wars plugin
 */

export { default as GalacticCitizenForm } from './GalacticCitizenForm.js';
export { default as PlanetarySystemRegistry } from './PlanetarySystemRegistry.js';

// Re-export types for external use
export type { StarWarsCharacter } from './GalacticCitizenForm.js';
export type { StarWarsSystem, StarWarsPlanet } from './PlanetarySystemRegistry.js';

// Component mapping for plugin system
export const StarWarsComponents = {
    CharacterForm: 'GalacticCitizenForm',
    LocationForm: 'PlanetarySystemRegistry',
    TimelineView: 'GalacticHistoryHolonet', // TODO: Implement
    ThemeProvider: 'ImperialThemeProvider',  // TODO: Implement
} as const;
