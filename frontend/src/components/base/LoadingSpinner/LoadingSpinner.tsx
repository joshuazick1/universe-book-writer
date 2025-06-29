/**
 * Loading Spinner Component
 * Simple loading spinner for use throughout the application
 */

import React from 'react';

interface LoadingSpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    style?: React.CSSProperties;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    className = '',
    size = 'md',
    message,
    style
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    const spinnerStyles = {
        borderColor: 'var(--color-universe-primary)',
        borderTopColor: 'var(--color-universe-accent)',
        ...style
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div
                className={`animate-spin rounded-full border-2 ${sizeClasses[size]}`}
                style={spinnerStyles}
                role="status"
                aria-label="Loading"
            />
            {message && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-universe-text)', opacity: 0.7 }}>{message}</p>
            )}
        </div>
    );
};
