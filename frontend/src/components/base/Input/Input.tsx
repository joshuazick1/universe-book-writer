/**
 * Input Component - VerseForge
 * Base input component with universe theme support and plugin extensibility
 */

import React, { forwardRef } from 'react';
import { withPluginComponent } from '../../providers/PluginRegistryProvider';

/* === TYPES === */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'universe';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
  universe?: string;
}

/* === STYLE VARIANTS === */

const getVariantClasses = (variant: InputProps['variant'], hasError: boolean) => {
  if (hasError) {
    return 'focus:ring-2 focus:ring-offset-2';
  }

  const variants = {
    default: 'focus:ring-2 focus:ring-offset-2',
    universe:
      'border-universe-accent focus:border-universe-primary focus:ring-universe-primary universe-border',
  };

  return variants[variant || 'default'];
};

const getVariantStyles = (variant: InputProps['variant'], hasError: boolean) => {
  if (variant === 'universe') {
    return {}; // Universe variant uses CSS custom properties
  }

  const baseStyles = {
    backgroundColor: 'var(--color-universe-surface)',
    color: 'var(--color-universe-text)',
    borderColor: hasError ? 'rgba(239, 68, 68, 0.5)' : 'var(--color-universe-primary)',
    '--placeholder-color': 'rgba(var(--color-universe-text-rgb), 0.5)'
  };

  return baseStyles;
};

const getSizeClasses = (inputSize: InputProps['inputSize']) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  return sizes[inputSize || 'md'];
};

/* === BASE COMPONENT === */

const BaseInput = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      inputSize = 'md',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      fullWidth = false,
      className = '',
      id,
      style,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const variantClasses = getVariantClasses(variant, hasError);
    const variantStyles = getVariantStyles(variant, hasError);
    const sizeClasses = getSizeClasses(inputSize);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = [
      'block w-full rounded-lg border',
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' ');

    const inputClasses = [
      baseInputClasses,
      variantClasses,
      sizeClasses,
      leftIcon || leftAddon ? 'pl-10' : '',
      rightIcon || rightAddon ? 'pr-10' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const containerClasses = fullWidth ? 'w-full' : '';

    const combinedStyles = {
      ...variantStyles,
      ...style
    };

    return (
      <div className={containerClasses}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-universe-text)', opacity: 0.8 }}
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Addon */}
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center">
              <div
                className="px-3 py-2 border-r rounded-l-lg"
                style={{
                  backgroundColor: 'var(--color-universe-surface)',
                  borderColor: 'var(--color-universe-primary)',
                  color: 'var(--color-universe-text)',
                  opacity: 0.7
                }}
              >
                {leftAddon}
              </div>
            </div>
          )}

          {/* Left Icon */}
          {leftIcon && !leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span style={{ color: 'var(--color-universe-text)', opacity: 0.6 }}>{leftIcon}</span>
            </div>
          )}

          {/* Input Field */}
          <input ref={ref} id={inputId} className={inputClasses} style={combinedStyles} {...props} />

          {/* Right Icon */}
          {rightIcon && !rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span style={{ color: 'var(--color-universe-text)', opacity: 0.6 }}>{rightIcon}</span>
            </div>
          )}

          {/* Right Addon */}
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center">
              <div
                className="px-3 py-2 border-l rounded-r-lg"
                style={{
                  backgroundColor: 'var(--color-universe-surface)',
                  borderColor: 'var(--color-universe-primary)',
                  color: 'var(--color-universe-text)',
                  opacity: 0.7
                }}
              >
                {rightAddon}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text or Error */}
        {(helperText || error) && (
          <p
            className="mt-2 text-sm"
            style={{
              color: error ? 'rgba(239, 68, 68, 0.8)' : 'var(--color-universe-text)',
              opacity: error ? 1 : 0.7
            }}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

BaseInput.displayName = 'BaseInput';

/* === PLUGIN-ENHANCED COMPONENT === */

export const Input = withPluginComponent<InputProps>('Input', BaseInput);

/* === EXPORT === */

export default Input;
