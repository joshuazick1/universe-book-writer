/**
 * LCARS Theme for Star Trek Universe Plugin
 * Authentic Star Trek LCARS interface styling
 * Based on official LCARS design specifications from Star Trek productions
 * and authentic implementations from cb-lcars and ha-lcars projects
 */

export const LCARSTheme = {
    name: 'LCARS',
    version: '2.0.0',
    description: 'Library Computer Access/Retrieval System interface theme - Authentic Star Trek styling',

    colors: {
        // Primary LCARS Colors (Authentic Palette)
        primary: '#ff9900',           // LCARS Orange (Primary UI element)
        secondary: '#9999ff',         // LCARS Lavender Blue
        accent: '#ffcc99',            // LCARS Peach/Tan

        // Background Colors
        background: '#000000',        // True Black (LCARS Standard)
        surface: '#111111',           // Very Dark Gray (Panel backgrounds)
        surfaceVariant: '#222222',    // Slightly lighter panels
        text: '#ffffff',              // Pure White text
        textSecondary: '#cccccc',     // Dimmed text

        // Authentic LCARS Color Palette
        lcarsOrange: '#ff9900',       // Primary Orange (Tangerine)
        lcarsBlue: '#9999ff',         // Lavender Blue
        lcarsRed: '#cc6666',          // Red Alert/Warning
        lcarsRedBright: '#ff0000',    // Bright Red (Critical alerts)
        lcarsGreen: '#99cc99',        // Green (Systems normal)
        lcarsGreenBright: '#00ff00',  // Bright Green (Active systems)
        lcarsPurple: '#cc99cc',       // Purple/Magenta
        lcarsYellow: '#ffcc99',       // Peach/Tan/Yellow
        lcarsGold: '#ffcc00',         // Gold (Command division)
        lcarsCyan: '#99ccff',         // Light Blue/Cyan
        lcarsWhite: '#ffffff',        // Pure White
        lcarsGray: '#666666',         // Medium Gray
        lcarsGrayDark: '#333333',     // Dark Gray
        lcarsGrayLight: '#999999',    // Light Gray

        // Status Colors (LCARS Standard)
        success: '#99cc99',           // LCARS Green
        warning: '#ffcc00',           // LCARS Gold
        error: '#cc6666',             // LCARS Red
        info: '#99ccff',              // LCARS Cyan
        critical: '#ff0000',          // Bright Red
        active: '#00ff00',            // Bright Green
        inactive: '#666666',          // Gray
    }, fonts: {
        primary: '"Federation", "Orbitron", "SF Alien Encounters", "Courier New", monospace',
        secondary: '"LCARS", "Swiss 911 Ultra Compressed", "Arial Narrow", sans-serif',
        mono: '"Courier New", "SF Mono", "Monaco", monospace',
        display: '"Okuda", "Federation", "Orbitron", sans-serif',

        // Font weights for LCARS typography
        weights: {
            normal: '400',
            bold: '700',
            ultraCondensed: '100',
        },

        // Font sizes following LCARS hierarchy
        sizes: {
            small: '0.75rem',
            normal: '1rem',
            large: '1.25rem',
            display: '1.5rem',
            title: '2rem',
        },
    },

    layout: {
        borderRadius: '20px',
        cornerRadius: '20px',
        elbowRadius: '40px',           // LCARS signature elbow curves
        padding: '1rem',
        margin: '0.5rem',

        // LCARS specific measurements (based on authentic specifications)
        barHeight: '40px',
        barHeightSmall: '20px',
        barHeightLarge: '60px',
        panelSpacing: '8px',
        cornerSize: '20px',
        elbowSize: '80px',
        lozengeHeight: '30px',

        // Grid system for LCARS layouts
        gridUnit: '8px',
        columnWidth: '120px',
        gutterWidth: '16px',
    }, animations: {
        transition: '0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        hover: '0.2s ease-out',
        active: '0.1s ease-in',

        // LCARS specific animations (authentic timings)
        activation: '0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        scanning: '2s linear infinite',
        pulse: '1.5s ease-in-out infinite',
        blink: '1s step-end infinite',
        sweep: '3s linear infinite',

        // Animation delays for staggered effects
        delays: {
            short: '0.1s',
            medium: '0.3s',
            long: '0.6s',
        },

        // CSS keyframe definitions for LCARS effects
        keyframes: {
            sweep: `
                @keyframes lcars-sweep {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
            `,
            pulse: `
                @keyframes lcars-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `,
            blink: `
                @keyframes lcars-blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `,
            scanning: `
                @keyframes lcars-scanning {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(1); }
                    100% { transform: scaleX(0); }
                }
            `,
            activation: `
                @keyframes lcars-activation {
                    0% { 
                        opacity: 0; 
                        transform: translateY(20px); 
                        filter: blur(4px); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0); 
                        filter: blur(0); 
                    }
                }
            `,
        },
    },

    effects: {
        glow: '0 0 20px currentColor, 0 0 40px rgba(255, 153, 0, 0.3)',
        glowIntense: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
        innerGlow: 'inset 0 0 10px rgba(255, 153, 0, 0.3)',
        shadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
        shadowDeep: '0 8px 16px rgba(0, 0, 0, 0.7)',
        textShadow: '0 0 5px currentColor, 0 0 10px rgba(255, 153, 0, 0.5)',
        textGlow: '0 0 8px currentColor',

        // LCARS specific visual effects
        scanline: 'linear-gradient(90deg, transparent, rgba(255, 153, 0, 0.1), transparent)',
        interference: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)',
    },    // Component-specific styling (Authentic LCARS Design Patterns)
    components: {
        button: {
            background: 'linear-gradient(135deg, var(--lcars-orange), var(--lcars-yellow))',
            border: '2px solid var(--lcars-orange)',
            borderRadius: 'var(--corner-radius)',
            color: 'var(--background)',
            fontFamily: 'var(--font-primary)',
            fontWeight: 'bold',
            fontSize: 'var(--font-size-normal)',
            padding: '0.75rem 1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            boxShadow: 'var(--glow), var(--shadow)',
            transition: 'var(--animation-transition)',
            cursor: 'pointer',

            // LCARS button states
            hover: {
                background: 'linear-gradient(135deg, var(--lcars-yellow), var(--lcars-orange))',
                boxShadow: 'var(--glow-intense), var(--shadow-deep)',
                transform: 'translateY(-1px)',
            },

            active: {
                background: 'var(--lcars-green-bright)',
                color: 'var(--background)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
                transform: 'translateY(0)',
            },

            disabled: {
                background: 'var(--lcars-gray)',
                color: 'var(--lcars-gray-dark)',
                boxShadow: 'none',
                cursor: 'not-allowed',
            },
        },

        panel: {
            background: 'linear-gradient(145deg, var(--surface-variant), var(--surface))',
            border: '2px solid var(--lcars-orange)',
            borderRadius: 'var(--corner-radius)',
            boxShadow: 'var(--inner-glow), var(--shadow)',
            padding: 'var(--panel-padding)',
            margin: 'var(--panel-spacing)',
            position: 'relative',

            // LCARS panel corner elements
            '::before': {
                content: '""',
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                width: '20px',
                height: '20px',
                background: 'var(--lcars-orange)',
                borderRadius: '50%',
            },
        },

        bar: {
            background: 'linear-gradient(90deg, var(--lcars-orange), var(--lcars-yellow), var(--lcars-orange))',
            height: 'var(--bar-height)',
            borderRadius: 'var(--corner-radius)',
            boxShadow: 'var(--glow)',
            position: 'relative',
            overflow: 'hidden',

            // Animated scanning effect
            '::after': {
                content: '""',
                position: 'absolute',
                top: '0',
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'var(--scanline)',
                animation: 'sweep var(--animation-sweep)',
            },
        },

        // LCARS Signature Elements
        elbow: {
            background: 'var(--lcars-orange)',
            borderRadius: 'var(--elbow-radius)',
            width: 'var(--elbow-size)',
            height: 'var(--elbow-size)',
            position: 'relative',

            // Create the elbow cutout
            '::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                right: '0',
                width: '50%',
                height: '50%',
                background: 'var(--background)',
                borderRadius: '0 0 0 var(--elbow-radius)',
            },
        },

        lozenge: {
            background: 'var(--lcars-blue)',
            borderRadius: 'var(--corner-radius)',
            height: 'var(--lozenge-height)',
            padding: '0 1rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--background)',
            fontFamily: 'var(--font-secondary)',
            fontWeight: 'var(--font-weight-bold)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            boxShadow: 'var(--glow)',
        },

        display: {
            background: 'var(--background)',
            border: '2px solid var(--lcars-cyan)',
            borderRadius: 'var(--corner-radius)',
            color: 'var(--lcars-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-large)',
            padding: '1rem',
            boxShadow: 'var(--inner-glow), var(--text-glow)',
            textShadow: 'var(--text-shadow)',

            // Subtle interference effect
            '::before': {
                content: '""',
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'var(--interference)',
                pointerEvents: 'none',
                opacity: '0.1',
            },
        },

        input: {
            background: 'var(--surface)',
            border: '2px solid var(--lcars-cyan)',
            borderRadius: 'var(--corner-radius)',
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-normal)',
            padding: '0.75rem 1rem',
            boxShadow: 'var(--inner-glow)',
            transition: 'var(--animation-transition)',

            focus: {
                borderColor: 'var(--lcars-orange)',
                boxShadow: 'var(--glow), var(--inner-glow)',
                outline: 'none',
            },

            '::placeholder': {
                color: 'var(--lcars-gray)',
                fontStyle: 'italic',
            },
        },

        text: {
            color: 'var(--text)',
            fontFamily: 'var(--font-primary)',
            textShadow: 'var(--text-shadow)',
            lineHeight: '1.4',

            // Text hierarchy
            heading: {
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--font-size-title)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--lcars-orange)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textShadow: 'var(--text-glow)',
            },

            subheading: {
                fontSize: 'var(--font-size-display)',
                color: 'var(--lcars-cyan)',
                fontWeight: 'var(--font-weight-bold)',
            },

            label: {
                fontSize: 'var(--font-size-small)',
                color: 'var(--lcars-yellow)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            },

            code: {
                fontFamily: 'var(--font-mono)',
                background: 'rgba(153, 204, 255, 0.1)',
                border: '1px solid var(--lcars-cyan)',
                borderRadius: '4px',
                padding: '0.2em 0.4em',
                color: 'var(--lcars-cyan)',
            },
        },
    },    // CSS Custom Properties (Comprehensive LCARS Variable System)
    cssVariables: {
        // Authentic LCARS Color Palette
        '--lcars-orange': '#ff9900',
        '--lcars-blue': '#9999ff',
        '--lcars-red': '#cc6666',
        '--lcars-red-bright': '#ff0000',
        '--lcars-green': '#99cc99',
        '--lcars-green-bright': '#00ff00',
        '--lcars-purple': '#cc99cc',
        '--lcars-yellow': '#ffcc99',
        '--lcars-gold': '#ffcc00',
        '--lcars-cyan': '#99ccff',
        '--lcars-white': '#ffffff',
        '--lcars-gray': '#666666',
        '--lcars-gray-dark': '#333333',
        '--lcars-gray-light': '#999999',

        // Background and Surface Colors
        '--background': '#000000',
        '--surface': '#111111',
        '--surface-variant': '#222222',
        '--text': '#ffffff',
        '--text-secondary': '#cccccc',

        // Layout Properties
        '--corner-radius': '20px',
        '--elbow-radius': '40px',
        '--bar-height': '40px',
        '--bar-height-small': '20px',
        '--bar-height-large': '60px',
        '--panel-spacing': '8px',
        '--panel-padding': '1rem',
        '--elbow-size': '80px',
        '--lozenge-height': '30px',
        '--grid-unit': '8px',
        '--column-width': '120px',
        '--gutter-width': '16px',

        // Typography
        '--font-primary': '"Federation", "Orbitron", "SF Alien Encounters", "Courier New", monospace',
        '--font-secondary': '"LCARS", "Swiss 911 Ultra Compressed", "Arial Narrow", sans-serif',
        '--font-mono': '"Courier New", "SF Mono", "Monaco", monospace',
        '--font-display': '"Okuda", "Federation", "Orbitron", sans-serif',
        '--font-weight-normal': '400',
        '--font-weight-bold': '700',
        '--font-weight-ultra-condensed': '100',
        '--font-size-small': '0.75rem',
        '--font-size-normal': '1rem',
        '--font-size-large': '1.25rem',
        '--font-size-display': '1.5rem',
        '--font-size-title': '2rem',

        // Animation Properties
        '--animation-duration': '0.3s',
        '--animation-transition': '0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        '--animation-hover': '0.2s ease-out',
        '--animation-active': '0.1s ease-in',
        '--animation-activation': '0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        '--animation-scanning': '2s linear infinite',
        '--animation-pulse': '1.5s ease-in-out infinite',
        '--animation-blink': '1s step-end infinite',
        '--animation-sweep': '3s linear infinite',
        '--animation-delay-short': '0.1s',
        '--animation-delay-medium': '0.3s',
        '--animation-delay-long': '0.6s',

        // Visual Effects
        '--glow': '0 0 20px currentColor, 0 0 40px rgba(255, 153, 0, 0.3)',
        '--glow-intense': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
        '--inner-glow': 'inset 0 0 10px rgba(255, 153, 0, 0.3)',
        '--shadow': '0 4px 8px rgba(0, 0, 0, 0.5)',
        '--shadow-deep': '0 8px 16px rgba(0, 0, 0, 0.7)',
        '--text-shadow': '0 0 5px currentColor, 0 0 10px rgba(255, 153, 0, 0.5)',
        '--text-glow': '0 0 8px currentColor',
        '--scanline': 'linear-gradient(90deg, transparent, rgba(255, 153, 0, 0.1), transparent)', '--interference': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)',
    },

    // LCARS Design Patterns and Presets
    patterns: {
        // Common LCARS UI patterns
        commandBar: {
            height: '60px',
            background: 'linear-gradient(90deg, var(--lcars-orange), var(--lcars-yellow))',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 2rem',
            boxShadow: 'var(--glow)',
        },

        statusPanel: {
            background: 'var(--surface)',
            border: '2px solid var(--lcars-cyan)',
            borderRadius: 'var(--corner-radius)',
            padding: '1rem',
            boxShadow: 'var(--inner-glow)',
        },

        navigationRail: {
            width: '120px',
            background: 'linear-gradient(180deg, var(--lcars-orange), var(--lcars-yellow))',
            borderRadius: '0 20px 20px 0',
            padding: '1rem 0',
        },

        dataDisplay: {
            background: 'var(--background)',
            border: '2px solid var(--lcars-cyan)',
            borderRadius: 'var(--corner-radius)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--lcars-cyan)',
            padding: '1rem',
            boxShadow: 'var(--text-glow)',
        },
    },
};

export default LCARSTheme;
