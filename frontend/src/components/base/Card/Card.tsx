/**
 * Card Component - VerseForge
 * Base card component with universe theme support and plugin extensibility
 */

import React, { forwardRef } from 'react';
import { withPluginComponent } from '../../providers/PluginRegistryProvider';

/* === TYPES === */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'universe';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  interactive?: boolean;
  universe?: string;
}

/* === STYLE VARIANTS === */

const getVariantClasses = (variant: CardProps['variant']) => {
  const variants = {
    default: 'border',
    elevated: 'shadow-lg border',
    outlined: 'bg-transparent border-2',
    universe: 'universe-surface universe-border',
  };

  return variants[variant || 'default'];
};

const getVariantStyles = (variant: CardProps['variant']) => {
  if (variant === 'universe') {
    return {}; // Universe variant uses CSS custom properties
  }

  const styles = {
    default: {
      backgroundColor: 'var(--color-universe-surface)',
      borderColor: 'var(--color-universe-primary)',
      color: 'var(--color-universe-text)'
    },
    elevated: {
      backgroundColor: 'var(--color-universe-surface)',
      borderColor: 'var(--color-universe-primary)',
      color: 'var(--color-universe-text)'
    },
    outlined: {
      borderColor: 'var(--color-universe-primary)',
      color: 'var(--color-universe-text)'
    }
  };

  return styles[variant || 'default'];
};

const getPaddingClasses = (padding: CardProps['padding']) => {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  return paddings[padding || 'md'];
};

/* === BASE COMPONENT === */

const BaseCard = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      header,
      footer,
      interactive = false,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const variantClasses = getVariantClasses(variant);
    const variantStyles = getVariantStyles(variant);
    const paddingClasses = getPaddingClasses(padding);

    const baseClasses = ['rounded-lg', 'transition-all duration-200'].join(' ');

    const interactiveClasses = interactive
      ? [
        'cursor-pointer',
        'hover:shadow-md',
        'hover:scale-[1.02]',
        'active:scale-[0.98]',
        'focus:outline-none',
        'focus:ring-2 focus:ring-offset-2',
        variant === 'universe' ? 'focus:ring-universe-primary' : 'focus:ring-2',
      ].join(' ')
      : '';

    const allClasses = [baseClasses, variantClasses, interactiveClasses, className]
      .filter(Boolean)
      .join(' ');

    const contentClasses = paddingClasses;

    const combinedStyles = {
      ...variantStyles,
      ...style
    };

    return (
      <div
        ref={ref}
        className={allClasses}
        style={combinedStyles}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {/* Header */}
        {header && (
          <div
            className={`${paddingClasses} border-b ${variant === 'universe' ? 'border-universe-accent' : ''
              }`}
            style={variant !== 'universe' ? { borderColor: 'var(--color-universe-primary)' } : {}}
          >
            {header}
          </div>
        )}

        {/* Content */}
        <div className={header || footer ? contentClasses : contentClasses}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={`${paddingClasses} border-t ${variant === 'universe' ? 'border-universe-accent' : ''
              }`}
            style={variant !== 'universe' ? { borderColor: 'var(--color-universe-primary)' } : {}}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

BaseCard.displayName = 'BaseCard';

/* === PLUGIN-ENHANCED COMPONENT === */

export const Card = withPluginComponent<CardProps>('Card', BaseCard);

/* === ADDITIONAL CARD COMPONENTS === */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  style,
  ...props
}) => {
  const headerStyles = {
    color: 'var(--color-universe-text)',
    ...style
  };

  return (
    <div className={`flex items-start justify-between ${className}`} style={headerStyles} {...props}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-semibold truncate" style={{ color: 'var(--color-universe-text)' }}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-universe-text)', opacity: 0.7 }}>{subtitle}</p>
        )}
        {children}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
};

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardContent: React.FC<CardContentProps> = ({ children, className = '', style, ...props }) => {
  const contentStyles = {
    color: 'var(--color-universe-text)',
    ...style
  };

  return (
    <div className={className} style={contentStyles} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', style, ...props }) => {
  const footerStyles = {
    color: 'var(--color-universe-text)',
    ...style
  };

  return (
    <div className={`flex items-center justify-between ${className}`} style={footerStyles} {...props}>
      {children}
    </div>
  );
};

/* === EXPORT === */

export default Card;
