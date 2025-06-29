/**
 * Romulan Theme for Star Trek Universe Plugin
 * Secretive intelligence-focused styling reflecting Romulan Star Empire
 */

export const RomulanTheme = {
    name: 'Romulan Empire',
    version: '1.0.0',
    description: 'Secretive intelligence interface inspired by Romulan Star Empire',

    colors: {
        // Primary Romulan Colors (Green/Dark)
        primary: '#006400',        // Dark Green
        secondary: '#1c1c1c',      // Almost Black
        accent: '#32cd32',         // Lime Green

        // Background Colors
        background: '#0a0a0a',     // Deep Black
        surface: '#1c1c1c',        // Dark Gray
        text: '#98fb98',           // Pale Green

        // Status Colors
        success: '#228b22',        // Forest Green
        warning: '#ffd700',        // Gold Warning
        error: '#b22222',          // Fire Brick
        info: '#4682b4',           // Steel Blue

        // Romulan Specific Colors
        empireGreen: '#006400',    // Empire Green
        secretGreen: '#32cd32',    // Secret Intelligence
        shadowBlack: '#0a0a0a',    // Shadow Operations
        spyGray: '#1c1c1c',        // Spy Network Gray
        cloakBlue: '#4682b4',      // Cloaking Device Blue
        senateGold: '#ffd700',     // Senate Gold
    },

    fonts: {
        primary: '"Romulan", "Libre Baskerville", "Times New Roman", serif',
        secondary: '"Intelligence", "Source Sans Pro", "Arial", sans-serif',
        mono: '"Source Code Pro", "Consolas", monospace',
    },

    layout: {
        borderRadius: '6px',
        cornerRadius: '8px',
        padding: '1.1rem',
        margin: '0.6rem',

        // Romulan specific measurements
        intelligenceBarHeight: '34px',
        secretBorderWidth: '1px',
        cloakSpacing: '1.1rem',
    },

    components: {
        // Button styling
        button: {
            borderRadius: '6px',
            padding: '11px 22px',
            fontWeight: '500',
            border: '1px solid #006400',
            background: 'linear-gradient(135deg, #006400, #1c1c1c)',
            color: '#98fb98',
            boxShadow: '0 2px 8px rgba(0, 100, 0, 0.3)',
            transition: 'all 0.3s ease',
            letterSpacing: '0.3px',
        },

        // Card styling
        card: {
            borderRadius: '8px',
            background: 'linear-gradient(145deg, #1c1c1c, #0a0a0a)',
            border: '1px solid #006400',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
            padding: '1.4rem',
            position: 'relative',
            overflow: 'hidden',
        },

        // Input styling
        input: {
            borderRadius: '6px',
            border: '1px solid #006400',
            background: '#0a0a0a',
            color: '#98fb98',
            padding: '10px 14px',
            fontSize: '0.95rem',
            fontFamily: '"Source Code Pro", monospace',
        },

        // Navigation styling
        nav: {
            background: 'linear-gradient(90deg, #0a0a0a, #1c1c1c)',
            borderBottom: '1px solid #006400',
            height: '58px',
            boxShadow: '0 1px 4px rgba(0, 100, 0, 0.4)',
        },

        // Intelligence panel styling
        panel: {
            background: 'rgba(0, 100, 0, 0.1)',
            border: '1px solid #006400',
            borderRadius: '8px',
            padding: '1rem',
            backdropFilter: 'blur(5px)',
        },
    },

    animations: {
        // Cloak effect
        cloakShimmer: {
            animation: 'cloakShimmer 4s ease-in-out infinite',
            keyframes: `
                @keyframes cloakShimmer {
                    0%, 100% { opacity: 0.8; }
                    25% { opacity: 0.6; }
                    50% { opacity: 0.9; }
                    75% { opacity: 0.7; }
                }
            `,
        },

        // Intelligence scan
        intelligenceScan: {
            animation: 'intelligenceScan 3s linear infinite',
            keyframes: `
                @keyframes intelligenceScan {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
            `,
        },

        // Secret pulse
        secretPulse: {
            animation: 'secretPulse 2s ease-in-out infinite',
            keyframes: `
                @keyframes secretPulse {
                    0%, 100% { box-shadow: 0 0 5px rgba(0, 100, 0, 0.2); }
                    50% { box-shadow: 0 0 20px rgba(0, 100, 0, 0.5); }
                }
            `,
        },
    },

    customProperties: {
        // Intelligence-specific features
        showCloakEffects: true,
        enableSecretMode: true,
        intelligenceOperations: true,
        cloakingTechnology: true,

        // Romulan cultural elements
        secretIntelligence: true,
        senateAuthority: true,
        cloakingDevices: true,
        subterfugeProtocols: true,
        empireSecrecy: true,
    },

    // Theme-specific CSS custom properties
    cssVariables: {
        '--romulan-green': '#006400',
        '--romulan-light-green': '#32cd32',
        '--romulan-pale-green': '#98fb98',
        '--romulan-black': '#0a0a0a',
        '--romulan-gray': '#1c1c1c',
        '--romulan-blue': '#4682b4',
        '--romulan-gold': '#ffd700',
        '--romulan-forest': '#228b22',
        '--romulan-fire': '#b22222',
    },
};

export default RomulanTheme;
