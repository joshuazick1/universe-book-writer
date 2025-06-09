/**
 * Animation Framework Components
 * Comprehensive animation system for the Universe Book Writer frontend
 */

// Base transition components
export {
  Transition,
  FadeTransition,
  ScaleTransition,
  SlideDownTransition,
  SlideUpTransition,
  SlideRightTransition,
  SlideLeftTransition,
  type TransitionProps,
} from './Transition';

// Loading state components
export {
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  LoadingBar,
  LoadingSkeleton,
  LoadingOverlay,
  type LoadingSpinnerProps,
  type LoadingDotsProps,
  type LoadingPulseProps,
  type LoadingBarProps,
  type LoadingSkeletonProps,
  type LoadingOverlayProps,
} from './LoadingStates';

// Interactive feedback components
export {
  HoverFeedback,
  FocusFeedback,
  ClickFeedback,
  Toast,
  Notification,
  StatusIndicator,
  ProgressIndicator,
  type HoverFeedbackProps,
  type FocusFeedbackProps,
  type ClickFeedbackProps,
  type ToastProps,
  type NotificationProps,
  type StatusIndicatorProps,
  type ProgressIndicatorProps,
} from './InteractiveFeedback';

// Animation utilities
export {
  animationDurations,
  animationEasings,
  baseAnimations,
  animationClasses,
  animationPatterns,
  animationUtils,
  type AnimationDuration,
  type AnimationEasing,
  type AnimationClass,
  type BaseAnimation,
} from '../../utils/animations';

// Demo and testing components
export { AnimationShowcase } from './AnimationShowcase';
