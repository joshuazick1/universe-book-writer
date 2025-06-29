/**
 * PADD Component
 * Personal Access Display Device - Star Trek handheld computer interface
 */

import React from 'react';

interface PADDProps {
    title: string;
    children: React.ReactNode;
    status?: 'online' | 'offline' | 'warning' | 'error';
    className?: string;
}

export const PADD: React.FC<PADDProps> = ({
    title,
    children,
    status = 'online',
    className = '',
}) => {
    const statusColors = {
        online: 'border-green-500 bg-green-50',
        offline: 'border-gray-500 bg-gray-50',
        warning: 'border-yellow-500 bg-yellow-50',
        error: 'border-red-500 bg-red-50',
    };

    const statusIndicators = {
        online: 'bg-green-500',
        offline: 'bg-gray-500',
        warning: 'bg-yellow-500 animate-pulse',
        error: 'bg-red-500 animate-pulse',
    };

    return (
        <div className={`relative bg-black rounded-lg border-2 ${statusColors[status]} ${className}`}>
            {/* Status indicator */}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusIndicators[status]}`} />

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black px-4 py-2 rounded-t-lg">
                <h3 className="font-bold font-mono text-sm uppercase">{title}</h3>
            </div>

            {/* Content */}
            <div className="p-4 text-orange-400 font-mono text-sm">
                {children}
            </div>

            {/* LCARS corner elements */}
            <div className="absolute bottom-2 left-2">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full opacity-70" />
                    <div className="w-2 h-2 bg-orange-500 rounded-full opacity-40" />
                </div>
            </div>
        </div>
    );
};
