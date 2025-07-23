/**
 * Harry Potter Hogwarts Theme
 * Magical, warm, and academic atmosphere with house colors
 */

export interface HogwartsTheme {
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        accent: string;
        // House colors
        gryffindor: { primary: string; secondary: string };
        hufflepuff: { primary: string; secondary: string };
        ravenclaw: { primary: string; secondary: string };
        slytherin: { primary: string; secondary: string };
    };
    fonts: {
        heading: string;
        body: string;
        magical: string;
    };
    effects: {
        glow: string;
        shimmer: string;
        sparkle: string;
    };
}

export const hogwartsTheme: HogwartsTheme = {
    name: 'Hogwarts',
    description: 'Warm, magical theme inspired by Hogwarts School of Witchcraft and Wizardry',
    colors: {
        primary: '#8B4513', // Saddle brown - like old castle stone
        secondary: '#DAA520', // Goldenrod - like candlelight
        background: '#2F1B14', // Dark brown - like castle walls at night
        surface: '#4A2C2A', // Dark reddish brown - like wooden panels
        text: '#F5DEB3', // Wheat - like parchment
        accent: '#FFD700', // Gold - like magical sparkles
        gryffindor: {
            primary: '#740001', // Gryffindor red
            secondary: '#D3A625' // Gryffindor gold
        },
        hufflepuff: {
            primary: '#FFD800', // Hufflepuff yellow
            secondary: '#000000' // Hufflepuff black
        },
        ravenclaw: {
            primary: '#0E1A40', // Ravenclaw blue
            secondary: '#946B2D' // Ravenclaw bronze
        },
        slytherin: {
            primary: '#1A472A', // Slytherin green
            secondary: '#C0C0C0' // Slytherin silver
        }
    },
    fonts: {
        heading: 'Trajan Pro, serif', // Roman-inspired for formal headings
        body: 'Minion Pro, serif', // Readable serif for body text
        magical: 'Luminari, fantasy' // Decorative for magical elements
    },
    effects: {
        glow: 'box-shadow: 0 0 10px rgba(255, 215, 0, 0.5)',
        shimmer: 'background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
        sparkle: 'filter: drop-shadow(0 0 3px gold)'
    }
};

export default hogwartsTheme;
