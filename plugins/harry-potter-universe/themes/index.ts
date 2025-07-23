/**
 * Harry Potter Universe Themes
 * Collection of all Harry Potter-themed UI themes
 */

export * from './hogwarts.js';
export * from './gryffindor.js';
export * from './hufflepuff.js';
export * from './ravenclaw.js';
export * from './slytherin.js';

import { default as hogwartsTheme } from './hogwarts.js';
import { default as gryffindorTheme } from './gryffindor.js';
import { default as hufflepuffTheme } from './hufflepuff.js';
import { default as ravenclawTheme } from './ravenclaw.js';
import { default as slytherinTheme } from './slytherin.js';

export { hogwartsTheme, gryffindorTheme, hufflepuffTheme, ravenclawTheme, slytherinTheme };

/**
 * Get all available Harry Potter themes
 */
export function getAllThemes() {
    return {
        hogwarts: hogwartsTheme,
        gryffindor: gryffindorTheme,
        hufflepuff: hufflepuffTheme,
        ravenclaw: ravenclawTheme,
        slytherin: slytherinTheme
    };
}

/**
 * Get theme by house name
 */
export function getThemeByHouse(house: 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin') {
    const themes = getAllThemes();
    return themes[house];
}

/**
 * Get sorting hat house colors
 */
export function getHouseColors() {
    return {
        gryffindor: { primary: '#740001', secondary: '#D3A625' },
        hufflepuff: { primary: '#FFD800', secondary: '#000000' },
        ravenclaw: { primary: '#0E1A40', secondary: '#946B2D' },
        slytherin: { primary: '#1A472A', secondary: '#C0C0C0' }
    };
}
