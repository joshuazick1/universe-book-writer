/**
 * Holodeck Grid Component
 * Simulates the holographic grid pattern used in Star Trek holodecks
 */

import React from 'react';

interface HolodeckGridProps {
    active?: boolean;
    size?: number;
    className?: string;
}

export const HolodeckGrid: React.FC<HolodeckGridProps> = ({
    active = false,
    size = 20,
    className = '',
}) => {
    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{
                backgroundImage: `
          linear-gradient(cyan 1px, transparent 1px),
          linear-gradient(90deg, cyan 1px, transparent 1px)
        `,
                backgroundSize: `${size}px ${size}px`,
                opacity: active ? 0.3 : 0.1,
            }}
        >
            {active && (
                <div
                    className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent animate-pulse"
                />
            )}
        </div>
    );
};
