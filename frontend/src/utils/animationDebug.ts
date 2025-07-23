/**
 * Animation Troubleshooting Guide
 * 
 * This guide helps identify and resolve common issues with the animation framework.
 */

export const troubleshootingSteps = [
    {
        issue: "Transitions not animating",
        causes: [
            "CSS transition classes not loading",
            "JavaScript state not updating",
            "Tailwind CSS not compiled with animation classes",
            "Browser performance settings disabling animations"
        ],
        solutions: [
            "Check browser DevTools for missing CSS classes",
            "Verify state updates in React DevTools",
            "Ensure Tailwind config includes animation utilities",
            "Test in different browser or disable 'Reduce motion' setting"
        ]
    },
    {
        issue: "Animations appear jerky or broken",
        causes: [
            "Missing CSS transform-origin properties",
            "Conflicting CSS styles",
            "GPU acceleration not enabled",
            "Too many animations running simultaneously"
        ],
        solutions: [
            "Add will-change: transform CSS property",
            "Use transform3d() for GPU acceleration",
            "Reduce concurrent animations",
            "Check for CSS specificity conflicts"
        ]
    },
    {
        issue: "Transitions happen too fast or slow",
        causes: [
            "Incorrect duration values",
            "Animation preferences in browser/OS",
            "CSS easing functions not working"
        ],
        solutions: [
            "Adjust duration prop in transition components",
            "Check prefers-reduced-motion media query",
            "Test with different easing functions"
        ]
    }
];

export const diagnosticChecks = {
    // Check if Tailwind animations are available
    checkTailwindAnimations: () => {
        const testElement = document.createElement('div');
        testElement.className = 'animate-fade-in opacity-0 transition-opacity duration-300';
        document.body.appendChild(testElement);

        const computedStyle = window.getComputedStyle(testElement);
        const hasTransition = computedStyle.transitionProperty !== 'none';
        const hasOpacity = computedStyle.opacity === '0';

        document.body.removeChild(testElement);

        return {
            tailwindLoaded: hasTransition && hasOpacity,
            transitionProperty: computedStyle.transitionProperty,
            transitionDuration: computedStyle.transitionDuration
        };
    },

    // Check browser animation support
    checkBrowserSupport: () => {
        return {
            cssTransitions: 'transition' in document.documentElement.style,
            cssTransforms: 'transform' in document.documentElement.style,
            cssAnimations: 'animation' in document.documentElement.style,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
    },

    // Performance checks
    checkPerformance: () => {
        return {
            devicePixelRatio: window.devicePixelRatio,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            memory: (navigator as any).deviceMemory || 'unknown'
        };
    }
};

export const debugAnimation = (elementId: string, animationType: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID "${elementId}" not found`);
        return;
    }

    console.group(`🎭 Animation Debug: ${animationType}`);
    console.log('Element:', element);
    console.log('Computed styles:', window.getComputedStyle(element));
    console.log('Classes:', element.className);
    console.log('Inline styles:', element.style.cssText);

    // Listen for transition events
    const events = ['transitionstart', 'transitionend', 'transitioncancel'];
    events.forEach(event => {
        element.addEventListener(event, (e) => {
            console.log(`${event}:`, e);
        }, { once: true });
    });

    console.groupEnd();
};
