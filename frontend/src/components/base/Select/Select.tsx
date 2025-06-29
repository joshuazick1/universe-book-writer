/**
 * Select Component
 * 
 * Reusable select dropdown component
 */

import React, { SelectHTMLAttributes } from 'react';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
    options: SelectOption[];
    onChange: (value: string) => void;
    error?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary' | 'universe';
}

export function Select({
    options,
    onChange,
    error,
    size = 'md',
    variant = 'primary',
    className = '',
    disabled = false,
    style,
    ...props
}: SelectProps) {
    const sizeClasses = {
        sm: 'px-2 py-1 text-sm',
        md: 'px-3 py-2 text-base',
        lg: 'px-4 py-3 text-lg',
    };

    const getVariantStyles = () => {
        if (variant === 'universe') {
            return {
                backgroundColor: 'var(--color-universe-surface)',
                borderColor: error ? 'rgba(239, 68, 68, 0.5)' : 'var(--color-universe-primary)',
                color: 'var(--color-universe-text)',
            };
        }

        return {
            backgroundColor: 'var(--color-universe-surface)',
            borderColor: error ? 'rgba(239, 68, 68, 0.5)' : 'var(--color-universe-primary)',
            color: 'var(--color-universe-text)',
        };
    };

    const baseClasses = [
        'block w-full rounded-md border shadow-sm',
        'focus:outline-none focus:ring-1 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        className,
    ].filter(Boolean).join(' ');

    const selectStyles = {
        ...getVariantStyles(),
        ...style
    }; return (
        <div className="space-y-1">
            <select
                {...props}
                className={baseClasses}
                style={selectStyles}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </option>
                ))}
            </select>

            {error && (
                <p className="text-sm" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>{error}</p>
            )}
        </div>
    );
}
