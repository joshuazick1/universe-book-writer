/**
 * Example Plugin Animations
 * Demonstrates how plugins would provide universe-specific animations
 */

import React, { useEffect, useRef, useState } from 'react';
import { animationRegistry, type PluginAnimationComponent } from '../../services/plugin-animation-registry';

/* === STAR TREK PLUGIN ANIMATIONS === */

interface LCARSBarProps {
    show: boolean;
    children: React.ReactNode;
    duration?: number;
    delay?: number;
    orientation?: 'horizontal' | 'vertical';
    fillDirection?: 'start' | 'end';
    barColor?: string;
    glowEffect?: boolean;
    cornerRadius?: 'small' | 'medium' | 'large';
    className?: string;
}

const LCARSBar: React.FC<LCARSBarProps> = ({
    show,
    children,
    duration = 600,
    delay = 0,
    orientation = 'horizontal',
    fillDirection = 'start',
    barColor = 'bg-orange-500',
    glowEffect = true,
    cornerRadius = 'medium',
    className = '',
}) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isVisible, setIsVisible] = useState(show);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            timeoutRef.current = setTimeout(() => {
                setIsVisible(true);
            }, delay);
        } else {
            setIsVisible(false);
            timeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, duration + delay);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [show, duration, delay]);

    if (!shouldRender) {
        return null;
    }

    const borderRadiusClass = {
        small: 'rounded',
        medium: 'rounded-lg',
        large: 'rounded-2xl',
    }[cornerRadius];

    const orientationStyles = orientation === 'vertical'
        ? 'writing-mode-vertical flex-col'
        : '';

    const fillStyles = orientation === 'horizontal'
        ? {
            clipPath: isVisible
                ? 'inset(0 0 0 0)'
                : fillDirection === 'start'
                    ? 'inset(0 100% 0 0)'
                    : 'inset(0 0 0 100%)',
        }
        : {
            clipPath: isVisible
                ? 'inset(0 0 0 0)'
                : fillDirection === 'start'
                    ? 'inset(100% 0 0 0)'
                    : 'inset(0 0 100% 0)',
        };

    return (
        <div
            className={`relative transition-all ease-out overflow-hidden ${barColor} ${borderRadiusClass} ${orientationStyles} ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                transitionDelay: `${delay}ms`,
                ...fillStyles,
                boxShadow: glowEffect && isVisible
                    ? `0 0 20px currentColor, inset 0 0 10px rgba(255, 153, 0, 0.3)`
                    : undefined,
            }}
        >
            {children}
            {/* LCARS corner accent */}
            <div
                className="absolute top-0 left-0 w-2 h-2 bg-black rounded-br-lg opacity-20"
                style={{ borderBottomRightRadius: '50%' }}
            />
        </div>
    );
};

/* === STAR WARS PLUGIN ANIMATIONS === */

interface ImperialPanelProps {
    show: boolean;
    children: React.ReactNode;
    duration?: number;
    panelType?: 'command' | 'tactical' | 'engineering';
    className?: string;
}

const ImperialPanel: React.FC<ImperialPanelProps> = ({
    show,
    children,
    duration = 400,
    panelType = 'command',
    className = '',
}) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isVisible, setIsVisible] = useState(show);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
            setTimeout(() => setShouldRender(false), duration);
        }
    }, [show, duration]);

    if (!shouldRender) return null;

    const panelStyles = {
        command: 'bg-gray-900 border-red-600',
        tactical: 'bg-red-900 border-red-500',
        engineering: 'bg-blue-900 border-blue-500',
    }[panelType];

    return (
        <div
            className={`relative border-2 transition-all ease-in-out ${panelStyles} ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                transformOrigin: 'top',
            }}
        >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent" />
            {children}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-current opacity-50" />
        </div>
    );
};

/* === CYBERPUNK PLUGIN ANIMATIONS === */

interface GlitchTextProps {
    show: boolean;
    children: React.ReactNode;
    duration?: number;
    intensity?: 'low' | 'medium' | 'high';
    className?: string;
}

const GlitchText: React.FC<GlitchTextProps> = ({
    show,
    children,
    duration = 300,
    intensity = 'medium',
    className = '',
}) => {
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        if (show) {
            setIsGlitching(true);
            const timeout = setTimeout(() => setIsGlitching(false), duration);
            return () => clearTimeout(timeout);
        }
    }, [show, duration]);

    const glitchIntensity = {
        low: 'animate-pulse',
        medium: 'animate-bounce',
        high: 'animate-ping',
    }[intensity];

    return (
        <div
            className={`relative font-mono ${className}`}
            style={{
                filter: isGlitching ? 'hue-rotate(90deg) contrast(150%)' : undefined,
                textShadow: isGlitching
                    ? '2px 0 #ff0080, -2px 0 #00ff41, 0 2px #00d4ff'
                    : undefined,
            }}
        >
            <div className={isGlitching ? glitchIntensity : ''}>
                {children}
            </div>
        </div>
    );
};

/* === REGISTER PLUGIN ANIMATIONS === */

// This would typically be done by each plugin when it loads
export const registerExamplePluginAnimations = () => {
    // Star Trek animations
    animationRegistry.registerAnimation({
        name: 'LCARSBar',
        component: LCARSBar,
        category: 'specialized',
        universeType: 'star-trek',
        description: 'LCARS-style animated bar with fill transitions',
        examples: [
            {
                name: 'Horizontal Bar',
                props: { orientation: 'horizontal', barColor: 'bg-orange-500' }
            },
            {
                name: 'Vertical Bar',
                props: { orientation: 'vertical', barColor: 'bg-blue-500' }
            }
        ]
    });

    // Star Wars animations
    animationRegistry.registerAnimation({
        name: 'ImperialPanel',
        component: ImperialPanel,
        category: 'ui',
        universeType: 'star-wars',
        description: 'Imperial-style command panel with scale transition',
        examples: [
            {
                name: 'Command Panel',
                props: { panelType: 'command' }
            },
            {
                name: 'Tactical Panel',
                props: { panelType: 'tactical' }
            }
        ]
    });

    // Cyberpunk animations
    animationRegistry.registerAnimation({
        name: 'GlitchText',
        component: GlitchText,
        category: 'effect',
        universeType: 'cyberpunk',
        description: 'Glitch effect for cyberpunk-style text',
        examples: [
            {
                name: 'Medium Glitch',
                props: { intensity: 'medium' }
            },
            {
                name: 'High Intensity',
                props: { intensity: 'high' }
            }
        ]
    });
};

// Auto-register when imported (in a real plugin, this would be triggered by plugin activation)
registerExamplePluginAnimations();
