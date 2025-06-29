/**
 * Ferengi Theme for Star Trek Universe Plugin
 * Commerce-focused golden styling reflecting Ferengi values
 */

export const FerengiTheme = {
    name: 'Ferengi Commerce',
    version: '1.0.0',
    description: 'Golden commerce-themed interface inspired by Ferengi aesthetic',

    colors: {
        // Primary Ferengi Colors (Gold/Commerce theme)
        primary: '#ffd700',        // Pure Gold
        secondary: '#b8860b',      // Dark Goldenrod
        accent: '#ffed4e',         // Light Gold

        // Background Colors
        background: '#2f1b14',     // Dark Brown
        surface: '#5d4037',        // Medium Brown
        text: '#ffd700',           // Gold Text

        // Status Colors
        success: '#4caf50',        // Profit Green
        warning: '#ff9800',        // Warning Orange
        error: '#f44336',          // Loss Red
        info: '#03a9f4',           // Info Blue

        // Ferengi Specific Colors
        latinum: '#ffd700',        // Gold Pressed Latinum
        profit: '#4caf50',         // Profit Green
        loss: '#f44336',           // Loss Red
        neutral: '#795548',        // Brown Neutral
        luxury: '#e91e63',         // Luxury Pink
        trade: '#ff9800',          // Trade Orange
    },

    fonts: {
        primary: '"Ferengi Trade", "Georgia", "Times New Roman", serif',
        secondary: '"Commerce", "Palatino", "Times", serif',
        mono: '"Courier New", "Monaco", monospace',
    },

    layout: {
        borderRadius: '8px',
        cornerRadius: '12px',
        padding: '1.2rem',
        margin: '0.8rem',

        // Ferengi specific measurements
        commerceBarHeight: '35px',
        profitIndicatorWidth: '4px',
        luxurySpacing: '1.5rem',
    },

    components: {
        // Button styling
        button: {
            borderRadius: '8px',
            padding: '12px 24px',
            fontWeight: 'bold',
            border: '2px solid #ffd700',
            background: 'linear-gradient(135deg, #ffd700, #b8860b)',
            color: '#2f1b14',
            boxShadow: '0 4px 8px rgba(255, 215, 0, 0.3)',
        },

        // Card styling
        card: {
            borderRadius: '12px',
            background: 'linear-gradient(145deg, #5d4037, #4a2c20)',
            border: '1px solid #ffd700',
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4)',
            padding: '1.5rem',
        },

        // Input styling
        input: {
            borderRadius: '6px',
            border: '2px solid #b8860b',
            background: '#2f1b14',
            color: '#ffd700',
            padding: '10px 15px',
            fontSize: '1rem',
        },

        // Navigation styling
        nav: {
            background: 'linear-gradient(90deg, #2f1b14, #5d4037)',
            borderBottom: '3px solid #ffd700',
            height: '60px',
        },
    },

    animations: {
        // Gold shimmer effect
        goldShimmer: {
            animation: 'goldShimmer 2s ease-in-out infinite',
            keyframes: `
                @keyframes goldShimmer {
                    0%, 100% { background-position: -200% center; }
                    50% { background-position: 200% center; }
                }
            `,
        },

        // Profit counter animation
        profitCount: {
            animation: 'profitCount 0.5s ease-out',
            keyframes: `
                @keyframes profitCount {
                    0% { transform: scale(1); color: #ffd700; }
                    50% { transform: scale(1.2); color: #4caf50; }
                    100% { transform: scale(1); color: #ffd700; }
                }
            `,
        },
    },

    customProperties: {
        // Commerce-specific features
        showProfitIndicators: true,
        enableGoldEffects: true,
        commerceMode: true,
        luxuryAccents: true,

        // Ferengi cultural elements
        rulesOfAcquisition: true,
        latinumCurrency: true,
        tradeNetworks: true,
    },

    // Theme-specific CSS custom properties
    cssVariables: {
        '--ferengi-gold': '#ffd700',
        '--ferengi-dark-gold': '#b8860b',
        '--ferengi-brown': '#2f1b14',
        '--ferengi-surface': '#5d4037',
        '--ferengi-profit': '#4caf50',
        '--ferengi-loss': '#f44336',
        '--ferengi-luxury': '#e91e63',
        '--ferengi-trade': '#ff9800',
    },
};

export default FerengiTheme;
