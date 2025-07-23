/**
 * LCARS Bar Component
 * Animated bar element with authentic LCARS styling
 */

import React, { useState, useEffect, useRef } from 'react';

interface LCARSBarProps {
    show: boolean;
    children: React.ReactNode;
    duration?: number;
    delay?: number;
    orientation?: 'horizontal' | 'vertical';
    fillDirection?: 'start' | 'end';
    barColor?: 'orange' | 'blue' | 'red' | 'green' | 'purple' | 'yellow';
    glowEffect?: boolean;
    cornerRadius?: 'small' | 'medium' | 'large';
    className?: string;
}

export const LCARSBar: React.FC<LCARSBarProps> = ({
    show,
    children,
    duration = 600,
    delay = 0,
    orientation = 'horizontal',
    fillDirection = 'start',
    barColor = 'orange',
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

    const colorClasses = {
        orange: 'bg-orange-500 border-orange-400',
        blue: 'bg-blue-500 border-blue-400',
        red: 'bg-red-500 border-red-400',
        green: 'bg-green-500 border-green-400',
        purple: 'bg-purple-500 border-purple-400',
        yellow: 'bg-yellow-500 border-yellow-400',
    }[barColor];

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
            className={`relative transition-all ease-out overflow-hidden border-2 ${colorClasses} ${borderRadiusClass} ${orientationStyles} ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                transitionDelay: `${delay}ms`,
                ...fillStyles,
                boxShadow: glowEffect && isVisible
                    ? `0 0 20px currentColor, inset 0 0 10px rgba(255, 153, 0, 0.3)`
                    : undefined,
                fontFamily: '"Orbitron", "Courier New", monospace',
            }}
        >
            {children}

            {/* LCARS corner accent */}
            <div
                className="absolute top-0 left-0 w-3 h-3 bg-black rounded-br-full opacity-20"
            />

            {/* LCARS inner border */}
            <div
                className="absolute inset-1 border border-current opacity-30 rounded-lg"
            />
        </div>
    );
};
