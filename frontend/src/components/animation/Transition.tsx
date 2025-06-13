import React, { useEffect, useRef, useState } from 'react';
import { animationClasses } from '../../utils/animations';

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
  enter = animationClasses.enterFade,
  enterFrom = 'opacity-0',
  enterTo = 'opacity-100',
  leave = animationClasses.exitFade,
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
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (show && !isVisible) {
      // Entering
      setIsVisible(true);
      setIsAnimating(true);
      onEnter?.();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set end state after animation
      timeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        onEntered?.();
      }, duration);
    } else if (!show && isVisible) {
      // Leaving
      setIsAnimating(true);
      onLeave?.();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Hide after animation
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        onLeft?.();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, isVisible, duration, onEnter, onEntered, onLeave, onLeft]);

  if (!isVisible) {
    return null;
  }

  const getClasses = () => {
    const baseClasses = `transition-all duration-${duration}`;

    if (show && isAnimating) {
      // Entering animation
      return `${baseClasses} ${enter} ${enterFrom} ${className}`;
    } else if (show && !isAnimating) {
      // Entered state
      return `${baseClasses} ${enterTo} ${className}`;
    } else if (!show && isAnimating) {
      // Leaving animation
      return `${baseClasses} ${leave} ${leaveFrom} ${className}`;
    } else {
      // Left state
      return `${baseClasses} ${leaveTo} ${className}`;
    }
  };

  return (
    <div ref={nodeRef} className={getClasses()}>
      {children}
    </div>
  );
};

// Fade transition component
export const FadeTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition enter={animationClasses.enterFade} leave={animationClasses.exitFade} {...props} />
);

// Scale transition component
export const ScaleTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition enter={animationClasses.enterScale} leave={animationClasses.exitScale} {...props} />
);

// Slide transitions
export const SlideDownTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition enter={animationClasses.enterFromTop} leave={animationClasses.exitToTop} {...props} />
);

export const SlideUpTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enter={animationClasses.enterFromBottom}
    leave={animationClasses.exitToBottom}
    {...props}
  />
);

export const SlideRightTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enter={animationClasses.enterFromLeft}
    leave={animationClasses.exitToLeft}
    {...props}
  />
);

export const SlideLeftTransition: React.FC<Omit<TransitionProps, 'enter' | 'leave'>> = props => (
  <Transition
    enter={animationClasses.enterFromRight}
    leave={animationClasses.exitToRight}
    {...props}
  />
);
