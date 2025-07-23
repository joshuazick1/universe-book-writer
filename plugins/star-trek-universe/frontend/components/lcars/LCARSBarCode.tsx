/**
 * LCARS Bar Code Component
 * Side navigation/status element with authentic LCARS styling
 */

import React from 'react';

interface LCARSBarCodeProps {
    items: string[];
    activeIndex?: number;
    color?: string;
    className?: string;
}

export const LCARSBarCode: React.FC<LCARSBarCodeProps> = ({
    items,
    activeIndex,
    color = '#FF9900',
    className = ''
}) => {
    return (
        <div className={`flex flex-col space-y-1 ${className}`}>
            {items.map((item, index) => (
                <div
                    key={index}
                    className="flex items-center space-x-2"
                >
                    <div
                        className="h-6 rounded-r-full transition-all duration-300"
                        style={{
                            width: index === activeIndex ? '120px' : '80px',
                            backgroundColor: index === activeIndex ? color : `${color}60`,
                            boxShadow: index === activeIndex ? `0 0 15px ${color}` : 'none'
                        }}
                    />
                    <span
                        className="text-xs font-mono uppercase tracking-wider"
                        style={{
                            color: index === activeIndex ? color : `${color}80`,
                            fontFamily: '"Orbitron", "Courier New", monospace'
                        }}
                    >
                        {item}
                    </span>
                </div>
            ))}
        </div>
    );
};
