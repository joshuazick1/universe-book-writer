/**
 * LCARS Button Component
 * Authentic pill-shaped LCARS button
 */

import React from 'react';

interface LCARSButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'warning' | 'alert';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    active?: boolean;
    className?: string;
}

export const LCARSButton: React.FC<LCARSButtonProps> = ({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    active = false,
    className = ''
}) => {
    const variants = {
        primary: { bg: '#FF9900', text: '#000000' },
        secondary: { bg: '#9999FF', text: '#000000' },
        warning: { bg: '#CCFF66', text: '#000000' },
        alert: { bg: '#FF6666', text: '#FFFFFF' }
    };

    const sizes = {
        sm: { padding: '8px 16px', fontSize: '12px', height: '32px' },
        md: { padding: '12px 24px', fontSize: '14px', height: '44px' },
        lg: { padding: '16px 32px', fontSize: '16px', height: '56px' }
    };

    const variantStyle = variants[variant];
    const sizeStyle = sizes[size];

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`relative font-mono font-bold uppercase tracking-wider transition-all duration-200 ${className}`}
            style={{
                backgroundColor: disabled ? '#333333' : variantStyle.bg,
                color: disabled ? '#666666' : variantStyle.text,
                padding: sizeStyle.padding,
                fontSize: sizeStyle.fontSize,
                height: sizeStyle.height,
                borderRadius: sizeStyle.height,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: active || (!disabled) ? `0 0 20px ${variantStyle.bg}80, inset 0 2px 4px rgba(0,0,0,0.2)` : 'none',
                transform: active ? 'scale(0.98)' : 'scale(1)',
                fontFamily: '"Orbitron", "Courier New", monospace',
                opacity: disabled ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.currentTarget.style.boxShadow = `0 0 30px ${variantStyle.bg}, inset 0 2px 4px rgba(0,0,0,0.2)`;
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.currentTarget.style.boxShadow = active ? `0 0 20px ${variantStyle.bg}80, inset 0 2px 4px rgba(0,0,0,0.2)` : 'none';
                }
            }}
        >
            {children}
        </button>
    );
};
