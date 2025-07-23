/**
 * Imperial Theme for Star Wars Universe Plugin
 * Dark, authoritarian, military-focused interface styling
 */

export const ImperialTheme = {
    name: 'Imperial',
    version: '1.0.0',
    description: 'Imperial Galactic Empire interface theme with dark military aesthetics',

    colors: {
        // Primary Imperial Colors
        primary: '#cc0000',           // Imperial Red
        secondary: '#333333',         // Dark Gray
        accent: '#666666',            // Medium Gray

        // Background Colors
        background: '#0a0a0a',        // Near Black
        surface: '#1a1a1a',           // Dark Surface
        text: '#ffffff',              // White Text

        // Status Colors
        success: '#00aa00',           // Imperial Green
        warning: '#ffaa00',           // Imperial Orange
        error: '#ff0000',             // Bright Red
        info: '#0066cc',              // Imperial Blue

        // Imperial Specific Colors
        imperialRed: '#cc0000',
        imperialGray: '#333333',
        imperialBlue: '#0066cc',
        imperialGreen: '#00aa00',
        imperialWhite: '#ffffff',
        imperialBlack: '#000000',

        // Rank Colors
        officer: '#cc0000',           // Red for officers
        trooper: '#666666',           // Gray for troopers
        admiral: '#ffaa00',           // Gold for admirals
        moff: '#aa00aa',              // Purple for Moffs
    },

    fonts: {
        primary: '"Orbitron", "Arial Black", "Arial", sans-serif',
        secondary: '"Roboto Condensed", "Arial Narrow", "Arial", sans-serif',
        mono: '"Courier New", "Monaco", monospace',
        military: '"Stencil", "Impact", "Arial Black", sans-serif',
    },

    layout: {
        borderRadius: '2px',          // Sharp, angular edges
        cornerRadius: '2px',
        padding: '0.75rem',
        margin: '0.25rem',

        // Imperial specific measurements
        panelHeight: '50px',
        borderWidth: '2px',
        militarySpacing: '4px',
        hierarchicalIndent: '16px',
    },

    animations: {
        transition: '0.2s ease-in-out',  // Sharp, quick transitions
        hover: '0.15s ease',
        active: '0.1s ease',

        // Imperial specific animations
        deployment: '0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',  // Military precision
        scanning: '1.5s linear infinite',
        alert: '0.5s ease-in-out infinite alternate',
    },

    effects: {
        glow: '0 0 15px #cc0000',
        innerGlow: 'inset 0 0 8px rgba(204, 0, 0, 0.3)',
        shadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
        textShadow: '0 0 3px #cc0000',
        militaryShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
    },

    // Component-specific styling
    components: {
        button: {
            background: 'linear-gradient(45deg, #cc0000, #aa0000)',
            border: '2px solid #cc0000',
            borderRadius: '2px',
            color: '#ffffff',
            fontFamily: 'var(--font-primary)',
            fontWeight: 'bold',
            padding: '0.75rem 1.5rem',
            textTransform: 'uppercase',
            boxShadow: 'var(--military-shadow)',
            letterSpacing: '1px',
        },

        panel: {
            background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
            border: '2px solid #333333',
            borderRadius: '2px',
            boxShadow: 'var(--inner-glow), var(--shadow)',
        },

        header: {
            background: 'linear-gradient(90deg, #cc0000, #aa0000)',
            color: '#ffffff',
            padding: '1rem',
            fontFamily: 'var(--font-military)',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '2px',
        },

        rankBadge: {
            background: 'var(--officer)',
            color: '#ffffff',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px',
        },

        commandInterface: {
            background: '#0a0a0a',
            border: '1px solid #333333',
            fontFamily: 'var(--font-mono)',
            color: '#00aa00',
            padding: '1rem',
        },

        alert: {
            background: 'linear-gradient(45deg, #ff0000, #cc0000)',
            color: '#ffffff',
            border: '2px solid #ff0000',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            animation: 'var(--alert)',
        },
    },

    // Imperial-specific UI patterns
    patterns: {
        hierarchicalIndent: 'var(--hierarchical-indent)',
        militaryGrid: '4px',
        commandStructure: {
            emperor: { color: '#ffaa00', weight: 'bold' },
            vader: { color: '#aa0000', weight: 'bold' },
            moff: { color: '#aa00aa', weight: 'bold' },
            admiral: { color: '#0066cc', weight: 'bold' },
            captain: { color: '#cc0000', weight: 'normal' },
            lieutenant: { color: '#666666', weight: 'normal' },
            trooper: { color: '#999999', weight: 'normal' },
        },
    },

    // Imperial iconography and symbols
    symbols: {
        imperial: '⚫',  // Imperial Crest placeholder
        rank: '▲',      // Rank indicator
        fleet: '◆',     // Fleet symbol
        planet: '●',    // Planetary control
        sector: '■',    // Sector control
        alert: '⚠',     // Alert symbol
    },
};

export default ImperialTheme;
