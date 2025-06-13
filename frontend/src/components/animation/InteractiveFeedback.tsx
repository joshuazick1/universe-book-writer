import React, { useEffect, useState } from 'react';
import { animationClasses } from '../../utils/animations';

export interface FeedbackProps {
  children: React.ReactNode;
  className?: string;
}

export interface HoverFeedbackProps extends FeedbackProps {
  scale?: boolean;
  fade?: boolean;
  shadow?: boolean;
  lift?: boolean;
}

export interface FocusFeedbackProps extends FeedbackProps {
  ring?: boolean;
  scale?: boolean;
  glow?: boolean;
}

export interface ClickFeedbackProps extends FeedbackProps {
  ripple?: boolean;
  scale?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface ToastProps {
  show: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  onClose?: () => void;
  className?: string;
}

export interface NotificationProps {
  show: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
}

// Configuration objects
const toastTypeClasses = {
  success: 'bg-success-50 border-success-500 text-success-700',
  error: 'bg-error-50 border-error-500 text-error-700',
  warning: 'bg-warning-50 border-warning-500 text-warning-700',
  info: 'bg-info-50 border-info-500 text-info-700',
};

const toastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
};

/**
 * Hover feedback wrapper component
 */
export const HoverFeedback: React.FC<HoverFeedbackProps> = ({
  children,
  scale = true,
  fade = false,
  shadow = false,
  lift = false,
  className = '',
}) => {
  const feedbackClasses = [
    scale && animationClasses.hoverScale,
    fade && animationClasses.hoverFade,
    shadow && animationClasses.hoverShadow,
    lift && 'hover:-translate-y-1 transition-transform duration-250 ease-in-out',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={feedbackClasses}>{children}</div>;
};

/**
 * Focus feedback wrapper component
 */
export const FocusFeedback: React.FC<FocusFeedbackProps> = ({
  children,
  ring = true,
  scale = false,
  glow = false,
  className = '',
}) => {
  const feedbackClasses = [
    ring && animationClasses.focusRing,
    scale && animationClasses.focusScale,
    glow &&
      'focus:shadow-lg focus:shadow-primary-500/25 transition-shadow duration-250 ease-in-out',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={feedbackClasses}>{children}</div>;
};

/**
 * Click feedback wrapper component with ripple effect
 */
export const ClickFeedback: React.FC<ClickFeedbackProps> = ({
  children,
  ripple = true,
  scale = true,
  disabled = false,
  onClick,
  className = '',
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (ripple) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newRipple = { id: Date.now(), x, y };

      setRipples(prev => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }

    onClick?.();
  };

  const feedbackClasses = [
    'relative overflow-hidden',
    scale && 'active:scale-95 transition-transform duration-150 ease-in-out',
    !disabled && 'cursor-pointer',
    disabled && 'opacity-50 cursor-not-allowed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={feedbackClasses} onClick={handleClick}>
      {children}
      {ripple && !disabled && (
        <>
          {ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute bg-white opacity-30 rounded-full animate-ping"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

/**
 * Toast notification component
 */
export const Toast: React.FC<ToastProps> = ({
  show,
  type = 'info',
  title,
  message,
  duration = 4000,
  position = 'top-right',
  onClose,
  className = '',
}) => {
  useEffect(() => {
    if (show && duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, duration, onClose]);

  if (!show) return null;

  const typeClass = toastTypeClasses[type];
  const positionClass = positionClasses[position];
  const icon = toastIcons[type];

  return (
    <div
      className={`fixed z-50 ${positionClass} max-w-sm w-full mx-auto`}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`
          ${typeClass}
          border-l-4 p-4 rounded-r-lg shadow-lg
          ${animationClasses.enterFromTop}
          ${className}
        `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-lg font-medium">{icon}</span>
          </div>
          <div className="ml-3 flex-1">
            {title && <h4 className="text-sm font-medium mb-1">{title}</h4>}
            <p className="text-sm">{message}</p>
          </div>
          {onClose && (
            <button
              className="ml-4 flex-shrink-0 text-lg hover:opacity-70 transition-opacity"
              onClick={onClose}
              aria-label="Close notification"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Notification banner component
 */
export const Notification: React.FC<NotificationProps> = ({
  show,
  type = 'info',
  title,
  message,
  action,
  onClose,
  className = '',
}) => {
  if (!show) return null;

  const typeClass = toastTypeClasses[type];
  const icon = toastIcons[type];

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        ${typeClass}
        border-b p-4 shadow-sm
        ${animationClasses.enterFromTop}
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg font-medium mr-3">{icon}</span>
          <div>
            {title && <h4 className="font-medium">{title}</h4>}
            <p className="text-sm">{message}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {action && (
            <button
              className="text-sm font-medium hover:underline focus:underline focus:outline-none"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
          {onClose && (
            <button
              className="text-lg hover:opacity-70 transition-opacity focus:outline-none"
              onClick={onClose}
              aria-label="Close notification"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Status indicator component
 */
export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
  className?: string;
}

const statusColors = {
  online: 'bg-success-500',
  offline: 'bg-neutral-400',
  busy: 'bg-error-500',
  away: 'bg-warning-500',
  loading: 'bg-info-500',
};

const statusSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  label,
  showLabel = false,
  className = '',
}) => {
  const sizeClass = statusSizes[size];
  const colorClass = statusColors[status];
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`
          ${sizeClass}
          ${colorClass}
          rounded-full
          ${status === 'loading' ? animationClasses.pulse : ''}
        `}
        aria-label={`Status: ${displayLabel}`}
      />
      {showLabel && <span className="text-sm text-neutral-600">{displayLabel}</span>}
    </div>
  );
};

/**
 * Progress indicator component
 */
export interface ProgressIndicatorProps {
  current: number;
  total: number;
  showNumbers?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

const progressSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const progressColors = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  accent: 'bg-accent-500',
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  showNumbers = false,
  showPercentage = true,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const sizeClass = progressSizes[size];
  const colorClass = progressColors[color];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showNumbers && (
          <span className="text-sm font-medium text-neutral-700">
            {current} of {total}
          </span>
        )}
        {showPercentage && (
          <span className="text-sm font-medium text-neutral-700">{percentage}%</span>
        )}
      </div>
      <div className={`w-full bg-neutral-200 rounded-full overflow-hidden ${sizeClass}`}>
        <div
          className={`${sizeClass} ${colorClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
};
