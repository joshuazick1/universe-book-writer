import React, { useEffect, useRef, useState } from 'react';

export interface TransitionProps {
  show: boolean;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  duration?: number;
  children: React.ReactNode;
  className?: string;
  onEnter?: () => void;
  onEntered?: () => void;
  onLeave?: () => void;
  onLeft?: () => void;
}

export const Transition: React.FC<TransitionProps> = ({
  show,
  enter = '',
  enterFrom = 'opacity-0',
  enterTo = 'opacity-100',
  leave = '',
  leaveFrom = 'opacity-100',
  leaveTo = 'opacity-0',
  duration = 250,
  children,
  className = '',
  onEnter,
  onEntered,
  onLeave,
  onLeft,
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(show);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (show) {
      // Show element first
      setShouldRender(true);
      onEnter?.();
      // Then trigger transition on next frame
      requestAnimationFrame(() => {
        setIsVisible(true);
        setTimeout(() => onEntered?.(), duration);
      });
    } else {
      // Start exit animation
      onLeave?.();
      setIsVisible(false);
      // Remove from DOM after animation completes
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        onLeft?.();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration, onEnter, onEntered, onLeave, onLeft]);

  if (!shouldRender) {
    return null;
  }

  // Build classes based on state
  const transitionClasses = `transition-all ease-in-out`;
  const stateClasses = isVisible ? enterTo : enterFrom;
  const finalClasses = `${transitionClasses} ${stateClasses} ${className}`.trim();

  return (
    <div
      className={finalClasses}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

// Fade transition component
export const FadeTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enterFrom="opacity-0"
    enterTo="opacity-100"
    leaveFrom="opacity-100"
    leaveTo="opacity-0"
    {...props}
  />
);

// Scale transition component
export const ScaleTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enterFrom="opacity-0 scale-90"
    enterTo="opacity-100 scale-100"
    leaveFrom="opacity-100 scale-100"
    leaveTo="opacity-0 scale-90"
    {...props}
  />
);

// Slide transitions
export const SlideDownTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enterFrom="opacity-0 -translate-y-2"
    enterTo="opacity-100 translate-y-0"
    leaveFrom="opacity-100 translate-y-0"
    leaveTo="opacity-0 -translate-y-2"
    {...props}
  />
);

export const SlideUpTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enterFrom="opacity-0 translate-y-2"
    enterTo="opacity-100 translate-y-0"
    leaveFrom="opacity-100 translate-y-0"
    leaveTo="opacity-0 translate-y-2"
    {...props}
  />
);

export const SlideRightTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enterFrom="opacity-0 -translate-x-2"
    enterTo="opacity-100 translate-x-0"
    leaveFrom="opacity-100 translate-x-0"
    leaveTo="opacity-0 -translate-x-2"
    {...props}
  />
);

export const SlideLeftTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enterFrom="opacity-0 translate-x-2"
    enterTo="opacity-100 translate-x-0"
    leaveFrom="opacity-100 translate-x-0"
    leaveTo="opacity-0 translate-x-2"
    {...props}
  />
);
