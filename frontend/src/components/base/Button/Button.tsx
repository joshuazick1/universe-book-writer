/**
 * Button Component - Universe Book Writer
 * Base button component with universe theme support and plugin extensibility
 */

import React, { forwardRef } from 'react';
import { withPluginComponent } from '../../providers/PluginRegistryProvider';

/* === TYPES === */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'universe';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  universe?: string;
}

/* === STYLE VARIANTS === */

const getVariantClasses = (variant: ButtonProps['variant']) => {
  const variants = {
    primary:
      'bg-primary-500 hover:bg-primary-600 text-white border-primary-500 hover:border-primary-600',
    secondary:
      'bg-secondary-500 hover:bg-secondary-600 text-white border-secondary-500 hover:border-secondary-600',
    accent:
      'bg-accent-500 hover:bg-accent-600 text-white border-accent-500 hover:border-accent-600',
    ghost:
      'bg-transparent hover:bg-neutral-100 text-neutral-700 border-neutral-300 hover:border-neutral-400 dark:hover:bg-neutral-800 dark:text-neutral-300',
    universe:
      'bg-universe-primary hover:brightness-110 text-universe-text border-universe-primary universe-glow',
  };

  return variants[variant || 'primary'];
};

const getSizeClasses = (size: ButtonProps['size']) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  return sizes[size || 'md'];
};

/* === BASE COMPONENT === */

const BaseButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);

    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-lg border',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'select-none',
    ].join(' ');

    const widthClasses = fullWidth ? 'w-full' : '';

    const focusClasses =
      variant === 'universe' ? 'focus:ring-universe-primary' : `focus:ring-${variant}-500`;

    const allClasses = [
      baseClasses,
      variantClasses,
      sizeClasses,
      widthClasses,
      focusClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} disabled={disabled || loading} className={allClasses} {...props}>
        {/* Loading Spinner */}
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Left Icon */}
        {leftIcon && !loading && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}

        {/* Content */}
        <span className={loading ? 'opacity-75' : ''}>{children}</span>

        {/* Right Icon */}
        {rightIcon && !loading && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

BaseButton.displayName = 'BaseButton';

/* === PLUGIN-ENHANCED COMPONENT === */

export const Button = withPluginComponent<ButtonProps>('Button', BaseButton);

/* === EXPORT === */

export default Button;
