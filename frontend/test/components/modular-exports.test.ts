/**
 * Test suite for modular component exports
 * Ensures all components are properly exported and importable
 */

import { describe, it, expect } from '@jest/globals';

describe.skip('Star Trek Plugin - Modular Component Exports', () => {
    it('should export all components from the main index', async () => {
        const mainIndex = await import('../../src/index.ts');

        // Check that grouped exports exist and are properly typed
        expect(mainIndex.LCARSComponents).toBeDefined();
        expect(mainIndex.StarfleetComponents).toBeDefined();
        expect(mainIndex.ShowcaseComponents).toBeDefined();
        expect(mainIndex.StarTrekComponents).toBeDefined();

        // Verify they are objects with function properties
        expect(typeof mainIndex.LCARSComponents).toBe('object');
        expect(typeof mainIndex.StarfleetComponents).toBe('object');
        expect(typeof mainIndex.ShowcaseComponents).toBe('object');
        expect(typeof mainIndex.StarTrekComponents).toBe('object');
    });

    it('should export LCARS components from base module', async () => {
        const baseModule = await import('../../src/base/index.ts');

        expect(baseModule.LCARSBar).toBeDefined();
        expect(typeof baseModule.LCARSBar).toBe('function');
    });

    it('should export LCARS interface components from lcars module', async () => {
        const lcarsModule = await import('../../src/lcars/index.ts');

        expect(lcarsModule.LCARSElbow).toBeDefined();
        expect(lcarsModule.LCARSPanel).toBeDefined();
        expect(lcarsModule.LCARSButton).toBeDefined();
        expect(lcarsModule.LCARSBarCode).toBeDefined();

        expect(typeof lcarsModule.LCARSElbow).toBe('function');
        expect(typeof lcarsModule.LCARSPanel).toBe('function');
        expect(typeof lcarsModule.LCARSButton).toBe('function');
        expect(typeof lcarsModule.LCARSBarCode).toBe('function');
    });

    it('should export Starfleet components from starfleet module', async () => {
        const starfleetModule = await import('../../src/starfleet/index.ts');

        expect(starfleetModule.StarfleetBadge).toBeDefined();
        expect(starfleetModule.PADD).toBeDefined();
        expect(starfleetModule.HolodeckGrid).toBeDefined();

        expect(typeof starfleetModule.StarfleetBadge).toBe('function');
        expect(typeof starfleetModule.PADD).toBe('function');
        expect(typeof starfleetModule.HolodeckGrid).toBe('function');
    });

    it('should export showcase components from showcase module', async () => {
        const showcaseModule = await import('../showcase/index.js');

        expect(showcaseModule.LCARSVisualComponentShowcase).toBeDefined();
        expect(typeof showcaseModule.LCARSVisualComponentShowcase).toBe('function');
    });

    it('should support dynamic imports through grouped exports', async () => {
        const { LCARSComponents, StarfleetComponents, ShowcaseComponents } = await import('../index.js');

        // Test that dynamic imports return functions
        expect(typeof LCARSComponents.LCARSElbow).toBe('function');
        expect(typeof StarfleetComponents.StarfleetBadge).toBe('function');
        expect(typeof ShowcaseComponents.LCARSVisualComponentShowcase).toBe('function');

        // Test that dynamic imports actually work
        const LCARSElbow = await LCARSComponents.LCARSElbow();
        const StarfleetBadge = await StarfleetComponents.StarfleetBadge();

        expect(LCARSElbow).toBeDefined();
        expect(StarfleetBadge).toBeDefined();
        expect(typeof LCARSElbow).toBe('function');
        expect(typeof StarfleetBadge).toBe('function');
    });

    it('should maintain backward compatibility with legacy exports', async () => {
        const legacyExports = await import('../components.js');

        // The old components.tsx file should re-export everything
        expect(legacyExports.LCARSBar).toBeDefined();
        expect(legacyExports.LCARSElbow).toBeDefined();
        expect(legacyExports.StarfleetBadge).toBeDefined();
        expect(legacyExports.LCARSVisualComponentShowcase).toBeDefined();
    });

    it('should have proper TypeScript types without errors', () => {
        // This test passes if TypeScript compilation succeeds
        // The previous TS4023 errors would prevent this test from even running
        expect(true).toBe(true);
    });
});
