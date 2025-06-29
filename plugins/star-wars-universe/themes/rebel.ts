/**
 * Rebel Alliance Theme for Star Wars Universe Plugin
 * Hopeful, organic, resistance-focused interface styling
 */

export const RebelTheme = {
    name: 'Rebel',
    version: '1.0.0',
    description: 'Rebel Alliance interface theme with organic, hopeful aesthetics',

    colors: {
        // Primary Rebel Colors
        primary: '#ff6600',           // Rebel Orange
        secondary: '#0066cc',         // Rebel Blue
        accent: '#00aa00',            // Rebel Green

        // Background Colors
        background: '#1a1a1a',        // Dark but warmer than Imperial
        surface: '#2a2a2a',           // Warmer surface
        text: '#ffffff',              // White Text

        // Status Colors
        success: '#00cc00',           // Bright Green
        warning: '#ffcc00',           // Bright Yellow
        error: '#ff3300',             // Bright Red
        info: '#0099ff',              // Bright Blue

        // Rebel Specific Colors
        rebelOrange: '#ff6600',
        rebelBlue: '#0066cc',
        rebelGreen: '#00aa00',
        rebelYellow: '#ffcc00',
        rebelRed: '#ff3300',
        rebelWhite: '#ffffff',

        // Alliance Colors
        freedom: '#00cc00',           // Green for freedom
        hope: '#ffcc00',              // Yellow for hope
        courage: '#ff6600',           // Orange for courage
        unity: '#0066cc',             // Blue for unity
        resistance: '#cc3300',        // Red for resistance
    },

    fonts: {
        primary: '"Open Sans", "Helvetica", "Arial", sans-serif',
        secondary: '"Roboto", "Arial", sans-serif',
        mono: '"Consolas", "Monaco", "Courier New", monospace',
        display: '"Exo 2", "Orbitron", "Arial", sans-serif',
    },

    layout: {
        borderRadius: '8px',          // Softer, more organic edges
        cornerRadius: '8px',
        padding: '1rem',
        margin: '0.5rem',

        // Rebel specific measurements
        panelHeight: '45px',
        borderWidth: '1px',
        organicSpacing: '8px',
        communityIndent: '12px',
    },

    animations: {
        transition: '0.3s ease-in-out',
        hover: '0.2s ease',
        active: '0.15s ease',

        // Rebel specific animations
        emergence: '0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',  // Organic emergence
        pulse: '2s ease-in-out infinite',
        inspiration: '1s ease-in-out infinite alternate',
    },

    effects: {
        glow: '0 0 20px #ff6600',
        innerGlow: 'inset 0 0 10px rgba(255, 102, 0, 0.2)',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        textShadow: '0 0 4px #ff6600',
        organicShadow: '0 6px 20px rgba(255, 102, 0, 0.3)',
    },

    // Component-specific styling
    components: {
        button: {
            background: 'linear-gradient(135deg, #ff6600, #ff8800)',
            border: '1px solid #ff6600',
            borderRadius: '8px',
            color: '#ffffff',
            fontFamily: 'var(--font-primary)',
            fontWeight: '600',
            padding: '0.75rem 1.5rem',
            textTransform: 'capitalize',
            boxShadow: 'var(--organic-shadow)',
            letterSpacing: '0.5px',
        },

        panel: {
            background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
            border: '1px solid #444444',
            borderRadius: '8px',
            boxShadow: 'var(--inner-glow), var(--shadow)',
        },

        header: {
            background: 'linear-gradient(135deg, #ff6600, #0066cc)',
            color: '#ffffff',
            padding: '1rem',
            fontFamily: 'var(--font-display)',
            fontWeight: '600',
            borderRadius: '8px 8px 0 0',
            letterSpacing: '1px',
        },

        rankBadge: {
            background: 'var(--courage)',
            color: '#ffffff',
            padding: '0.25rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            borderRadius: '12px',
            letterSpacing: '0.5px',
        },

        commandInterface: {
            background: '#1a1a1a',
            border: '1px solid #444444',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono)',
            color: '#00cc00',
            padding: '1rem',
        },

        alert: {
            background: 'linear-gradient(135deg, #ff3300, #ff6600)',
            color: '#ffffff',
            border: '1px solid #ff3300',
            borderRadius: '8px',
            fontWeight: '600',
            animation: 'var(--inspiration)',
        },

        inspirationalQuote: {
            background: 'rgba(255, 102, 0, 0.1)',
            border: '1px solid #ff6600',
            borderRadius: '8px',
            color: '#ffffff',
            fontStyle: 'italic',
            padding: '1rem',
            textAlign: 'center',
        },
    },

    // Rebel-specific UI patterns
    patterns: {
        organicSpacing: 'var(--organic-spacing)',
        communityGrid: '8px',
        allianceStructure: {
            leadership: { color: '#ff6600', weight: '600' },
            general: { color: '#0066cc', weight: '600' },
            commander: { color: '#00aa00', weight: '600' },
            captain: { color: '#ffcc00', weight: 'normal' },
            lieutenant: { color: '#ff8800', weight: 'normal' },
            pilot: { color: '#00cccc', weight: 'normal' },
            volunteer: { color: '#cccccc', weight: 'normal' },
        },
    },

    // Rebel iconography and symbols
    symbols: {
        alliance: '⭐',     // Alliance symbol
        starbird: '🕊',     // Rebel starbird (simplified)
        squadron: '✈',     // Squadron symbol
        base: '🏠',        // Base symbol
        mission: '🎯',     // Mission symbol
        hope: '💫',        // Hope symbol
        freedom: '🗽',     // Freedom symbol
    },

    // Inspirational elements
    inspiration: {
        quotes: [
            "Hope is like the sun. If you only believe in it when you can see it, you'll never make it through the night.",
            "The strength to resist and the wisdom to know when to fight.",
            "Sometimes we must let go of our pride and do what is requested of us.",
            "In my experience, there's no such thing as luck.",
            "The Force will be with you. Always.",
        ],
        values: [
            'Freedom',
            'Hope',
            'Unity',
            'Courage',
            'Sacrifice',
            'Resistance',
            'Democracy',
            'Justice',
        ],
    },

    // Rebel-specific interaction patterns
    interactions: {
        community: {
            sharing: 'encourage collaborative editing',
            support: 'provide helpful suggestions',
            inclusion: 'welcome all skill levels',
            democracy: 'consensus-based decision making',
        },
        resistance: {
            persistence: 'never give up on difficult tasks',
            adaptation: 'flexible approaches to problems',
            resourcefulness: 'make the most of available tools',
            solidarity: 'support other users and creators',
        },
    },
};

export default RebelTheme;
