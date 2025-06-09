/**
 * Card Component - Universe Book Writer
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
    default: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
    elevated:
      'bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700',
    outlined: 'bg-transparent border-2 border-neutral-300 dark:border-neutral-600',
    universe: 'universe-surface universe-border',
  };

  return variants[variant || 'default'];
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
      ...props
    },
    ref
  ) => {
    const variantClasses = getVariantClasses(variant);
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
          variant === 'universe' ? 'focus:ring-universe-primary' : 'focus:ring-primary-500',
        ].join(' ')
      : '';

    const allClasses = [baseClasses, variantClasses, interactiveClasses, className]
      .filter(Boolean)
      .join(' ');

    const contentClasses = paddingClasses;

    return (
      <div
        ref={ref}
        className={allClasses}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {/* Header */}
        {header && (
          <div
            className={`${paddingClasses} border-b border-neutral-200 dark:border-neutral-700 ${
              variant === 'universe' ? 'border-universe-accent' : ''
            }`}
          >
            {header}
          </div>
        )}

        {/* Content */}
        <div className={header || footer ? contentClasses : contentClasses}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={`${paddingClasses} border-t border-neutral-200 dark:border-neutral-700 ${
              variant === 'universe' ? 'border-universe-accent' : ''
            }`}
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
  ...props
}) => {
  return (
    <div className={`flex items-start justify-between ${className}`} {...props}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
        )}
        {children}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
};

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`text-neutral-700 dark:text-neutral-300 ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
};

/* === EXPORT === */

export default Card;
