import React, { useState } from 'react';
import {
  FadeTransition,
  ScaleTransition,
  SlideDownTransition,
  SlideUpTransition,
  AnimatedLoadingSpinner,
  LoadingDots,
  LoadingPulse,
  LoadingBar,
  LoadingSkeleton,
  LoadingOverlay,
  HoverFeedback,
  FocusFeedback,
  ClickFeedback,
  Toast,
  Notification,
  StatusIndicator,
  ProgressIndicator,
  animationPatterns,
  animationUtils,
} from './index';
import { Button } from '../base';
import { PluginAnimationShowcase } from './PluginAnimationShowcase';

/**
 * Animation Framework Showcase
 *
 * This component serves as a comprehensive demonstration and testing ground
 * for the Universe Book Writer Animation Framework. It's designed for:
 *
 * - Plugin developers to understand available animations
 * - Testing animation components during development
 * - Visual reference for animation capabilities
 * - Code examples for implementation
 *
 * @category Development Tools
 * @subcategory Animation Framework
 */
export const AnimationShowcase: React.FC = () => {
  const [showTransitions, setShowTransitions] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(45);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const handleProgressIncrease = () => {
    setProgress(prev => Math.min(prev + 10, 100));
  };

  const handleProgressDecrease = () => {
    setProgress(prev => Math.max(prev - 10, 0));
  };

  const simulateLoading = () => {
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };
  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Developer Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Developer Showcase</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This page demonstrates all available animation components and utilities for plugin
                  developers. Use this as a reference for implementing animations in your plugins or
                  custom components.
                </p>
              </div>
            </div>
          </div>
        </div>

        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Animation Framework Showcase</h1>
          <p className="text-lg text-neutral-600">
            Comprehensive demonstration of the Universe Book Writer animation system
          </p>
        </header>

        {/* Transition Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Transition Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Basic Transitions</h3>
              <div className="space-y-4">
                <Button onClick={() => setShowTransitions(!showTransitions)} variant="primary">
                  Toggle Transitions
                </Button>

                <div className="space-y-2">
                  <FadeTransition show={showTransitions}>
                    <div className="p-3 bg-primary-100 rounded">Fade Transition</div>
                  </FadeTransition>

                  <ScaleTransition show={showTransitions}>
                    <div className="p-3 bg-secondary-100 rounded">Scale Transition</div>
                  </ScaleTransition>

                  <SlideDownTransition show={showTransitions}>
                    <div className="p-3 bg-accent-100 rounded">Slide Down Transition</div>
                  </SlideDownTransition>

                  <SlideUpTransition show={showTransitions}>
                    <div className="p-3 bg-success-100 rounded">Slide Up Transition</div>
                  </SlideUpTransition>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Animation Patterns</h3>
              <div className="space-y-3">
                <div className={animationPatterns.buttonHover}>
                  <div className="p-3 bg-blue-100 rounded cursor-pointer">Button Hover Pattern</div>
                </div>

                <div className={animationPatterns.cardHover}>
                  <div className="p-3 bg-green-100 rounded cursor-pointer">Card Hover Pattern</div>
                </div>

                <div className={animationPatterns.universeGlow}>
                  <div className="p-3 bg-purple-100 rounded">Universe Glow Pattern</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loading States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Loading States</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Spinners & Indicators</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <AnimatedLoadingSpinner size="sm" />
                  <AnimatedLoadingSpinner size="md" />
                  <AnimatedLoadingSpinner size="lg" />
                </div>

                <div className="flex items-center space-x-4">
                  <LoadingDots size="sm" />
                  <LoadingDots size="md" />
                  <LoadingDots size="lg" />
                </div>

                <LoadingPulse size="md" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Progress Bars</h3>
              <div className="space-y-4">
                <LoadingBar progress={progress} size="sm" />
                <LoadingBar progress={progress} size="md" />
                <LoadingBar progress={progress} size="lg" />

                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleProgressDecrease}>
                    -
                  </Button>
                  <Button size="sm" onClick={handleProgressIncrease}>
                    +
                  </Button>
                </div>

                <LoadingBar progress={loadingProgress} animated />
                <Button size="sm" onClick={simulateLoading}>
                  Simulate Loading
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Skeleton Loading</h3>
              <div className="space-y-4">
                <LoadingSkeleton height="1rem" />
                <LoadingSkeleton height="1.5rem" width="80%" />
                <LoadingSkeleton height="2rem" lines={3} />

                <Button size="sm" onClick={() => setShowOverlay(true)}>
                  Show Loading Overlay
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Feedback */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Interactive Feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Hover & Focus Effects</h3>
              <div className="space-y-4">
                <HoverFeedback scale shadow>
                  <div className="p-4 bg-blue-100 rounded cursor-pointer">
                    Hover with Scale & Shadow
                  </div>
                </HoverFeedback>

                <HoverFeedback fade lift>
                  <div className="p-4 bg-green-100 rounded cursor-pointer">
                    Hover with Fade & Lift
                  </div>
                </HoverFeedback>

                <FocusFeedback ring glow>
                  <button className="w-full p-4 bg-purple-100 rounded">
                    Focus with Ring & Glow
                  </button>
                </FocusFeedback>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Click Effects</h3>
              <div className="space-y-4">
                <ClickFeedback ripple scale>
                  <div className="p-4 bg-orange-100 rounded text-center cursor-pointer">
                    Click with Ripple & Scale
                  </div>
                </ClickFeedback>

                <ClickFeedback ripple disabled>
                  <div className="p-4 bg-gray-100 rounded text-center">Disabled Click Effect</div>
                </ClickFeedback>
              </div>
            </div>
          </div>
        </section>

        {/* Status & Progress Indicators */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Status & Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Status Indicators</h3>
              <div className="space-y-3">
                <StatusIndicator status="online" showLabel />
                <StatusIndicator status="busy" showLabel />
                <StatusIndicator status="away" showLabel />
                <StatusIndicator status="offline" showLabel />
                <StatusIndicator status="loading" showLabel />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-medium mb-4">Progress Indicators</h3>
              <div className="space-y-4">
                <ProgressIndicator current={7} total={10} showNumbers />
                <ProgressIndicator current={progress} total={100} />
                <ProgressIndicator current={loadingProgress} total={100} color="accent" />
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Notifications</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setShowToast(true)} variant="primary" size="sm">
                Show Toast
              </Button>

              <Button onClick={() => setShowNotification(true)} variant="secondary" size="sm">
                Show Notification
              </Button>
            </div>
          </div>
        </section>

        {/* Staggered Animation Demo */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Staggered Animations</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={animationUtils.createStaggeredAnimation(i, 100)}
                  style={{ animationFillMode: 'both' }}
                >
                  <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg text-center">
                    Item {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plugin Animation Showcase */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-800">Plugin Animation Showcase</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <PluginAnimationShowcase />
          </div>
        </section>
      </div>

      {/* Toast Notification */}
      <Toast
        show={showToast}
        type="success"
        title="Success!"
        message="Animation framework is working perfectly!"
        onClose={() => setShowToast(false)}
      />

      {/* Banner Notification */}
      <Notification
        show={showNotification}
        type="info"
        title="Animation Framework"
        message="All animation components are now available for use throughout the application."
        action={{
          label: 'Learn More',
          // eslint-disable-next-line no-console
          onClick: () => console.log('Learn more clicked'),
        }}
        onClose={() => setShowNotification(false)}
      />

      {/* Plugin Animation System */}
      <PluginAnimationShowcase />

      {/* Loading Overlay */}
      <LoadingOverlay
        show={showOverlay}
        type="spinner"
        size="lg"
        message="Processing your request..."
        onClose={() => setShowOverlay(false)}
      />
    </div>
  );
};
