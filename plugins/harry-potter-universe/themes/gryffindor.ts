/**
 * Gryffindor House Theme
 * Brave, bold, and daring with scarlet and gold
 */

export interface GryffindorTheme {
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

export const gryffindorTheme: GryffindorTheme = {
    name: 'Gryffindor',
    description: 'Bold and daring theme for the house of the brave',
    house: 'gryffindor',
    colors: {
        primary: '#740001', // Deep scarlet red
        secondary: '#D3A625', // Rich gold
        background: '#2D0000', // Very dark red
        surface: '#4A0000', // Dark scarlet
        text: '#FFD700', // Bright gold
        accent: '#FF6B35' // Bright orange-red
    },
    traits: ['Courage', 'Bravery', 'Nerve', 'Chivalry', 'Determination'],
    commonRoom: 'Gryffindor Tower with its cozy fireplace and crimson hangings'
};

export default gryffindorTheme;
