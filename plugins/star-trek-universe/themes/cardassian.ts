/**
 * Cardassian Theme for Star Trek Universe Plugin
 * Military-authoritarian styling reflecting Cardassian society
 */

export const CardassianTheme = {
    name: 'Cardassian Military',
    version: '1.0.0',
    description: 'Authoritarian military interface inspired by Cardassian Union',

    colors: {
        // Primary Cardassian Colors (Military Gray/Blue)
        primary: '#4a5568',        // Cardassian Gray
        secondary: '#2d3748',      // Dark Gray
        accent: '#5a67d8',         // Military Blue

        // Background Colors
        background: '#1a1a1a',     // Dark Background
        surface: '#2d3748',        // Gray Surface
        text: '#e2e8f0',           // Light Gray Text

        // Status Colors
        success: '#38a169',        // Military Green
        warning: '#d69e2e',        // Warning Gold
        error: '#cd3030',          // Alert Red
        info: '#3182ce',           // Information Blue

        // Cardassian Specific Colors
        militaryGray: '#4a5568',   // Standard Military Gray
        authoritarianBlue: '#5a67d8', // Authority Blue
        surveillanceGreen: '#38a169', // Surveillance Systems
        orderRed: '#cd3030',       // Order Enforcement
        disciplineGold: '#d69e2e', // Discipline/Hierarchy
        strategyPurple: '#805ad5', // Strategic Planning
    },

    fonts: {
        primary: '"Cardassian Military", "Roboto Condensed", "Arial", sans-serif',
        secondary: '"Authority", "Roboto", "Helvetica", sans-serif',
        mono: '"Roboto Mono", "Courier New", monospace',
    },

    layout: {
        borderRadius: '4px',       // Sharp, military edges
        cornerRadius: '6px',
        padding: '1rem',
        margin: '0.5rem',

        // Cardassian specific measurements
        militaryBarHeight: '32px',
        authorityBorderWidth: '2px',
        hierarchySpacing: '1rem',
    },

    components: {
        // Button styling
        button: {
            borderRadius: '4px',
            padding: '10px 20px',
            fontWeight: '600',
            border: '1px solid #4a5568',
            background: 'linear-gradient(135deg, #4a5568, #2d3748)',
            color: '#e2e8f0',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        },

        // Card styling
        card: {
            borderRadius: '6px',
            background: 'linear-gradient(145deg, #2d3748, #1a202c)',
            border: '1px solid #4a5568',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.6)',
            padding: '1.25rem',
        },

        // Input styling
        input: {
            borderRadius: '4px',
            border: '1px solid #4a5568',
            background: '#1a1a1a',
            color: '#e2e8f0',
            padding: '8px 12px',
            fontSize: '0.95rem',
            fontFamily: 'monospace',
        },

        // Navigation styling
        nav: {
            background: 'linear-gradient(90deg, #1a1a1a, #2d3748)',
            borderBottom: '2px solid #4a5568',
            height: '55px',
        },

        // Table styling (for military data)
        table: {
            border: '1px solid #4a5568',
            borderCollapse: 'collapse',
            background: '#1a1a1a',
        },
    },

    animations: {
        // Military scan effect
        militaryScan: {
            animation: 'militaryScan 3s linear infinite',
            keyframes: `
                @keyframes militaryScan {
                    0% { background-position: -100% center; }
                    100% { background-position: 100% center; }
                }
            `,
        },

        // Authority pulse
        authorityPulse: {
            animation: 'authorityPulse 2s ease-in-out infinite',
            keyframes: `
                @keyframes authorityPulse {
                    0%, 100% { box-shadow: 0 0 5px rgba(90, 103, 216, 0.3); }
                    50% { box-shadow: 0 0 15px rgba(90, 103, 216, 0.6); }
                }
            `,
        },
    },

    customProperties: {
        // Military-specific features
        showHierarchyIndicators: true,
        enableSurveillanceMode: true,
        militaryProtocols: true,
        authoritarianLayout: true,

        // Cardassian cultural elements
        orderAndDiscipline: true,
        surveillanceState: true,
        militaryHierarchy: true,
        strategicPlanning: true,
    },

    // Theme-specific CSS custom properties
    cssVariables: {
        '--cardassian-gray': '#4a5568',
        '--cardassian-dark': '#2d3748',
        '--cardassian-blue': '#5a67d8',
        '--cardassian-background': '#1a1a1a',
        '--cardassian-surface': '#2d3748',
        '--cardassian-text': '#e2e8f0',
        '--cardassian-green': '#38a169',
        '--cardassian-gold': '#d69e2e',
        '--cardassian-red': '#cd3030',
        '--cardassian-purple': '#805ad5',
    },
};

export default CardassianTheme;
