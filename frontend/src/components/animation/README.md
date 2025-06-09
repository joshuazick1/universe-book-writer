# Animation Framework

The Universe Book Writer Animation Framework provides a comprehensive set of animation components and utilities for creating smooth, accessible, and performant user interfaces.

## Overview

This framework is designed with plugin developers in mind, offering:

- **Consistent animations** across all plugins and components
- **Accessibility-first** approach with motion preference respect
- **Performance-optimized** animations using CSS transforms and GPU acceleration
- **TypeScript support** with full type definitions
- **Tailwind CSS integration** for easy customization

## Components

### Loading States

The framework provides various loading indicators for different use cases:

```tsx
import { LoadingSpinner, LoadingDots, LoadingPulse, LoadingBar, LoadingSkeleton, LoadingOverlay } from './animation';

// Spinner loader
<LoadingSpinner size="md" color="primary" />

// Animated dots
<LoadingDots size="lg" color="accent" />

// Pulsing circle
<LoadingPulse size="xl" />

// Progress bar
<LoadingBar progress={75} size="md" color="primary" animated />

// Content placeholder
<LoadingSkeleton width="100%" height="20px" lines={3} />

// Full-screen overlay
<LoadingOverlay
  show={isLoading}
  type="spinner"
  message="Loading content..."
  onClose={() => setIsLoading(false)}
/>
```

### Interactive Feedback

Enhance user interactions with responsive feedback components:

```tsx
import { HoverFeedback, FocusFeedback, ClickFeedback, Toast, Notification, StatusIndicator, ProgressIndicator } from './animation';

// Hover effects
<HoverFeedback effect="scale">
  <button>Hover me</button>
</HoverFeedback>

// Focus indicators
<FocusFeedback>
  <input type="text" />
</FocusFeedback>

// Click feedback
<ClickFeedback effect="ripple">
  <button>Click me</button>
</ClickFeedback>

// Toast notifications
<Toast
  show={showToast}
  type="success"
  message="Operation completed!"
  onClose={() => setShowToast(false)}
/>

// Status indicators
<StatusIndicator status="online" label="System Status" />

// Progress indicators
<ProgressIndicator
  value={progress}
  max={100}
  showValue
  animated
/>
```

### Transitions

Smooth transitions between states and components:

```tsx
import { FadeTransition, ScaleTransition, SlideDownTransition, SlideUpTransition } from './animation';

// Fade in/out
<FadeTransition show={isVisible}>
  <div>Content to fade</div>
</FadeTransition>

// Scale animation
<ScaleTransition show={isVisible}>
  <modal>Modal content</modal>
</ScaleTransition>

// Slide transitions
<SlideDownTransition show={isDropdownOpen}>
  <div>Dropdown content</div>
</SlideDownTransition>
```

## Utilities

### Animation Classes

Pre-defined animation classes for common effects:

```tsx
import { animationClasses } from './animation';

// Use in className
<div className={animationClasses.spin}>Spinning element</div>
<div className={animationClasses.bounce}>Bouncing element</div>
<div className={animationClasses.pulse}>Pulsing element</div>
<div className={animationClasses.enterFade}>Fade in element</div>
```

### Animation Patterns

Advanced animation patterns for complex interactions:

```tsx
import { animationPatterns } from './animation';

// Page transitions
<div className={animationPatterns.pageTransition.enter}>
  New page content
</div>

// Staggered list animations
<ul>
  {items.map((item, index) => (
    <li
      key={item.id}
      className={animationPatterns.staggeredList.item}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {item.content}
    </li>
  ))}
</ul>
```

### Animation Utilities

Helper functions for dynamic animations:

```tsx
import { animationUtils } from './animation';

// Create staggered animations
const staggeredClasses = animationUtils.createStaggeredAnimation(itemCount, 100);

// Respect user motion preferences
const shouldAnimate = animationUtils.respectMotionPreference();

// Conditional animations
const className = animationUtils.conditionalAnimation(
  shouldShow,
  'opacity-100 scale-100',
  'opacity-0 scale-95'
);

// Performance-optimized animations
const optimizedClass = animationUtils.performantAnimation('transform', 'scale-110');
```

## Customization

### Tailwind Configuration

The framework extends Tailwind CSS with custom animations. These are automatically available in your project:

```css
/* Custom keyframes available */
@keyframes shimmer {
  /* ... */
}
@keyframes shake {
  /* ... */
}
@keyframes float {
  /* ... */
}
@keyframes glow {
  /* ... */
}

/* Usage in classes */
.animate-shimmer {
  animation: shimmer 2s infinite;
}
.animate-shake {
  animation: shake 0.5s ease-in-out;
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}
.animate-glow {
  animation: glow 2s ease-in-out infinite alternate;
}
```

### Theme Integration

All components respect the current theme and can be customized through CSS custom properties:

```css
:root {
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-duration-slow: 500ms;
  --animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Accessibility

The animation framework is built with accessibility in mind:

- **Respects `prefers-reduced-motion`** settings
- **Proper ARIA labels** and roles for loading states
- **Keyboard navigation** support for interactive elements
- **Screen reader** friendly with appropriate semantic markup

## Performance

Animations are optimized for performance:

- **GPU acceleration** using CSS transforms
- **Efficient re-renders** with React.memo where appropriate
- **Conditional rendering** to avoid unnecessary DOM updates
- **CSS-based animations** for smooth 60fps performance

## Plugin Development

When developing plugins, use these animation components to maintain consistency:

1. **Import from the animation module**: Always use the centralized animation components
2. **Follow the design system**: Use predefined sizes, colors, and timing
3. **Test with reduced motion**: Ensure your plugin works with accessibility settings
4. **Document custom animations**: If creating plugin-specific animations, document them

## Testing

Visit the Animation Showcase (`/animation-showcase`) to:

- **Test all components** interactively
- **View code examples** for implementation
- **Verify accessibility** features
- **Check performance** across different devices

## Examples

For complete implementation examples, see:

- `AnimationShowcase.tsx` - Comprehensive demonstration
- Individual component files for specific use cases
- Plugin implementations in the `/plugins` directory

## Support

For questions or issues with the animation framework:

1. Check the showcase page for examples
2. Review component TypeScript definitions
3. Consult the main project documentation
4. Create an issue in the project repository
