/**
 * LCARS Elbow Component
 * Classic LCARS corner frame element with rounded corners
 */

import React from 'react';

interface LCARSElbowProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    children?: React.ReactNode;
    className?: string;
}

export const LCARSElbow: React.FC<LCARSElbowProps> = ({
    position = 'top-left',
    size = 'md',
    color = '#FF9900',
    children,
    className = ''
}) => {
    const sizes = {
        sm: { width: '60px', height: '60px', radius: '30px' },
        md: { width: '100px', height: '100px', radius: '50px' },
        lg: { width: '140px', height: '140px', radius: '70px' }
    };

    const sizeStyle = sizes[size];

    const getClipPath = () => {
        switch (position) {
            case 'top-left': return 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)';
            case 'top-right': return 'polygon(0 0, 100% 0, 100% 100%, 50% 100%, 50% 50%, 0 50%)';
            case 'bottom-left': return 'polygon(0 0, 50% 0, 50% 50%, 100% 50%, 100% 100%, 0 100%)';
            case 'bottom-right': return 'polygon(50% 0, 100% 0, 100% 100%, 0 100%, 0 50%, 50% 50%)';
            default: return 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)';
        }
    };

    return (
        <div
            className={`relative ${className}`}
            style={{
                width: sizeStyle.width,
                height: sizeStyle.height,
                background: color,
                borderRadius: sizeStyle.radius,
                clipPath: getClipPath(),
                boxShadow: `0 0 15px ${color}60`
            }}
        >
            {children}
        </div>
    );
};
