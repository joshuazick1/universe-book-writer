/**
 * Button Component - VerseForge
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
    primary: 'border',
    secondary: 'border',
    accent: 'border',
    ghost: 'bg-transparent border',
    universe: 'bg-universe-primary hover:brightness-110 text-universe-text border-universe-primary universe-glow',
  };

  return variants[variant || 'primary'];
};

const getVariantStyles = (variant: ButtonProps['variant']) => {
  if (variant === 'universe') {
    return {}; // Universe variant uses CSS custom properties
  }

  const styles = {
    primary: {
      backgroundColor: 'var(--color-universe-primary)',
      color: 'var(--color-universe-background)',
      borderColor: 'var(--color-universe-primary)',
    },
    secondary: {
      backgroundColor: 'var(--color-universe-surface)',
      color: 'var(--color-universe-text)',
      borderColor: 'var(--color-universe-primary)',
    },
    accent: {
      backgroundColor: 'var(--color-universe-accent)',
      color: 'var(--color-universe-background)',
      borderColor: 'var(--color-universe-accent)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-universe-text)',
      borderColor: 'var(--color-universe-primary)',
    },
  };

  return styles[variant || 'primary'];
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
      style,
      ...props
    },
    ref
  ) => {
    const variantClasses = getVariantClasses(variant);
    const variantStyles = getVariantStyles(variant);
    const sizeClasses = getSizeClasses(size);

    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-lg',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'select-none',
      'hover:opacity-80',
    ].join(' ');

    const widthClasses = fullWidth ? 'w-full' : '';

    const focusClasses =
      variant === 'universe' ? 'focus:ring-universe-primary' : 'focus:ring-2';

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

    const combinedStyles = {
      ...variantStyles,
      ...style
    };

    return (
      <button ref={ref} disabled={disabled || loading} className={allClasses} style={combinedStyles} {...props}>
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
