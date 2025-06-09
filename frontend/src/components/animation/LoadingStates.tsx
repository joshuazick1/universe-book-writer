import React from 'react';
import { animationClasses } from '../../utils/animations';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral';
  className?: string;
}

export interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral';
  className?: string;
}

export interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface LoadingBarProps {
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral';
  className?: string;
  animated?: boolean;
}

export interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animated?: boolean;
}

// Size configurations
const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const dotsSizes = {
  sm: 'w-1 h-1',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

const pulseSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const barSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

// Color configurations
const colorClasses = {
  primary: 'text-primary-500 border-primary-500',
  secondary: 'text-secondary-500 border-secondary-500',
  accent: 'text-accent-500 border-accent-500',
  neutral: 'text-neutral-500 border-neutral-500',
};

const backgroundColorClasses = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  accent: 'bg-accent-500',
  neutral: 'bg-neutral-500',
};

/**
 * Spinning circle loader
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const sizeClass = spinnerSizes[size];
  const colorClass = colorClasses[color];

  return (
    <div
      className={`${sizeClass} ${colorClass} border-2 border-t-transparent rounded-full ${animationClasses.spin} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Three bouncing dots loader
 */
export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const sizeClass = dotsSizes[size];
  const bgColorClass = backgroundColorClasses[color];

  return (
    <div className={`flex space-x-1 ${className}`} role="status" aria-label="Loading">
      <div
        className={`${sizeClass} ${bgColorClass} rounded-full animate-bounce`}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={`${sizeClass} ${bgColorClass} rounded-full animate-bounce`}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={`${sizeClass} ${bgColorClass} rounded-full animate-bounce`}
        style={{ animationDelay: '300ms' }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Pulsing circle loader
 */
export const LoadingPulse: React.FC<LoadingPulseProps> = ({ size = 'md', className = '' }) => {
  const sizeClass = pulseSizes[size];

  return (
    <div className={`relative ${className}`} role="status" aria-label="Loading">
      <div className={`${sizeClass} bg-primary-500 rounded-full ${animationClasses.pulse}`} />
      <div
        className={`absolute inset-0 ${sizeClass} bg-primary-500 rounded-full ${animationClasses.pulse}`}
        style={{ animationDelay: '0.5s' }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Progress bar loader
 */
export const LoadingBar: React.FC<LoadingBarProps> = ({
  progress = 0,
  size = 'md',
  color = 'primary',
  className = '',
  animated = true,
}) => {
  const sizeClass = barSizes[size];
  const bgColorClass = backgroundColorClasses[color];

  return (
    <div
      className={`w-full bg-neutral-200 rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${sizeClass} ${bgColorClass} rounded-full transition-all duration-300 ease-out ${
          animated && progress === 0 ? 'animate-pulse' : ''
        }`}
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
};

/**
 * Skeleton loader for content placeholders
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '1rem',
  lines = 1,
  className = '',
  animated = true,
}) => {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  const skeletonLines = Array.from({ length: lines }, (_, index) => (
    <div
      key={index}
      className={`bg-neutral-200 rounded ${animated ? animationClasses.pulse : ''} ${
        index < lines - 1 ? 'mb-2' : ''
      }`}
      style={{
        width: index === lines - 1 && lines > 1 ? '75%' : widthStyle,
        height: heightStyle,
      }}
    />
  ));

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading content">
      {skeletonLines}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};

/**
 * Combined loading overlay component
 */
export interface LoadingOverlayProps {
  show: boolean;
  type?: 'spinner' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'accent' | 'neutral';
  message?: string;
  className?: string;
  backdrop?: boolean;
  onClose?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  show,
  type = 'spinner',
  size = 'lg',
  color = 'primary',
  message,
  className = '',
  backdrop = true,
  onClose,
}) => {
  if (!show) return null;

  const LoaderComponent = {
    spinner: LoadingSpinner,
    dots: LoadingDots,
    pulse: LoadingPulse,
  }[type];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        backdrop ? 'bg-black bg-opacity-50' : ''
      } ${animationClasses.enterFade} ${className}`}
      role="status"
      aria-label={message || 'Loading'}
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg relative"
        onClick={e => e.stopPropagation()}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
        <LoaderComponent size={size === 'xl' ? 'lg' : size} color={color} />
        {message && <p className="text-sm text-neutral-600 text-center max-w-xs">{message}</p>}
      </div>
    </div>
  );
};
