/**
 * Starfleet Communicator Badge Component
 * Official Starfleet rank and division indicator
 */

import React from 'react';

interface StarfleetBadgeProps {
    rank?: 'cadet' | 'ensign' | 'lieutenant' | 'commander' | 'captain' | 'admiral';
    division?: 'command' | 'sciences' | 'engineering' | 'medical';
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
    className?: string;
}

export const StarfleetBadge: React.FC<StarfleetBadgeProps> = ({
    rank = 'ensign',
    division = 'command',
    size = 'md',
    animated = true,
    className = '',
}) => {
    const divisionColors = {
        command: 'text-red-500',
        sciences: 'text-blue-500',
        engineering: 'text-yellow-500',
        medical: 'text-green-500',
    };

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-12 h-12 text-base',
    };

    return (
        <div
            className={`
        relative flex items-center justify-center rounded-full border-2 border-current
        ${divisionColors[division]} ${sizeClasses[size]} ${className}
        ${animated ? 'hover:scale-110 transition-transform duration-200' : ''}
      `}
            title={`${rank.charAt(0).toUpperCase() + rank.slice(1)} - ${division.charAt(0).toUpperCase() + division.slice(1)}`}
        >
            <div className="font-bold font-mono">
                {rank.charAt(0).toUpperCase()}
            </div>

            {/* Division indicator */}
            <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-current`} />
        </div>
    );
};
