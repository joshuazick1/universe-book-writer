/**
 * Star Trek Universe Plugin - Frontend Components (Legacy)
 * 
 * @deprecated This file is deprecated. Use the modular component imports instead:
 * 
 * ```ts
 * // New modular imports
 * import { LCARSBar } from './components/base/index.js';
 * import { LCARSElbow, LCARSPanel, LCARSButton, LCARSBarCode } from './components/lcars/index.js';
 * import { StarfleetBadge, PADD, HolodeckGrid } from './components/starfleet/index.js';
 * import { LCARSVisualComponentShowcase } from './components/showcase/index.js';
 * 
 * // Or use the main export hub
 * import { 
 *   LCARSBar, 
 *   LCARSElbow, 
 *   LCARSPanel, 
 *   LCARSButton, 
 *   LCARSBarCode,
 *   StarfleetBadge,
 *   PADD,
 *   HolodeckGrid,
 *   LCARSVisualComponentShowcase
 * } from './components/index.js';
 * ```
 * 
 * This legacy file will be removed in a future version.
 */

// Re-export all components from the new modular structure
export * from './components/index.js';

// Backward compatibility - export everything as named exports
export {
    // Base components
    LCARSBar,

    // LCARS components
    LCARSElbow,
    LCARSPanel,
    LCARSButton,
    LCARSBarCode,

    // Starfleet components
    StarfleetBadge,
    PADD,
    HolodeckGrid,

    // Showcase component
    LCARSVisualComponentShowcase
} from './components/index.js';
