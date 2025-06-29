/**
 * LCARS Panel Component
 * Main content panel with authentic LCARS styling
 */

import React from 'react';
import { LCARSElbow } from './LCARSElbow.js';

interface LCARSPanelProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    status?: 'online' | 'offline' | 'standby' | 'alert';
    showElbows?: boolean;
    showSideBars?: boolean;
    className?: string;
}

export const LCARSPanel: React.FC<LCARSPanelProps> = ({
    children,
    title,
    subtitle,
    status = 'online',
    showElbows = true,
    showSideBars = true,
    className = ''
}) => {
    const statusColors = {
        online: '#FF9900',
        offline: '#999999',
        standby: '#CCFF66',
        alert: '#FF6666'
    };

    const statusColor = statusColors[status];

    return (
        <div className={`relative p-6 bg-black text-white ${className}`}>
            {/* LCARS Elbows */}
            {showElbows && (
                <>
                    <LCARSElbow
                        position="top-left"
                        color={statusColor}
                        className="absolute -top-2 -left-2 z-10"
                    />
                    <LCARSElbow
                        position="bottom-right"
                        size="sm"
                        color={statusColor}
                        className="absolute -bottom-1 -right-1 z-10"
                    />
                </>
            )}

            {/* LCARS Side Bars */}
            {showSideBars && (
                <>
                    <div
                        className="absolute left-0 top-12 bottom-12 w-1"
                        style={{
                            background: `linear-gradient(to bottom, ${statusColor}, transparent)`,
                        }}
                    />
                    <div
                        className="absolute right-0 top-8 bottom-16 w-0.5"
                        style={{
                            background: `linear-gradient(to bottom, transparent, ${statusColor}60)`,
                        }}
                    />
                </>
            )}

            {/* Header */}
            {(title || subtitle) && (
                <div className="mb-6 relative z-20">
                    {title && (
                        <h2
                            className="text-xl font-mono font-bold uppercase tracking-wider"
                            style={{
                                color: statusColor,
                                fontFamily: '"Orbitron", "Courier New", monospace'
                            }}
                        >
                            {title}
                        </h2>
                    )}
                    {subtitle && (
                        <p
                            className="text-sm font-mono opacity-75 mt-1"
                            style={{ color: statusColor }}
                        >
                            {subtitle}
                        </p>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="relative z-20 ml-6">
                {children}
            </div>

            {/* LCARS Footer Bar */}
            <div
                className="absolute bottom-0 left-16 right-4 h-2"
                style={{
                    background: `linear-gradient(to right, ${statusColor}, ${statusColor}40, transparent)`,
                    clipPath: 'polygon(0 0, 90% 0, 100% 100%, 0 100%)'
                }}
            />

            {/* Status Indicators */}
            <div className="absolute top-4 right-4 flex space-x-2">
                <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: statusColor }}
                />
                <div
                    className="w-2 h-2 rounded-full opacity-60"
                    style={{ backgroundColor: statusColor }}
                />
            </div>
        </div>
    );
};
