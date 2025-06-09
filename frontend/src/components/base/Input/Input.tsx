/**
 * Input Component - Universe Book Writer
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
    return 'border-error-500 focus:border-error-500 focus:ring-error-500';
  }

  const variants = {
    default:
      'border-neutral-300 focus:border-primary-500 focus:ring-primary-500 dark:border-neutral-600 dark:focus:border-primary-400',
    universe:
      'border-universe-accent focus:border-universe-primary focus:ring-universe-primary universe-border',
  };

  return variants[variant || 'default'];
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
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const variantClasses = getVariantClasses(variant, hasError);
    const sizeClasses = getSizeClasses(inputSize);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = [
      'block w-full rounded-lg border',
      'bg-white dark:bg-neutral-800',
      'text-neutral-900 dark:text-neutral-100',
      'placeholder-neutral-500 dark:placeholder-neutral-400',
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

    return (
      <div className={containerClasses}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Addon */}
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center">
              <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border-r border-neutral-300 dark:border-neutral-600 rounded-l-lg text-neutral-500 dark:text-neutral-400">
                {leftAddon}
              </div>
            </div>
          )}

          {/* Left Icon */}
          {leftIcon && !leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-neutral-500 dark:text-neutral-400">{leftIcon}</span>
            </div>
          )}

          {/* Input Field */}
          <input ref={ref} id={inputId} className={inputClasses} {...props} />

          {/* Right Icon */}
          {rightIcon && !rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-neutral-500 dark:text-neutral-400">{rightIcon}</span>
            </div>
          )}

          {/* Right Addon */}
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center">
              <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border-l border-neutral-300 dark:border-neutral-600 rounded-r-lg text-neutral-500 dark:text-neutral-400">
                {rightAddon}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text or Error */}
        {(helperText || error) && (
          <p
            className={`mt-2 text-sm ${
              error
                ? 'text-error-600 dark:text-error-400'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
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
