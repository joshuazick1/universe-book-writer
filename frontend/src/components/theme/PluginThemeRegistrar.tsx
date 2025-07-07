/**
 * Plugin Theme Registration - VerseForge
 * Registers plugin themes on application startup
 */

import React from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { useEffect } from 'react';

/* === PLUGIN THEME CONFIGURATIONS === */

export const PLUGIN_THEMES = {
    // Star Trek Plugin Themes
    lcars: {
        name: 'LCARS (Star Trek)',
        colors: {
            primary: '#ff9900',
            secondary: '#ff6600',
            accent: '#ffcc00',
            background: '#000000',
            surface: '#001122',
            text: '#ff9900',
        },
        fonts: {
            primary: 'Orbitron, monospace',
            secondary: 'Orbitron, monospace',
        },
        layout: {
            borderRadius: '0px',
            padding: '16px',
            margin: '8px',
        },
        animations: {
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            hover: 'transform: scale(1.02)',
            active: 'transform: scale(0.98)',
        },
    },

    // Star Wars Plugin Themes
    imperial: {
        name: 'Imperial (Star Wars)',
        colors: {
            primary: '#cc0000',
            secondary: '#800000',
            accent: '#ff0000',
            background: '#0a0a0a',
            surface: '#1a1a1a',
            text: '#e0e0e0',
        },
        fonts: {
            primary: 'Inter, sans-serif',
            secondary: 'Inter, sans-serif',
        },
        layout: {
            borderRadius: '4px',
            padding: '16px',
            margin: '8px',
        },
    },

    rebel: {
        name: 'Rebel Alliance (Star Wars)',
        colors: {
            primary: '#ff6600',
            secondary: '#cc5500',
            accent: '#ff8833',
            background: '#0d1117',
            surface: '#161b22',
            text: '#f0f6fc',
        },
        fonts: {
            primary: 'Inter, sans-serif',
            secondary: 'Inter, sans-serif',
        },
        layout: {
            borderRadius: '8px',
            padding: '16px',
            margin: '8px',
        },
    },

    // Harry Potter Plugin Themes
    gryffindor: {
        name: 'Gryffindor (Harry Potter)',
        colors: {
            primary: '#740001',
            secondary: '#d3a625',
            accent: '#eeba30',
            background: '#2d0000',
            surface: '#4a0000',
            text: '#ffd700',
        },
    },

    hufflepuff: {
        name: 'Hufflepuff (Harry Potter)',
        colors: {
            primary: '#ffdb00',
            secondary: '#000000',
            accent: '#fff200',
            background: '#2b2a00',
            surface: '#4d4600',
            text: '#000000',
        },
    },

    ravenclaw: {
        name: 'Ravenclaw (Harry Potter)',
        colors: {
            primary: '#0e1a40',
            secondary: '#946b2d',
            accent: '#5d9cec',
            background: '#0a1428',
            surface: '#1a2b47',
            text: '#c5c5c5',
        },
    },

    slytherin: {
        name: 'Slytherin (Harry Potter)',
        colors: {
            primary: '#1a472a',
            secondary: '#5d5d5d',
            accent: '#2a623d',
            background: '#0d1f0d',
            surface: '#1a3a1a',
            text: '#c0c0c0',
        },
    },
};

/* === PLUGIN THEME REGISTRAR COMPONENT === */

export const PluginThemeRegistrar: React.FC = () => {
    const { registerTheme } = useTheme();

    useEffect(() => {
        // Register all plugin themes on mount
        // The registerTheme function now checks if themes are already registered
        // and avoids unnecessary updates, preventing infinite loops
        Object.entries(PLUGIN_THEMES).forEach(([themeName, themeConfig]) => {
            registerTheme(themeName, themeConfig);
        });
    }, []); // Empty dependency array - only run once on mount

    // This component doesn't render anything - it just registers themes
    return null;
};

export default PluginThemeRegistrar;
