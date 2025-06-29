/**
 * Ravenclaw House Theme
 * Intelligent, wise, and creative with blue and bronze
 */

export interface RavenclawTheme {
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

export const ravenclawTheme: RavenclawTheme = {
    name: 'Ravenclaw',
    description: 'Elegant and intellectual theme for the house of the wise',
    house: 'ravenclaw',
    colors: {
        primary: '#0E1A40', // Deep navy blue
        secondary: '#946B2D', // Antique bronze
        background: '#001122', // Very dark blue
        surface: '#1A2B4C', // Dark blue-gray
        text: '#C0C0C0', // Silver text
        accent: '#4A90E2' // Bright blue
    },
    traits: ['Intelligence', 'Wisdom', 'Learning', 'Wit', 'Creativity'],
    commonRoom: 'Ravenclaw Tower with its soaring ceiling and eagle motifs'
};

export default ravenclawTheme;
