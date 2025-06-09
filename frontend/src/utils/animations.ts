/**
 * Animation utilities for the Universe Book Writer frontend
 * Provides consistent animation patterns across the application
 */

export type AnimationDuration = 'fast' | 'normal' | 'slow';
export type AnimationEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export const animationDurations = {
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
} as const;

export const animationEasings = {
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  linear: 'linear',
} as const;

/**
 * Base animation configurations
 */
export const baseAnimations = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  // Scale animations
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0.95)', opacity: 0 },
  },

  // Slide animations
  slideInFromTop: {
    from: { transform: 'translateY(-10px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInFromBottom: {
    from: { transform: 'translateY(10px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInFromLeft: {
    from: { transform: 'translateX(-10px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  slideInFromRight: {
    from: { transform: 'translateX(10px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },

  // Bounce animation
  bounce: {
    '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
    '40%, 43%': { transform: 'translate3d(0, -30px, 0)' },
    '70%': { transform: 'translate3d(0, -15px, 0)' },
    '90%': { transform: 'translate3d(0, -4px, 0)' },
  },

  // Pulse animation
  pulse: {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
  },

  // Spin animation
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
} as const;

/**
 * CSS class names for common animations
 */
export const animationClasses = {
  // Transitions
  transition: 'transition-all duration-250 ease-in-out',
  transitionFast: 'transition-all duration-150 ease-in-out',
  transitionSlow: 'transition-all duration-400 ease-in-out',

  // Hover effects
  hoverScale: 'hover:scale-105 transition-transform duration-250 ease-in-out',
  hoverFade: 'hover:opacity-80 transition-opacity duration-250 ease-in-out',
  hoverShadow: 'hover:shadow-lg transition-shadow duration-250 ease-in-out',

  // Focus effects
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  focusScale: 'focus:scale-105 transition-transform duration-150 ease-in-out',

  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',

  // Enter/exit animations
  enterFromTop: 'animate-in slide-in-from-top-2 duration-250 ease-out',
  enterFromBottom: 'animate-in slide-in-from-bottom-2 duration-250 ease-out',
  enterFromLeft: 'animate-in slide-in-from-left-2 duration-250 ease-out',
  enterFromRight: 'animate-in slide-in-from-right-2 duration-250 ease-out',
  enterFade: 'animate-in fade-in duration-250 ease-out',
  enterScale: 'animate-in zoom-in-95 duration-250 ease-out',

  exitToTop: 'animate-out slide-out-to-top-2 duration-200 ease-in',
  exitToBottom: 'animate-out slide-out-to-bottom-2 duration-200 ease-in',
  exitToLeft: 'animate-out slide-out-to-left-2 duration-200 ease-in',
  exitToRight: 'animate-out slide-out-to-right-2 duration-200 ease-in',
  exitFade: 'animate-out fade-out duration-200 ease-in',
  exitScale: 'animate-out zoom-out-95 duration-200 ease-in',
} as const;

/**
 * Advanced animation patterns
 */
export const animationPatterns = {
  // Page transitions
  pageTransition: {
    enter: 'animate-in slide-in-from-right duration-300 ease-out',
    exit: 'animate-out slide-out-to-left duration-200 ease-in',
  },
  modalTransition: {
    enter: 'animate-in fade-in zoom-in-95 duration-200 ease-out',
    exit: 'animate-out fade-out zoom-out-95 duration-150 ease-in',
  },
  drawerTransition: {
    enter: 'animate-in slide-in-from-left duration-300 ease-out',
    exit: 'animate-out slide-out-to-left duration-200 ease-in',
  },

  // Staggered animations
  staggeredFadeIn: (index: number, baseDelay: number = 100): string => {
    return `animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out`;
  },

  // Interactive states
  buttonHover: 'hover:scale-105 hover:shadow-lg transition-all duration-200 ease-out',
  cardHover: 'hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ease-out',
  linkHover: 'hover:text-primary-600 transition-colors duration-150 ease-in-out',

  // Loading patterns
  skeleton:
    'animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]',
  shimmer:
    'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',

  // Status animations
  success: 'animate-in zoom-in-95 duration-300 ease-out text-success-600',
  error: 'animate-in shake duration-500 ease-in-out text-error-600',
  warning: 'animate-in pulse duration-1000 ease-in-out text-warning-600',

  // Universe-specific patterns
  universeGlow: 'animate-pulse shadow-lg shadow-universe-primary/30',
  universeTransition: 'transition-all duration-500 ease-in-out',
} as const;

/**
 * Animation utility functions
 */
export const animationUtils = {
  /**
   * Create a custom animation class string
   */
  createAnimation: (
    duration: AnimationDuration = 'normal',
    easing: AnimationEasing = 'ease-in-out'
  ): string => {
    const durationClass = {
      fast: 'duration-150',
      normal: 'duration-250',
      slow: 'duration-400',
    }[duration];

    const easingClass = {
      ease: 'ease',
      'ease-in': 'ease-in',
      'ease-out': 'ease-out',
      'ease-in-out': 'ease-in-out',
      linear: 'ease-linear',
    }[easing];

    return `transition-all ${durationClass} ${easingClass}`;
  },

  /**
   * Get staggered animation delay
   */
  getStaggerDelay: (index: number, baseDelay: number = 50): string => {
    return `style="animation-delay: ${index * baseDelay}ms"`;
  },

  /**
   * Create staggered animation classes
   */
  createStaggeredAnimation: (
    index: number,
    baseDelay: number = 100,
    animation: string = 'animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out'
  ): string => {
    return `${animation} [animation-delay:${index * baseDelay}ms]`;
  },

  /**
   * Combine multiple animation classes
   */
  combineAnimations: (...classes: string[]): string => {
    return classes.filter(Boolean).join(' ');
  },

  /**
   * Create responsive animation (respect user preferences)
   */
  respectMotionPreference: (animation: string): string => {
    return `motion-safe:${animation} motion-reduce:transition-none`;
  },

  /**
   * Create conditional animation based on state
   */
  conditionalAnimation: (
    condition: boolean,
    trueAnimation: string,
    falseAnimation?: string
  ): string => {
    return condition ? trueAnimation : falseAnimation || '';
  },

  /**
   * Performance optimized animation
   */
  performantAnimation: (animation: string): string => {
    return `will-change-transform transform-gpu ${animation}`;
  },
} as const;

export type AnimationClass = keyof typeof animationClasses;
export type BaseAnimation = keyof typeof baseAnimations;
