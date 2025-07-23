/**
 * Hufflepuff House Theme
 * Loyal, patient, and kind with yellow and black
 */

export interface HufflepuffTheme {
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

export const hufflepuffTheme: HufflepuffTheme = {
    name: 'Hufflepuff',
    description: 'Warm and welcoming theme for the house of the loyal',
    house: 'hufflepuff',
    colors: {
        primary: '#FFD800', // Bright yellow
        secondary: '#000000', // Pure black
        background: '#332200', // Dark golden brown
        surface: '#4D3300', // Medium golden brown
        text: '#000000', // Black text on yellow
        accent: '#FF8C00' // Dark orange
    },
    traits: ['Loyalty', 'Patience', 'Hard Work', 'Dedication', 'Kindness'],
    commonRoom: 'Hufflepuff basement with its cozy circular windows and earthy tones'
};

export default hufflepuffTheme;
