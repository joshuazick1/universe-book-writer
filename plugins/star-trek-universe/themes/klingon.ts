/**
 * Klingon Theme for Star Trek Universe Plugin
 * Warrior honor-based styling reflecting Klingon culture
 */

export const KlingonTheme = {
    name: 'Klingon Warrior',
    version: '1.0.0',
    description: 'Honor-based warrior interface inspired by Klingon Empire',

    colors: {
        // Primary Klingon Colors (Blood Red/Dark)
        primary: '#8b0000',        // Dark Red (Blood)
        secondary: '#2c1810',      // Dark Brown
        accent: '#cd853f',         // Bronze/Gold

        // Background Colors
        background: '#0d0d0d',     // Near Black
        surface: '#1a1a1a',        // Dark Surface
        text: '#daa520',           // Goldenrod Text

        // Status Colors
        success: '#228b22',        // Victory Green
        warning: '#ff8c00',        // Warning Orange
        error: '#dc143c',          // Battle Red
        info: '#4169e1',           // Honor Blue

        // Klingon Specific Colors
        bloodRed: '#8b0000',       // Warrior Blood
        honorGold: '#daa520',      // Honor Gold
        battleBronze: '#cd853f',   // Battle Bronze
        victoryGreen: '#228b22',   // Victory Color
        deathBlack: '#0d0d0d',     // Death/Dishonor
        gloryOrange: '#ff8c00',    // Glory Fire
    },

    fonts: {
        primary: '"Klingon", "Cinzel", "Times New Roman", serif',
        secondary: '"Warrior", "Crimson Text", "Georgia", serif',
        mono: '"Fira Code", "Courier New", monospace',
    },

    layout: {
        borderRadius: '0px',       // Sharp warrior edges
        cornerRadius: '2px',
        padding: '1.25rem',
        margin: '0.75rem',

        // Klingon specific measurements
        warriorBarHeight: '36px',
        honorBorderWidth: '3px',
        battleSpacing: '1.25rem',
    },

    components: {
        // Button styling
        button: {
            borderRadius: '2px',
            padding: '12px 24px',
            fontWeight: '700',
            border: '2px solid #8b0000',
            background: 'linear-gradient(135deg, #8b0000, #2c1810)',
            color: '#daa520',
            boxShadow: '0 3px 6px rgba(139, 0, 0, 0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: '"Cinzel", serif',
        },

        // Card styling
        card: {
            borderRadius: '4px',
            background: 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
            border: '2px solid #8b0000',
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.7)',
            padding: '1.5rem',
            position: 'relative',
        },

        // Input styling
        input: {
            borderRadius: '2px',
            border: '2px solid #8b0000',
            background: '#0d0d0d',
            color: '#daa520',
            padding: '12px 16px',
            fontSize: '1rem',
            fontWeight: '600',
        },

        // Navigation styling
        nav: {
            background: 'linear-gradient(90deg, #0d0d0d, #1a1a1a)',
            borderBottom: '3px solid #8b0000',
            height: '65px',
            boxShadow: '0 2px 8px rgba(139, 0, 0, 0.5)',
        },

        // Honor badge styling
        badge: {
            background: 'linear-gradient(45deg, #daa520, #cd853f)',
            color: '#0d0d0d',
            border: '1px solid #8b0000',
            borderRadius: '0px',
            padding: '4px 12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
        },
    },

    animations: {
        // Honor glow effect
        honorGlow: {
            animation: 'honorGlow 2.5s ease-in-out infinite',
            keyframes: `
                @keyframes honorGlow {
                    0%, 100% { box-shadow: 0 0 10px rgba(218, 165, 32, 0.3); }
                    50% { box-shadow: 0 0 25px rgba(218, 165, 32, 0.6); }
                }
            `,
        },

        // Battle pulse
        battlePulse: {
            animation: 'battlePulse 1.5s ease-in-out infinite',
            keyframes: `
                @keyframes battlePulse {
                    0%, 100% { border-color: #8b0000; }
                    50% { border-color: #dc143c; }
                }
            `,
        },

        // Victory flash
        victoryFlash: {
            animation: 'victoryFlash 0.3s ease-out',
            keyframes: `
                @keyframes victoryFlash {
                    0% { background-color: initial; }
                    50% { background-color: rgba(34, 139, 34, 0.3); }
                    100% { background-color: initial; }
                }
            `,
        },
    },

    customProperties: {
        // Warrior-specific features
        showHonorIndicators: true,
        enableBattleEffects: true,
        warriorMode: true,
        honorSystem: true,

        // Klingon cultural elements
        honorAndGlory: true,
        battleReadiness: true,
        warriorCode: true,
        houseAllegiance: true,
        deathBeforeDishonor: true,
    },

    // Theme-specific CSS custom properties
    cssVariables: {
        '--klingon-red': '#8b0000',
        '--klingon-dark': '#2c1810',
        '--klingon-gold': '#daa520',
        '--klingon-bronze': '#cd853f',
        '--klingon-background': '#0d0d0d',
        '--klingon-surface': '#1a1a1a',
        '--klingon-victory': '#228b22',
        '--klingon-battle': '#dc143c',
        '--klingon-glory': '#ff8c00',
        '--klingon-honor': '#4169e1',
    },
};

export default KlingonTheme;
