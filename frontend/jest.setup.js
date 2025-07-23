/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
// Mock DOM APIs that might be missing in jsdom
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '0px';
    thresholds = [0];
    constructor(_callback, _options) { }
    observe(_target) { }
    unobserve(_target) { }
    disconnect() { }
    takeRecords() {
        return [];
    }
};
// Mock navigator.clipboard for testing
Object.assign(navigator, {
    clipboard: {
        writeText: () => Promise.resolve(),
        readText: () => Promise.resolve(''),
    },
});
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { }, // deprecated
        removeListener: () => { }, // deprecated
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});
// Suppress React 18 console errors/warnings during tests
const originalError = console.error;
console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
    }
    originalError.call(console, ...args);
};
//# sourceMappingURL=jest.setup.js.map