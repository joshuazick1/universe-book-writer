/**
 * Slytherin House Theme
 * Ambitious, cunning, and resourceful with green and silver
 */

export interface SlytherinTheme {
    name: string;
    description: string;
    house: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        accent: string;
    };
    traits: string[];
    commonRoom: string;
}

export const slytherinTheme: SlytherinTheme = {
    name: 'Slytherin',
    description: 'Sophisticated and ambitious theme for the house of the cunning',
    house: 'slytherin',
    colors: {
        primary: '#1A472A', // Deep forest green
        secondary: '#C0C0C0', // Bright silver
        background: '#0D1F0D', // Very dark green
        surface: '#2D5A2D', // Medium dark green
        text: '#C0C0C0', // Silver text
        accent: '#50C878' // Emerald green
    },
    traits: ['Ambition', 'Cunning', 'Leadership', 'Resourcefulness', 'Determination'],
    commonRoom: 'Slytherin dungeon with its underwater windows and serpentine decorations'
};

export default slytherinTheme;
