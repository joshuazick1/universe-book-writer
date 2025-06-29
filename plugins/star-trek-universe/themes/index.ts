/**
 * Star Trek Universe Plugin Themes
 * Collection of faction-specific themes for the Star Trek universe
 */

import { LCARSTheme } from './lcars.js';
import { FerengiTheme } from './ferengi.js';
import { CardassianTheme } from './cardassian.js';
import { KlingonTheme } from './klingon.js';
import { RomulanTheme } from './romulan.js';

// Export all themes
export {
    LCARSTheme,
    FerengiTheme,
    CardassianTheme,
    KlingonTheme,
    RomulanTheme,
};

// Theme collection for easy access
export const StarTrekThemes = {
    lcars: LCARSTheme,
    ferengi: FerengiTheme,
    cardassian: CardassianTheme,
    klingon: KlingonTheme,
    romulan: RomulanTheme,
};

// Theme metadata for UI selection
export const ThemeMetadata = [
    {
        id: 'lcars',
        name: 'LCARS (Federation)',
        description: 'Library Computer Access/Retrieval System - Clean Federation interface',
        faction: 'Federation',
        colors: ['#ff9900', '#9999ff', '#000000'],
        characteristics: ['Technical', 'Clean', 'Organized'],
        theme: LCARSTheme,
    },
    {
        id: 'ferengi',
        name: 'Ferengi Commerce',
        description: 'Golden commerce-themed interface for profit-focused operations',
        faction: 'Ferengi Alliance',
        colors: ['#ffd700', '#b8860b', '#2f1b14'],
        characteristics: ['Luxurious', 'Commerce', 'Profitable'],
        theme: FerengiTheme,
    },
    {
        id: 'cardassian',
        name: 'Cardassian Military',
        description: 'Authoritarian military interface emphasizing order and discipline',
        faction: 'Cardassian Union',
        colors: ['#4a5568', '#2d3748', '#5a67d8'],
        characteristics: ['Military', 'Authoritarian', 'Structured'],
        theme: CardassianTheme,
    },
    {
        id: 'klingon',
        name: 'Klingon Warrior',
        description: 'Honor-based warrior interface celebrating battle and glory',
        faction: 'Klingon Empire',
        colors: ['#8b0000', '#daa520', '#0d0d0d'],
        characteristics: ['Warrior', 'Honor', 'Battle'],
        theme: KlingonTheme,
    },
    {
        id: 'romulan',
        name: 'Romulan Empire',
        description: 'Secretive intelligence interface for covert operations',
        faction: 'Romulan Star Empire',
        colors: ['#006400', '#32cd32', '#0a0a0a'],
        characteristics: ['Secretive', 'Intelligence', 'Subtle'],
        theme: RomulanTheme,
    },
];

// Default theme
export const DEFAULT_THEME = LCARSTheme;

// Theme utilities
export const getThemeById = (themeId: string) => {
    return StarTrekThemes[themeId as keyof typeof StarTrekThemes] || DEFAULT_THEME;
};

export const getThemeMetadata = (themeId: string) => {
    return ThemeMetadata.find(theme => theme.id === themeId);
};

export const getAllThemeIds = () => {
    return Object.keys(StarTrekThemes);
};

export const getThemesByFaction = (faction: string) => {
    return ThemeMetadata.filter(theme =>
        theme.faction.toLowerCase().includes(faction.toLowerCase())
    );
};

export default StarTrekThemes;
