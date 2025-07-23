/**
 * Error Message Component
 * Displays error messages with optional retry functionality
 */

import React from 'react';
import { Button } from '../Button';

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    className?: string;
    variant?: 'error' | 'warning' | 'info';
    style?: React.CSSProperties;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message,
    onRetry,
    className = '',
    variant = 'error',
    style
}) => {
    const getVariantStyles = () => {
        const styles = {
            error: {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'rgba(239, 68, 68, 0.9)'
            },
            warning: {
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: 'rgba(245, 158, 11, 0.9)'
            },
            info: {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                color: 'rgba(59, 130, 246, 0.9)'
            }
        };
        return styles[variant];
    };

    const getIconColor = () => {
        const colors = {
            error: 'rgba(239, 68, 68, 0.6)',
            warning: 'rgba(245, 158, 11, 0.6)',
            info: 'rgba(59, 130, 246, 0.6)'
        };
        return colors[variant];
    };

    const getIcon = () => {
        switch (variant) {
            case 'error':
                return (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    }; const containerStyles = {
        ...getVariantStyles(),
        ...style
    };

    return (
        <div className={`rounded-md border p-4 ${className}`} style={containerStyles}>
            <div className="flex">
                <div className="flex-shrink-0" style={{ color: getIconColor() }}>
                    {getIcon()}
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{message}</p>
                </div>
                {onRetry && (
                    <div className="ml-3">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onRetry}
                        >
                            Retry
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
