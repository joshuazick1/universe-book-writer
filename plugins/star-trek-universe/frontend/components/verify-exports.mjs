/**
 * Verification script for modular component exports
 * Tests that all components can be imported and are properly typed
 */

import { LCARSComponents, StarfleetComponents, ShowcaseComponents, StarTrekComponents } from './index.ts';

// Test basic functionality
async function verifyModularExports() {
    console.log('🔍 Verifying Star Trek Plugin modular exports...\n');

    // Test grouped exports exist
    console.log('✅ LCARSComponents:', Object.keys(LCARSComponents));
    console.log('✅ StarfleetComponents:', Object.keys(StarfleetComponents));
    console.log('✅ ShowcaseComponents:', Object.keys(ShowcaseComponents));
    console.log('✅ StarTrekComponents (legacy):', Object.keys(StarTrekComponents));

    // Test dynamic imports work
    try {
        const LCARSElbow = await LCARSComponents.LCARSElbow();
        console.log('✅ Dynamic import of LCARSElbow successful:', typeof LCARSElbow);

        const StarfleetBadge = await StarfleetComponents.StarfleetBadge();
        console.log('✅ Dynamic import of StarfleetBadge successful:', typeof StarfleetBadge);

        const Showcase = await ShowcaseComponents.LCARSVisualComponentShowcase();
        console.log('✅ Dynamic import of LCARSVisualComponentShowcase successful:', typeof Showcase);

    } catch (error) {
        console.error('❌ Dynamic import failed:', error);
        return false;
    }

    console.log('\n🎉 All modular exports verified successfully!');
    return true;
}

// Test direct imports from submodules
async function verifyDirectImports() {
    console.log('\n🔍 Verifying direct module imports...\n');

    try {
        const { LCARSBar } = await import('./base/index.ts');
        console.log('✅ Direct import from base module:', typeof LCARSBar);

        const { LCARSElbow, LCARSPanel } = await import('./lcars/index.ts');
        console.log('✅ Direct import from lcars module:', typeof LCARSElbow, typeof LCARSPanel);

        const { StarfleetBadge, PADD } = await import('./starfleet/index.ts');
        console.log('✅ Direct import from starfleet module:', typeof StarfleetBadge, typeof PADD);

        const { LCARSVisualComponentShowcase } = await import('./showcase/index.ts');
        console.log('✅ Direct import from showcase module:', typeof LCARSVisualComponentShowcase);

    } catch (error) {
        console.error('❌ Direct import failed:', error);
        return false;
    }

    console.log('\n🎉 All direct imports verified successfully!');
    return true;
}

// Test backward compatibility
async function verifyBackwardCompatibility() {
    console.log('\n🔍 Verifying backward compatibility...\n');

    try {
        const legacyExports = await import('./components.tsx');

        // Check that key components are available through legacy export
        const requiredComponents = ['LCARSBar', 'LCARSElbow', 'StarfleetBadge', 'LCARSVisualComponentShowcase'];

        for (const componentName of requiredComponents) {
            if (typeof legacyExports[componentName] === 'function') {
                console.log(`✅ Legacy export ${componentName}:`, typeof legacyExports[componentName]);
            } else {
                console.error(`❌ Legacy export ${componentName} not found or invalid type`);
                return false;
            }
        }

    } catch (error) {
        console.error('❌ Backward compatibility test failed:', error);
        return false;
    }

    console.log('\n🎉 Backward compatibility verified successfully!');
    return true;
}

// Run all verification tests
async function main() {
    console.log('🚀 Starting Star Trek Plugin Component Verification\n');

    const results = await Promise.all([
        verifyModularExports(),
        verifyDirectImports(),
        verifyBackwardCompatibility()
    ]);

    if (results.every(result => result)) {
        console.log('\n🌟 ALL TESTS PASSED! Modular component system is working correctly.');
        process.exit(0);
    } else {
        console.log('\n💥 SOME TESTS FAILED! Please check the errors above.');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
});
