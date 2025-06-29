/**
 * Star Trek Universe Plugin - Frontend Components Index
 * Modular export system for all Star Trek UI components
 * 
 * 🚫 **AUTHENTIC LCARS DESIGN IMPLEMENTATION**:
 * 
 * This modular structure follows proper LCARS design principles:
 * - Orange (#FF9900), Blue (#9999FF), Purple (#CC6699), Yellow (#CCFF66)
 * - Muted, pastel colors with matte finish - not neon/bright
 * - Black backgrounds (#000000, #111111) with colored accents
 * - Large "elbow" or "PADD-style" corner segments
 * - Pill-shaped buttons arranged vertically or in cascades
 * - LCARS fonts: "Orbitron", "Swiss911 UCm BT", or "Eurostile Extended"
 * - Asymmetric colored blocks for section dividers
 */

// Base components (fundamental building blocks)
export * from './base/index.js';

// LCARS interface components (authentic Star Trek UI)
export * from './lcars/index.js';

// Starfleet-specific components (badges, devices, etc.)
export * from './starfleet/index.js';

// Showcase components (complete interface demonstrations)
export * from './showcase/index.js';

// Type-safe convenience grouped exports for easy importing
export const LCARSComponents: Record<string, () => Promise<any>> = {
    // LCARS Interface
    LCARSElbow: () => import('./lcars/LCARSElbow.js').then(m => m.LCARSElbow),
    LCARSPanel: () => import('./lcars/LCARSPanel.js').then(m => m.LCARSPanel),
    LCARSButton: () => import('./lcars/LCARSButton.js').then(m => m.LCARSButton),
    LCARSBarCode: () => import('./lcars/LCARSBarCode.js').then(m => m.LCARSBarCode),
};

export const StarfleetComponents: Record<string, () => Promise<any>> = {
    // Starfleet Devices
    StarfleetBadge: () => import('./starfleet/StarfleetBadge.js').then(m => m.StarfleetBadge),
    PADD: () => import('./starfleet/PADD.js').then(m => m.PADD),
    HolodeckGrid: () => import('./starfleet/HolodeckGrid.js').then(m => m.HolodeckGrid),
};

export const ShowcaseComponents: Record<string, () => Promise<any>> = {
    // Complete Interface Demonstrations
    LCARSVisualComponentShowcase: () => import('./showcase/LCARSVisualComponentShowcase.js').then(m => m.LCARSVisualComponentShowcase),
};

// Legacy compatibility export (for existing imports)
export const StarTrekComponents: Record<string, () => Promise<any>> = {
    // Base
    LCARSBar: () => import('./base/LCARSBar.js').then(m => m.LCARSBar),

    // LCARS
    LCARSElbow: () => import('./lcars/LCARSElbow.js').then(m => m.LCARSElbow),
    LCARSPanel: () => import('./lcars/LCARSPanel.js').then(m => m.LCARSPanel),
    LCARSButton: () => import('./lcars/LCARSButton.js').then(m => m.LCARSButton),
    LCARSBarCode: () => import('./lcars/LCARSBarCode.js').then(m => m.LCARSBarCode),

    // Starfleet
    StarfleetBadge: () => import('./starfleet/StarfleetBadge.js').then(m => m.StarfleetBadge),
    PADD: () => import('./starfleet/PADD.js').then(m => m.PADD),
    HolodeckGrid: () => import('./starfleet/HolodeckGrid.js').then(m => m.HolodeckGrid),

    // Showcase
    LCARSVisualComponentShowcase: () => import('./showcase/LCARSVisualComponentShowcase.js').then(m => m.LCARSVisualComponentShowcase),
};

export default StarTrekComponents;
